import type { ErrorRequestHandler, RequestHandler } from "express";

export const rotaNaoEncontrada: RequestHandler = (_req, res) => {
  res.status(404).json({ erro: "rota_nao_encontrada" });
};

// Erros de conexão com o PostgreSQL (servidor fora do ar, timeout, conexão derrubada).
function bancoIndisponivel(err: { code?: string; message?: string }): boolean {
  const codigo = err.code ?? "";
  return (
    ["ECONNREFUSED", "ETIMEDOUT", "ECONNRESET", "ENOTFOUND"].includes(codigo) ||
    codigo.startsWith("08") || // classe 08: falha de conexão
    codigo.startsWith("57P") || // servidor desligando/reiniciando
    /timeout exceeded when trying to connect|Connection terminated/i.test(err.message ?? "")
  );
}

// Último middleware: nunca devolve detalhes internos para o cliente.
export const tratarErros: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err?.type === "entity.parse.failed") {
    res.status(400).json({ erro: "json_invalido", mensagem: "O corpo da requisição não é um JSON válido." });
    return;
  }
  if (err?.type === "entity.too.large") {
    res.status(413).json({ erro: "corpo_muito_grande" });
    return;
  }
  if (err && bancoIndisponivel(err)) {
    console.error("Banco de dados indisponível:", err.message ?? err.code);
    res.status(503).json({ erro: "banco_indisponivel", mensagem: "Serviço temporariamente indisponível. Tente novamente." });
    return;
  }
  console.error("Erro inesperado:", err);
  res.status(500).json({ erro: "erro_interno" });
};
