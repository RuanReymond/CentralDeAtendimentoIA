import { z } from "zod";
import { CATEGORIAS, PRIORIDADES } from "../tickets/ticket.types";

// Contrato do JSON que a IA deve devolver. Tudo que sair daqui é considerado confiável;
// qualquer coisa que não passe nesse schema é tratada como "resposta inválida" (etapa 6).
// Campos extras que a IA inventar são descartados (comportamento padrão do z.object).
export const classificacaoSchema = z.object({
  categoria: z.enum(CATEGORIAS),
  prioridade: z.enum(PRIORIDADES),
  assunto: z.string().trim().min(3, "assunto curto demais").max(120, "assunto longo demais"),
  respostaSugerida: z.string().trim().min(1, "resposta vazia").max(1500, "resposta longa demais"),
});

export type Classificacao = z.infer<typeof classificacaoSchema>;
