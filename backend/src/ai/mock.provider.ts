import type { Categoria, DadosClassificacao, Prioridade } from "../tickets/ticket.types";
import { ErroProvedor, type AiProvider, type OpcoesChamada } from "./ai.provider";

// Comportamentos que o provedor simulado sabe imitar.
export const MODOS_MOCK = [
  "normal",
  "json_quebrado",
  "campo_faltando",
  "categoria_inventada",
  "prioridade_invalida",
  "resposta_vazia",
  "markdown",
  "texto_extra",
  "timeout",
  "indisponivel",
  "instavel",
] as const;
export type ModoMock = (typeof MODOS_MOCK)[number];

export function ehModoMock(valor: string): valor is ModoMock {
  return (MODOS_MOCK as readonly string[]).includes(valor);
}

// ---------- classificação por palavras-chave (a "inteligência" da IA simulada) ----------
const PALAVRAS: Record<Exclude<Categoria, "outros">, string[]> = {
  financeiro: ["cobranca", "cobrado", "fatura", "boleto", "pagamento", "reembolso", "estorno", "cartao", "nota fiscal"],
  suporte_tecnico: ["erro", "nao consigo", "senha", "login", "travou", "bug", "aplicativo", "acessar", "fora do ar", "nao funciona", "cadastro"],
  comercial: ["plano", "orcamento", "preco", "contratar", "desconto", "proposta", "upgrade"],
  entrega: ["entrega", "pedido", "rastreio", "atrasou", "encomenda", "frete", "correios"],
};

const PALAVRAS_PRIORIDADE: Record<Exclude<Prioridade, "media">, string[]> = {
  urgente: ["urgente", "imediato", "fora do ar", "bloqueado", "cobrado duas"],
  alta: ["nao consigo", "nao funciona", "erro", "atrasou", "estorno", "reclamacao"],
  baixa: ["duvida", "gostaria de saber", "informacao", "como faco"],
};

const RESPOSTAS: Record<Categoria, string> = {
  financeiro: "Olá! Recebemos sua solicitação financeira e já estamos verificando as cobranças da sua conta. Retornamos em até 1 dia útil com a solução.",
  suporte_tecnico: "Olá! Sentimos pelo problema. Nossa equipe técnica já está analisando o caso. Enquanto isso, pode nos informar o horário em que o erro ocorreu?",
  comercial: "Olá! Obrigado pelo interesse. Vamos preparar as informações e condições e enviar para você ainda hoje.",
  entrega: "Olá! Estamos consultando o status do seu pedido com a transportadora e retornamos em breve com uma previsão.",
  outros: "Olá! Recebemos sua mensagem e um atendente vai analisá-la para direcioná-la corretamente.",
};

function normalizar(texto: string): string {
  return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function contar(texto: string, palavras: string[]): number {
  return palavras.filter((palavra) => texto.includes(palavra)).length;
}

export function classificarPorPalavras(mensagem: string): DadosClassificacao {
  const texto = normalizar(mensagem);

  let categoria: Categoria = "outros";
  let melhor = 0;
  for (const [candidata, palavras] of Object.entries(PALAVRAS) as [Categoria, string[]][]) {
    const pontos = contar(texto, palavras);
    if (pontos > melhor) {
      melhor = pontos;
      categoria = candidata;
    }
  }

  let prioridade: Prioridade = "media";
  for (const nivel of ["urgente", "alta", "baixa"] as const) {
    if (contar(texto, PALAVRAS_PRIORIDADE[nivel]) > 0) {
      prioridade = nivel;
      break;
    }
  }

  const limpa = mensagem.trim();
  const assunto = limpa.length < 3 ? "Mensagem curta" : limpa.length > 60 ? limpa.slice(0, 57) + "..." : limpa;
  return { categoria, prioridade, assunto, respostaSugerida: RESPOSTAS[categoria] };
}

// ---------- falhas sob demanda ----------
// Escrever [falha:nome_do_modo] em qualquer ponto da mensagem força aquele comportamento
// só nessa chamada. Útil para demonstrar cada falha pelo chat sem reiniciar o servidor.
const MARCADOR = /\[falha:([a-z_]+)\]/i;

function extrairModo(mensagem: string): { texto: string; modo?: ModoMock } {
  const achou = MARCADOR.exec(mensagem);
  if (!achou) return { texto: mensagem };
  const nome = achou[1].toLowerCase();
  return { texto: mensagem.replace(MARCADOR, "").trim(), modo: ehModoMock(nome) ? nome : undefined };
}

function esperar(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolver, rejeitar) => {
    if (signal?.aborted) return rejeitar(new Error("Chamada cancelada"));
    const aoCancelar = () => {
      clearTimeout(timer);
      rejeitar(new Error("Chamada cancelada"));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", aoCancelar);
      resolver();
    }, ms);
    signal?.addEventListener("abort", aoCancelar, { once: true });
  });
}

