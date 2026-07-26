import { listDailyTasks, listAgendaTasks } from "@/lib/tasks";
import { getDashboardStats } from "@/lib/dashboard";
import { listColdContacts } from "@/lib/oferta";
import { AppShell } from "@/components/AppShell";

export const dynamic = "force-dynamic";

async function safe<T>(promise: Promise<T>, fallback: T): Promise<{ data: T; error: string | null }> {
  try {
    return { data: await promise, error: null };
  } catch (error) {
    return {
      data: fallback,
      error: error instanceof Error ? error.message : "Erro ao carregar dados.",
    };
  }
}

export default async function Home() {
  const [tasks, agendaTasks, stats, coldContacts] = await Promise.all([
    safe(listDailyTasks(), []),
    safe(listAgendaTasks(), []),
    safe(
      getDashboardStats(),
      { overdueCount: 0, dueTodayCount: 0, completedThisWeekCount: 0, openByPriority: { HIGH: 0, MEDIUM: 0, LOW: 0, NONE: 0 } }
    ),
    safe(listColdContacts(), []),
  ]);

  return (
    <AppShell
      initialTasks={tasks.data}
      initialAgendaTasks={agendaTasks.data}
      initialStats={stats.data}
      initialColdContacts={coldContacts.data}
      errors={{
        tasks: tasks.error,
        agenda: agendaTasks.error,
        dashboard: stats.error,
        oferta: coldContacts.error,
      }}
    />
  );
}
