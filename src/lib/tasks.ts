import { AssociationTypes } from "@hubspot/api-client";
import { FilterOperatorEnum } from "@hubspot/api-client/lib/codegen/crm/objects/tasks/models/Filter";
import { AssociationSpecAssociationCategoryEnum } from "@hubspot/api-client/lib/codegen/crm/objects/notes/models/AssociationSpec";
import { getHubspotClient } from "./hubspot";
import { buildWhatsappLink } from "./whatsapp";

export type TaskPriority = "HIGH" | "MEDIUM" | "LOW" | "NONE";

export interface DailyTaskContact {
  id: string;
  name: string;
  whatsapp: string | null;
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

async function getOwnerId(): Promise<string> {
  const email = process.env.HUBSPOT_OWNER_EMAIL;
  if (!email) {
    throw new Error("HUBSPOT_OWNER_EMAIL não está configurado no ambiente.");
  }
  const client = getHubspotClient();
  const owners = await client.crm.owners.ownersApi.getPage(email);
  const owner = owners.results[0];
  if (!owner) {
    throw new Error(`Nenhum owner do HubSpot encontrado para o e-mail ${email}.`);
  }
  return owner.id;
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

  const contactIdByTaskId = new Map<string, string>();
  for (const result of associationsResult.results) {
    const contactId = result.to[0]?.toObjectId;
    if (contactId) contactIdByTaskId.set(result._from.id, contactId);
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
    const name =
      [contact.properties.firstname, contact.properties.lastname]
        .filter(Boolean)
        .join(" ") || "(sem nome)";
    const phone = contact.properties.mobilephone || contact.properties.phone;
    contactByTaskId.set(taskId, {
      id: contact.id,
      name,
      whatsapp: buildWhatsappLink(phone),
    });
  }
  return contactByTaskId;
}

export async function listDailyTasks(): Promise<DailyTask[]> {
  const client = getHubspotClient();
  const ownerId = await getOwnerId();

  const now = new Date();
  const endOfToday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999)
  );

  const searchResult = await client.crm.objects.tasks.searchApi.doSearch({
    filterGroups: [
      {
        filters: [
          { propertyName: "hubspot_owner_id", operator: FilterOperatorEnum.Eq, value: ownerId },
          { propertyName: "hs_task_status", operator: FilterOperatorEnum.Neq, value: "COMPLETED" },
          {
            propertyName: "hs_timestamp",
            operator: FilterOperatorEnum.Lte,
            value: String(endOfToday.getTime()),
          },
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
    limit: 100,
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

export async function completeTask(taskId: string, observation?: string): Promise<void> {
  const client = getHubspotClient();

  if (observation && observation.trim()) {
    const associations = await client.crm.associations.v4.batchApi.getPage(
      "tasks",
      "contacts",
      { inputs: [{ id: taskId }] }
    );
    const contactId = associations.results[0]?.to[0]?.toObjectId;
    if (contactId) {
      await client.crm.objects.notes.basicApi.create({
        properties: {
          hs_note_body: observation,
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
    }
  }

  await client.crm.objects.tasks.basicApi.update(taskId, {
    properties: { hs_task_status: "COMPLETED" },
  });
}
