import { describe, expect, it } from "vitest";
import { ErroProvedor } from "./ai.provider";
import { classificacaoSchema } from "./ai.schema";
import { classificarPorPalavras, MockProvider, MODOS_MOCK } from "./mock.provider";

const mock = (modo: (typeof MODOS_MOCK)[number] = "normal") => new MockProvider({ modo, latenciaMs: 0 });
const MENSAGEM = "Fui cobrado duas vezes no cartão, preciso do estorno";

describe("classificarPorPalavras", () => {
  it("classifica por palavras-chave", () => {
    expect(classificarPorPalavras(MENSAGEM)).toMatchObject({ categoria: "financeiro", prioridade: "urgente" });
    expect(classificarPorPalavras("Meu pedido atrasou")).toMatchObject({ categoria: "entrega", prioridade: "alta" });
    expect(classificarPorPalavras("Dúvida sobre o plano")).toMatchObject({ categoria: "comercial", prioridade: "baixa" });
    expect(classificarPorPalavras("Vocês têm vaga de estágio?")).toMatchObject({ categoria: "outros", prioridade: "media" });
  });

  it("sempre gera um assunto que respeita o contrato", () => {
    expect(classificacaoSchema.safeParse(classificarPorPalavras("oi")).success).toBe(true);
    expect(classificacaoSchema.safeParse(classificarPorPalavras("a".repeat(500))).success).toBe(true);
  });
});

describe("MockProvider", () => {
  it("modo normal devolve um JSON que passa no contrato", async () => {
    const bruto = await mock().classificar(MENSAGEM);
    expect(classificacaoSchema.safeParse(JSON.parse(bruto)).success).toBe(true);
  });

  it("json_quebrado devolve um texto que não é JSON", async () => {
    const bruto = await mock("json_quebrado").classificar(MENSAGEM);
    expect(() => JSON.parse(bruto)).toThrow();
  });

  it.each(["campo_faltando", "categoria_inventada", "prioridade_invalida"] as const)(
    "%s devolve JSON válido que quebra o contrato",
    async (modo) => {
      const json = JSON.parse(await mock(modo).classificar(MENSAGEM));
      expect(classificacaoSchema.safeParse(json).success).toBe(false);
    },
  );

  it("resposta_vazia, markdown e texto_extra não são JSON puro", async () => {
    for (const modo of ["resposta_vazia", "markdown", "texto_extra"] as const) {
      const bruto = await mock(modo).classificar(MENSAGEM);
      expect(() => JSON.parse(bruto)).toThrow();
    }
  });

  it("indisponivel lança ErroProvedor 503", async () => {
    await expect(mock("indisponivel").classificar(MENSAGEM)).rejects.toMatchObject({
      name: "ErroProvedor",
      status: 503,
    });
    await expect(mock("indisponivel").classificar(MENSAGEM)).rejects.toBeInstanceOf(ErroProvedor);
  });

  it("timeout só termina quando a chamada é cancelada", async () => {
    const controle = new AbortController();
    const chamada = mock("timeout").classificar(MENSAGEM, { signal: controle.signal });
    setTimeout(() => controle.abort(), 30);
    await expect(chamada).rejects.toThrow("cancelada");
  });

  it("[falha:modo] na mensagem força o modo só naquela chamada e some do assunto", async () => {
    const provider = mock("normal");
    const quebrado = await provider.classificar(`${MENSAGEM} [falha:json_quebrado]`);
    expect(() => JSON.parse(quebrado)).toThrow();

    const normal = JSON.parse(await provider.classificar(`${MENSAGEM} [falha:campo_inexistente]`));
    expect(normal.assunto).toBe(MENSAGEM);
  });

  it("modo instavel: na maior parte responde bem, às vezes sorteia uma falha", async () => {
    const sorteios = [0.9, 0.1, 0]; // 1ª chamada: normal. 2ª: falha, e o 0 escolhe a primeira falha (json_quebrado)
    const provider = new MockProvider({ modo: "instavel", latenciaMs: 0, aleatorio: () => sorteios.shift() ?? 0.9 });

    expect(JSON.parse(await provider.classificar(MENSAGEM)).categoria).toBe("financeiro");
    const quebrado = await provider.classificar(MENSAGEM);
    expect(() => JSON.parse(quebrado)).toThrow();
  });
});
