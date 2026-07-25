import { completeTask } from "@/lib/tasks";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;
  const body = await request.json().catch(() => ({}));
  const observation = typeof body.observation === "string" ? body.observation : undefined;

  try {
    await completeTask(taskId, observation);
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao concluir tarefa.";
    return Response.json({ error: message }, { status: 500 });
  }
}
