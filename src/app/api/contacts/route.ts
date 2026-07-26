import { createContact } from "@/lib/contacts";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : undefined;
  const observation = typeof body.observation === "string" ? body.observation : undefined;

  if (!name) {
    return Response.json({ error: "Nome é obrigatório." }, { status: 400 });
  }

  try {
    const result = await createContact({ name, phone, observation });
    return Response.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao criar contato.";
    return Response.json({ error: message }, { status: 500 });
  }
}
