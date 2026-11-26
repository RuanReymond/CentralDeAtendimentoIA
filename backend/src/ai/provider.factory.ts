import { config } from "../config";
import type { AiProvider } from "./ai.provider";
import { ehModoMock, MockProvider, MODOS_MOCK } from "./mock.provider";

export function criarProvider(): AiProvider {
  const { provider, mockModo, mockLatenciaMs } = config.ia;

  if (provider === "mock") {
    if (!ehModoMock(mockModo)) {
      throw new Error(`IA_MOCK_MODO inválido: "${mockModo}". Use um destes: ${MODOS_MOCK.join(", ")}`);
    }
    return new MockProvider({ modo: mockModo, latenciaMs: mockLatenciaMs });
  }

  throw new Error(`IA_PROVIDER desconhecido: "${provider}". Por enquanto só existe "mock".`);
}
