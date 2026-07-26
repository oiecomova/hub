"use client";

import { useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (text: string) => Promise<void>;
}

export function AgendaModal({ open, onClose, onSubmit }: Props) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    setText("");
    setError(null);
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(text);
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar compromisso.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={`overlay ${open ? "open" : ""}`} onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="agendamentoModalTitle">
        <div className="modal-head">
          <div>
            <h2 id="agendamentoModalTitle">Novo compromisso</h2>
            <p>Descreva livremente — o Claude interpreta e aloca no dia certo do calendário</p>
          </div>
          <button className="modal-close" aria-label="Fechar" onClick={handleClose} type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 5 14 14M19 5 5 19" /></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="fieldAgendamento">Compromisso</label>
            <textarea
              id="fieldAgendamento"
              placeholder="ex: amanhã 15h visita com a Cristina no Monã Anália Franco"
              value={text}
              onChange={(e) => setText(e.target.value)}
              required
            />
          </div>
          {error && <p style={{ color: "var(--critical)", fontSize: 12.5, marginTop: 10 }}>{error}</p>}
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={handleClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Agendando..." : "Agendar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
