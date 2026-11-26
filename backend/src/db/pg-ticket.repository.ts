import type { Pool } from "pg";
import type { TicketRepository } from "../tickets/ticket.repository";
import type {
  Categoria,
  DadosClassificacao,
  NovoTicket,
  Prioridade,
  StatusTicket,
  Ticket,
} from "../tickets/ticket.types";

interface LinhaTicket {
  id: number;
  mensagem: string;
  categoria: Categoria | null;
  prioridade: Prioridade | null;
  assunto: string | null;
  resposta_sugerida: string | null;
  status: StatusTicket;
  criado_em: Date;
}

// Converte a linha do banco (snake_case) para o formato que a API devolve (camelCase).
function paraTicket(linha: LinhaTicket): Ticket {
  return {
    id: linha.id,
    mensagem: linha.mensagem,
    categoria: linha.categoria,
    prioridade: linha.prioridade,
    assunto: linha.assunto,
    respostaSugerida: linha.resposta_sugerida,
    status: linha.status,
    criadoEm: linha.criado_em.toISOString(),
  };
}

export class PgTicketRepository implements TicketRepository {
  constructor(private readonly pool: Pool) {}

  async criar(dados: NovoTicket): Promise<Ticket> {
    const { rows } = await this.pool.query<LinhaTicket>(
      "INSERT INTO tickets (mensagem) VALUES ($1) RETURNING *",
      [dados.mensagem],
    );
    return paraTicket(rows[0]);
  }

  async listar(): Promise<Ticket[]> {
    const { rows } = await this.pool.query<LinhaTicket>(
      "SELECT * FROM tickets ORDER BY criado_em DESC, id DESC",
    );
    return rows.map(paraTicket);
  }

  async buscarPorId(id: number): Promise<Ticket | undefined> {
    const { rows } = await this.pool.query<LinhaTicket>("SELECT * FROM tickets WHERE id = $1", [id]);
    return rows[0] ? paraTicket(rows[0]) : undefined;
  }

  async aplicarClassificacao(id: number, dados: DadosClassificacao): Promise<Ticket | undefined> {
    const { rows } = await this.pool.query<LinhaTicket>(
      `UPDATE tickets
          SET categoria = $2, prioridade = $3, assunto = $4, resposta_sugerida = $5,
              status = 'aguardando_revisao', atualizado_em = now()
        WHERE id = $1
        RETURNING *`,
      [id, dados.categoria, dados.prioridade, dados.assunto, dados.respostaSugerida],
    );
    return rows[0] ? paraTicket(rows[0]) : undefined;
  }

  async atualizarStatus(id: number, status: StatusTicket): Promise<Ticket | undefined> {
    const { rows } = await this.pool.query<LinhaTicket>(
      "UPDATE tickets SET status = $2, atualizado_em = now() WHERE id = $1 RETURNING *",
      [id, status],
    );
    return rows[0] ? paraTicket(rows[0]) : undefined;
  }
}
