import { describe, expect, it } from "vitest";
import type { AiProvider } from "./ai.provider";
import { classificarMensagem } from "./classificador";
import { MockProvider, type ModoMock } from "./mock.provider";

const MENSAGEM = "Fui cobrado duas vezes no cartão, preciso do estorno";
const com = (modo: ModoMock) => new MockProvider({ modo, latenciaMs: 0 });

describe("classificarMensagem", () => {
  it("resposta correta vira uma classificação validada", async () => {
    const r = await classificarMensagem(com("normal"), MENSAGEM, 1000);
    expect(r).toMatchObject({ ok: true, classificacao: { categoria: "financeiro", prioridade: "urgente" } });
  });

  it.each(["json_quebrado", "resposta_vazia", "markdown", "texto_extra"] as const)(
    "%s é recusado como json_invalido",
    async (modo) => {
      const r = await classificarMensagem(com(modo), MENSAGEM, 1000);
      expect(r).toMatchObject({ ok: false, motivo: "json_invalido" });
    },
  );

  it.each([
    ["campo_faltando", "respostaSugerida"],
    ["categoria_inventada", "categoria"],
    ["prioridade_invalida", "prioridade"],
  ] as const)("%s é recusado como contrato_invalido e o detalhe cita o campo", async (modo, campo) => {
    const r = await classificarMensagem(com(modo), MENSAGEM, 1000);
    expect(r).toMatchObject({ ok: false, motivo: "contrato_invalido" });
    if (!r.ok) expect(r.detalhe).toContain(campo);
  });

  it("IA que não responde vira timeout", async () => {
    const inicio = Date.now();
    const r = await classificarMensagem(com("timeout"), MENSAGEM, 80);
    expect(r).toMatchObject({ ok: false, motivo: "timeout" });
    expect(Date.now() - inicio).toBeLessThan(1000);
  });

  it("estoura o tempo mesmo se o provedor ignorar o cancelamento", async () => {
    const travado: AiProvider = { nome: "travado", classificar: () => new Promise<string>(() => {}) };
    const r = await classificarMensagem(travado, MENSAGEM, 80);
    expect(r).toMatchObject({ ok: false, motivo: "timeout" });
  });

  it("API fora do ar vira provedor_indisponivel", async () => {
    const r = await classificarMensagem(com("indisponivel"), MENSAGEM, 1000);
    expect(r).toMatchObject({ ok: false, motivo: "provedor_indisponivel" });
  });
});
