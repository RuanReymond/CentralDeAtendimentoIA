// Listas oficiais usadas em todo o projeto: contrato da IA (Zod), tipos e testes.
// Se mudar uma delas, ajuste também o banco (tabela departamentos / CHECKs) com uma nova migração.
export const CATEGORIAS = ["financeiro", "suporte_tecnico", "comercial", "entrega", "outros"] as const;
export const PRIORIDADES = ["urgente", "alta", "media", "baixa"] as const;
export const STATUS_TICKET = [
  "recebido",
  "aguardando_ia",
  "aguardando_revisao",
  "classificacao_manual",
  "respondido",
] as const;

export type Categoria = (typeof CATEGORIAS)[number];
export type Prioridade = (typeof PRIORIDADES)[number];
export type StatusTicket = (typeof STATUS_TICKET)[number];

// Categoria, prioridade, assunto e resposta sugerida ficam nulos até a IA entrar (etapas 5 e 6).
export interface Ticket {
  id: number;
  mensagem: string;
  categoria: Categoria | null;
  prioridade: Prioridade | null;
  assunto: string | null;
  respostaSugerida: string | null;
  status: StatusTicket;
  criadoEm: string; // ISO 8601
}

export interface NovoTicket {
  mensagem: string;
}
