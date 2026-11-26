const lista = document.getElementById("mensagens");
const form = document.getElementById("form-chat");
const campo = document.getElementById("texto");
const botao = form.querySelector("button");

function adicionarBalao(texto, tipo) {
  const li = document.createElement("li");
  li.className = "balao " + tipo;
  li.textContent = texto;
  lista.appendChild(li);
  lista.scrollTop = lista.scrollHeight;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const texto = campo.value.trim();
  if (!texto) return;

  adicionarBalao(texto, "cliente");
  campo.value = "";
  campo.disabled = true;
  botao.disabled = true;

  try {
    const ticket = await criarTicket(texto);
    adicionarBalao(
      `Recebemos sua mensagem. Protocolo ${formatarProtocolo(ticket.id)}. Um atendente responde em breve.`,
      "sistema"
    );
  } catch (erro) {
    adicionarBalao(`Sua mensagem não foi enviada. ${erro.message} Tente novamente.`, "sistema");
    campo.value = texto; // devolve o texto para o cliente não precisar digitar de novo
  } finally {
    campo.disabled = false;
    botao.disabled = false;
    campo.focus();
  }
});

// Enter envia; Shift+Enter quebra a linha
campo.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    form.requestSubmit();
  }
});