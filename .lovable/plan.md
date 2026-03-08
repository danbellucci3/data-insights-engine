

## Análise do Sistema FinAnalytics — Melhorias Sugeridas

Após revisar toda a estrutura do projeto, identifiquei melhorias organizadas por prioridade.

---

### 1. Segurança

- **Dashboard não respeita perfis de acesso.** O chat filtra tabelas pelo perfil do usuário, mas o Dashboard carrega todas as 7 tabelas diretamente (incluindo folha de pagamento) sem verificar permissões. Deve-se replicar a lógica de restrição no Dashboard e na página de Dados.
- **Página de Dados também ignora perfis.** Qualquer usuário autenticado pode ver e deletar dados de qualquer tabela, incluindo folha de pagamento.
- **Confirmação de e-mail.** O fluxo de cadastro redireciona imediatamente para o app após `signUp`, sem verificar se o e-mail foi confirmado. Isso pode permitir contas com e-mails falsos.
- **Exclusão em massa sem proteção.** O botão "Excluir todos" na página de Dados usa apenas `confirm()` nativo. Seria mais seguro usar um dialog com confirmação por texto (ex: digitar o nome da tabela).

### 2. Persistência e Histórico do Chat

- **Conversas não são salvas.** As tabelas `chat_conversations` e `chat_messages` existem no banco mas não são utilizadas. Ao recarregar a página, todo o histórico se perde. Implementar persistência de conversas com lista lateral de histórico.

### 3. Performance

- **Dashboard faz muitas queries sequenciais.** `loadEmpresas` faz 7 queries sequenciais para buscar empresas. Deveria usar `Promise.all`.
- **Sem cache de dados.** O TanStack Query está instalado mas não é utilizado em nenhuma página. Todas as queries são feitas com `useEffect` + `useState` manual, sem cache, deduplicação ou revalidação.
- **Edge Function carrega todos os dados a cada mensagem.** O chat busca até 500 registros de cada tabela permitida em cada mensagem enviada. Para conversas longas com muitos dados, isso é ineficiente. Considerar cache no servidor ou enviar apenas dados relevantes.

### 4. UX / Interface

- **Sem indicador de loading no Dashboard.** Quando os dados estão carregando, não há skeleton ou spinner — a tela fica vazia.
- **Sem paginação na página de Dados.** Limitado a 500 registros sem opção de ver mais.
- **Upload não valida duplicatas.** Se o usuário importar o mesmo arquivo duas vezes, os dados são duplicados sem aviso.
- **Sem dark mode toggle.** O CSS define variáveis para dark mode e `next-themes` está instalado, mas não há botão para alternar.
- **Mobile: sidebar não tem menu hamburger.** No mobile, os itens de navegação ficam comprimidos em ícones pequenos no header, sem labels.

### 5. Qualidade de Código

- **Tipos `any` em excesso.** Dashboard, Data e Chat usam `any[]` para dados. Criar interfaces tipadas para cada tabela.
- **Lógica de formatação duplicada.** `fmt()` no Dashboard e `formatValue()` na página de Dados fazem a mesma coisa. Extrair para `utils.ts`.
- **Sem tratamento de erro no Dashboard.** As queries do Dashboard não tratam erros — falhas silenciosas.

### 6. Funcionalidades Ausentes Relevantes

- **Sem recuperação de senha.** Não há fluxo de "esqueci minha senha".
- **Sem edição de dados.** A página de Dados permite apenas visualizar e excluir, mas não editar registros individuais.
- **Sem filtro por safra no Dashboard.** Só filtra por empresa, mas safra é uma dimensão importante nos dados.
- **Sem log de ações do admin.** Atribuições de perfil e exclusões não são rastreadas.

---

### Prioridade Recomendada de Implementação

1. **Aplicar restrição de perfis no Dashboard e Dados** (segurança crítica)
2. **Migrar queries para TanStack Query** (performance + UX)
3. **Persistir histórico do chat** (as tabelas já existem)
4. **Adicionar loading states e dark mode toggle** (UX rápida)
5. **Recuperação de senha e validação de duplicatas no upload**

Posso implementar qualquer uma dessas melhorias. Qual você gostaria de priorizar?

