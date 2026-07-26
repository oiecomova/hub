import { AssociationTypes } from "@hubspot/api-client";
import { FilterOperatorEnum } from "@hubspot/api-client/lib/codegen/crm/objects/tasks/models/Filter";
import { AssociationSpecAssociationCategoryEnum } from "@hubspot/api-client/lib/codegen/crm/objects/notes/models/AssociationSpec";
import { getHubspotClient, getOwnerId, buildContactName } from "./hubspot";
import { buildWhatsappLink, formatBrPhone } from "./whatsapp";
import { decideNextActivity } from "./followup";
import { interpretAgendaText } from "./agenda";
import { searchContactByName } from "./contacts";

export type TaskPriority = "HIGH" | "MEDIUM" | "LOW" | "NONE";

export interface DailyTaskContact {
  id: string;
  name: string;
  whatsapp: string | null;
  phoneDisplay: string | null;
}

export interface DailyTask {
  id: string;
  subject: string;
  body: string;
  priority: TaskPriority;
  dueDate: string;
  isOverdue: boolean;
  contact: DailyTaskContact | null;
}

async function getContactsForTasks(
  taskIds: string[]
): Promise<Map<string, DailyTaskContact>> {
  const client = getHubspotClient();

  const associationsResult = await client.crm.associations.v4.batchApi.getPage(
    "tasks",
    "contacts",
    { inputs: taskIds.map((id) => ({ id })) }
  );

  // Os IDs vêm como number em algumas respostas dessa API, apesar do tipo declarado
  // ser string — força String() para as chaves do Map baterem de forma confiável.
  const contactIdByTaskId = new Map<string, string>();
  for (const result of associationsResult.results) {
    const contactId = result.to[0]?.toObjectId;
    if (contactId) {
      contactIdByTaskId.set(String(result._from.id), String(contactId));
    }
  }

  const contactIds = [...new Set(contactIdByTaskId.values())];
  if (contactIds.length === 0) return new Map();

  const contactsResult = await client.crm.contacts.batchApi.read({
    inputs: contactIds.map((id) => ({ id })),
    properties: ["firstname", "lastname", "phone", "mobilephone"],
    propertiesWithHistory: [],
  });

  const contactById = new Map(contactsResult.results.map((c) => [c.id, c]));

  const contactByTaskId = new Map<string, DailyTaskContact>();
  for (const [taskId, contactId] of contactIdByTaskId) {
    const contact = contactById.get(contactId);
    if (!contact) continue;
    const phone = contact.properties.mobilephone || contact.properties.phone;
    contactByTaskId.set(taskId, {
      id: contact.id,
      name: buildContactName(contact.properties.firstname, contact.properties.lastname),
      whatsapp: buildWhatsappLink(phone),
      phoneDisplay: formatBrPhone(phone),
    });
  }
  return contactByTaskId;
}

async function searchOpenTasks(
  extraFilters: Array<{ propertyName: string; operator: FilterOperatorEnum; value: string }>
): Promise<DailyTask[]> {
  const client = getHubspotClient();
  const ownerId = await getOwnerId();

  const searchResult = await client.crm.objects.tasks.searchApi.doSearch({
    filterGroups: [
      {
        filters: [
          { propertyName: "hubspot_owner_id", operator: FilterOperatorEnum.Eq, value: ownerId },
          { propertyName: "hs_task_status", operator: FilterOperatorEnum.Neq, value: "COMPLETED" },
          ...extraFilters,
        ],
      },
    ],
    sorts: ["hs_timestamp"],
    properties: [
      "hs_task_subject",
      "hs_task_body",
      "hs_task_priority",
      "hs_task_status",
      "hs_timestamp",
      "hs_task_is_overdue",
    ],
    limit: 200,
  });

  const tasks = searchResult.results;
  if (tasks.length === 0) return [];

  const contactByTaskId = await getContactsForTasks(tasks.map((t) => t.id));

  return tasks.map((task) => {
    const props = task.properties;
    return {
      id: task.id,
      subject: props.hs_task_subject ?? "(sem título)",
      body: props.hs_task_body ?? "",
      priority: (props.hs_task_priority as TaskPriority) || "NONE",
      dueDate: props.hs_timestamp ?? "",
      isOverdue: props.hs_task_is_overdue === "true",
      contact: contactByTaskId.get(task.id) ?? null,
    };
  });
}

export async function listDailyTasks(): Promise<DailyTask[]> {
  const now = new Date();
  const endOfToday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999)
  );

  return searchOpenTasks([
    {
      propertyName: "hs_timestamp",
      operator: FilterOperatorEnum.Lte,
      value: String(endOfToday.getTime()),
    },
  ]);
}

/** Todas as tarefas em aberto do owner, sem filtro de data — usado pela Agenda
 * para agrupar por dia num calendário (inclui atrasadas e futuras). */
