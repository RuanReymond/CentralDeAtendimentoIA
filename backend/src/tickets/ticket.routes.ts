import { Router } from "express";
import type { TicketRepository } from "./ticket.repository";
import { criarTicketSchema, formatarErros } from "./ticket.schema";
import type { Ticket } from "./ticket.types";

// "classificar" (opcional) roda em segundo plano depois que o ticket já foi salvo e respondido.
export function criarTicketRouter(repo: TicketRepository, classificar?: (ticket: Ticket) => Promise<void>) {
  const router = Router();

  // Recebe a mensagem do cliente e salva como "recebido" ANTES de qualquer chamada à IA,
  // para que o cliente nunca perca a mensagem.
  router.post("/", async (req, res) => {
    const resultado = criarTicketSchema.safeParse(req.body);
    if (!resultado.success) {
      res.status(400).json({ erro: "dados_invalidos", detalhes: formatarErros(resultado.error) });
      return;
    }
    const ticket = await repo.criar({ mensagem: resultado.data.mensagem });
    res.status(201).json(ticket);

    // A resposta ao cliente já foi enviada; a IA trabalha depois, sem fazê-lo esperar.
    if (classificar) {
      classificar(ticket).catch((erro) => console.error(`Falha ao processar o ticket #${ticket.id}:`, erro));
    }
  });

  router.get("/", async (_req, res) => {
    res.json(await repo.listar());
  });

  router.get("/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      res.status(400).json({ erro: "id_invalido" });
      return;
    }
    const ticket = await repo.buscarPorId(id);
    if (!ticket) {
      res.status(404).json({ erro: "ticket_nao_encontrado" });
      return;
    }
    res.json(ticket);
  });

  return router;
}
