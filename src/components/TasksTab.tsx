"use client";

import { useState } from "react";
import type { DailyTask, TaskPriority } from "@/lib/tasks";
import type { Toast } from "./Toast";

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  HIGH: "Prioridade alta",
  MEDIUM: "Prioridade média",
  LOW: "Prioridade baixa",
  NONE: "Sem prioridade",
};
const PRIORITY_CHIP_LABEL: Record<TaskPriority, string> = {
  HIGH: "Alta",
  MEDIUM: "Média",
  LOW: "Baixa",
  NONE: "Sem prioridade",
};
const PRIORITY_COLOR: Record<TaskPriority, string> = {
  HIGH: "var(--critical)",
  MEDIUM: "var(--warning)",
  LOW: "var(--good)",
  NONE: "var(--muted)",
};
const PRIORITY_ORDER: TaskPriority[] = ["HIGH", "MEDIUM", "LOW", "NONE"];

function daysLate(dueDate: string): number {
  const due = new Date(dueDate);
  const today = new Date();
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.max(Math.round((todayDay.getTime() - dueDay.getTime()) / 86400000), 1);
}

function formatDueLabel(task: DailyTask): string {
  if (task.isOverdue) {
    const n = daysLate(task.dueDate);
    return `Atrasada · há ${n} dia${n > 1 ? "s" : ""}`;
  }
  const due = new Date(task.dueDate);
  if (Number.isNaN(due.getTime())) return "";
  return due.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

async function copyPhone(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // sem permissão de clipboard — ignora silenciosamente
  }
}

interface Props {
  tasks: DailyTask[];
  setTasks: (updater: (prev: DailyTask[]) => DailyTask[]) => void;
  query: string;
  error: string | null;
  pushToast: (text: string, kind?: Toast["kind"]) => void;
}

export function TasksTab({ tasks, setTasks, query, error, pushToast }: Props) {
  const [filter, setFilter] = useState<TaskPriority | "ALL">("ALL");
  const [observations, setObservations] = useState<Record<string, string>>({});
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (error) {
    return <p style={{ color: "var(--critical)", fontSize: 13 }}>{error}</p>;
  }

  const q = query.trim().toLowerCase();
  const visible = tasks.filter((t) => {
    if (filter !== "ALL" && t.priority !== filter) return false;
    if (!q) return true;
    return t.subject.toLowerCase().includes(q) || (t.contact?.name.toLowerCase().includes(q) ?? false);
  });

  const counts = PRIORITY_ORDER.reduce(
    (acc, p) => ({ ...acc, [p]: tasks.filter((t) => t.priority === p).length }),
    {} as Record<TaskPriority, number>
  );

  const groups = PRIORITY_ORDER.filter((p) => visible.some((t) => t.priority === p));

  async function handleComplete(taskId: string) {
    setCompletingId(taskId);
    try {
      const res = await fetch(`/api/tasks/${taskId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ observation: observations[taskId] ?? "" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Falha ao concluir tarefa.");

      if (data.warning) {
        pushToast(data.warning, "info");
      } else if (data.nextTaskCreated) {
        pushToast("Tarefa concluída — Claude já decidiu a próxima atividade.");
      } else {
        pushToast("Tarefa concluída.");
      }
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Erro ao concluir tarefa.", "info");
    } finally {
      setCompletingId(null);
    }
  }

  if (tasks.length === 0) {
    return <p style={{ color: "var(--muted)", fontSize: 13 }}>Nenhuma tarefa pendente para hoje.</p>;
  }

  return (
    <>
      <div className="chip-row">
        <button className={`chip ${filter === "ALL" ? "active" : ""}`} onClick={() => setFilter("ALL")}>
          Todas <span className="chip-count">{tasks.length}</span>
        </button>
        {PRIORITY_ORDER.map((p) => (
          <button key={p} className={`chip ${filter === p ? "active" : ""}`} onClick={() => setFilter(p)}>
            <span className="dot" style={{ background: PRIORITY_COLOR[p] }} />
            {PRIORITY_CHIP_LABEL[p]} <span className="chip-count">{counts[p]}</span>
          </button>
        ))}
      </div>

      {groups.length === 0 && <p style={{ color: "var(--muted)", fontSize: 13 }}>Nenhuma tarefa nesse filtro.</p>}

      {groups.map((priority) => (
        <div key={priority} className="task-group">
          <div className="task-group-title">
            <span className="dot" style={{ background: PRIORITY_COLOR[priority] }} />
            {PRIORITY_LABEL[priority]}
          </div>
          <div className="task-list">
            {visible
              .filter((t) => t.priority === priority)
              .map((task) => (
                <div key={task.id} className="task-card">
                  <div className="task-top">
                    <div className="task-name-row">
                      <span className="dot" style={{ background: PRIORITY_COLOR[task.priority] }} />
                      <span className="task-name">{task.contact?.name ?? "(sem contato)"}</span>
                    </div>
                    <div className="task-top-right">
                      <span className={`task-due ${task.isOverdue ? "overdue" : ""}`}>{formatDueLabel(task)}</span>
                      <div className="task-actions">
                        {task.contact?.whatsapp && (
                          <a
                            className="icon-btn whatsapp"
                            href={task.contact.whatsapp}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Abrir WhatsApp"
                            aria-label="Abrir WhatsApp"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 18.5 3.5 20l1.55-3.86A7.94 7.94 0 0 1 4 12a8 8 0 1 1 3.3 6.47Z" /><path d="M8.5 9.7c0-.4.3-.7.7-.7h.6c.3 0 .6.2.7.5l.5 1.3c.1.3 0 .6-.2.8l-.5.5c.4.9 1.1 1.6 2 2l.5-.5c.2-.2.5-.3.8-.2l1.3.5c.3.1.5.4.5.7v.6c0 .4-.3.7-.7.7-3.3 0-6-2.7-6-6Z" /></svg>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <p className="task-subject">{task.subject}</p>

                  {task.contact?.phoneDisplay ? (
                    <span
                      className="oferta-phone"
                      onClick={() => {
                        copyPhone(task.contact!.phoneDisplay!);
                        setCopiedId(task.id);
                        setTimeout(() => setCopiedId((id) => (id === task.id ? null : id)), 1500);
                      }}
                    >
                      {copiedId === task.id ? "Copiado!" : task.contact.phoneDisplay}
                    </span>
                  ) : (
                    <span className="oferta-phone muted">Sem telefone</span>
                  )}

                  <div className="task-composer">
                    <textarea
                      placeholder="o que aconteceu?"
                      value={observations[task.id] ?? ""}
                      onChange={(e) => setObservations((prev) => ({ ...prev, [task.id]: e.target.value }))}
                    />
                    <button
                      className="btn-conclude"
                      disabled={completingId === task.id}
                      onClick={() => handleComplete(task.id)}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4L19 6" /></svg>
                      {completingId === task.id ? "Concluindo..." : "Concluir tarefa"}
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}
    </>
  );
}
