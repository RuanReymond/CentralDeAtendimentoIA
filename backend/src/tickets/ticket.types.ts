export const STATUS_TICKET = [
  "recebido",
  "aguardando_ia",
  "aguardando_revisao",
  "classificacao_manual",
  "respondido",
] as const;

export type StatusTicket = (typeof STATUS_TICKET)[number];

// Categoria, prioridade, assunto e resposta sugerida ficam nulos até a IA entrar (etapas 5 e 6).
export interface Ticket {
  id: number;
  mensagem: string;
  categoria: string | null;
  prioridade: string | null;
  assunto: string | null;
  respostaSugerida: string | null;
  status: StatusTicket;
  criadoEm: string; // ISO 8601
}

export interface NovoTicket {
  mensagem: string;
}
