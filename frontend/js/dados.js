// Constantes compartilhadas pelo chat e pelo painel (o contrato de dados vive no backend).
const CATEGORIAS = {
  financeiro:      { nome: "Financeiro",      cor: "#1F6FEB", depto: "Financeiro" },
  suporte_tecnico: { nome: "Suporte técnico", cor: "#7A3FD1", depto: "Suporte Técnico" },
  comercial:       { nome: "Comercial",       cor: "#0E8F6B", depto: "Comercial" },
  entrega:         { nome: "Entrega",         cor: "#C2620A", depto: "Logística" },
  outros:          { nome: "Outros",          cor: "#6B7785", depto: "Triagem geral" }
};

// Ticket que a IA ainda não classificou (categoria nula no banco).
const SEM_CATEGORIA = { nome: "Aguardando classificação", cor: null };

const PRIORIDADES = { urgente: "Urgente", alta: "Alta", media: "Média", baixa: "Baixa" };

const STATUS = {
  recebido: "Recebido",
  aguardando_ia: "Aguardando IA",
  aguardando_revisao: "Aguardando revisão",
  classificacao_manual: "Classificação manual",
  respondido: "Respondido"
};

function formatarProtocolo(id) { return "#" + String(id).padStart(4, "0"); }

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