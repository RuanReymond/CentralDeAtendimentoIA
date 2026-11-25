-- Departamentos: o "codigo" é igual à categoria que a IA devolve (liga categoria -> departamento).
CREATE TABLE departamentos (
  id     SERIAL PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  nome   TEXT NOT NULL
);

INSERT INTO departamentos (codigo, nome) VALUES
  ('financeiro',      'Financeiro'),
  ('suporte_tecnico', 'Suporte Técnico'),
  ('comercial',       'Comercial'),
  ('entrega',         'Logística'),
  ('outros',          'Triagem geral');

CREATE TABLE tickets (
  id                SERIAL PRIMARY KEY,
  mensagem          TEXT NOT NULL CHECK (char_length(mensagem) BETWEEN 1 AND 2000),
  -- Nulos até a IA classificar. A categoria só aceita códigos existentes em departamentos.
  categoria         TEXT REFERENCES departamentos (codigo),
  prioridade        TEXT CHECK (prioridade IN ('urgente', 'alta', 'media', 'baixa')),
  assunto           TEXT,
  resposta_sugerida TEXT,
  status            TEXT NOT NULL DEFAULT 'recebido'
                    CHECK (status IN ('recebido', 'aguardando_ia', 'aguardando_revisao',
                                      'classificacao_manual', 'respondido')),
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tickets_status ON tickets (status);
CREATE INDEX idx_tickets_criado_em ON tickets (criado_em DESC);