export interface OpcoesMock {
  modo?: ModoMock;
  latenciaMs?: number; // tempo que a "IA" demora para responder
  chanceFalha?: number; // no modo "instavel": probabilidade de falhar (0 a 1)
  aleatorio?: () => number; // injetável para os testes
}

export class MockProvider implements AiProvider {
  readonly nome = "mock";
  private readonly modo: ModoMock;
  private readonly latenciaMs: number;
  private readonly chanceFalha: number;
  private readonly aleatorio: () => number;

  constructor(opcoes: OpcoesMock = {}) {
    this.modo = opcoes.modo ?? "normal";
    this.latenciaMs = opcoes.latenciaMs ?? 300;
    this.chanceFalha = opcoes.chanceFalha ?? 0.3;
    this.aleatorio = opcoes.aleatorio ?? Math.random;
  }

  async classificar(mensagem: string, opcoes: OpcoesChamada = {}): Promise<string> {
    const { texto, modo: modoDaMensagem } = extrairModo(mensagem);
    let modo = modoDaMensagem ?? this.modo;
    if (modo === "instavel") modo = this.sortearModo();

    if (this.latenciaMs > 0) await esperar(this.latenciaMs, opcoes.signal);

    if (modo === "indisponivel") throw new ErroProvedor("Serviço de IA indisponível (503).", 503);
    if (modo === "timeout") return this.nuncaResponde(opcoes.signal);

    const dados = classificarPorPalavras(texto);
    const json = JSON.stringify(dados);
    switch (modo) {
      case "json_quebrado":
        return json.slice(0, Math.floor(json.length * 0.6));
      case "campo_faltando": {
        const { respostaSugerida: _omitido, ...semResposta } = dados;
        return JSON.stringify(semResposta);
      }
      case "categoria_inventada":
        return JSON.stringify({ ...dados, categoria: "rh" });
      case "prioridade_invalida":
        return JSON.stringify({ ...dados, prioridade: "Crítica" });
      case "resposta_vazia":
        return "";
      case "markdown":
        return "```json\n" + json + "\n```";
      case "texto_extra":
        return "Claro! Aqui está a classificação:\n" + json;
      default:
        return json;
    }
  }

  // No modo "instavel": na maior parte das vezes responde normal, às vezes sorteia uma falha.
  private sortearModo(): ModoMock {
    if (this.aleatorio() >= this.chanceFalha) return "normal";
    const falhas = MODOS_MOCK.filter((m) => m !== "normal" && m !== "instavel");
    return falhas[Math.floor(this.aleatorio() * falhas.length)];
  }

  // Imita uma IA travada: só termina quando a chamada é cancelada.
  private nuncaResponde(signal?: AbortSignal): Promise<string> {
    return new Promise((_resolver, rejeitar) => {
      if (signal?.aborted) return rejeitar(new Error("Chamada cancelada"));
      signal?.addEventListener("abort", () => rejeitar(new Error("Chamada cancelada")), { once: true });
      setTimeout(() => rejeitar(new Error("Sem resposta")), 60_000).unref();
    });
  }
}
