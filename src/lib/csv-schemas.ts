export interface TableSchema {
  name: string;
  label: string;
  columns: { key: string; label: string; type: "text" | "number" | "date" }[];
}

export const tableSchemas: TableSchema[] = [
  {
    name: "investimentos",
    label: "Investimentos",
    columns: [
      { key: "empresa", label: "Empresa", type: "text" },
      { key: "data", label: "Data", type: "date" },
      { key: "id_lancamento", label: "ID", type: "text" },
      { key: "tipo_lancamento", label: "Tipo de Lançamento", type: "text" },
      { key: "banco", label: "Banco", type: "text" },
      { key: "ativo", label: "Ativo", type: "text" },
      { key: "valor_bruto", label: "Valor Bruto", type: "number" },
      { key: "imposto_renda", label: "Imposto de Renda", type: "number" },
      { key: "receita_bruta_dia", label: "Receita Bruta Dia", type: "number" },
      { key: "remuneracao_dia_cdi", label: "Remuneração Dia (%CDI)", type: "number" },
      { key: "aux1", label: "Aux1", type: "text" },
      { key: "carencia", label: "Carência", type: "text" },
      { key: "visao", label: "Visão", type: "text" },
    ],
  },
  {
    name: "dre",
    label: "DRE",
    columns: [
      { key: "empresa", label: "Empresa", type: "text" },
      { key: "safra", label: "Safra", type: "text" },
      { key: "faturamento", label: "Faturamento", type: "number" },
      { key: "custos", label: "Custos", type: "number" },
      { key: "despesa", label: "Despesa", type: "number" },
      { key: "impostos", label: "Impostos", type: "number" },
      { key: "ebitda", label: "EBITDA", type: "number" },
      { key: "lucro_liquido", label: "Lucro Líquido", type: "number" },
      { key: "visao", label: "Visão", type: "text" },
    ],
  },
  {
    name: "balanco",
    label: "Balanço",
    columns: [
      { key: "empresa", label: "Empresa", type: "text" },
      { key: "safra", label: "Safra", type: "text" },
      { key: "ativo_circulante", label: "Ativo Circulante", type: "number" },
      { key: "ativo_nao_circulante", label: "Ativo Não Circulante", type: "number" },
      { key: "passivo_circulante", label: "Passivo Circulante", type: "number" },
      { key: "passivo_nao_circulante", label: "Passivo Não Circulante", type: "number" },
      { key: "patrimonio_liquido", label: "Patrimônio Líquido", type: "number" },
    ],
  },
  {
    name: "fluxo_de_caixa",
    label: "Fluxo de Caixa",
    columns: [
      { key: "empresa", label: "Empresa", type: "text" },
      { key: "data", label: "Data", type: "date" },
      { key: "total_entradas", label: "Total de Entradas", type: "number" },
      { key: "total_saidas", label: "Total de Saídas", type: "number" },
      { key: "saldo_conta_corrente", label: "Saldo Conta Corrente", type: "number" },
    ],
  },
  {
    name: "folha_de_pagamento",
    label: "Folha de Pagamento",
    columns: [
      { key: "empresa", label: "Empresa", type: "text" },
      { key: "safra", label: "Safra", type: "text" },
      { key: "nome_funcionario", label: "Nome do Funcionário", type: "text" },
      { key: "tipo_recebimento", label: "Tipo de Recebimento", type: "text" },
      { key: "valor", label: "Valor", type: "number" },
    ],
  },
  {
    name: "projetos",
    label: "Projetos",
    columns: [
      { key: "empresa", label: "Empresa", type: "text" },
      { key: "safra", label: "Safra", type: "text" },
      { key: "nome_projeto", label: "Nome Projeto", type: "text" },
      { key: "status", label: "Status", type: "text" },
    ],
  },
  {
    name: "fornecedores",
    label: "Fornecedores",
    columns: [
      { key: "empresa", label: "Empresa", type: "text" },
      { key: "safra", label: "Safra", type: "text" },
      { key: "nome_fornecedor", label: "Nome Fornecedor", type: "text" },
      { key: "data_inicio_contrato", label: "Data Início Contrato", type: "date" },
      { key: "data_fim_contrato", label: "Data Fim Contrato", type: "date" },
      { key: "valor_contrato", label: "Valor Contrato", type: "number" },
    ],
  },
];
