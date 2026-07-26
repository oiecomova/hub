import { getAnthropicClient } from "./anthropic";

export interface AgendaInterpretation {
  tituloTarefa: string;
  descricaoTarefa: string;
  dataTarefaIso: string;
  contactNameGuess: string | null;
}

const SYSTEM_PROMPT = `Você transforma uma anotação livre de um corretor de imóveis em um compromisso estruturado para o calendário do CRM (HubSpot).

O corretor escreve de forma solta, ex: "amanhã 15h visita com a Cristina no Monã Anália Franco" ou "sexta às 10 ligar pro Marcos sobre a proposta".

A partir do texto e da data/hora atual informada, defina:
- um título curto no padrão "Empreendimento | Tipo | Contexto" (Tipo: Visita, Reunião, Ligação, Follow-up, etc.) — omita a parte que não der pra inferir;
- uma descrição de uma frase com o que foi combinado;
- a data/hora do compromisso em ISO 8601 UTC, resolvendo expressões relativas ("amanhã", "sexta", "daqui a 2 dias") a partir da data/hora atual informada. Se não houver horário explícito, use 09:00 local (considere o fuso America/Sao_Paulo, UTC-3);
- o nome do contato mencionado no texto, se houver algum (só o nome, sem sobrenome inventado); null se não houver nenhum nome.

Responda APENAS com um JSON válido, sem texto antes ou depois, exatamente neste formato:
{
  "tituloTarefa": "...",
  "descricaoTarefa": "...",
  "dataTarefaIso": "AAAA-MM-DDTHH:mm:00Z",
  "contactNameGuess": "..." | null
}`;

export async function interpretAgendaText(params: {
  text: string;
  now: Date;
}): Promise<AgendaInterpretation> {
  const client = getAnthropicClient();

  const message = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Data/hora atual: ${params.now.toISOString()}\nTexto do corretor: ${params.text}`,
      },
    ],
  });

  const textBlock = message.content.find(
    (block): block is Extract<typeof block, { type: "text" }> => block.type === "text"
  );
  if (!textBlock) {
    throw new Error("Resposta da IA não contém texto.");
  }

  try {
    return JSON.parse(textBlock.text) as AgendaInterpretation;
  } catch {
    throw new Error("Não foi possível interpretar o compromisso (JSON inválido).");
  }
}
