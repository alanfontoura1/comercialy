-- ─── Schema V2: Comercialy CRM Tables ────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Clinicas ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clinicas (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome                  VARCHAR(255) NOT NULL,
  nome_dra              VARCHAR(255),
  nome_atendente        VARCHAR(255),
  instagram             VARCHAR(255),
  tom                   TEXT,
  horario_inicio        TIME DEFAULT '08:00',
  horario_fim           TIME DEFAULT '18:00',
  atendente_24h         BOOLEAN DEFAULT false,
  funciona_domingo      BOOLEAN DEFAULT false,
  cobra_consulta        BOOLEAN DEFAULT false,
  valor_consulta        NUMERIC(10,2),
  consulta_abate        BOOLEAN DEFAULT false,
  chave_pix             VARCHAR(255),
  follow_up_manha       TIME DEFAULT '09:00',
  follow_up_tarde       TIME DEFAULT '14:00',
  follow_up_noite       TIME DEFAULT '19:00',
  webhook_url           TEXT,
  whatsapp_instance     VARCHAR(255),
  instance_name         VARCHAR(255),
  grupo_notificacao     VARCHAR(255),
  endereco              TEXT,
  ia_ativa              BOOLEAN DEFAULT true,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Procedimentos ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS procedimentos (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id          UUID REFERENCES clinicas(id) ON DELETE CASCADE,
  nome                VARCHAR(255) NOT NULL,
  duracao_minutos     INTEGER DEFAULT 60,
  valor_inteiro       NUMERIC(10,2),
  valor_parcelado     NUMERIC(10,2),
  parcelas            INTEGER DEFAULT 1,
  desconto_vista      NUMERIC(5,2),
  publico_ideal       TEXT,
  contraindicacoes    TEXT,
  ativo               BOOLEAN DEFAULT true,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Procedimentos de Entrada ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS procedimentos_entrada (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id          UUID REFERENCES clinicas(id) ON DELETE CASCADE,
  nome                VARCHAR(255) NOT NULL,
  valor_inteiro       NUMERIC(10,2),
  valor_parcelado     NUMERIC(10,2),
  parcelas            INTEGER DEFAULT 1,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Paciente Modelo ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS paciente_modelo (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id              UUID REFERENCES clinicas(id) ON DELETE CASCADE,
  ativo                   BOOLEAN DEFAULT true,
  valor_minimo_interesse  NUMERIC(10,2),
  procedimentos_ids       UUID[],
  descricao               TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Conteudos Instagram ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conteudos_instagram (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id  UUID REFERENCES clinicas(id) ON DELETE CASCADE,
  link        TEXT NOT NULL,
  descricao   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Leads ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id              UUID REFERENCES clinicas(id) ON DELETE CASCADE,
  nome                    VARCHAR(255),
  telefone                VARCHAR(30) NOT NULL,
  email                   VARCHAR(255),
  score                   INTEGER DEFAULT 0,
  status                  VARCHAR(50) DEFAULT 'novo' CHECK (status IN ('novo','qualificacao','qualificado','agendado','convertido','followup','nutricao','arquivado')),
  procedimento_interesse  VARCHAR(255),
  data_contato            TIMESTAMPTZ DEFAULT NOW(),
  data_agendamento        DATE,
  horario_agendamento     TIME,
  follow_up_count         INTEGER DEFAULT 0,
  ultimo_followup         TIMESTAMPTZ,
  bloqueado               BOOLEAN DEFAULT false,
  metadados               JSONB DEFAULT '{}',
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(clinica_id, telefone)
);

-- ─── Mensagens ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mensagens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id     UUID REFERENCES leads(id) ON DELETE CASCADE,
  clinica_id  UUID REFERENCES clinicas(id),
  conteudo    TEXT NOT NULL,
  tipo        VARCHAR(20) DEFAULT 'recebida' CHECK (tipo IN ('enviada','recebida','sistema')),
  media_type  VARCHAR(50),
  media_url   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Análise de Conversas ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversation_analysis (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id           UUID REFERENCES leads(id) ON DELETE CASCADE,
  clinica_id        UUID REFERENCES clinicas(id),
  score             INTEGER,
  resumo            TEXT,
  pontos_positivos  JSONB DEFAULT '[]',
  pontos_melhoria   JSONB DEFAULT '[]',
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Agendamentos ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agendamentos (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id           UUID REFERENCES leads(id) ON DELETE CASCADE,
  clinica_id        UUID REFERENCES clinicas(id),
  procedimento_id   UUID REFERENCES procedimentos(id),
  nome_paciente     VARCHAR(255),
  tipo              VARCHAR(50) DEFAULT 'normal',
  observacoes       TEXT,
  data              DATE NOT NULL,
  horario           TIME NOT NULL,
  duracao_minutos   INTEGER DEFAULT 60,
  status            VARCHAR(50) DEFAULT 'agendado',
  google_event_id   VARCHAR(255),
  consulta_paga     BOOLEAN DEFAULT false,
  comprovante_url   TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_leads_clinica_id       ON leads(clinica_id);
CREATE INDEX IF NOT EXISTS idx_leads_status           ON leads(status);
CREATE INDEX IF NOT EXISTS idx_mensagens_lead_id      ON mensagens(lead_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_clinica_data ON agendamentos(clinica_id, data);

-- ─── Updated_at triggers for clinicas and leads ───────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$ DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['clinicas','leads','agendamentos']
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_updated_at ON %I; CREATE TRIGGER trg_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at();',
      t, t
    );
  END LOOP;
END $$;
