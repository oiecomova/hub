import { AssociationTypes } from "@hubspot/api-client";
import { FilterOperatorEnum } from "@hubspot/api-client/lib/codegen/crm/objects/tasks/models/Filter";
import { AssociationSpecAssociationCategoryEnum } from "@hubspot/api-client/lib/codegen/crm/objects/notes/models/AssociationSpec";
import { getHubspotClient, getOwnerId, buildContactName } from "./hubspot";
import { decideNextActivity } from "./followup";

export interface ContactMatch {
  id: string;
  name: string;
}

/**
 * Busca um contato do owner por primeiro nome (usado quando o texto do
 * corretor menciona um nome e precisamos achar o contato certo no HubSpot).
 */
export async function searchContactByName(name: string): Promise<ContactMatch | null> {
  const client = getHubspotClient();
  const ownerId = await getOwnerId();

  const result = await client.crm.contacts.searchApi.doSearch({
    filterGroups: [
      {
        filters: [
          { propertyName: "hubspot_owner_id", operator: FilterOperatorEnum.Eq, value: ownerId },
          { propertyName: "firstname", operator: FilterOperatorEnum.ContainsToken, value: name },
        ],
      },
    ],
    properties: ["firstname", "lastname"],
    limit: 1,
  });

  const contact = result.results[0];
  if (!contact) return null;

  return {
    id: contact.id,
    name: buildContactName(contact.properties.firstname, contact.properties.lastname),
  };
}

export interface CreateContactResult {
  contactId: string;
  nextTaskCreated: boolean;
  warning?: string;
}

export async function createContact(params: {
  name: string;
  phone?: string;
  observation?: string;
}): Promise<CreateContactResult> {
  const client = getHubspotClient();
  const ownerId = await getOwnerId();

  const [firstname, ...rest] = params.name.trim().split(/\s+/);
  const lastname = rest.join(" ") || undefined;

  const contact = await client.crm.contacts.basicApi.create({
    properties: {
      firstname: firstname ?? params.name,
      ...(lastname ? { lastname } : {}),
      ...(params.phone ? { phone: params.phone } : {}),
      hubspot_owner_id: ownerId,
    },
  });

  let nextTaskCreated = false;
  let warning: string | undefined;

  if (params.observation && params.observation.trim()) {
    try {
      const decision = await decideNextActivity({
        contactName: params.name,
        currentTaskSubject: "Contato novo | Dia 0",
        currentTaskBody: "",
        observation: params.observation,
        now: new Date(),
      });

      await client.crm.objects.notes.basicApi.create({
        properties: {
          hs_note_body: decision.resumoNota,
          hs_timestamp: String(Date.now()),
        },
        associations: [
          {
            to: { id: contact.id },
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
          hs_task_priority: "MEDIUM",
          hs_task_status: "NOT_STARTED",
          hubspot_owner_id: ownerId,
        },
        associations: [
          {
            to: { id: contact.id },
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
    } catch (error) {
      warning =
        error instanceof Error
          ? `Contato criado, mas não foi possível gerar a primeira tarefa automaticamente: ${error.message}`
          : "Contato criado, mas não foi possível gerar a primeira tarefa automaticamente.";
    }
  }

  return { contactId: contact.id, nextTaskCreated, warning };
}
