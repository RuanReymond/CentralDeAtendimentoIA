import "dotenv/config";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CATEGORIAS } from "../tickets/ticket.types";
import { migrar } from "./migrar";
import { PgTicketRepository } from "./pg-ticket.repository";

const url = process.env.DATABASE_URL;

// Sem DATABASE_URL configurada, estes testes são pulados.
describe.skipIf(!url)("PgTicketRepository (PostgreSQL real)", () => {
  const schema = `teste_${randomUUID().replace(/-/g, "")}`;
  let admin: Pool;
  let pool: Pool;
  let repo: PgTicketRepository;

  beforeAll(async () => {
    // Cada execução cria um schema próprio e o apaga no final.
    admin = new Pool({ connectionString: url });
    await admin.query(`CREATE SCHEMA ${schema}`);
    pool = new Pool({ connectionString: url, options: `-c search_path=${schema}` });
    await migrar(pool);
    repo = new PgTicketRepository(pool);
  });

  afterAll(async () => {
    await pool?.end();
    await admin?.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await admin?.end();
  });

  it("aplica a migração uma única vez", async () => {
    expect(await migrar(pool)).toEqual([]);
  });

  it("os departamentos do banco batem com as categorias do código", async () => {
    const { rows } = await pool.query<{ codigo: string }>("SELECT codigo FROM departamentos");
    expect(rows.map((r) => r.codigo).sort()).toEqual([...CATEGORIAS].sort());
  });

  it("cria ticket 'recebido' sem classificação", async () => {
    const ticket = await repo.criar({ mensagem: "Fui cobrado duas vezes" });
    expect(ticket).toMatchObject({
      mensagem: "Fui cobrado duas vezes",
      status: "recebido",
      categoria: null,
      prioridade: null,
      assunto: null,
      respostaSugerida: null,
    });
    expect(new Date(ticket.criadoEm).toString()).not.toBe("Invalid Date");
  });

  it("lista do mais recente para o mais antigo e busca por id", async () => {
    const a = await repo.criar({ mensagem: "primeiro" });
    const b = await repo.criar({ mensagem: "segundo" });

    const lista = await repo.listar();
    expect(lista.findIndex((t) => t.id === b.id)).toBeLessThan(lista.findIndex((t) => t.id === a.id));
    expect((await repo.buscarPorId(a.id))?.mensagem).toBe("primeiro");
    expect(await repo.buscarPorId(999999)).toBeUndefined();
  });

  it("o banco recusa valores fora do contrato", async () => {
    await expect(pool.query("INSERT INTO tickets (mensagem, status) VALUES ('x', 'inventado')")).rejects.toThrow();
    await expect(pool.query("INSERT INTO tickets (mensagem, prioridade) VALUES ('x', 'critica')")).rejects.toThrow();
    await expect(pool.query("INSERT INTO tickets (mensagem, categoria) VALUES ('x', 'rh')")).rejects.toThrow();
    await expect(pool.query("INSERT INTO tickets (mensagem) VALUES ('')")).rejects.toThrow();
  });

  it("aplicarClassificacao grava os campos da IA e muda o status", async () => {
    const criado = await repo.criar({ mensagem: "Fui cobrado duas vezes" });
    const atualizado = await repo.aplicarClassificacao(criado.id, {
      categoria: "financeiro",
      prioridade: "urgente",
      assunto: "Cobrança duplicada",
      respostaSugerida: "Vamos verificar.",
    });
    expect(atualizado).toMatchObject({
      id: criado.id,
      categoria: "financeiro",
      prioridade: "urgente",
      assunto: "Cobrança duplicada",
      respostaSugerida: "Vamos verificar.",
      status: "aguardando_revisao",
    });
    expect((await repo.buscarPorId(criado.id))?.categoria).toBe("financeiro");
  });

  it("atualizarStatus muda só o status; ids inexistentes devolvem undefined", async () => {
    const criado = await repo.criar({ mensagem: "teste de status" });
    const atualizado = await repo.atualizarStatus(criado.id, "classificacao_manual");
    expect(atualizado).toMatchObject({ status: "classificacao_manual", categoria: null });

    expect(await repo.atualizarStatus(999999, "respondido")).toBeUndefined();
    expect(
      await repo.aplicarClassificacao(999999, { categoria: "outros", prioridade: "baixa", assunto: "abc", respostaSugerida: "x" }),
    ).toBeUndefined();
  });
});
