-- ==============================================================================
-- COTACAMPO (MG, ES, BA) - SUPABASE DDL & SCHEMA NORMALIZADO (3NF)
-- Projeto Supabase: app_agro_es (https://uwrvxmlgvgvvqmtucidk.supabase.co)
-- ==============================================================================

-- Habilitar extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. LIMPEZA CONTROLADA DAS TABELAS ANTIGAS
DROP TABLE IF EXISTS quotation_bids CASCADE;
DROP TABLE IF EXISTS quotation_items CASCADE;
DROP TABLE IF EXISTS quotation_requests CASCADE;
DROP TABLE IF EXISTS reseller_categories CASCADE;
DROP TABLE IF EXISTS producer_crops CASCADE;
DROP TABLE IF EXISTS password_resets CASCADE;
DROP TABLE IF EXISTS resellers CASCADE;
DROP TABLE IF EXISTS producers CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS crops CASCADE;

-- 2. TABELA DE DOMÍNIO: CULTURAS AGRÍCOLAS ATENDIDAS
CREATE TABLE crops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO crops (name, slug) VALUES
    ('Café', 'cafe'),
    ('Cacau', 'cacau'),
    ('Pimenta-do-reino', 'pimenta-do-reino'),
    ('Mamão', 'mamao')
ON CONFLICT (name) DO NOTHING;

-- 3. TABELA DE DOMÍNIO: CATEGORIAS DE INSUMOS AGRÍCOLAS
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO categories (name, slug) VALUES
    ('Defensivos', 'defensivos'),
    ('Fertilizantes / Nutrição de Plantas', 'fertilizantes-nutricao'),
    ('Foliares e Bioestimulantes', 'foliares-bioestimulantes'),
    ('Biológicos', 'biologicos'),
    ('Corretivos de Solo', 'corretivos-solo')
ON CONFLICT (name) DO NOTHING;

-- 4. TABELA DE PERFIS UNIFICADOS (PROFILES)
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('PRODUCER', 'RESELLER', 'ADMIN')),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    state CHAR(2) NOT NULL CHECK (state IN ('MG', 'ES', 'BA')),
    city VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_phone ON profiles(phone);
CREATE INDEX idx_profiles_role ON profiles(role);

-- 5. TABELA DE PRODUTORES RURAIS (US01)
CREATE TABLE producers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    farm_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. TABELA ASSOCIATIVA N:N PRODUTOR <-> CULTURAS (3NF)
CREATE TABLE producer_crops (
    producer_id UUID NOT NULL REFERENCES producers(id) ON DELETE CASCADE,
    crop_id UUID NOT NULL REFERENCES crops(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (producer_id, crop_id)
);

-- 7. TABELA DE REVENDAS DE INSUMOS (US02)
CREATE TABLE resellers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255) NOT NULL,
    cnpj CHAR(14) UNIQUE NOT NULL,
    delivery_radius_km INTEGER NOT NULL CHECK (delivery_radius_km > 0),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_resellers_cnpj ON resellers(cnpj);

-- 8. TABELA ASSOCIATIVA N:N REVENDA <-> CATEGORIAS DE INSUMOS (3NF)
CREATE TABLE reseller_categories (
    reseller_id UUID NOT NULL REFERENCES resellers(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (reseller_id, category_id)
);

-- 9. TABELA DE TOKENS E CÓDIGOS DE REDEFINIÇÃO DE SENHA (US04)
CREATE TABLE password_resets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier VARCHAR(255) NOT NULL,
    token VARCHAR(128) UNIQUE NOT NULL,
    code CHAR(6) NOT NULL,
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('WHATSAPP', 'EMAIL')),
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_password_resets_token ON password_resets(token);
CREATE INDEX idx_password_resets_code ON password_resets(code);
CREATE INDEX idx_password_resets_identifier ON password_resets(identifier);

-- 10. TABELAS DO MÓDULO DE COTAÇÕES (CORE DO COTACAMPO)
CREATE TABLE quotation_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    producer_id UUID NOT NULL REFERENCES producers(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(30) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_REVIEW', 'AWARDED', 'CANCELLED', 'CLOSED')),
    target_state CHAR(2) NOT NULL CHECK (target_state IN ('MG', 'ES', 'BA')),
    target_city VARCHAR(100) NOT NULL,
    deadline TIMESTAMPTZ NOT NULL,
    freight_type VARCHAR(50) DEFAULT 'CIF',
    payment_terms VARCHAR(100) DEFAULT '30/60 dias',
    proposal_limit_hours INTEGER DEFAULT 48,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE quotation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id UUID NOT NULL REFERENCES quotation_requests(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE RESTRICT,
    product_name VARCHAR(255) NOT NULL,
    active_ingredient VARCHAR(255),
    quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
    unit VARCHAR(20) NOT NULL,
    accepts_generic BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE quotation_bids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id UUID NOT NULL REFERENCES quotation_requests(id) ON DELETE CASCADE,
    reseller_id UUID NOT NULL REFERENCES resellers(id) ON DELETE RESTRICT,
    total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount > 0),
    status VARCHAR(30) DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED', 'ACCEPTED', 'REJECTED')),
    delivery_days INTEGER NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (quotation_id, reseller_id)
);

