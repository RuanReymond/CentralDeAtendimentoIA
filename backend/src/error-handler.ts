import type { ErrorRequestHandler, RequestHandler } from "express";

export const rotaNaoEncontrada: RequestHandler = (_req, res) => {
  res.status(404).json({ erro: "rota_nao_encontrada" });
};

export const tratarErros: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err?.type === "entity.parse.failed") {
    res.status(400).json({ erro: "json_invalido", mensagem: "O corpo da requisição não é um JSON válido." });
    return;
  }
  if (err?.type === "entity.too.large") {
    res.status(413).json({ erro: "corpo_muito_grande" });
    return;
  }
  console.error("Erro inesperado:", err);
  res.status(500).json({ erro: "erro_interno" });
};
