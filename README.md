# Backend — Central de Atendimento com IA

API em Node.js + TypeScript + Express. Nesta etapa (2/10) ela só recebe e lista tickets;
a IA, o banco de dados e a validação das respostas entram nas próximas etapas.

## Requisitos
- Node.js 20 ou superior

## Como rodar
```bash
cd backend
npm install
cp .env.example .env     # no Windows (cmd): copy .env.example .env
npm run dev              # http://localhost:3000
```

## Scripts
| Comando | O que faz |
|---|---|
| `npm run dev` | servidor com recarga automática |
| `npm test` | roda os testes |
| `npm run typecheck` | confere os tipos sem gerar arquivos |
| `npm run build` / `npm start` | compila e roda a versão de produção |

## Endpoints
| Método | Rota | Descrição |
|---|---|---|
| GET | `/health` | verifica se a API está no ar |
| POST | `/tickets` | cria um ticket. Corpo: `{ "mensagem": "texto" }` (1 a 2000 caracteres) |
| GET | `/tickets` | lista os tickets, do mais recente para o mais antigo |
| GET | `/tickets/:id` | busca um ticket |

Erros seguem o formato `{ "erro": "codigo", ... }`, por exemplo `dados_invalidos` (400),
`json_invalido` (400), `ticket_nao_encontrado` (404) e `erro_interno` (500).

## Estrutura
```
src/
├── server.ts                 sobe o servidor
├── app.ts                    monta o Express (usado também nos testes)
├── config.ts                 variáveis de ambiente
├── middlewares/error-handler.ts
└── tickets/
    ├── ticket.types.ts       tipos e status possíveis
    ├── ticket.schema.ts      validação da entrada (Zod)
    ├── ticket.repository.ts  acesso aos dados (hoje em memória)
    ├── ticket.routes.ts      rotas
    └── tickets.test.ts       testes
```
