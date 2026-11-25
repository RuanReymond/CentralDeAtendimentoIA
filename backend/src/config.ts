import "dotenv/config";

export const config = {
  port: Number(process.env.PORT) || 3000,
  corsOrigins: (process.env.CORS_ORIGIN ?? "http://localhost:5500,http://127.0.0.1:5500")
    .split(",")
    .map((origem) => origem.trim())
    .filter(Boolean),
};
