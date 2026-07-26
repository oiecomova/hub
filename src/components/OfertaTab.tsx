"use client";

import { useState } from "react";
import type { ColdContact } from "@/lib/oferta";

async function copyPhone(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // sem permissão de clipboard — ignora silenciosamente
  }
}

export function OfertaTab({
  contacts,
  query,
  error,
}: {
  contacts: ColdContact[];
  query: string;
  error: string | null;
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (error) {
    return <p style={{ color: "var(--critical)", fontSize: 13 }}>{error}</p>;
  }

  const q = query.trim().toLowerCase();
  const visible = contacts.filter((c) => !q || c.name.toLowerCase().includes(q));

  if (visible.length === 0) {
    return <p style={{ color: "var(--muted)", fontSize: 13 }}>Nenhum contato frio encontrado.</p>;
  }

  const byCity = new Map<string, ColdContact[]>();
  for (const contact of visible) {
    const list = byCity.get(contact.city) ?? [];
    list.push(contact);
    byCity.set(contact.city, list);
  }

  return (
    <>
      {[...byCity.entries()].map(([city, list]) => (
        <div key={city} className="oferta-region">
          <div className="oferta-region-title">
            {city.toUpperCase()} <span className="oferta-region-count">{list.length}</span>
          </div>
          {list.map((contact) => (
            <div key={contact.id} className="oferta-row">
              <div className="oferta-body">
                <div className="oferta-name">{contact.name}</div>
                {contact.phoneDisplay ? (
                  <span
                    className="oferta-phone"
                    onClick={() => {
                      copyPhone(contact.phoneDisplay!);
                      setCopiedId(contact.id);
                      setTimeout(() => setCopiedId((id) => (id === contact.id ? null : id)), 1500);
                    }}
                  >
                    {copiedId === contact.id ? "Copiado!" : contact.phoneDisplay}
                  </span>
                ) : (
                  <span className="oferta-phone muted">Sem telefone</span>
                )}
              </div>
              <span className="oferta-last">
                {contact.daysSinceLastActivity === null ? "sem interação" : `há ${contact.daysSinceLastActivity} dias`}
              </span>
              {contact.whatsapp && (
                <a
                  className="icon-btn whatsapp"
                  href={contact.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Abrir WhatsApp"
                  aria-label="Abrir WhatsApp"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 18.5 3.5 20l1.55-3.86A7.94 7.94 0 0 1 4 12a8 8 0 1 1 3.3 6.47Z" /><path d="M8.5 9.7c0-.4.3-.7.7-.7h.6c.3 0 .6.2.7.5l.5 1.3c.1.3 0 .6-.2.8l-.5.5c.4.9 1.1 1.6 2 2l.5-.5c.2-.2.5-.3.8-.2l1.3.5c.3.1.5.4.5.7v.6c0 .4-.3.7-.7.7-3.3 0-6-2.7-6-6Z" /></svg>
                </a>
              )}
            </div>
          ))}
        </div>
      ))}
    </>
  );
}
