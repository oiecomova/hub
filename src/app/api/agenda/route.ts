import { createAgendaTask, listAgendaTasks } from "@/lib/tasks";

export async function GET() {
  try {
    const tasks = await listAgendaTasks();
    return Response.json({ tasks });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao carregar a agenda.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const text = typeof body.text === "string" ? body.text.trim() : "";

  if (!text) {
    return Response.json({ error: "Descreva o compromisso." }, { status: 400 });
  }

  try {
    const result = await createAgendaTask(text);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao criar compromisso.";
    return Response.json({ error: message }, { status: 500 });
  }
}
