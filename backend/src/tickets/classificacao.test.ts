import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MockProvider } from "../ai/mock.provider";
import { createApp } from "../app";
import { InMemoryTicketRepository } from "./ticket.repository";
import type { Ticket } from "./ticket.types";

let app: ReturnType<typeof createApp>;

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  app = createApp(new InMemoryTicketRepository(), {
    provider: new MockProvider({ latenciaMs: 40 }),
    timeoutMs: 150,
  });
});

afterEach(() => vi.restoreAllMocks());

// A classificação roda em segundo plano: espera o ticket sair do status "recebido".
async function aguardarClassificacao(id: number): Promise<Ticket> {
  for (let i = 0; i < 40; i++) {
    const { body } = await request(app).get(`/tickets/${id}`);
    if (body.status !== "recebido") return body;
    await new Promise((r) => setTimeout(r, 25));
  }
  throw new Error("o ticket não saiu do status 'recebido'");
}

describe("classificação automática dos tickets", () => {
  it("responde na hora com 'recebido' e depois o ticket é classificado", async () => {
    const res = await request(app).post("/tickets").send({ mensagem: "Fui cobrado duas vezes no cartão" });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ status: "recebido", categoria: null });

    const ticket = await aguardarClassificacao(res.body.id);
    expect(ticket).toMatchObject({
      status: "aguardando_revisao",
      categoria: "financeiro",
      prioridade: "urgente",
    });
    expect(ticket.respostaSugerida).toBeTruthy();
    expect(ticket.assunto).toBe("Fui cobrado duas vezes no cartão");
  });

  it.each([
    "json_quebrado",
    "campo_faltando",
    "categoria_inventada",
    "prioridade_invalida",
    "resposta_vazia",
    "markdown",
    "timeout",
    "indisponivel",
  ])("falha '%s': o ticket não se perde e vai para classificação manual", async (modo) => {
    const mensagem = `Meu pedido atrasou [falha:${modo}]`;
    const res = await request(app).post("/tickets").send({ mensagem });
    expect(res.status).toBe(201);

    const ticket = await aguardarClassificacao(res.body.id);
    expect(ticket).toMatchObject({
      status: "classificacao_manual",
      categoria: null,
      prioridade: null,
      mensagem,
    });
  });

  it("uma falha não afeta os outros tickets", async () => {
    const ruim = await request(app).post("/tickets").send({ mensagem: "teste [falha:json_quebrado]" });
    const bom = await request(app).post("/tickets").send({ mensagem: "Preciso da segunda via do boleto" });

    expect((await aguardarClassificacao(ruim.body.id)).status).toBe("classificacao_manual");
    expect(await aguardarClassificacao(bom.body.id)).toMatchObject({
      status: "aguardando_revisao",
      categoria: "financeiro",
    });
  });
});
