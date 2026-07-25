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
