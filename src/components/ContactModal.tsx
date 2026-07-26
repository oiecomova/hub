"use client";

import { useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; phone: string; observation: string }) => Promise<void>;
}

export function ContactModal({ open, onClose, onSubmit }: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [observation, setObservation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName("");
    setPhone("");
    setObservation("");
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ name, phone, observation });
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar contato.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={`overlay ${open ? "open" : ""}`} onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="contactModalTitle">
        <div className="modal-head">
          <div>
            <h2 id="contactModalTitle">Novo contato</h2>
            <p>Cria o contato no HubSpot e, se houver observação, o Claude já agenda a próxima atividade</p>
          </div>
          <button className="modal-close" aria-label="Fechar" onClick={handleClose} type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 5 14 14M19 5 5 19" /></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="fieldNome">Nome</label>
            <input
              id="fieldNome"
              type="text"
              placeholder="Nome completo"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="fieldTelefone">Telefone</label>
            <input
              id="fieldTelefone"
              type="tel"
              placeholder="(11) 90000-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="fieldObservacao">Observação</label>
            <textarea
              id="fieldObservacao"
              placeholder="Contexto inicial, empreendimento de interesse, como chegou até você..."
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
            />
          </div>
          {error && <p style={{ color: "var(--critical)", fontSize: 12.5, marginTop: 10 }}>{error}</p>}
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={handleClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Criando..." : "Criar contato"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
