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

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const texto = campo.value.trim();
  if (!texto) return;

  adicionarBalao(texto, "cliente");
  campo.value = "";
  campo.disabled = true;

  try {
    const ticket = await criarTicket(texto);
    adicionarBalao(
      `Recebemos sua mensagem. Protocolo ${formatarProtocolo(ticket.id)}. Um atendente responde em breve.`,
      "sistema"
    );
  } catch (erro) {
    adicionarBalao(`Não foi possível enviar sua mensagem: ${erro.message}`, "sistema");
  } finally {
    campo.disabled = false;
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