CREATE TABLE quotation_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id UUID NOT NULL REFERENCES quotation_requests(id) ON DELETE CASCADE,
    reseller_id UUID REFERENCES resellers(id) ON DELETE CASCADE,
    target_city VARCHAR(100) NOT NULL,
    target_state CHAR(2) NOT NULL,
    channel VARCHAR(30) DEFAULT 'IN_APP',
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. POLÍTICAS DE SEGURANÇA ROW LEVEL SECURITY (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE producers ENABLE ROW LEVEL SECURITY;
ALTER TABLE producer_crops ENABLE ROW LEVEL SECURITY;
ALTER TABLE resellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE reseller_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE crops ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_bids ENABLE ROW LEVEL SECURITY;

-- Políticas de Leitura Pública para Domínio
DROP POLICY IF EXISTS "Leitura publica de culturas" ON crops;
CREATE POLICY "Leitura publica de culturas" ON crops FOR SELECT USING (true);

DROP POLICY IF EXISTS "Leitura publica de categorias" ON categories;
CREATE POLICY "Leitura publica de categorias" ON categories FOR SELECT USING (true);

-- Políticas para Profiles
DROP POLICY IF EXISTS "Leitura de perfil" ON profiles;
CREATE POLICY "Leitura de perfil" ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Insercao de perfil" ON profiles;
CREATE POLICY "Insercao de perfil" ON profiles FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Atualizacao de perfil" ON profiles;
CREATE POLICY "Atualizacao de perfil" ON profiles FOR UPDATE USING (true);

-- Políticas para Produtores e Culturas
DROP POLICY IF EXISTS "Leitura de produtores" ON producers;
CREATE POLICY "Leitura de produtores" ON producers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Insercao de produtores" ON producers;
CREATE POLICY "Insercao de produtores" ON producers FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Leitura de culturas do produtor" ON producer_crops;
CREATE POLICY "Leitura de culturas do produtor" ON producer_crops FOR SELECT USING (true);

DROP POLICY IF EXISTS "Insercao de culturas do produtor" ON producer_crops;
CREATE POLICY "Insercao de culturas do produtor" ON producer_crops FOR INSERT WITH CHECK (true);

-- Políticas para Revendas e Categorias
DROP POLICY IF EXISTS "Leitura de revendas" ON resellers;
CREATE POLICY "Leitura de revendas" ON resellers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Insercao de revendas" ON resellers;
CREATE POLICY "Insercao de revendas" ON resellers FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Leitura de categorias da revenda" ON reseller_categories;
CREATE POLICY "Leitura de categorias da revenda" ON reseller_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Insercao de categorias da revenda" ON reseller_categories;
CREATE POLICY "Insercao de categorias da revenda" ON reseller_categories FOR INSERT WITH CHECK (true);

-- Políticas para Recuperação de Senha
DROP POLICY IF EXISTS "Leitura de password_resets" ON password_resets;
CREATE POLICY "Leitura de password_resets" ON password_resets FOR SELECT USING (true);

DROP POLICY IF EXISTS "Insercao de password_resets" ON password_resets;
CREATE POLICY "Insercao de password_resets" ON password_resets FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Atualizacao de password_resets" ON password_resets;
CREATE POLICY "Atualizacao de password_resets" ON password_resets FOR UPDATE USING (true);

-- Políticas para Cotações e Itens
DROP POLICY IF EXISTS "Leitura de cotacoes" ON quotation_requests;
CREATE POLICY "Leitura de cotacoes" ON quotation_requests FOR SELECT USING (true);

DROP POLICY IF EXISTS "Insercao de cotacoes" ON quotation_requests;
CREATE POLICY "Insercao de cotacoes" ON quotation_requests FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Leitura de itens da cotacao" ON quotation_items;
CREATE POLICY "Leitura de itens da cotacao" ON quotation_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Insercao de itens da cotacao" ON quotation_items;
CREATE POLICY "Insercao de itens da cotacao" ON quotation_items FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Leitura de lances da cotacao" ON quotation_bids;
CREATE POLICY "Leitura de lances da cotacao" ON quotation_bids FOR SELECT USING (true);

DROP POLICY IF EXISTS "Insercao de lances da cotacao" ON quotation_bids;
CREATE POLICY "Insercao de lances da cotacao" ON quotation_bids FOR INSERT WITH CHECK (true);

-- Políticas para Notificações de Cotações
ALTER TABLE quotation_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Leitura de notificacoes" ON quotation_notifications;
CREATE POLICY "Leitura de notificacoes" ON quotation_notifications FOR SELECT USING (true);

DROP POLICY IF EXISTS "Insercao de notificacoes" ON quotation_notifications;
CREATE POLICY "Insercao de notificacoes" ON quotation_notifications FOR INSERT WITH CHECK (true);
