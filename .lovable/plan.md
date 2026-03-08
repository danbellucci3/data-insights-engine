

## Sistema de Análise Financeira com IA

### Visão Geral
Sistema multi-usuário com dashboard e chat inteligente alimentado por Gemini, onde o usuário importa dados financeiros via CSV e faz perguntas em linguagem natural.

### Funcionalidades

#### 1. Autenticação
- Login/cadastro com email e senha
- Cada usuário vê apenas seus próprios dados

#### 2. Upload de Dados (CSV)
- Página dedicada para importar CSVs para cada uma das 7 tabelas:
  - Investimentos, DRE, Balanço, Fluxo de Caixa, Folha de Pagamento, Projetos, Fornecedores
- Validação dos campos e preview antes de confirmar importação
- Possibilidade de visualizar e deletar dados já importados

#### 3. Dashboard
- Visão geral com cards resumindo totais por categoria (investimentos, saldo, faturamento)
- Filtros por empresa e período
- Gráficos de faturamento, fluxo de caixa e investimentos usando Recharts

#### 4. Chat com IA (Gemini)
- Interface de chat com streaming de respostas
- A IA recebe os dados relevantes do usuário como contexto para responder perguntas
- Exemplos: "Qual meu saldo de investimentos da Empresa X?", "Qual o EBITDA da safra 2024?"
- Histórico de conversas salvo

### Stack Técnica
- **Frontend**: React + Tailwind + shadcn/ui
- **Backend**: Lovable Cloud (Supabase) para banco de dados, autenticação e edge functions
- **IA**: Lovable AI Gateway com modelo Gemini para o chat inteligente
- **Gráficos**: Recharts (já instalado)

### Banco de Dados (7 tabelas de dados + suporte)
- `profiles` — perfil do usuário
- `user_roles` — controle de permissões
- `investimentos`, `dre`, `balanco`, `fluxo_de_caixa`, `folha_de_pagamento`, `projetos`, `fornecedores` — cada uma com os campos indicados + `user_id`
- `chat_conversations` e `chat_messages` — histórico do chat

### Fluxo do Usuário
1. Faz login/cadastro
2. Importa CSVs com dados financeiros
3. Visualiza resumo no dashboard
4. Faz perguntas no chat e recebe respostas baseadas nos seus dados reais

