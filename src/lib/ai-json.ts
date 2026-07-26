/**
 * Claude normalmente responde só com JSON quando instruído, mas às vezes
 * ainda envolve a resposta em um bloco de código markdown (```json ... ```)
 * ou adiciona texto antes/depois — isso extrai o primeiro objeto JSON válido.
 */
export function parseJsonResponse<T>(text: string): T {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]) as T;
    }
    throw new Error("Não foi possível interpretar a resposta da IA (JSON inválido).");
  }
}
