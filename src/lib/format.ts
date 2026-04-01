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

/**
 * Normalizes a safra value to mm/yyyy format.
 * Handles: dd/mm/yyyy -> mm/yyyy, Excel serial numbers, and passthrough for mm/yyyy.
 */
export function normalizeSafra(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.trim();
  // Already mm/yyyy
  if (/^\d{2}\/\d{4}$/.test(v)) return v;
  // dd/mm/yyyy -> mm/yyyy
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(v)) {
    const parts = v.split("/");
    return `${parts[1].padStart(2, "0")}/${parts[2]}`;
  }
  // yyyy-mm-dd (ISO) -> mm/yyyy
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const parts = v.split("-");
    return `${parts[1]}/${parts[0]}`;
  }
  // Excel serial number
  const num = Number(v);
  if (!isNaN(num) && num > 10000) {
    const excelEpoch = new Date(1899, 11, 30);
    const d = new Date(excelEpoch.getTime() + num * 86400000);
    return `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  }
  return v;
}

export function formatValue(value: any, key: string): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") {
    if (CURRENCY_KEYS.has(key)) return fmtCurrency(value);
    return value.toLocaleString("pt-BR");
  }
  return String(value);
}
