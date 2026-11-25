import cors from "cors";
import express from "express";
import { config } from "./config";
import { rotaNaoEncontrada, tratarErros } from "./error-handler";
import { InMemoryTicketRepository, type TicketRepository } from "./tickets/ticket.repository";
import { criarTicketRouter } from "./tickets/ticket.routes";

// Fábrica do app: facilita os testes (cada teste cria um app com repositório novo).
export function createApp(repo: TicketRepository = new InMemoryTicketRepository()) {
  const app = express();

  app.use(cors({ origin: config.corsOrigins }));
  app.use(express.json({ limit: "10kb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });
  app.use("/tickets", criarTicketRouter(repo));

  app.use(rotaNaoEncontrada);
  app.use(tratarErros);
  return app;
}
