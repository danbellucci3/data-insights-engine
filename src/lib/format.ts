const CURRENCY_KEYS = new Set([
  "valor_bruto", "imposto_renda", "receita_bruta_dia", "faturamento",
  "custos", "despesa", "impostos", "ebitda", "lucro_liquido",
  "ativo_circulante", "ativo_nao_circulante", "passivo_circulante",
  "passivo_nao_circulante", "patrimonio_liquido", "total_entradas",
  "total_saidas", "saldo_conta_corrente", "valor", "valor_contrato",
]);

export function fmtCurrency(n: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits,
  }).format(n);
}

export function formatValue(value: any, key: string): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") {
    if (CURRENCY_KEYS.has(key)) return fmtCurrency(value);
    return value.toLocaleString("pt-BR");
  }
  return String(value);
}
