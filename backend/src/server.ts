import { createApp } from "./app";
import { config } from "./config";
import { PgTicketRepository } from "./db/pg-ticket.repository";
import { criarPool } from "./db/pool";
import { InMemoryTicketRepository } from "./tickets/ticket.repository";

const pool = config.databaseUrl ? criarPool(config.databaseUrl) : undefined;
const repo = pool ? new PgTicketRepository(pool) : new InMemoryTicketRepository();
console.log(
  pool
    ? "Armazenamento: PostgreSQL"
    : "Armazenamento: memória (defina DATABASE_URL no .env para usar o PostgreSQL)",
);

const app = createApp(repo);
const servidor = app.listen(config.port, () => {
  console.log(`API rodando em http://localhost:${config.port}`);
});

// Encerramento limpo (Ctrl+C): fecha o servidor e as conexões com o banco.
process.on("SIGINT", () => {
  servidor.close(() => {
    void (pool ? pool.end() : Promise.resolve()).then(() => process.exit(0));
  });
});
