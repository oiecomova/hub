import { listDailyTasks } from "@/lib/tasks";
import { TaskDashboard } from "@/components/TaskDashboard";

export const dynamic = "force-dynamic";

export default async function Home() {
  let tasks: Awaited<ReturnType<typeof listDailyTasks>> = [];
  let errorMessage: string | null = null;

  try {
    tasks = await listDailyTasks();
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Erro ao carregar tarefas do HubSpot.";
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
      <h1 className="text-xl font-semibold">Tarefas de hoje</h1>
      {errorMessage ? (
        <p className="text-sm text-red-500">{errorMessage}</p>
      ) : (
        <TaskDashboard tasks={tasks} />
      )}
    </main>
  );
}
