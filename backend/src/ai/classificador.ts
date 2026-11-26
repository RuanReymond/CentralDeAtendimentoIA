import type { AiProvider } from "./ai.provider";
import { classificacaoSchema, type Classificacao } from "./ai.schema";

export type MotivoFalha = "timeout" | "provedor_indisponivel" | "json_invalido" | "contrato_invalido";

export type ResultadoClassificacao =
  | { ok: true; classificacao: Classificacao }
  | { ok: false; motivo: MotivoFalha; detalhe: string };

class ErroTimeout extends Error {}

// Garante que a espera termina mesmo se o provedor ignorar o cancelamento.
function comTimeout<T>(promessa: Promise<T>, ms: number, aoEstourar: () => void): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const limite = new Promise<never>((_resolver, rejeitar) => {
    timer = setTimeout(() => {
      aoEstourar();
      rejeitar(new ErroTimeout(`sem resposta em ${ms} ms`));
    }, ms);
  });
  return Promise.race([promessa, limite]).finally(() => clearTimeout(timer));
}

// Pede a classificação à IA e confere se o que voltou é utilizável.
// Etapa 5: qualquer problema vira "falha" e o ticket vai para classificação manual.
// A etapa 6 melhora isso (limpeza do texto e nova tentativa) e a 7 trata a API fora do ar.
export async function classificarMensagem(
  provider: AiProvider,
  mensagem: string,
  timeoutMs: number,
): Promise<ResultadoClassificacao> {
  const controle = new AbortController();

  let bruto: string;
  try {
    bruto = await comTimeout(provider.classificar(mensagem, { signal: controle.signal }), timeoutMs, () => controle.abort());
  } catch (erro) {
    if (erro instanceof ErroTimeout) return { ok: false, motivo: "timeout", detalhe: erro.message };
    return { ok: false, motivo: "provedor_indisponivel", detalhe: erro instanceof Error ? erro.message : String(erro) };
  }

  let json: unknown;
  try {
    json = JSON.parse(bruto);
  } catch {
    return { ok: false, motivo: "json_invalido", detalhe: "a resposta da IA não é um JSON válido" };
  }

  const validacao = classificacaoSchema.safeParse(json);
  if (!validacao.success) {
    const detalhe = validacao.error.issues.map((p) => `${p.path.join(".") || "raiz"}: ${p.message}`).join("; ");
    return { ok: false, motivo: "contrato_invalido", detalhe };
  }
  return { ok: true, classificacao: validacao.data };
}
