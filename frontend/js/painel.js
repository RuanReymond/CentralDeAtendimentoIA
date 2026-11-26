const el = (id) => document.getElementById(id);

const INTERVALO_MS = window.INTERVALO_PAINEL_MS || 5000; // de quanto em quanto tempo busca tickets novos
const INTERVALO_MAX_MS = 30000;                          // espera máxima quando o servidor está fora

let tickets = [];
let ultimaResposta = "";      // JSON da última resposta, para só redesenhar quando algo mudou
let carregouAlgumaVez = false;
let falhasSeguidas = 0;
let carregando = false;
let temporizador = null;
let filtroCategoria = "todas";
const abertos = new Set();

// ---------- utilitários ----------
function criar(tag, classe, texto) {
  const n = document.createElement(tag);
  if (classe) n.className = classe;
  if (texto !== undefined) n.textContent = texto;
  return n;
}

function formatarData(iso) {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function formatarHora(data) {
  return data.toLocaleTimeString("pt-BR");
}

function resumir(texto, limite = 60) {
  const t = texto.trim();
  return t.length > limite ? t.slice(0, limite - 3) + "..." : t;
}

function ponto(cor) {
  const p = criar("span", "ponto");
  if (cor) p.style.background = cor;
  else p.classList.add("pendente");
  return p;
}

// Ticket sem categoria (ou com categoria desconhecida) fica em "Sem categoria".
function chaveCategoria(t) { return CATEGORIAS[t.categoria] ? t.categoria : "sem_categoria"; }
function metaCategoria(chave) { return CATEGORIAS[chave] || SEM_CATEGORIA; }

function mostrarStatus(texto, erro) {
  const p = el("atualizacao");
  p.textContent = texto;
  p.classList.toggle("erro", erro);
}

function mostrarVazio(texto) {
  const v = el("vazio");
  v.hidden = false;
  v.textContent = texto;
}

// ---------- desenho da tela ----------
function renderDistribuicao(todos) {
  const chaves = [...Object.keys(CATEGORIAS), "sem_categoria"];
  const contagem = Object.fromEntries(chaves.map((c) => [c, 0]));
  todos.forEach((t) => { contagem[chaveCategoria(t)]++; });

  const urgentes = todos.filter((t) => t.prioridade === "urgente").length;
  const pendentes = contagem.sem_categoria;
  el("resumo").textContent = todos.length
    ? `${todos.length} ${todos.length === 1 ? "ticket" : "tickets"}, ${urgentes} ${urgentes === 1 ? "urgente" : "urgentes"}` +
      (pendentes ? `, ${pendentes} sem categoria` : "")
    : "Nenhum ticket ainda.";

  const barra = el("barra");
  barra.replaceChildren();
  chaves.forEach((chave) => {
    const qtd = contagem[chave];
    if (!qtd) return;
    const meta = metaCategoria(chave);
    const seg = criar("div", "segmento");
    seg.style.width = (qtd / todos.length * 100) + "%";
    if (meta.cor) seg.style.background = meta.cor;
    else seg.classList.add("pendente");
    seg.title = `${meta.nome}: ${qtd}`;
    barra.appendChild(seg);
  });

  const legenda = el("legenda");
  legenda.replaceChildren();
  const itens = [["todas", "Todas", "#17324D", todos.length],
    ...chaves.map((c) => [c, metaCategoria(c).nome, metaCategoria(c).cor, contagem[c]])];
  itens.forEach(([chave, nome, cor, qtd]) => {
    const b = criar("button");
    b.type = "button";
    b.setAttribute("aria-pressed", String(filtroCategoria === chave));
    b.append(ponto(cor), criar("span", "", nome), criar("span", "qtd", String(qtd)));
    b.addEventListener("click", () => { filtroCategoria = chave; render(); });
    legenda.appendChild(b);
  });
}

function renderTabela(filtrados) {
  const corpo = el("corpo");
  corpo.replaceChildren();

  filtrados.forEach((t) => {
    const cat = metaCategoria(chaveCategoria(t));
    const tr = criar("tr");
    tr.appendChild(criar("td", "num", formatarProtocolo(t.id)));

    // Enquanto a IA não gera o assunto, mostra o começo da mensagem do cliente.
    const tdAssunto = criar("td");
    const btn = criar("button", "linha-toggle", t.assunto || resumir(t.mensagem));
    btn.type = "button";
    btn.setAttribute("aria-expanded", String(abertos.has(t.id)));
    tdAssunto.appendChild(btn);
    tr.appendChild(tdAssunto);

    const tdCat = criar("td");
    const spanCat = criar("span", "cat");
    spanCat.append(ponto(cat.cor), criar("span", "", cat.nome));
    tdCat.appendChild(spanCat);
    tr.appendChild(tdCat);

    const tdPrio = criar("td");
    tdPrio.appendChild(criar("span", "prio " + (t.prioridade || "indefinida"), PRIORIDADES[t.prioridade] || "Pendente"));
    tr.appendChild(tdPrio);

    tr.appendChild(criar("td", "", STATUS[t.status] || t.status));
    tr.appendChild(criar("td", "num", formatarData(t.criadoEm)));

    const detalhe = criar("tr", "detalhe");
    detalhe.hidden = !abertos.has(t.id);
    const td = criar("td");
    td.colSpan = 6;
    const grade = criar("div", "detalhe-grade");
    const a = criar("div"); a.append(criar("h2", "", "Mensagem do cliente"), criar("p", "", t.mensagem));
    const b = criar("div"); b.append(criar("h2", "", "Resposta sugerida"), criar("p", "", t.respostaSugerida || "Ainda não disponível."));
    grade.append(a, b);
    td.appendChild(grade);
    detalhe.appendChild(td);

    btn.addEventListener("click", () => {
      const abrir = detalhe.hidden;
      detalhe.hidden = !abrir;
      btn.setAttribute("aria-expanded", String(abrir));
      if (abrir) abertos.add(t.id); else abertos.delete(t.id);
    });

    corpo.append(tr, detalhe);
  });

  if (filtrados.length) {
    el("vazio").hidden = true;
  } else {
    mostrarVazio(tickets.length
      ? "Nenhum ticket com esses filtros. Escolha outra categoria ou prioridade."
      : "Nenhum ticket ainda. Envie uma mensagem pelo chat ou carregue os exemplos.");
  }
}

function render() {
  const prio = el("filtro-prioridade").value;
  const filtrados = tickets.filter((t) =>
    (filtroCategoria === "todas" || chaveCategoria(t) === filtroCategoria) &&
    (prio === "todas" || t.prioridade === prio));
  renderDistribuicao(tickets);
  renderTabela(filtrados);
}

// ---------- atualização periódica (polling) ----------
// Cada ciclo agenda o próximo só quando termina, então requisições nunca se sobrepõem.
// Com o servidor fora do ar a espera dobra (5s, 10s, 20s, 30s...) e volta ao normal ao reconectar.
function proximoIntervalo() {
  return Math.min(INTERVALO_MS * 2 ** falhasSeguidas, INTERVALO_MAX_MS);
}

function agendar() {
  clearTimeout(temporizador);
  if (document.hidden) return; // aba em segundo plano: não consulta o servidor
  temporizador = setTimeout(atualizar, proximoIntervalo());
}

async function atualizar() {
  if (carregando) return;
  carregando = true;
  clearTimeout(temporizador);
  try {
    const dados = await lerTickets();
    carregouAlgumaVez = true;
    falhasSeguidas = 0;
    const json = JSON.stringify(dados);
    if (json !== ultimaResposta) { // só redesenha se algo mudou
      ultimaResposta = json;
      tickets = [...dados].sort((x, y) => new Date(y.criadoEm) - new Date(x.criadoEm));
      render();
    }
    mostrarStatus(`Atualizado às ${formatarHora(new Date())}. Verificando novidades a cada ${INTERVALO_MS / 1000}s.`, false);
  } catch (erro) {
    falhasSeguidas++;
    const espera = Math.round(proximoIntervalo() / 1000);
    if (carregouAlgumaVez) {
      mostrarStatus(`${erro.message} Mostrando os últimos dados recebidos. Nova tentativa em ${espera}s.`, true);
    } else {
      mostrarStatus(`${erro.message} Nova tentativa em ${espera}s.`, true);
      mostrarVazio("Não foi possível carregar os tickets. Confira se o backend está rodando.");
    }
  } finally {
    carregando = false;
    agendar();
  }
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) clearTimeout(temporizador);
  else atualizar(); // ao voltar para a aba, atualiza na hora
});

// ---------- eventos ----------
el("filtro-prioridade").addEventListener("change", render);

el("btn-exemplos").addEventListener("click", async () => {
  if (!confirm(`Isso cria ${EXEMPLOS.length} tickets de exemplo no banco de dados. Continuar?`)) return;
  const botao = el("btn-exemplos");
  botao.disabled = true;
  try {
    for (const mensagem of EXEMPLOS) await criarTicket(mensagem); // em sequência, para manter a ordem
  } catch (erro) {
    mostrarStatus(erro.message, true);
  } finally {
    botao.disabled = false;
    atualizar();
  }
});

mostrarVazio("Carregando tickets...");
atualizar();
