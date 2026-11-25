import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app";
import { InMemoryTicketRepository } from "./ticket.repository";

let app: ReturnType<typeof createApp>;

beforeEach(() => {
  app = createApp(new InMemoryTicketRepository());
});

describe("POST /tickets", () => {
  it("cria o ticket com status 'recebido' e sem classificação", async () => {
    const res = await request(app).post("/tickets").send({ mensagem: "  Fui cobrado duas vezes  " });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id: 1,
      mensagem: "Fui cobrado duas vezes",
      status: "recebido",
      categoria: null,
      prioridade: null,
    });
  });

  it("rejeita mensagem vazia", async () => {
    const res = await request(app).post("/tickets").send({ mensagem: "   " });
    expect(res.status).toBe(400);
    expect(res.body.erro).toBe("dados_invalidos");
  });

  it("rejeita corpo sem o campo mensagem", async () => {
    const res = await request(app).post("/tickets").send({});
    expect(res.status).toBe(400);
    expect(res.body.detalhes[0].campo).toBe("mensagem");
  });

  it("rejeita mensagem acima de 2000 caracteres", async () => {
    const res = await request(app).post("/tickets").send({ mensagem: "a".repeat(2001) });
    expect(res.status).toBe(400);
  });

  it("rejeita JSON quebrado", async () => {
    const res = await request(app)
      .post("/tickets")
      .set("Content-Type", "application/json")
      .send("{ mensagem: ");
    expect(res.status).toBe(400);
    expect(res.body.erro).toBe("json_invalido");
  });
});

describe("GET /tickets", () => {
  it("lista os tickets, do mais recente para o mais antigo", async () => {
    await request(app).post("/tickets").send({ mensagem: "primeira" });
    await request(app).post("/tickets").send({ mensagem: "segunda" });

    const res = await request(app).get("/tickets");
    expect(res.status).toBe(200);
    expect(res.body.map((t: { mensagem: string }) => t.mensagem)).toEqual(["segunda", "primeira"]);
  });

  it("busca um ticket por id e devolve 404 quando não existe", async () => {
    await request(app).post("/tickets").send({ mensagem: "teste" });

    expect((await request(app).get("/tickets/1")).status).toBe(200);
    expect((await request(app).get("/tickets/99")).status).toBe(404);
    expect((await request(app).get("/tickets/abc")).status).toBe(400);
  });
});

describe("rotas gerais", () => {
  it("responde no /health e 404 em rota desconhecida", async () => {
    expect((await request(app).get("/health")).body).toEqual({ status: "ok" });
    expect((await request(app).get("/nada")).status).toBe(404);
  });
});
