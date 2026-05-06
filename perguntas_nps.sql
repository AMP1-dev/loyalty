CREATE TABLE IF NOT EXISTS perguntas_nps_mesa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID NOT NULL REFERENCES lojas(id) ON DELETE CASCADE,
  pergunta TEXT NOT NULL,
  tipo TEXT DEFAULT 'geral' CHECK (tipo IN ('geral', 'atendimento', 'comida', 'ambiente', 'experiencia')),
  ativa BOOLEAN DEFAULT true,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_perguntas_nps_loja ON perguntas_nps_mesa(loja_id);
CREATE INDEX idx_perguntas_nps_ativa ON perguntas_nps_mesa(ativa);
CREATE INDEX idx_perguntas_nps_ordem ON perguntas_nps_mesa(ordem);

-- RLS
ALTER TABLE perguntas_nps_mesa DISABLE ROW LEVEL SECURITY;

-- Execute este INSERT para cada loja_id:

INSERT INTO perguntas_nps_mesa (loja_id, pergunta, tipo, ativa, ordem)
SELECT 
  id as loja_id,
  'Como foi sua experiência?' as pergunta,
  'geral' as tipo,
  true as ativa,
  1 as ordem
FROM lojas
WHERE id NOT IN (SELECT DISTINCT loja_id FROM perguntas_nps_mesa WHERE pergunta = 'Como foi sua experiência?');

INSERT INTO perguntas_nps_mesa (loja_id, pergunta, tipo, ativa, ordem)
SELECT 
  id as loja_id,
  'Voltaria a nos visitar?' as pergunta,
  'experiencia' as tipo,
  true as ativa,
  2 as ordem
FROM lojas
WHERE id NOT IN (SELECT DISTINCT loja_id FROM perguntas_nps_mesa WHERE pergunta = 'Voltaria a nos visitar?');

INSERT INTO perguntas_nps_mesa (loja_id, pergunta, tipo, ativa, ordem)
SELECT 
  id as loja_id,
  'Recomendaria para amigos?' as pergunta,
  'geral' as tipo,
  true as ativa,
  3 as ordem
FROM lojas
WHERE id NOT IN (SELECT DISTINCT loja_id FROM perguntas_nps_mesa WHERE pergunta = 'Recomendaria para amigos?');
