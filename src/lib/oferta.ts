import { FilterOperatorEnum } from "@hubspot/api-client/lib/codegen/crm/contacts/models/Filter";
import { getHubspotClient, getOwnerId, buildContactName } from "./hubspot";
import { buildWhatsappLink, formatBrPhone } from "./whatsapp";

export interface ColdContact {
  id: string;
  name: string;
  city: string;
  daysSinceLastActivity: number | null;
  whatsapp: string | null;
  phoneDisplay: string | null;
}

const COLD_AFTER_DAYS = 14;

export async function listColdContacts(): Promise<ColdContact[]> {
  const client = getHubspotClient();
  const ownerId = await getOwnerId();

  const cutoff = new Date(Date.now() - COLD_AFTER_DAYS * 24 * 60 * 60 * 1000);

  const result = await client.crm.contacts.searchApi.doSearch({
    filterGroups: [
      {
        filters: [
          { propertyName: "hubspot_owner_id", operator: FilterOperatorEnum.Eq, value: ownerId },
          {
            propertyName: "notes_last_updated",
            operator: FilterOperatorEnum.Lt,
            value: String(cutoff.getTime()),
          },
        ],
      },
      {
        filters: [
          { propertyName: "hubspot_owner_id", operator: FilterOperatorEnum.Eq, value: ownerId },
          { propertyName: "notes_last_updated", operator: FilterOperatorEnum.NotHasProperty, value: "" },
        ],
      },
    ],
    sorts: ["notes_last_updated"],
    properties: ["firstname", "lastname", "phone", "mobilephone", "city", "notes_last_updated"],
    limit: 100,
  });

  const now = Date.now();

  return result.results.map((contact) => {
    const props = contact.properties;
    const phone = props.mobilephone || props.phone || null;
    const lastActivityMs = props.notes_last_updated ? new Date(props.notes_last_updated).getTime() : NaN;

    return {
      id: contact.id,
      name: buildContactName(props.firstname, props.lastname),
      city: props.city?.trim() || "Sem região",
      daysSinceLastActivity: Number.isFinite(lastActivityMs)
        ? Math.floor((now - lastActivityMs) / (24 * 60 * 60 * 1000))
        : null,
      whatsapp: buildWhatsappLink(phone),
      phoneDisplay: formatBrPhone(phone),
    };
  });
}
