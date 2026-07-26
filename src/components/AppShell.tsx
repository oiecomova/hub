"use client";

import { useState, useSyncExternalStore } from "react";
import { subscribeTheme, getThemeSnapshot, getThemeServerSnapshot, setTheme } from "@/lib/theme-store";
import type { DailyTask } from "@/lib/tasks";
import type { DashboardStats } from "@/lib/dashboard";
import type { ColdContact } from "@/lib/oferta";
import { TasksTab } from "./TasksTab";
import { DashboardTab } from "./DashboardTab";
import { AgendaTab } from "./AgendaTab";
import { OfertaTab } from "./OfertaTab";
import { ContactModal } from "./ContactModal";
import { AgendaModal } from "./AgendaModal";
import { ToastStack, type Toast } from "./Toast";

type TabId = "tarefas" | "dashboard" | "agenda" | "oferta";

const TAB_META: Record<TabId, { title: string; sub: string }> = {
  tarefas: { title: "Tarefas", sub: "Vencidas e de hoje, por prioridade" },
  dashboard: { title: "Dashboard", sub: "Visão geral da carteira" },
  agenda: { title: "Agenda", sub: "Compromissos e visitas" },
  oferta: { title: "Oferta ativa", sub: "Contatos frios, por região" },
};

interface Props {
  initialTasks: DailyTask[];
  initialAgendaTasks: DailyTask[];
  initialStats: DashboardStats;
  initialColdContacts: ColdContact[];
  errors: {
    tasks: string | null;
    agenda: string | null;
    dashboard: string | null;
    oferta: string | null;
  };
}

export function AppShell({
  initialTasks,
  initialAgendaTasks,
  initialStats,
  initialColdContacts,
  errors,
}: Props) {
  const [tab, setTab] = useState<TabId>("tarefas");
  const [tasks, setTasks] = useState(initialTasks);
  const [agendaTasks, setAgendaTasks] = useState(initialAgendaTasks);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [agendaModalOpen, setAgendaModalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const isDark = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getThemeServerSnapshot);

  function toggleTheme() {
    setTheme(!isDark);
  }

  function pushToast(text: string, kind: Toast["kind"] = "success") {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, text, kind }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3400);
  }

  async function handleContactSubmit(data: { name: string; phone: string; observation: string }) {
    const res = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error ?? "Erro ao criar contato.");
    setContactModalOpen(false);
    pushToast(
      json.nextTaskCreated
        ? `Contato criado — Claude já agendou a próxima atividade para ${data.name}.`
        : `Contato ${data.name} criado.`
    );
    if (json.warning) pushToast(json.warning, "info");
  }

  async function handleAgendaSubmit(text: string) {
    const res = await fetch("/api/agenda", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error ?? "Erro ao criar compromisso.");
    setAgendaModalOpen(false);
    pushToast(`Claude agendou: ${json.subject}`);

    const refreshed = await fetch("/api/agenda");
    const refreshedJson = await refreshed.json().catch(() => ({}));
    if (refreshed.ok && Array.isArray(refreshedJson.tasks)) {
      setAgendaTasks(refreshedJson.tasks);
    }
  }

  const meta = TAB_META[tab];

  return (
    <div className="app">
      <aside className="rail">
        <div className="rail-brand">
          <div className="rail-brand-mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10v9a1 1 0 0 0 1 1H9a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h2.5a1 1 0 0 0 1-1v-9" /></svg>
          </div>
          <div className="rail-brand-name brand-wordmark">Chave</div>
        </div>

        <nav>
          <button className={`nav-item ${tab === "tarefas" ? "active" : ""}`} onClick={() => setTab("tarefas")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4L19 6" /></svg>
            Tarefas
          </button>
          <button className={`nav-item ${tab === "dashboard" ? "active" : ""}`} onClick={() => setTab("dashboard")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3.5" y="3.5" width="7" height="9" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="5" rx="1.5" /><rect x="13.5" y="11.5" width="7" height="9" rx="1.5" /><rect x="3.5" y="15.5" width="7" height="5" rx="1.5" /></svg>
            Dashboard
          </button>
          <button className={`nav-item ${tab === "agenda" ? "active" : ""}`} onClick={() => setTab("agenda")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3.5" y="5" width="17" height="15.5" rx="2" /><path d="M3.5 9.5h17M8 3v4M16 3v4" /><circle cx="8.25" cy="13.5" r="1" /><circle cx="12" cy="13.5" r="1" /><circle cx="15.75" cy="13.5" r="1" /><circle cx="8.25" cy="17" r="1" /><circle cx="12" cy="17" r="1" /></svg>
            Agenda
          </button>
          <button className={`nav-item ${tab === "oferta" ? "active" : ""}`} onClick={() => setTab("oferta")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h4l2 5-2.5 1.5a12 12 0 0 0 6 6L15 14l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 2 6a2 2 0 0 1 2-2Z" /></svg>
            Oferta ativa
          </button>
        </nav>

        <div className="rail-footer">
          <div className="rail-avatar">M</div>
          <div>
            <div className="rail-user-name">Miguel</div>
            <div className="rail-user-role">Corretor</div>
          </div>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <h1>{meta.title}</h1>
            <div className="topbar-sub">{meta.sub}</div>
          </div>
          <div className="topbar-actions">
            <div className="search-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
              <input
                type="text"
                placeholder="Buscar contato ou tarefa"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <button className="theme-toggle" title="Alternar tema" aria-label="Alternar tema" onClick={toggleTheme}>
              {isDark ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4.5" /><path d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" /></svg>
              )}
            </button>
          </div>
        </header>

        <div className="tab-scroll">
          {tab === "tarefas" && (
            <TasksTab
              tasks={tasks}
              setTasks={setTasks}
              query={query}
              error={errors.tasks}
              pushToast={pushToast}
            />
          )}
          {tab === "dashboard" && <DashboardTab stats={initialStats} error={errors.dashboard} />}
          {tab === "agenda" && (
            <AgendaTab tasks={agendaTasks} query={query} error={errors.agenda} />
          )}
          {tab === "oferta" && (
            <OfertaTab contacts={initialColdContacts} query={query} error={errors.oferta} />
          )}
        </div>
      </main>

      {tab !== "dashboard" && (
        <button
          className="fab"
          title={tab === "agenda" ? "Novo compromisso" : "Novo contato"}
          aria-label={tab === "agenda" ? "Novo compromisso" : "Novo contato"}
          onClick={() => (tab === "agenda" ? setAgendaModalOpen(true) : setContactModalOpen(true))}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
        </button>
      )}

      <ContactModal
        open={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        onSubmit={handleContactSubmit}
      />
      <AgendaModal
        open={agendaModalOpen}
        onClose={() => setAgendaModalOpen(false)}
        onSubmit={handleAgendaSubmit}
      />

      <ToastStack toasts={toasts} />
    </div>
  );
}
