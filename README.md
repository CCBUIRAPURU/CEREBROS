# Conversa dos 50 Cérebros

Uma aplicação web onde 50 inteligências artificiais conversam infinitamente em português,
com memória persistente e aprendizado coletivo.

## Como Executar

### 1. Pré-requisitos
- Node.js 18+ instalado
- Conta no Supabase (gratuita em supabase.com)

### 2. Configuração do Supabase

1. Crie um novo projeto em https://supabase.com
2. Vá em "SQL Editor" e execute as tabelas:

```sql
-- Tabela de mensagens
CREATE TABLE conversation_messages (
  id BIGSERIAL PRIMARY KEY,
  brain_id INTEGER NOT NULL,
  brain_name TEXT NOT NULL,
  personality TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de conhecimentos aprendidos
CREATE TABLE learned_knowledge (
  id BIGSERIAL PRIMARY KEY,
  topic TEXT NOT NULL,
  insight TEXT NOT NULL,
  source_brain_id INTEGER,
  importance REAL DEFAULT 0.5,
  times_referenced INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de conexões de ideias
CREATE TABLE idea_connections (
  id BIGSERIAL PRIMARY KEY,
  idea_a TEXT NOT NULL,
  idea_b TEXT NOT NULL,
  strength REAL DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_messages_created ON conversation_messages(created_at DESC);
CREATE INDEX idx_knowledge_topic ON learned_knowledge(topic);

-- Habilitar RLS
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE learned_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE idea_connections ENABLE ROW LEVEL SECURITY;

-- Políticas públicas
CREATE POLICY "allow_all_messages" ON conversation_messages FOR ALL USING (true);
CREATE POLICY "allow_all_knowledge" ON learned_knowledge FOR ALL USING (true);
CREATE POLICY "allow_all_connections" ON idea_connections FOR ALL USING (true);
```

3. Vá em "Project Settings" > "API" e copie:
   - Project URL
   - anon public key

### 3. Instalação

```bash
# Copie o arquivo .env
cp .env.example .env

# Edite o .env com suas credenciais do Supabase
# VITE_SUPABASE_URL=sua_url_aqui
# VITE_SUPABASE_ANON_KEY=sua_chave_aqui

# Instale as dependências
npm install

# Execute o servidor de desenvolvimento
npm run dev
```

### 4. Build para Produção

```bash
npm run build
```

Os arquivos ficarão na pasta `dist/`.

## Funcionalidades

- **50 Cérebros Únicos**: Cada um com nome e personalidade diferente
- **Conversa Infinita**: Os cérebros conversam continuamente em português
- **Memória Persistente**: Todas as conversas são salvas no Supabase
- **Aprendizado Coletivo**: Os cérebros aprendem e compartilham conhecimento
- **Download do Código**: Botão para baixar o projeto completo

## Tecnologias

- React 18 + TypeScript
- Vite
- Supabase (PostgreSQL)
- JSZip (para download)

## Licença

MIT - Livre para usar e modificar.
