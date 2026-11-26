import type { TicketRepository } from "../tickets/ticket.repository";
import type { Ticket } from "../tickets/ticket.types";
import type { AiProvider } from "./ai.provider";
import { classificarMensagem } from "./classificador";

// Classifica um ticket já salvo. Sucesso: grava categoria, prioridade, assunto e resposta sugerida.
// Falha: o ticket continua salvo e vai para "classificacao_manual" (um humano resolve).
export async function classificarTicket(
  repo: TicketRepository,
  provider: AiProvider,
  ticket: Ticket,
  timeoutMs: number,
): Promise<void> {
  const resultado = await classificarMensagem(provider, ticket.mensagem, timeoutMs);

  if (resultado.ok) {
    const { categoria, prioridade } = resultado.classificacao;
    await repo.aplicarClassificacao(ticket.id, resultado.classificacao);
    console.log(`Ticket #${ticket.id} classificado: ${categoria} / ${prioridade}`);
    return;
  }

  console.warn(`Ticket #${ticket.id} enviado para classificação manual (${resultado.motivo}): ${resultado.detalhe}`);
  await repo.atualizarStatus(ticket.id, "classificacao_manual");
}
