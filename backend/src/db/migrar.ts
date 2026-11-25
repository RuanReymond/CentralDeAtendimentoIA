import { promises as fs } from "node:fs";
import path from "node:path";
import type { Pool } from "pg";
import { config } from "../config";
import { criarPool } from "./pool";

// Aplica, em ordem, os arquivos .sql de src/db/migrations que ainda não foram aplicados.
// Cada arquivo roda numa transação: se der erro, nada daquele arquivo é gravado.
export async function migrar(pool: Pool, pasta = path.join(__dirname, "migrations")): Promise<string[]> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migracoes (
      nome        TEXT PRIMARY KEY,
      aplicada_em TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);

  const arquivos = (await fs.readdir(pasta)).filter((a) => a.endsWith(".sql")).sort();
  const { rows } = await pool.query<{ nome: string }>("SELECT nome FROM _migracoes");
  const aplicadas = new Set(rows.map((r) => r.nome));
  const novas: string[] = [];

  for (const arquivo of arquivos) {
    if (aplicadas.has(arquivo)) continue;
    const sql = await fs.readFile(path.join(pasta, arquivo), "utf8");
    const cliente = await pool.connect();
    try {
      await cliente.query("BEGIN");
      await cliente.query(sql);
      await cliente.query("INSERT INTO _migracoes (nome) VALUES ($1)", [arquivo]);
      await cliente.query("COMMIT");
      novas.push(arquivo);
    } catch (erro) {
      await cliente.query("ROLLBACK");
      throw new Error(`Falha na migração ${arquivo}: ${(erro as Error).message}`);
    } finally {
      cliente.release();
    }
  }
  return novas;
}

async function main() {
  if (!config.databaseUrl) {
    console.error("Defina DATABASE_URL no arquivo .env antes de migrar.");
    process.exitCode = 1;
    return;
  }
  const pool = criarPool(config.databaseUrl);
  try {
    const novas = await migrar(pool);
    console.log(novas.length ? `Migrações aplicadas: ${novas.join(", ")}` : "Banco já está atualizado.");
  } catch (erro) {
    console.error((erro as Error).message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

// Roda só quando chamado via "npm run db:migrate" (e não quando importado nos testes).
if (require.main === module) {
  void main();
}
