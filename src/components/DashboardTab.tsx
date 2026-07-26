import type { DashboardStats } from "@/lib/dashboard";

const PRIORITY_LABEL: Record<keyof DashboardStats["openByPriority"], string> = {
  HIGH: "Alta",
  MEDIUM: "Média",
  LOW: "Baixa",
  NONE: "Sem prioridade",
};
const PRIORITY_COLOR: Record<keyof DashboardStats["openByPriority"], string> = {
  HIGH: "var(--critical)",
  MEDIUM: "var(--warning)",
  LOW: "var(--good)",
  NONE: "var(--muted)",
};

export function DashboardTab({ stats, error }: { stats: DashboardStats; error: string | null }) {
  if (error) {
    return <p style={{ color: "var(--critical)", fontSize: 13 }}>{error}</p>;
  }

  const totalOpen =
    stats.openByPriority.HIGH + stats.openByPriority.MEDIUM + stats.openByPriority.LOW + stats.openByPriority.NONE;

  return (
    <>
      <div className="stat-grid">
        <div className="stat-tile">
          <div className="stat-label">Tarefas atrasadas</div>
          <div className="stat-value">{stats.overdueCount}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Vencem hoje</div>
          <div className="stat-value">{stats.dueTodayCount}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Concluídas (7 dias)</div>
          <div className="stat-value">{stats.completedThisWeekCount}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Em aberto</div>
          <div className="stat-value">{totalOpen}</div>
        </div>
      </div>

      <div className="panel">
        <p className="panel-title">Tarefas em aberto por prioridade</p>
        <p className="panel-sub">Carteira atual, todas as datas</p>
        {(Object.keys(PRIORITY_LABEL) as Array<keyof DashboardStats["openByPriority"]>).map((p) => {
          const value = stats.openByPriority[p];
          const pct = totalOpen > 0 ? (value / totalOpen) * 100 : 0;
          return (
            <div key={p} className="funnel-row">
              <div className="funnel-label">{PRIORITY_LABEL[p]}</div>
              <div className="funnel-bar-track">
                <div className="funnel-bar-fill" style={{ width: `${pct}%`, background: PRIORITY_COLOR[p] }} />
              </div>
              <div className="funnel-value">{value}</div>
            </div>
          );
        })}
      </div>
    </>
  );
}
