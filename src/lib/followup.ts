import { getAnthropicClient } from "./anthropic";

export type NextActivityType = "REUNIAO" | "FOLLOWUP_CADENCIA" | "TAREFA_GENERICA";

export interface NextActivityDecision {
  resumoNota: string;
  tipoProximaAtividade: NextActivityType;
  tituloTarefa: string;
  descricaoTarefa: string;
  dataTarefaIso: string;
}

const SYSTEM_PROMPT = `Você decide a próxima atividade de um CRM imobiliário no HubSpot, a partir da observação que o corretor escreveu depois de uma interação com um cliente.

Regra central: depois de processar a observação, deve sobrar EXATAMENTE UMA próxima atividade em aberto para o contato.

Ordem de prioridade para decidir o tipo da próxima atividade:
1. REUNIAO — se a observação deixou definido um compromisso concreto (visita marcada, ligação agendada, reunião confirmada), a próxima atividade é essa reunião/visita, na data combinada.
2. FOLLOWUP_CADENCIA — se não há compromisso marcado, mas o contato segue "quente" (aguardando resposta, revisão de material, decisão em andamento), a próxima etapa segue a cadência: Dia 0 → 1 → 3 → 5 → 7 → 15 → 30 → semanal (a partir daí, recorrente). O título da tarefa atual geralmente contém "Dia X" — avance para o próximo marco da sequência.
3. TAREFA_GENERICA — se não há reunião nem cadência clara (ex: pediu mais prazo, está de viagem, vai decidir depois de falar com terceiros), crie uma tarefa simples de retomada com data compatível com o que foi combinado.

Padrão de título da tarefa: "Empreendimento | Tipo | Contexto" — reaproveite o nome do empreendimento do título da tarefa atual quando existir. Tipo: "Follow-up Dia X", "Reunião", "Visita", "Ligação", "Retomar", etc. Contexto: nome do contato + detalhe curto relevante.

Padrão de descrição da tarefa (duas linhas):
"Resumo da última interação: [o que aconteceu, com base na observação]
Objetivo do próximo contato: [o que o corretor deve fazer/perguntar/buscar na próxima interação]"

Responda APENAS com um JSON válido, sem nenhum texto antes ou depois, exatamente neste formato:
{
  "resumoNota": "1-2 frases reescrevendo a observação de forma clara e objetiva, em primeira pessoa quando fizer sentido",
  "tipoProximaAtividade": "REUNIAO" | "FOLLOWUP_CADENCIA" | "TAREFA_GENERICA",
  "tituloTarefa": "...",
  "descricaoTarefa": "...",
  "dataTarefaIso": "AAAA-MM-DDTHH:mm:00Z"
}`;

export async function decideNextActivity(params: {
  contactName: string;
  currentTaskSubject: string;
  currentTaskBody: string;
  observation: string;
  now: Date;
}): Promise<NextActivityDecision> {
  const client = getAnthropicClient();

  const message = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Data/hora atual: ${params.now.toISOString()}
Contato: ${params.contactName}
Tarefa atual (título): ${params.currentTaskSubject}
Tarefa atual (descrição): ${params.currentTaskBody || "(vazio)"}
Observação do corretor: ${params.observation}`,
      },
    ],
  });

  const textBlock = message.content.find(
    (block): block is Extract<typeof block, { type: "text" }> => block.type === "text"
  );
  if (!textBlock) {
    throw new Error("Resposta da IA não contém texto.");
  }

  let parsed: NextActivityDecision;
  try {
    parsed = JSON.parse(textBlock.text);
  } catch {
    throw new Error("Não foi possível interpretar a decisão da IA (JSON inválido).");
  }

  return parsed;
}
