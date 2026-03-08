
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Investimentos
CREATE TABLE public.investimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  empresa TEXT NOT NULL,
  data DATE,
  id_lancamento TEXT,
  tipo_lancamento TEXT,
  banco TEXT,
  ativo TEXT,
  valor_bruto NUMERIC,
  imposto_renda NUMERIC,
  receita_bruta_dia NUMERIC,
  remuneracao_dia_cdi NUMERIC,
  aux1 TEXT,
  carencia TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.investimentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own investimentos" ON public.investimentos FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- DRE
CREATE TABLE public.dre (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  empresa TEXT NOT NULL,
  safra TEXT,
  faturamento NUMERIC,
  custos NUMERIC,
  despesa NUMERIC,
  impostos NUMERIC,
  ebitda NUMERIC,
  lucro_liquido NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.dre ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own dre" ON public.dre FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Balanço
CREATE TABLE public.balanco (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  empresa TEXT NOT NULL,
  safra TEXT,
  ativo_circulante NUMERIC,
  ativo_nao_circulante NUMERIC,
  passivo_circulante NUMERIC,
  passivo_nao_circulante NUMERIC,
  patrimonio_liquido NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.balanco ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own balanco" ON public.balanco FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Fluxo de Caixa
CREATE TABLE public.fluxo_de_caixa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  empresa TEXT NOT NULL,
  data DATE,
  total_entradas NUMERIC,
  total_saidas NUMERIC,
  saldo_conta_corrente NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fluxo_de_caixa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own fluxo_de_caixa" ON public.fluxo_de_caixa FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Folha de Pagamento
CREATE TABLE public.folha_de_pagamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  empresa TEXT NOT NULL,
  safra TEXT,
  nome_funcionario TEXT,
  tipo_recebimento TEXT,
  valor NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.folha_de_pagamento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own folha" ON public.folha_de_pagamento FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Projetos
CREATE TABLE public.projetos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  empresa TEXT NOT NULL,
  safra TEXT,
  nome_projeto TEXT,
  status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.projetos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own projetos" ON public.projetos FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Fornecedores
CREATE TABLE public.fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  empresa TEXT NOT NULL,
  safra TEXT,
  nome_fornecedor TEXT,
  data_inicio_contrato DATE,
  data_fim_contrato DATE,
  valor_contrato NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own fornecedores" ON public.fornecedores FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Chat conversations
CREATE TABLE public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT DEFAULT 'Nova conversa',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own conversations" ON public.chat_conversations FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_chat_conversations_updated_at BEFORE UPDATE ON public.chat_conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Chat messages
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own messages" ON public.chat_messages FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
