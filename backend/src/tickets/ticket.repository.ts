import type { NovoTicket, Ticket } from "./ticket.types";

// Interface única de acesso aos dados. Na etapa 3 entra uma versão com PostgreSQL
// e o resto do código não precisa mudar.
export interface TicketRepository {
  criar(dados: NovoTicket): Promise<Ticket>;
  listar(): Promise<Ticket[]>;
  buscarPorId(id: number): Promise<Ticket | undefined>;
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
    return ticket;
  }

  async listar(): Promise<Ticket[]> {
    return [...this.tickets].reverse(); // mais recentes primeiro
  }

  async buscarPorId(id: number): Promise<Ticket | undefined> {
    return this.tickets.find((ticket) => ticket.id === id);
  }
}
