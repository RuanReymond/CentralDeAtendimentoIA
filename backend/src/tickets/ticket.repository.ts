import type { DadosClassificacao, NovoTicket, StatusTicket, Ticket } from "./ticket.types";

// Interface única de acesso aos dados: existe uma versão em memória (testes e uso sem banco)
// e uma versão PostgreSQL (src/db/pg-ticket.repository.ts).
export interface TicketRepository {
  criar(dados: NovoTicket): Promise<Ticket>;
  listar(): Promise<Ticket[]>;
  buscarPorId(id: number): Promise<Ticket | undefined>;
  // Grava o resultado da IA e muda o status para "aguardando_revisao".
  aplicarClassificacao(id: number, dados: DadosClassificacao): Promise<Ticket | undefined>;
  atualizarStatus(id: number, status: StatusTicket): Promise<Ticket | undefined>;
}

// Versão em memória: os dados somem quando o servidor reinicia.
export class InMemoryTicketRepository implements TicketRepository {
  private tickets: Ticket[] = [];
  private proximoId = 1;

  async criar(dados: NovoTicket): Promise<Ticket> {
    const ticket: Ticket = {
      id: this.proximoId++,
      mensagem: dados.mensagem,
      categoria: null,
      prioridade: null,
      assunto: null,
      respostaSugerida: null,
      status: "recebido",
      criadoEm: new Date().toISOString(),
    };
    this.tickets.push(ticket);
    return { ...ticket };
  }

  async listar(): Promise<Ticket[]> {
    return [...this.tickets].reverse().map((ticket) => ({ ...ticket })); // mais recentes primeiro
  }

  async buscarPorId(id: number): Promise<Ticket | undefined> {
    const ticket = this.tickets.find((t) => t.id === id);
    return ticket ? { ...ticket } : undefined;
  }

  async aplicarClassificacao(id: number, dados: DadosClassificacao): Promise<Ticket | undefined> {
    return this.alterar(id, { ...dados, status: "aguardando_revisao" });
  }

  async atualizarStatus(id: number, status: StatusTicket): Promise<Ticket | undefined> {
    return this.alterar(id, { status });
  }

  private alterar(id: number, mudancas: Partial<Ticket>): Ticket | undefined {
    const posicao = this.tickets.findIndex((t) => t.id === id);
    if (posicao === -1) return undefined;
    this.tickets[posicao] = { ...this.tickets[posicao], ...mudancas };
    return { ...this.tickets[posicao] };
  }
}
