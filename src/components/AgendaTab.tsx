"use client";

import { useMemo, useState } from "react";
import type { DailyTask } from "@/lib/tasks";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTH_LABEL = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function AgendaTab({
  tasks,
  query,
  error,
}: {
  tasks: DailyTask[];
  query: string;
  error: string | null;
}) {
  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState(today);

  if (error) {
    return <p style={{ color: "var(--critical)", fontSize: 13 }}>{error}</p>;
  }

  const q = query.trim().toLowerCase();
  const visible = tasks.filter(
    (t) => !q || t.subject.toLowerCase().includes(q) || (t.contact?.name.toLowerCase().includes(q) ?? false)
  );

  const tasksByDay = new Map<string, DailyTask[]>();
  for (const task of visible) {
    const due = new Date(task.dueDate);
    if (Number.isNaN(due.getTime())) continue;
    const key = dateKey(due);
    const list = tasksByDay.get(key) ?? [];
    list.push(task);
    tasksByDay.set(key, list);
  }

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(gridStart.getDate() - firstOfMonth.getDay());
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    cells.push(d);
  }

  function changeMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  const selectedTasks = (tasksByDay.get(dateKey(selected)) ?? []).sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  );

  return (
    <>
      <div className="cal-header">
        <button className="cal-nav" onClick={() => changeMonth(-1)} aria-label="Mês anterior">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
        </button>
        <span className="cal-month-label">{MONTH_LABEL.format(new Date(viewYear, viewMonth, 1))}</span>
        <button className="cal-nav" onClick={() => changeMonth(1)} aria-label="Próximo mês">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
        </button>
      </div>

      <div className="cal-weekdays">
        {WEEKDAYS.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>

      <div className="cal-grid">
        {cells.map((d) => {
          const key = dateKey(d);
          const dayTasks = tasksByDay.get(key) ?? [];
          const isOutside = d.getMonth() !== viewMonth;
          const isToday = dateKey(d) === dateKey(today);
          const isSelected = dateKey(d) === dateKey(selected);
          return (
            <div
              key={key}
              className={`cal-cell ${isOutside ? "outside" : ""} ${isToday ? "today" : ""} ${isSelected ? "selected" : ""}`}
              onClick={() => setSelected(d)}
            >
              <span className="cal-cell-num">{d.getDate()}</span>
              {dayTasks.slice(0, 2).map((t) => (
                <span key={t.id} className="cal-event">
                  {t.contact?.name ?? t.subject}
                </span>
              ))}
              {dayTasks.length > 2 && <span className="cal-event-more">+{dayTasks.length - 2}</span>}
            </div>
          );
        })}
      </div>

      <div className="panel cal-day-panel">
        <p className="panel-title">
          {selected.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
        </p>
        {selectedTasks.length === 0 && <p className="cal-day-empty">Nada agendado neste dia.</p>}
        {selectedTasks.map((t) => {
          const due = new Date(t.dueDate);
          return (
            <div key={t.id} className="cal-day-item">
              <span className="cal-day-time">
                {Number.isNaN(due.getTime())
                  ? "--:--"
                  : due.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </span>
              <div className="cal-day-body">
                <div className="cal-day-name">{t.contact?.name ?? "(sem contato)"}</div>
                <div className="cal-day-sub">{t.subject}</div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
