const el = (id) => document.getElementById(id);
let filtroCategoria = "todas";
const abertos = new Set();

function criar(tag, classe, texto) {
  const n = document.createElement(tag);
  if (classe) n.className = classe;
  if (texto !== undefined) n.textContent = texto;
  return n;
}

function formatarData(iso) {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function ponto(cor) {
  const p = criar("span", "ponto");
  p.style.background = cor;
  return p;
}

function renderDistribuicao(todos) {
  const contagem = {};
  Object.keys(CATEGORIAS).forEach(c => contagem[c] = 0);
  todos.forEach(t => { if (contagem[t.categoria] !== undefined) contagem[t.categoria]++; });

  const urgentes = todos.filter(t => t.prioridade === "urgente").length;
  el("resumo").textContent = todos.length
    ? `${todos.length} ${todos.length === 1 ? "ticket" : "tickets"}, ${urgentes} ${urgentes === 1 ? "urgente" : "urgentes"}`
    : "Nenhum ticket ainda.";

  const barra = el("barra");
  barra.replaceChildren();
  Object.entries(contagem).forEach(([cat, qtd]) => {
    if (!qtd) return;
    const seg = criar("div", "segmento");
    seg.style.width = (qtd / todos.length * 100) + "%";
    seg.style.background = CATEGORIAS[cat].cor;
    seg.title = `${CATEGORIAS[cat].nome}: ${qtd}`;
    barra.appendChild(seg);
  });

  const legenda = el("legenda");
  legenda.replaceChildren();
  const itens = [["todas", "Todas", "#17324D", todos.length],
    ...Object.entries(CATEGORIAS).map(([c, d]) => [c, d.nome, d.cor, contagem[c]])];
  itens.forEach(([chave, nome, cor, qtd]) => {
    const b = criar("button");
    b.type = "button";
    b.setAttribute("aria-pressed", String(filtroCategoria === chave));
    b.append(ponto(cor), criar("span", "", nome), criar("span", "qtd", String(qtd)));
    b.addEventListener("click", () => { filtroCategoria = chave; render(); });
    legenda.appendChild(b);
  });
}

function renderTabela(filtrados, totalGeral) {
  const corpo = el("corpo");
  corpo.replaceChildren();

  filtrados.forEach(t => {
    const cat = CATEGORIAS[t.categoria] || CATEGORIAS.outros;
    const tr = criar("tr");
    tr.appendChild(criar("td", "num", formatarProtocolo(t.id)));

    const tdAssunto = criar("td");
    const btn = criar("button", "linha-toggle", t.assunto);
    btn.type = "button";
    btn.setAttribute("aria-expanded", String(abertos.has(t.id)));
    tdAssunto.appendChild(btn);
    tr.appendChild(tdAssunto);

    const tdCat = criar("td");
    const spanCat = criar("span", "cat");
    spanCat.append(ponto(cat.cor), criar("span", "", cat.nome));
    tdCat.appendChild(spanCat);
    tr.appendChild(tdCat);

    tr.appendChild(Object.assign(criar("td"), {})).appendChild(criar("span", "prio " + t.prioridade, PRIORIDADES[t.prioridade] || t.prioridade));
    tr.appendChild(criar("td", "", STATUS[t.status] || t.status));
    tr.appendChild(criar("td", "num", formatarData(t.criadoEm)));

    const detalhe = criar("tr", "detalhe");
    detalhe.hidden = !abertos.has(t.id);
    const td = criar("td");
    td.colSpan = 6;
    const grade = criar("div", "detalhe-grade");
    const a = criar("div"); a.append(criar("h2", "", "Mensagem do cliente"), criar("p", "", t.mensagem));
    const b = criar("div"); b.append(criar("h2", "", "Resposta sugerida"), criar("p", "", t.respostaSugerida));
    grade.append(a, b);
    td.appendChild(grade);
    detalhe.appendChild(td);

    btn.addEventListener("click", () => {
      const abrir = detalhe.hidden;
      detalhe.hidden = !abrir;
      btn.setAttribute("aria-expanded", String(abrir));
      abrir ? abertos.add(t.id) : abertos.delete(t.id);
    });

    corpo.append(tr, detalhe);
  });

  const vazio = el("vazio");
  vazio.hidden = filtrados.length > 0;
  if (!filtrados.length) {
    vazio.textContent = totalGeral
      ? "Nenhum ticket com esses filtros. Escolha outra categoria ou prioridade."
      : "Nenhum ticket ainda. Envie uma mensagem pelo chat ou carregue os exemplos.";
  }
}

function render() {
  const todos = lerTickets().sort((x, y) => new Date(y.criadoEm) - new Date(x.criadoEm));
  const prio = el("filtro-prioridade").value;
  const filtrados = todos.filter(t =>
    (filtroCategoria === "todas" || t.categoria === filtroCategoria) &&
    (prio === "todas" || t.prioridade === prio));
  renderDistribuicao(todos);
  renderTabela(filtrados, todos.length);
}

el("filtro-prioridade").addEventListener("change", render);

el("btn-exemplos").addEventListener("click", () => {
  const agora = Date.now();
  EXEMPLOS.forEach((msg, i) => criarTicket(msg, new Date(agora - i * 17 * 60000)));
  render();
});

el("btn-limpar").addEventListener("click", () => {
  if (confirm("Apagar todos os tickets salvos neste navegador?")) {
    limparTickets();
    abertos.clear();
    filtroCategoria = "todas";
    render();
  }
});

// Atualiza sozinho quando um ticket chega pelo chat em outra aba
window.addEventListener("storage", (e) => { if (e.key === CHAVE) render(); });

render();
