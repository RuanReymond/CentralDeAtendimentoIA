# Backend — Central de Atendimento com IA

API em Node.js + TypeScript + Express. Na etapa atual (3/10) ela recebe e lista tickets,
guarda tudo no PostgreSQL e já tem o contrato Zod da resposta da IA.
A IA, a validação com retentativa e o tratamento de falhas entram nas próximas etapas.

## Requisitos
- Node.js 20 ou superior
- Docker (para o PostgreSQL). Sem Docker, use um Postgres gratuito na nuvem (ex.: Neon) e cole a URL em `DATABASE_URL`.

## Como rodar
```bash
# 1. na raiz do repositório: sobe o PostgreSQL
docker compose up -d

# 2. dentro de backend/
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

## Contrato de dados
| Campo | Valores permitidos |
|---|---|
| categoria | `financeiro`, `suporte_tecnico`, `comercial`, `entrega`, `outros` |
| prioridade | `urgente`, `alta`, `media`, `baixa` |
| status | `recebido`, `aguardando_ia`, `aguardando_revisao`, `classificacao_manual`, `respondido` |

O mesmo contrato vale em três lugares: constantes em `tickets/ticket.types.ts`, schema Zod da IA em
`ai/ai.schema.ts` e restrições do banco em `db/migrations/001_inicial.sql`. Um teste confere que
os departamentos do banco batem com as categorias do código.

## Estrutura
```
src/
├── server.ts                  sobe o servidor (escolhe PostgreSQL ou memória)
├── app.ts                     monta o Express (usado também nos testes)
├── config.ts                  variáveis de ambiente
├── ai/ai.schema.ts            contrato Zod do JSON que a IA deve devolver
├── db/
│   ├── pool.ts                conexão com o PostgreSQL
│   ├── migrar.ts              aplica as migrações
│   ├── migrations/            arquivos .sql numerados (001_inicial.sql...)
│   └── pg-ticket.repository.ts
├── middlewares/error-handler.ts
└── tickets/                   tipos, schema de entrada, repositório em memória, rotas
```
