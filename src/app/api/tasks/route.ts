import { listDailyTasks } from "@/lib/tasks";

export async function GET() {
  try {
    const tasks = await listDailyTasks();
    return Response.json({ tasks });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao buscar tarefas.";
    return Response.json({ error: message }, { status: 500 });
  }
}
