// ===== Contrato de dados (o mesmo JSON que a IA vai devolver no futuro) =====
const CHAVE = "atendimento_tickets";

const CATEGORIAS = {
  financeiro:      { nome: "Financeiro",      cor: "#1F6FEB", depto: "Financeiro" },
  suporte_tecnico: { nome: "Suporte técnico", cor: "#7A3FD1", depto: "Suporte Técnico" },
  comercial:       { nome: "Comercial",       cor: "#0E8F6B", depto: "Comercial" },
  entrega:         { nome: "Entrega",         cor: "#C2620A", depto: "Logística" },
  outros:          { nome: "Outros",          cor: "#6B7785", depto: "Triagem geral" }
};

const PRIORIDADES = { urgente: "Urgente", alta: "Alta", media: "Média", baixa: "Baixa" };

const STATUS = {
  aguardando_revisao: "Aguardando revisão",
  respondido: "Respondido",
  classificacao_manual: "Classificação manual",
  aguardando_ia: "Aguardando IA"
};

// ===== Armazenamento (temporário: localStorage no lugar do banco) =====
function lerTickets() {
  try { return JSON.parse(localStorage.getItem(CHAVE)) || []; }
  catch { return []; }
}
function salvarTickets(lista) { localStorage.setItem(CHAVE, JSON.stringify(lista)); }
function limparTickets() { localStorage.removeItem(CHAVE); }
function formatarProtocolo(id) { return "#" + String(id).padStart(4, "0"); }

// ===== IA simulada (por palavras-chave). Será trocada pela chamada ao backend =====
const PALAVRAS = {
  financeiro:      ["cobranca", "fatura", "boleto", "pagamento", "reembolso", "estorno", "cartao", "nota fiscal"],
  suporte_tecnico: ["erro", "nao consigo", "senha", "login", "travou", "bug", "aplicativo", "acessar", "fora do ar", "nao funciona", "cadastro"],
  comercial:       ["plano", "orcamento", "preco", "contratar", "desconto", "proposta", "upgrade"],
  entrega:         ["entrega", "pedido", "rastreio", "atrasou", "encomenda", "frete", "correios"]
};
const PALAVRAS_PRIORIDADE = {
  urgente: ["urgente", "imediato", "fora do ar", "bloqueado", "cobrado duas"],
  alta:    ["nao consigo", "nao funciona", "erro", "atrasou", "estorno", "reclamacao"],
  baixa:   ["duvida", "gostaria de saber", "informacao", "como faco"]
};
const RESPOSTAS = {
  financeiro:      "Olá! Recebemos sua solicitação financeira e já estamos verificando as cobranças da sua conta. Retornamos em até 1 dia útil com a solução.",
  suporte_tecnico: "Olá! Sentimos pelo problema. Nossa equipe técnica já está analisando o caso. Enquanto isso, pode nos informar o horário em que o erro ocorreu?",
  comercial:       "Olá! Obrigado pelo interesse. Vamos preparar as informações e condições e enviar para você ainda hoje.",
  entrega:         "Olá! Estamos consultando o status do seu pedido com a transportadora e retornamos em breve com uma previsão.",
  outros:          "Olá! Recebemos sua mensagem e um atendente vai analisá-la para direcioná-la corretamente."
};

function normalizar(texto) {
  return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function contem(texto, lista) { return lista.filter(p => texto.includes(p)).length; }

function classificar(mensagem) {
  const t = normalizar(mensagem);
  let categoria = "outros", melhor = 0;
  for (const [cat, palavras] of Object.entries(PALAVRAS)) {
    const pontos = contem(t, palavras);
    if (pontos > melhor) { melhor = pontos; categoria = cat; }
  }
  let prioridade = "media";
  for (const nivel of ["urgente", "alta", "baixa"]) {
    if (contem(t, PALAVRAS_PRIORIDADE[nivel]) > 0) { prioridade = nivel; break; }
  }
  const assunto = mensagem.trim().length > 60 ? mensagem.trim().slice(0, 57) + "..." : mensagem.trim();
  return { categoria, prioridade, assunto, respostaSugerida: RESPOSTAS[categoria] };
}

function criarTicket(mensagem, quando = new Date()) {
  const lista = lerTickets();
  const id = lista.length ? Math.max(...lista.map(t => t.id)) + 1 : 1;
  const ticket = {
    id,
    mensagem: mensagem.trim(),
    ...classificar(mensagem),
    status: "aguardando_revisao",
    criadoEm: quando.toISOString()
  };
  lista.push(ticket);
  salvarTickets(lista);
  return ticket;
}

const EXEMPLOS = [
  "Fui cobrado duas vezes no cartão este mês, preciso do estorno.",
  "Não consigo acessar minha conta, aparece erro de senha inválida.",
  "Gostaria de saber o preço do plano empresarial e se há desconto anual.",
  "Meu pedido atrasou e o rastreio não atualiza há 5 dias.",
  "Dúvida: como faço para trocar o e-mail do cadastro?",
  "O aplicativo travou ao abrir o relatório e não funciona mais.",
  "Preciso da segunda via do boleto de outubro.",
  "Quero contratar o plano com mais usuários, podem enviar uma proposta?",
  "A encomenda chegou com a caixa danificada.",
  "Vocês têm vaga de estágio?",
  "O sistema está fora do ar e nossa equipe inteira está bloqueada!"
];
