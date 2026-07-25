"use client";

import { useState } from "react";
import type { DailyTask, TaskPriority } from "@/lib/tasks";

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  HIGH: "Prioridade alta",
  MEDIUM: "Prioridade média",
  LOW: "Prioridade baixa",
  NONE: "Sem prioridade",
};

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  HIGH: "#e5484d",
  MEDIUM: "#ffc53d",
  LOW: "#30a46c",
  NONE: "#8a8a8a",
};

const PRIORITY_ORDER: TaskPriority[] = ["HIGH", "MEDIUM", "LOW", "NONE"];

function formatDueDate(dueDate: string): string {
  if (!dueDate) return "";
  // hs_timestamp vem como string ISO (ex: "2026-07-06T13:00:00Z"), não como epoch em milissegundos.
  return new Date(dueDate).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TaskDashboard({ tasks: initialTasks }: { tasks: DailyTask[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [observations, setObservations] = useState<Record<string, string>>({});
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [errorByTask, setErrorByTask] = useState<Record<string, string>>({});

  async function handleComplete(taskId: string) {
    setCompletingId(taskId);
    setErrorByTask((prev) => ({ ...prev, [taskId]: "" }));
    try {
      const res = await fetch(`/api/tasks/${taskId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ observation: observations[taskId] ?? "" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Falha ao concluir tarefa.");
      }
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao concluir tarefa.";
      setErrorByTask((prev) => ({ ...prev, [taskId]: message }));
    } finally {
      setCompletingId(null);
    }
  }

  if (tasks.length === 0) {
    return <p className="text-sm text-gray-500">Nenhuma tarefa pendente para hoje.</p>;
  }

  const groups = PRIORITY_ORDER.filter((priority) =>
    tasks.some((task) => task.priority === priority)
  );

  return (
    <div className="flex flex-col gap-6">
      {groups.map((priority) => (
        <section key={priority} className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            {PRIORITY_LABEL[priority]}
          </h2>
          {tasks
            .filter((task) => task.priority === priority)
            .map((task) => (
              <article
                key={task.id}
                className="rounded-xl border border-gray-200 p-4 dark:border-gray-800"
              >
                <div className="mb-1 flex items-start justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <span
                      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: PRIORITY_COLOR[priority] }}
                    />
                    {task.contact?.whatsapp ? (
                      <a href={task.contact.whatsapp} target="_blank" rel="noreferrer">
                        {task.contact.name}
                      </a>
                    ) : (
                      <span>{task.contact?.name ?? "(sem contato)"}</span>
                    )}
                  </span>
                  <span
                    className={`whitespace-nowrap text-xs ${
                      task.isOverdue ? "text-red-500" : "text-gray-500"
                    }`}
                  >
                    {task.isOverdue ? "Atrasada · " : ""}
                    {formatDueDate(task.dueDate)}
                  </span>
                </div>
                <p className="mb-3 text-xs text-gray-500">{task.subject}</p>
                {task.body && <p className="mb-3 text-sm">{task.body}</p>}
                <textarea
                  placeholder="o que aconteceu?"
                  value={observations[task.id] ?? ""}
                  onChange={(e) =>
                    setObservations((prev) => ({ ...prev, [task.id]: e.target.value }))
                  }
                  rows={3}
                  className="mb-3 w-full resize-y rounded-lg border border-gray-200 bg-transparent p-2 text-sm dark:border-gray-800"
                />
                {errorByTask[task.id] && (
                  <p className="mb-2 text-xs text-red-500">{errorByTask[task.id]}</p>
                )}
                <button
                  onClick={() => handleComplete(task.id)}
                  disabled={completingId === task.id}
                  className="w-full rounded-lg border border-green-800 bg-green-950 py-2 text-sm font-semibold text-green-400 disabled:opacity-50"
                >
                  {completingId === task.id ? "Concluindo..." : "Concluir tarefa"}
                </button>
              </article>
            ))}
        </section>
      ))}
    </div>
  );
}
