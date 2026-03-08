import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";
import { DollarSign, TrendingUp, Building2, Users } from "lucide-react";

const COLORS = [
  "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
  "hsl(var(--chart-4))", "hsl(var(--chart-5))",
];

export default function Dashboard() {
  const { user } = useAuth();
  const [empresas, setEmpresas] = useState<string[]>([]);
  const [selectedEmpresa, setSelectedEmpresa] = useState<string>("all");
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

  useEffect(() => {
    if (!user) return;
    loadEmpresas();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    loadStats();
    loadChartData();
  }, [user, selectedEmpresa]);

  const loadEmpresas = async () => {
    const tables = ["investimentos", "dre", "balanco", "fluxo_de_caixa", "folha_de_pagamento", "projetos", "fornecedores"] as const;
    const allEmpresas = new Set<string>();
    for (const table of tables) {
      const { data } = await supabase.from(table).select("empresa").eq("user_id", user!.id);
      data?.forEach((row) => allEmpresas.add(row.empresa));
    }
    setEmpresas(Array.from(allEmpresas).sort());
  };

  const filter = (query: any) => {
    let q = query.eq("user_id", user!.id);
    if (selectedEmpresa !== "all") q = q.eq("empresa", selectedEmpresa);
    return q;
  };

  const loadStats = async () => {
    const [inv, dre, folha] = await Promise.all([
      filter(supabase.from("investimentos").select("valor_bruto")),
      filter(supabase.from("dre").select("faturamento")),
      filter(supabase.from("folha_de_pagamento").select("nome_funcionario")),
    ]);

    let saldoCaixa = 0;
    if (selectedEmpresa !== "all") {
      const { data: fluxo } = await supabase
        .from("fluxo_de_caixa")
        .select("saldo_conta_corrente")
        .eq("user_id", user!.id)
        .eq("empresa", selectedEmpresa)
        .order("data", { ascending: false })
        .limit(1);
      saldoCaixa = fluxo?.[0]?.saldo_conta_corrente || 0;
    } else {
      const { data: allFluxo } = await supabase
        .from("fluxo_de_caixa")
        .select("empresa, data, saldo_conta_corrente")
        .eq("user_id", user!.id)
        .order("data", { ascending: false });
      if (allFluxo) {
        const latestPerEmpresa = new Map<string, number>();
        for (const row of allFluxo) {
          if (!latestPerEmpresa.has(row.empresa)) {
            latestPerEmpresa.set(row.empresa, row.saldo_conta_corrente || 0);
          }
        }
        saldoCaixa = Array.from(latestPerEmpresa.values()).reduce((sum, v) => sum + v, 0);
      }
    }

    setStats({
      totalInvestimentos: inv.data?.reduce((sum, r) => sum + (r.valor_bruto || 0), 0) || 0,
      totalFaturamento: dre.data?.reduce((sum, r) => sum + (r.faturamento || 0), 0) || 0,
      totalFuncionarios: new Set(folha.data?.map((r) => r.nome_funcionario)).size,
      saldoCaixa,
    });
  };

  const loadChartData = async () => {
    const [dreRes, fluxoRes, investRes, balancoRes, folhaRes, projetosRes, fornecedoresRes] = await Promise.all([
      filter(supabase.from("dre").select("safra, faturamento, custos, ebitda, lucro_liquido").order("safra")),
      filter(supabase.from("fluxo_de_caixa").select("data, total_entradas, total_saidas, saldo_conta_corrente").order("data")),
      filter(supabase.from("investimentos").select("banco, valor_bruto, ativo")),
      filter(supabase.from("balanco").select("safra, ativo_circulante, ativo_nao_circulante, passivo_circulante, passivo_nao_circulante, patrimonio_liquido").order("safra")),
      filter(supabase.from("folha_de_pagamento").select("nome_funcionario, valor, safra")),
      filter(supabase.from("projetos").select("status")),
      filter(supabase.from("fornecedores").select("nome_fornecedor, valor_contrato")),
    ]);

    setDreData(dreRes.data || []);
    setFluxoData(fluxoRes.data || []);

    // Investimentos: agrupar por banco
    if (investRes.data && investRes.data.length > 0) {
      const byBanco = new Map<string, number>();
      investRes.data.forEach((r) => {
        const key = r.banco || "Outros";
        byBanco.set(key, (byBanco.get(key) || 0) + (r.valor_bruto || 0));
      });
      setInvestData(Array.from(byBanco.entries()).map(([banco, valor]) => ({ banco, valor })));
    } else {
      setInvestData([]);
    }

    setBalancoData(balancoRes.data || []);

    // Folha: agrupar por funcionário (soma valores)
    if (folhaRes.data && folhaRes.data.length > 0) {
      const byFunc = new Map<string, number>();
      folhaRes.data.forEach((r) => {
        const key = r.nome_funcionario || "Outros";
        byFunc.set(key, (byFunc.get(key) || 0) + (r.valor || 0));
      });
      setFolhaData(Array.from(byFunc.entries()).map(([nome, valor]) => ({ nome, valor })));
    } else {
      setFolhaData([]);
    }

    // Projetos: agrupar por status
    if (projetosRes.data && projetosRes.data.length > 0) {
      const byStatus = new Map<string, number>();
      projetosRes.data.forEach((r) => {
        const key = r.status || "Sem status";
        byStatus.set(key, (byStatus.get(key) || 0) + 1);
      });
      setProjetosData(Array.from(byStatus.entries()).map(([status, qtd]) => ({ status, qtd })));
    } else {
      setProjetosData([]);
    }

    // Fornecedores: top por valor contrato
    if (fornecedoresRes.data && fornecedoresRes.data.length > 0) {
      const byForn = new Map<string, number>();
      fornecedoresRes.data.forEach((r) => {
        const key = r.nome_fornecedor || "Outros";
        byForn.set(key, (byForn.get(key) || 0) + (r.valor_contrato || 0));
      });
      const sorted = Array.from(byForn.entries())
        .map(([nome, valor]) => ({ nome, valor }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 10);
      setFornecedoresData(sorted);
    } else {
      setFornecedoresData([]);
    }
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);

  const summaryCards = [
    { label: "Total Investimentos", value: fmt(stats.totalInvestimentos), icon: DollarSign, color: "text-primary" },
    { label: "Faturamento Total", value: fmt(stats.totalFaturamento), icon: TrendingUp, color: "text-accent" },
    { label: "Saldo em Caixa", value: fmt(stats.saldoCaixa), icon: Building2, color: "text-primary" },
    { label: "Funcionários", value: stats.totalFuncionarios.toString(), icon: Users, color: "text-accent" },
  ];

  const hasAnyData = dreData.length > 0 || fluxoData.length > 0 || investData.length > 0 ||
    balancoData.length > 0 || folhaData.length > 0 || projetosData.length > 0 || fornecedoresData.length > 0;

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral dos seus dados financeiros.</p>
        </div>
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

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map(({ label, value, icon: Icon, color }) => (
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

      {/* Charts grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* DRE */}
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

        {/* Fluxo de Caixa */}
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

        {/* Investimentos por Banco */}
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

        {/* Balanço Patrimonial */}
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

        {/* Folha de Pagamento */}
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

        {/* Projetos por Status */}
        {projetosData.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Projetos por Status</CardTitle></CardHeader>
            <CardContent className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={projetosData}
                    dataKey="qtd"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ status, qtd }) => `${status} (${qtd})`}
                  >
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

        {/* Fornecedores */}
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

      {!hasAnyData && (
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
