// Todas as chamadas ao backend ficam neste arquivo.
// Para apontar para outro servidor, defina window.API_URL antes de carregar este script.
const API_URL = window.API_URL || "http://localhost:3000";
const TEMPO_LIMITE_MS = 10000; // se o servidor não responder em 10s, desiste

class ErroApi extends Error {
  constructor(mensagem, { status = null, semConexao = false } = {}) {
    super(mensagem);
    this.status = status;
    this.semConexao = semConexao;
  }
}

function mensagemDeErro(dados, status) {
  if (dados && dados.detalhes && dados.detalhes[0] && dados.detalhes[0].mensagem) return dados.detalhes[0].mensagem;
  if (dados && dados.mensagem) return dados.mensagem;
  if (status === 503) return "Serviço temporariamente indisponível.";
  return `Erro inesperado no servidor (código ${status}).`;
}

async function requisicao(caminho, opcoes = {}) {
  const controle = new AbortController();
  const timer = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);
  let resposta;
  try {
    resposta = await fetch(`${API_URL}${caminho}`, { ...opcoes, signal: controle.signal });
  } catch (erro) {
    const demorou = erro.name === "AbortError";
    throw new ErroApi(
      demorou ? "O servidor demorou demais para responder." : "Não foi possível conectar ao servidor.",
      { semConexao: true }
    );
  } finally {
    clearTimeout(timer);
  }
  const dados = await resposta.json().catch(() => null);
  if (!resposta.ok) throw new ErroApi(mensagemDeErro(dados, resposta.status), { status: resposta.status });
  return dados;
}

function lerTickets() {
  return requisicao("/tickets");
}

function criarTicket(mensagem) {
  return requisicao("/tickets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mensagem })
  });
}
