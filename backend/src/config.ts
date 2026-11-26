import "dotenv/config";

export const config = {
  port: Number(process.env.PORT) || 3000,
  corsOrigins: (process.env.CORS_ORIGIN ?? "http://localhost:5500,http://127.0.0.1:5500")
    .split(",")
    .map((origem) => origem.trim())
    .filter(Boolean),
  // Sem DATABASE_URL o servidor usa o armazenamento em memória.
  databaseUrl: process.env.DATABASE_URL || undefined,
  ia: {
    provider: process.env.IA_PROVIDER || "mock",
    timeoutMs: Number(process.env.IA_TIMEOUT_MS) || 8000,
    mockModo: process.env.IA_MOCK_MODO || "normal",
    mockLatenciaMs: Number(process.env.IA_MOCK_LATENCIA_MS ?? 300),
  },
};
