import { describe, expect, it } from "vitest";
import { classificacaoSchema } from "./ai.schema";

const valida = {
  categoria: "financeiro",
  prioridade: "alta",
  assunto: "Cobrança duplicada no cartão",
  respostaSugerida: "Olá! Vamos verificar a cobrança.",
};

describe("classificacaoSchema", () => {
  it("aceita uma resposta válida", () => {
    expect(classificacaoSchema.safeParse(valida).success).toBe(true);
  });

  it("rejeita categoria inventada", () => {
    expect(classificacaoSchema.safeParse({ ...valida, categoria: "rh" }).success).toBe(false);
  });

  it("rejeita prioridade fora da lista (inclusive com acento ou maiúscula)", () => {
    expect(classificacaoSchema.safeParse({ ...valida, prioridade: "Média" }).success).toBe(false);
    expect(classificacaoSchema.safeParse({ ...valida, prioridade: "ALTA" }).success).toBe(false);
  });

  it("rejeita campo obrigatório ausente", () => {
    const { respostaSugerida, ...semResposta } = valida;
    expect(classificacaoSchema.safeParse(semResposta).success).toBe(false);
  });

  it("rejeita tipos errados e textos fora do limite", () => {
    expect(classificacaoSchema.safeParse({ ...valida, assunto: 123 }).success).toBe(false);
    expect(classificacaoSchema.safeParse({ ...valida, assunto: "a".repeat(121) }).success).toBe(false);
    expect(classificacaoSchema.safeParse({ ...valida, respostaSugerida: "   " }).success).toBe(false);
  });

  it("descarta campos extras e limpa espaços", () => {
    const r = classificacaoSchema.safeParse({ ...valida, assunto: "  Cobrança  ", extra: "x" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.assunto).toBe("Cobrança");
      expect("extra" in r.data).toBe(false);
    }
  });
});