export async function listAgendaTasks(): Promise<DailyTask[]> {
  return searchOpenTasks([]);
}

async function getContactIdForTask(taskId: string): Promise<string | null> {
  const client = getHubspotClient();
  const associations = await client.crm.associations.v4.batchApi.getPage(
    "tasks",
    "contacts",
    { inputs: [{ id: taskId }] }
  );
  const contactId = associations.results[0]?.to[0]?.toObjectId;
  return contactId ? String(contactId) : null;
}

export interface CompleteTaskResult {
  nextTaskCreated: boolean;
  warning?: string;
}

export async function completeTask(
  taskId: string,
  observation?: string
): Promise<CompleteTaskResult> {
  const client = getHubspotClient();

  let nextTaskCreated = false;
  let warning: string | undefined;

  if (observation && observation.trim()) {
    try {
      const contactId = await getContactIdForTask(taskId);

      if (!contactId) {
        warning =
          "Tarefa sem contato associado — não foi possível registrar a nota nem criar a próxima atividade automaticamente.";
      } else {
        const [currentTask, contact] = await Promise.all([
          client.crm.objects.tasks.basicApi.getById(taskId, [
            "hs_task_subject",
            "hs_task_body",
            "hs_task_priority",
            "hubspot_owner_id",
          ]),
          client.crm.contacts.basicApi.getById(contactId, ["firstname", "lastname"]),
        ]);

        const contactName = buildContactName(
          contact.properties.firstname,
          contact.properties.lastname
        );

        const decision = await decideNextActivity({
          contactName,
          currentTaskSubject: currentTask.properties.hs_task_subject ?? "",
          currentTaskBody: currentTask.properties.hs_task_body ?? "",
          observation,
          now: new Date(),
        });

        await client.crm.objects.notes.basicApi.create({
          properties: {
            hs_note_body: decision.resumoNota,
            hs_timestamp: String(Date.now()),
          },
          associations: [
            {
              to: { id: contactId },
              types: [
                {
                  associationCategory: AssociationSpecAssociationCategoryEnum.HubspotDefined,
                  associationTypeId: AssociationTypes.noteToContact,
                },
              ],
            },
          ],
        });

        const dueDateMs = new Date(decision.dataTarefaIso).getTime();
        await client.crm.objects.tasks.basicApi.create({
          properties: {
            hs_task_subject: decision.tituloTarefa,
            hs_task_body: decision.descricaoTarefa,
            hs_timestamp: Number.isFinite(dueDateMs) ? String(dueDateMs) : String(Date.now()),
            hs_task_priority: currentTask.properties.hs_task_priority ?? "NONE",
            hs_task_status: "NOT_STARTED",
            hubspot_owner_id: currentTask.properties.hubspot_owner_id ?? "",
          },
          associations: [
            {
              to: { id: contactId },
              types: [
                {
                  associationCategory: AssociationSpecAssociationCategoryEnum.HubspotDefined,
                  associationTypeId: AssociationTypes.taskToContact,
                },
              ],
            },
          ],
        });
        nextTaskCreated = true;
      }
    } catch (error) {
      warning =
        error instanceof Error
          ? `Não foi possível gerar a próxima atividade automaticamente: ${error.message}`
          : "Não foi possível gerar a próxima atividade automaticamente.";
    }
  }

  await client.crm.objects.tasks.basicApi.update(taskId, {
    properties: { hs_task_status: "COMPLETED" },
  });

  return { nextTaskCreated, warning };
}

export interface CreateAgendaTaskResult {
  taskId: string;
  subject: string;
  dueDate: string;
  contactName: string | null;
}

export async function createAgendaTask(text: string): Promise<CreateAgendaTaskResult> {
  const client = getHubspotClient();
  const ownerId = await getOwnerId();

  const decision = await interpretAgendaText({ text, now: new Date() });

  const contact = decision.contactNameGuess
    ? await searchContactByName(decision.contactNameGuess)
    : null;

  const dueDateMs = new Date(decision.dataTarefaIso).getTime();
  const task = await client.crm.objects.tasks.basicApi.create({
    properties: {
      hs_task_subject: decision.tituloTarefa,
      hs_task_body: decision.descricaoTarefa,
      hs_timestamp: Number.isFinite(dueDateMs) ? String(dueDateMs) : String(Date.now()),
      hs_task_priority: "NONE",
      hs_task_status: "NOT_STARTED",
      hubspot_owner_id: ownerId,
    },
    associations: contact
      ? [
          {
            to: { id: contact.id },
            types: [
              {
                associationCategory: AssociationSpecAssociationCategoryEnum.HubspotDefined,
                associationTypeId: AssociationTypes.taskToContact,
              },
            ],
          },
        ]
      : [],
  });

  return {
    taskId: task.id,
    subject: decision.tituloTarefa,
    dueDate: task.properties.hs_timestamp ?? decision.dataTarefaIso,
    contactName: contact?.name ?? null,
  };
}
