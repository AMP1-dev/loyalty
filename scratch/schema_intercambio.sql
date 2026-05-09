
-- Tabela para os Tokens de Intercâmbio
CREATE TABLE IF NOT EXISTS intercambio_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token VARCHAR(10) UNIQUE NOT NULL,
    cliente_cpf VARCHAR(15) NOT NULL,
    loja_destino_id UUID, -- Opcional: Se ele quiser travar para uma loja específica
    total_pontos_origem DECIMAL DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pendente', -- pendente, usado, expirado, cancelado
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Tabela para os itens da reserva (de onde estão saindo os pontos)
CREATE TABLE IF NOT EXISTS intercambio_itens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_id UUID REFERENCES intercambio_tokens(id),
    loja_origem_id UUID NOT NULL,
    pontos DECIMAL NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
