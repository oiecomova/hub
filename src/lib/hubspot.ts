import { Client } from "@hubspot/api-client";

let client: Client | null = null;

export function getHubspotClient(): Client {
  if (!client) {
    const accessToken = process.env.HUBSPOT_ACCESS_TOKEN;
    if (!accessToken) {
      throw new Error("HUBSPOT_ACCESS_TOKEN não está configurado no ambiente.");
    }
    client = new Client({ accessToken });
  }
  return client;
}

let ownerIdCache: string | null = null;

export async function getOwnerId(): Promise<string> {
  if (ownerIdCache) return ownerIdCache;
  const email = process.env.HUBSPOT_OWNER_EMAIL;
  if (!email) {
    throw new Error("HUBSPOT_OWNER_EMAIL não está configurado no ambiente.");
  }
  const owners = await getHubspotClient().crm.owners.ownersApi.getPage(email);
  const owner = owners.results[0];
  if (!owner) {
    throw new Error(`Nenhum owner do HubSpot encontrado para o e-mail ${email}.`);
  }
  ownerIdCache = owner.id;
  return ownerIdCache;
}

export function buildContactName(
  firstname?: string | null,
  lastname?: string | null
): string {
  // Contatos deste HubSpot carregam uma tag interna "C_Mig" no final do nome —
  // às vezes como lastname separado, às vezes grudada no próprio firstname.
  const fullName = [firstname, lastname].filter(Boolean).join(" ").trim();
  const cleaned = fullName.replace(/\s*C_Mig\s*$/i, "").trim();
  return cleaned || "(sem nome)";
}
