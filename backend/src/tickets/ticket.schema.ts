import { z } from "zod";

// Contrato de ENTRADA do POST /tickets. O contrato da resposta da IA virá na etapa 3.
export const criarTicketSchema = z.object({
  mensagem: z
    .string()
    .trim()
    .min(1, "A mensagem não pode ser vazia.")
    .max(2000, "A mensagem pode ter no máximo 2000 caracteres."),
});

export function formatarErros(erro: z.ZodError) {
  return erro.issues.map((problema) => ({
    campo: problema.path.join(".") || "corpo",
    mensagem:
      problema.code === "invalid_type"
        ? "Campo obrigatório e deve ser um texto."
        : problema.message,
  }));
}
