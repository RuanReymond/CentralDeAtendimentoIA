import { Pool } from "pg";

export function criarPool(connectionString: string): Pool {
  const pool = new Pool({
    connectionString,
    max: 10,
    connectionTimeoutMillis: 5000, // banco fora do ar: falha em 5s em vez de travar a requisição
  });
  // Sem esse listener, um erro numa conexão ociosa derrubaria o processo inteiro.
  pool.on("error", (erro) => console.error("Erro no pool do PostgreSQL:", erro.message));
  return pool;
}
