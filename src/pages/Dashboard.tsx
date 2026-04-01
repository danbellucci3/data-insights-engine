import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAllowedTables } from "@/hooks/useAllowedTables";
import { fmtCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";
import { DollarSign, TrendingUp, Building2, Users, Calendar } from "lucide-react";
import DashboardExport from "@/components/DashboardExport";
import { Badge } from "@/components/ui/badge";

const COLORS = [
  "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
  "hsl(var(--chart-4))", "hsl(var(--chart-5))",
];

type ValidTableName = "investimentos" | "dre" | "balanco" | "fluxo_de_caixa" | "folha_de_pagamento" | "projetos" | "fornecedores";

export default function Dashboard() {
  const { user } = useAuth();
  const { allowedTables, loading: tablesLoading } = useAllowedTables();
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [empresas, setEmpresas] = useState<string[]>([]);
  const [allSafras, setAllSafras] = useState<string[]>([]);
  const [selectedEmpresa, setSelectedEmpresa] = useState<string>("all");
  const [safraInicio, setSafraInicio] = useState<string>("all");
  const [safraFim, setSafraFim] = useState<string>("all");
  const [dataLoading, setDataLoading] = useState(true);
  const [stats, setStats] = useState({
    totalInvestimentos: 0,
    totalFaturamento: 0,
    totalFuncionarios: 0,
    saldoCaixa: 0,
  });
  const [dreData, setDreData] = useState<any[]>([]);
  const [fluxoData, setFluxoData] = useState<any[]>([]);
  const [investData, setInvestData] = useState<any[]>([]);
  const [balancoData, setBalancoData] = useState<any[]>([]);
  const [folhaData, setFolhaData] = useState<any[]>([]);
  const [projetosData, setProjetosData] = useState<any[]>([]);
  const [fornecedoresData, setFornecedoresData] = useState<any[]>([]);
  const [safraRanges, setSafraRanges] = useState<Record<string, { min: string; max: string; count: number }>>({});
  const has = (t: string) => allowedTables.includes(t);

  useEffect(() => {
    if (!user || tablesLoading) return;
    loadEmpresas();
    loadAllSafras();
  }, [user, tablesLoading, allowedTables]);

  useEffect(() => {
    if (!user || tablesLoading) return;
    loadAll();
  }, [user, selectedEmpresa, safraInicio, safraFim, tablesLoading, allowedTables]);

  const loadEmpresas = async () => {
    const allEmpresas = new Set<string>();
    const queries = allowedTables.map((table) =>
      supabase.from(table as ValidTableName).select("empresa")
    );
    const results = await Promise.all(queries);
    results.forEach(({ data }) => data?.forEach((row) => allEmpresas.add(row.empresa)));
    setEmpresas(Array.from(allEmpresas).sort());
  };

  const loadAllSafras = async () => {
    const safraSet = new Set<string>();
    const safraFields: { table: ValidTableName; field: string }[] = [
      { table: "dre", field: "safra" },
      { table: "balanco", field: "safra" },
      { table: "folha_de_pagamento", field: "safra" },
      { table: "projetos", field: "safra" },
      { table: "fornecedores", field: "safra" },
      { table: "investimentos", field: "data" },
      { table: "fluxo_de_caixa", field: "data" },
    ].filter(t => has(t.table));
    const results = await Promise.all(
      safraFields.map(t => supabase.from(t.table).select(t.field))
    );
    results.forEach(({ data }, i) => {
      data?.forEach((r: any) => {
        const v = r[safraFields[i].field];
        if (v) safraSet.add(v);
      });
    });
    setAllSafras(Array.from(safraSet).sort());
  };

  const getSafraField = (table: string) => {
    if (table === "fluxo_de_caixa" || table === "investimentos") return "data";
    return "safra";
  };

  const filter = (query: any, table?: string) => {
    let q = query;
    if (selectedEmpresa !== "all") q = q.eq("empresa", selectedEmpresa);
    if (table && (safraInicio !== "all" || safraFim !== "all")) {
      const field = getSafraField(table);
      if (safraInicio !== "all") q = q.gte(field, safraInicio);
      if (safraFim !== "all") q = q.lte(field, safraFim);
    }
    return q;
  };

  const loadAll = async () => {
    setDataLoading(true);

    // Stats
    const statsPromises: PromiseLike<any>[] = [];
    const statsKeys: string[] = [];

    if (has("investimentos")) {
      statsPromises.push(filter(supabase.from("investimentos").select("valor_bruto")));
      statsKeys.push("inv");
    }
    if (has("dre")) {
      statsPromises.push(filter(supabase.from("dre").select("faturamento")));
      statsKeys.push("dre");
    }
    if (has("folha_de_pagamento")) {
      statsPromises.push(filter(supabase.from("folha_de_pagamento").select("nome_funcionario")));
      statsKeys.push("folha");
    }
    if (has("fluxo_de_caixa")) {
      if (selectedEmpresa !== "all") {
        statsPromises.push(
          supabase.from("fluxo_de_caixa").select("saldo_conta_corrente")
            .eq("empresa", selectedEmpresa)
            .order("data", { ascending: false }).limit(1).then(r => r)
        );
      } else {
        statsPromises.push(
          supabase.from("fluxo_de_caixa").select("empresa, data, saldo_conta_corrente")
            .order("data", { ascending: false }).then(r => r)
        );
      }
      statsKeys.push("fluxoStats");
    }

    // Chart data
    const chartPromises: PromiseLike<any>[] = [];
    const chartKeys: string[] = [];

    if (has("dre")) {
      chartPromises.push(filter(supabase.from("dre").select("safra, faturamento, custos, ebitda, lucro_liquido").order("safra")));
      chartKeys.push("dre");
    }
    if (has("fluxo_de_caixa")) {
      chartPromises.push(filter(supabase.from("fluxo_de_caixa").select("data, total_entradas, total_saidas, saldo_conta_corrente").order("data")));
      chartKeys.push("fluxo");
    }
    if (has("investimentos")) {
      chartPromises.push(filter(supabase.from("investimentos").select("banco, valor_bruto, ativo")));
      chartKeys.push("invest");
    }
    if (has("balanco")) {
      chartPromises.push(filter(supabase.from("balanco").select("safra, ativo_circulante, ativo_nao_circulante, passivo_circulante, passivo_nao_circulante, patrimonio_liquido").order("safra")));
      chartKeys.push("balanco");
    }
    if (has("folha_de_pagamento")) {
      chartPromises.push(filter(supabase.from("folha_de_pagamento").select("nome_funcionario, valor, safra")));
      chartKeys.push("folha");
    }
    if (has("projetos")) {
      chartPromises.push(filter(supabase.from("projetos").select("status")));
      chartKeys.push("projetos");
    }
    if (has("fornecedores")) {
      chartPromises.push(filter(supabase.from("fornecedores").select("nome_fornecedor, valor_contrato")));
      chartKeys.push("fornecedores");
    }

    const [statsResults, chartResults] = await Promise.all([
      Promise.all(statsPromises),
      Promise.all(chartPromises),
    ]);

    // Process stats
    const newStats = { totalInvestimentos: 0, totalFaturamento: 0, totalFuncionarios: 0, saldoCaixa: 0 };
    statsKeys.forEach((key, i) => {
      const res = statsResults[i];
      if (key === "inv") {
        newStats.totalInvestimentos = res.data?.reduce((s: number, r: any) => s + (r.valor_bruto || 0), 0) || 0;
      } else if (key === "dre") {
        newStats.totalFaturamento = res.data?.reduce((s: number, r: any) => s + (r.faturamento || 0), 0) || 0;
      } else if (key === "folha") {
        newStats.totalFuncionarios = new Set(res.data?.map((r: any) => r.nome_funcionario)).size;
      } else if (key === "fluxoStats") {
        if (selectedEmpresa !== "all") {
          newStats.saldoCaixa = res.data?.[0]?.saldo_conta_corrente || 0;
        } else if (res.data) {
          const latest = new Map<string, number>();
          for (const row of res.data) {
            if (!latest.has(row.empresa)) latest.set(row.empresa, row.saldo_conta_corrente || 0);
          }
          newStats.saldoCaixa = Array.from(latest.values()).reduce((s, v) => s + v, 0);
        }
      }
    });
    setStats(newStats);

    // Process chart data
    chartKeys.forEach((key, i) => {
      const data = chartResults[i].data || [];
      switch (key) {
        case "dre": setDreData(data); break;
        case "fluxo": setFluxoData(data); break;
        case "invest": {
          if (data.length > 0) {
            const byBanco = new Map<string, number>();
            data.forEach((r: any) => {
              const k = r.banco || "Outros";
              byBanco.set(k, (byBanco.get(k) || 0) + (r.valor_bruto || 0));
            });
            setInvestData(Array.from(byBanco.entries()).map(([banco, valor]) => ({ banco, valor })));
          } else setInvestData([]);
          break;
        }
        case "balanco": setBalancoData(data); break;
        case "folha": {
          if (data.length > 0) {
            const byFunc = new Map<string, number>();
            data.forEach((r: any) => {
              const k = r.nome_funcionario || "Outros";
              byFunc.set(k, (byFunc.get(k) || 0) + (r.valor || 0));
            });
            setFolhaData(Array.from(byFunc.entries()).map(([nome, valor]) => ({ nome, valor })));
          } else setFolhaData([]);
          break;
        }
        case "projetos": {
          if (data.length > 0) {
            const byStatus = new Map<string, number>();
            data.forEach((r: any) => {
              const k = r.status || "Sem status";
              byStatus.set(k, (byStatus.get(k) || 0) + 1);
            });
            setProjetosData(Array.from(byStatus.entries()).map(([status, qtd]) => ({ status, qtd })));
          } else setProjetosData([]);
          break;
        }
        case "fornecedores": {
          if (data.length > 0) {
            const byForn = new Map<string, number>();
            data.forEach((r: any) => {
              const k = r.nome_fornecedor || "Outros";
              byForn.set(k, (byForn.get(k) || 0) + (r.valor_contrato || 0));
            });
            setFornecedoresData(
              Array.from(byForn.entries()).map(([nome, valor]) => ({ nome, valor }))
                .sort((a, b) => b.valor - a.valor).slice(0, 10)
            );
          } else setFornecedoresData([]);
          break;
        }
      }
    });

    // Reset data for tables not allowed
    if (!has("dre")) setDreData([]);
    if (!has("fluxo_de_caixa")) setFluxoData([]);
    if (!has("investimentos")) setInvestData([]);
    if (!has("balanco")) setBalancoData([]);
    if (!has("folha_de_pagamento")) setFolhaData([]);
    if (!has("projetos")) setProjetosData([]);
    if (!has("fornecedores")) setFornecedoresData([]);

    // Load safra ranges for each table
    const safraTablesConfig = [
      { key: "dre", table: "dre" as ValidTableName, label: "DRE", safraField: "safra" },
      { key: "balanco", table: "balanco" as ValidTableName, label: "Balanço", safraField: "safra" },
      { key: "investimentos", table: "investimentos" as ValidTableName, label: "Investimentos", safraField: "data" },
      { key: "fluxo_de_caixa", table: "fluxo_de_caixa" as ValidTableName, label: "Fluxo de Caixa", safraField: "data" },
      { key: "folha_de_pagamento", table: "folha_de_pagamento" as ValidTableName, label: "Folha de Pagamento", safraField: "safra" },
      { key: "projetos", table: "projetos" as ValidTableName, label: "Projetos", safraField: "safra" },
      { key: "fornecedores", table: "fornecedores" as ValidTableName, label: "Fornecedores", safraField: "safra" },
    ].filter(t => has(t.key));

    const safraPromises = safraTablesConfig.map(t =>
      filter(supabase.from(t.table).select(t.safraField)).then(res => ({
        key: t.key,
        label: t.label,
        values: (res.data || []).map((r: any) => r[t.safraField]).filter(Boolean) as string[],
      }))
    );
    const safraResults = await Promise.all(safraPromises);
    const ranges: Record<string, { min: string; max: string; count: number }> = {};
    safraResults.forEach(({ label, values }) => {
      if (values.length === 0) return;
      const unique = [...new Set(values)].sort() as string[];
      ranges[label] = { min: unique[0] as string, max: unique[unique.length - 1] as string, count: unique.length };
    });
    setSafraRanges(ranges);

    setDataLoading(false);
  };

  const fmt = (n: number) => fmtCurrency(n);

  const summaryCards = [
    { label: "Total Investimentos", value: fmt(stats.totalInvestimentos), icon: DollarSign, color: "text-primary", show: has("investimentos") },
    { label: "Faturamento Total", value: fmt(stats.totalFaturamento), icon: TrendingUp, color: "text-accent", show: has("dre") },
    { label: "Saldo em Caixa", value: fmt(stats.saldoCaixa), icon: Building2, color: "text-primary", show: has("fluxo_de_caixa") },
    { label: "Funcionários", value: stats.totalFuncionarios.toString(), icon: Users, color: "text-accent", show: has("folha_de_pagamento") },
  ].filter((c) => c.show);

  const hasAnyData = dreData.length > 0 || fluxoData.length > 0 || investData.length > 0 ||
    balancoData.length > 0 || folhaData.length > 0 || projetosData.length > 0 || fornecedoresData.length > 0;

  const isLoading = tablesLoading || dataLoading;

  return (
    <div ref={dashboardRef} className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral dos seus dados financeiros.</p>
        </div>
        <div className="flex items-center gap-2">
          <DashboardExport targetRef={dashboardRef} />
          <Select value={selectedEmpresa} onValueChange={setSelectedEmpresa}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Todas as empresas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as empresas</SelectItem>
              {empresas.map((e) => (
                <SelectItem key={e} value={e}>{e}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="flex items-center gap-4 p-6">
                  <Skeleton className="h-12 w-12 rounded-xl" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-6 w-32" />
                  </div>
                </CardContent>
              </Card>
            ))
          : summaryCards.map(({ label, value, icon: Icon, color }) => (
              <Card key={label}>
                <CardContent className="flex items-center gap-4 p-6">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-muted ${color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="text-xl font-bold">{value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Safra coverage per table */}
      {!isLoading && Object.keys(safraRanges).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Cobertura de Safras por Tabela
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Object.entries(safraRanges).map(([table, range]) => (
                <div key={table} className="flex flex-col gap-1.5 rounded-lg border bg-muted/30 p-3">
                  <span className="text-sm font-medium">{table}</span>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-xs">{range.min}</Badge>
                    <span className="text-xs text-muted-foreground">→</span>
                    <Badge variant="outline" className="text-xs">{range.max}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">{range.count} safra{range.count !== 1 ? "s" : ""}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
              <CardContent><Skeleton className="h-[300px] w-full rounded-lg" /></CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Charts grid */}
      {!isLoading && (
        <div className="grid gap-6 lg:grid-cols-2">
          {dreData.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">DRE por Safra</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dreData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="safra" className="text-xs" />
                    <YAxis className="text-xs" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Bar dataKey="faturamento" fill={COLORS[0]} name="Faturamento" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="custos" fill={COLORS[4]} name="Custos" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="lucro_liquido" fill={COLORS[1]} name="Lucro Líquido" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {fluxoData.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Fluxo de Caixa</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={fluxoData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="data" className="text-xs" />
                    <YAxis className="text-xs" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Line type="monotone" dataKey="total_entradas" stroke={COLORS[1]} name="Entradas" strokeWidth={2} />
                    <Line type="monotone" dataKey="total_saidas" stroke={COLORS[4]} name="Saídas" strokeWidth={2} />
                    <Line type="monotone" dataKey="saldo_conta_corrente" stroke={COLORS[0]} name="Saldo" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {investData.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Investimentos por Banco</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={investData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" className="text-xs" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="banco" className="text-xs" width={100} />
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Bar dataKey="valor" fill={COLORS[2]} name="Valor Bruto" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {balancoData.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Balanço Patrimonial por Safra</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={balancoData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="safra" className="text-xs" />
                    <YAxis className="text-xs" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Bar dataKey="ativo_circulante" fill={COLORS[0]} name="Ativo Circulante" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="passivo_circulante" fill={COLORS[4]} name="Passivo Circulante" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="patrimonio_liquido" fill={COLORS[1]} name="Patrimônio Líquido" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {folhaData.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Folha de Pagamento por Funcionário</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={folhaData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" className="text-xs" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="nome" className="text-xs" width={80} />
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Bar dataKey="valor" fill={COLORS[3]} name="Total Pago" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {projetosData.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Projetos por Status</CardTitle></CardHeader>
              <CardContent className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={projetosData} dataKey="qtd" nameKey="status" cx="50%" cy="50%" outerRadius={100}
                      label={({ status, qtd }) => `${status} (${qtd})`}>
                      {projetosData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {fornecedoresData.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Top Fornecedores por Valor de Contrato</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={fornecedoresData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" className="text-xs" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="nome" className="text-xs" width={100} />
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Bar dataKey="valor" fill={COLORS[0]} name="Valor Contrato" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!isLoading && !hasAnyData && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Building2 className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="text-lg font-medium">Nenhum dado encontrado</h3>
            <p className="text-muted-foreground">Importe seus dados na aba "Importar Dados" para visualizar o dashboard.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
