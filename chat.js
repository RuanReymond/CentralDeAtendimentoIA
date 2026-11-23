const lista = document.getElementById("mensagens");
const form = document.getElementById("form-chat");
const campo = document.getElementById("texto");

function adicionarBalao(texto, tipo) {
  const li = document.createElement("li");
  li.className = "balao " + tipo;
  li.textContent = texto;
  lista.appendChild(li);
  lista.scrollTop = lista.scrollHeight;
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const texto = campo.value.trim();
  if (!texto) return;

  adicionarBalao(texto, "cliente");
  campo.value = "";

  const ticket = criarTicket(texto);
  const depto = CATEGORIAS[ticket.categoria].depto;
  setTimeout(() => {
    adicionarBalao(
      `Recebemos sua mensagem. Protocolo ${formatarProtocolo(ticket.id)}, encaminhada ao setor ${depto}. Um atendente responde em breve.`,
      "sistema"
    );
  }, 500);
});

// Enter envia; Shift+Enter quebra a linha
campo.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    form.requestSubmit();
  }
});
