# Backend — Central de Atendimento com IA

API em Node.js + TypeScript + Express. Na etapa atual (5/10) ela recebe tickets, guarda tudo no
PostgreSQL e classifica cada mensagem com um **provedor de IA simulado** que pode falhar de propósito.
A validação com nova tentativa (etapa 6) e o tratamento da API fora do ar (etapa 7) vêm a seguir.

## Requisitos
- Node.js 20 ou superior
- Um PostgreSQL: Docker (`docker compose up -d` na raiz) ou um banco gratuito na nuvem (ex.: Neon), com a URL em `DATABASE_URL`

## Como rodar
```bash
cd backend
npm install
cp .env.example .env      # Windows (PowerShell): Copy-Item .env.example .env
npm run db:migrate        # cria as tabelas
npm run dev               # http://localhost:3000
```
Sem `DATABASE_URL` no `.env`, o servidor usa armazenamento em memória (os dados somem ao reiniciar).

## Scripts
| Comando | O que faz |
|---|---|
| `npm run dev` | servidor com recarga automática |
| `npm run db:migrate` | aplica as migrações de `src/db/migrations` que ainda faltam |
| `npm test` | roda os testes (os de banco só rodam se houver `DATABASE_URL`) |
| `npm run typecheck` | confere os tipos sem gerar arquivos |
| `npm run build` / `npm start` | compila e roda a versão de produção |

## Endpoints
| Método | Rota | Descrição |
|---|---|---|
| GET | `/health` | verifica se a API está no ar |
| POST | `/tickets` | cria um ticket. Corpo: `{ "mensagem": "texto" }` (1 a 2000 caracteres) |
| GET | `/tickets` | lista os tickets, do mais recente para o mais antigo |
| GET | `/tickets/:id` | busca um ticket |

Erros seguem o formato `{ "erro": "codigo", ... }`: `dados_invalidos` e `json_invalido` (400),
`ticket_nao_encontrado` (404), `banco_indisponivel` (503) e `erro_interno` (500).

## Como um ticket é processado
1. `POST /tickets` salva o ticket com status `recebido` e **responde na hora** ao cliente.
2. Em segundo plano, o backend pede à IA a classificação da mensagem (com tempo limite).
3. O texto devolvido é lido como JSON e validado com Zod (`src/ai/ai.schema.ts`).
4. Se estiver tudo certo, o ticket recebe categoria, prioridade, assunto e resposta sugerida e vai para `aguardando_revisao`.
5. Se qualquer passo falhar, o ticket **não se perde**: fica salvo e vai para `classificacao_manual`.

## Provedor de IA simulado
O provedor é escolhido por `IA_PROVIDER` (por enquanto só existe `mock`). Ele classifica por palavras-chave
e imita os problemas de uma IA de verdade. O modo vem de `IA_MOCK_MODO` no `.env`:

| Modo | O que simula | Resultado hoje (etapa 5) |
|---|---|---|
| `normal` | resposta correta | ticket classificado |
| `json_quebrado` | JSON cortado no meio | `classificacao_manual` |
| `campo_faltando` | falta a `respostaSugerida` | `classificacao_manual` |
| `categoria_inventada` | categoria fora da lista | `classificacao_manual` |
| `prioridade_invalida` | prioridade fora da lista (ex.: "Crítica") | `classificacao_manual` |
| `resposta_vazia` | texto vazio | `classificacao_manual` |
| `markdown` | JSON dentro de um bloco ` ```json ` | `classificacao_manual` (a etapa 6 vai recuperar) |
| `texto_extra` | texto antes do JSON ("Claro! Aqui está...") | `classificacao_manual` (a etapa 6 vai recuperar) |
| `timeout` | IA que não responde | `classificacao_manual` após `IA_TIMEOUT_MS` |
| `indisponivel` | erro 503 do provedor | `classificacao_manual` (a etapa 7 vai tratar) |
| `instavel` | falha de forma aleatória em ~30% das chamadas | mistura de resultados |

**Falha sob demanda, pelo chat:** escreva `[falha:nome_do_modo]` em qualquer lugar da mensagem e só aquela
chamada usa o modo escolhido. Exemplo: `Meu pedido atrasou [falha:json_quebrado]`.

Outras variáveis: `IA_TIMEOUT_MS` (tempo limite, padrão 8000) e `IA_MOCK_LATENCIA_MS` (demora da IA simulada, padrão 300).

## Contrato de dados
| Campo | Valores permitidos |
|---|---|
| categoria | `financeiro`, `suporte_tecnico`, `comercial`, `entrega`, `outros` |
| prioridade | `urgente`, `alta`, `media`, `baixa` |
| status | `recebido`, `aguardando_ia`, `aguardando_revisao`, `classificacao_manual`, `respondido` |

O mesmo contrato vale em três lugares: constantes em `tickets/ticket.types.ts`, schema Zod da IA em
`ai/ai.schema.ts` e restrições do banco em `db/migrations/001_inicial.sql`.

## Estrutura
```
src/
├── server.ts                    sobe o servidor (escolhe banco e provedor de IA)
├── app.ts                       monta o Express (usado também nos testes)
├── config.ts                    variáveis de ambiente
├── ai/
│   ├── ai.provider.ts           interface que toda IA implementa
│   ├── ai.schema.ts             contrato Zod do JSON da IA
│   ├── mock.provider.ts         IA simulada, com modos de falha
│   ├── provider.factory.ts      escolhe o provedor pela configuração
│   ├── classificador.ts         chama a IA com tempo limite e valida a resposta
│   └── classificar-ticket.ts    aplica o resultado (ou a falha) no ticket
├── db/                          conexão, migrações e repositório PostgreSQL
├── middlewares/error-handler.ts
└── tickets/                     tipos, schema de entrada, repositório em memória, rotas
```