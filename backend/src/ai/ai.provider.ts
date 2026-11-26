export interface OpcoesChamada {
  // Permite cancelar a chamada (usado quando estoura o tempo limite).
  signal?: AbortSignal;
}

// Qualquer IA (simulada, Gemini...) implementa esta interface. O resto do sistema só conhece ela.
export interface AiProvider {
  readonly nome: string;
  // Devolve o TEXTO bruto da resposta da IA (que deveria ser um JSON), sem validar.
  // Quem valida é o classificador. Assim dá para simular e tratar respostas quebradas.
  classificar(mensagem: string, opcoes?: OpcoesChamada): Promise<string>;
}

// Erro de comunicação com o provedor (fora do ar, limite de uso, erro 5xx...).
export class ErroProvedor extends Error {
  constructor(
    mensagem: string,
    readonly status?: number,
  ) {
    super(mensagem);
    this.name = "ErroProvedor";
  }
}
