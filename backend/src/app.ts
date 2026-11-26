import cors from "cors";
import express from "express";
import { type AiProvider } from "./ai/ai.provider";
import { classificarTicket } from "./ai/classificar-ticket";
import { config } from "./config";
import { rotaNaoEncontrada, tratarErros } from "./middlewares/error-handler";
import { InMemoryTicketRepository, type TicketRepository } from "./tickets/ticket.repository";
import { criarTicketRouter } from "./tickets/ticket.routes";
import type { Ticket } from "./tickets/ticket.types";

export interface OpcoesIa {
  provider: AiProvider;
  timeoutMs: number;
}

// Fábrica do app: facilita os testes (cada teste cria um app com repositório novo).
// Sem "ia", os tickets só são salvos (sem classificação automática).
export function createApp(repo: TicketRepository = new InMemoryTicketRepository(), ia?: OpcoesIa) {
  const app = express();

  app.use(cors({ origin: config.corsOrigins }));
  app.use(express.json({ limit: "10kb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  const classificar = ia
    ? (ticket: Ticket) => classificarTicket(repo, ia.provider, ticket, ia.timeoutMs)
    : undefined;
  app.use("/tickets", criarTicketRouter(repo, classificar));

  app.use(rotaNaoEncontrada);
  app.use(tratarErros);
  return app;
}
