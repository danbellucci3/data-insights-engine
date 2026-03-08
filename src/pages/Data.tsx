import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { tableSchemas } from "@/lib/csv-schemas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Database, Trash2, RefreshCw } from "lucide-react";

type ValidTableName = "investimentos" | "dre" | "balanco" | "fluxo_de_caixa" | "folha_de_pagamento" | "projetos" | "fornecedores";

export default function DataPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedTable, setSelectedTable] = useState<string>("investimentos");
  const [data, setData] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const schema = tableSchemas.find((s) => s.name === selectedTable);

  const loadData = async () => {
    if (!user || !schema) return;
    setLoading(true);
    const { data: rows, error } = await supabase
      .from(selectedTable as ValidTableName)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      toast({ title: "Erro ao carregar dados", description: error.message, variant: "destructive" });
    } else {
      setData(rows || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user, selectedTable]);

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este registro?")) return;
    setDeleting(id);
    const { error } = await supabase
      .from(selectedTable as ValidTableName)
      .delete()
      .eq("id", id);

    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      setData((prev) => prev.filter((r) => r.id !== id));
      toast({ title: "Registro excluído" });
    }
    setDeleting(null);
  };

  const handleDeleteAll = async () => {
    if (!user || !confirm(`Excluir TODOS os ${data.length} registros de ${schema?.label}?`)) return;
    const { error } = await supabase
      .from(selectedTable as ValidTableName)
      .delete()
      .eq("user_id", user.id);

    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      setData([]);
      toast({ title: "Todos os registros excluídos" });
    }
  };

  const formatValue = (value: any, key: string) => {
    if (value === null || value === undefined) return "—";
    if (typeof value === "number") {
      if (["valor_bruto", "imposto_renda", "receita_bruta_dia", "faturamento", "custos", "despesa", "impostos", "ebitda", "lucro_liquido", "ativo_circulante", "ativo_nao_circulante", "passivo_circulante", "passivo_nao_circulante", "patrimonio_liquido", "total_entradas", "total_saidas", "saldo_conta_corrente", "valor", "valor_contrato"].includes(key)) {
        return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
      }
      return value.toLocaleString("pt-BR");
    }
    return String(value);
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dados Importados</h1>
          <p className="text-muted-foreground">Visualize e gerencie os dados de cada tabela.</p>
        </div>
        <Select value={selectedTable} onValueChange={setSelectedTable}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {tableSchemas.map((s) => (
              <SelectItem key={s.name} value={s.name}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Database className="h-5 w-5 text-primary" />
            {schema?.label} — {data.length} registros
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
              <RefreshCw className={`mr-1 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
            {data.length > 0 && (
              <Button variant="destructive" size="sm" onClick={handleDeleteAll}>
                <Trash2 className="mr-1 h-4 w-4" />
                Excluir todos
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Database className="mb-4 h-10 w-10 text-muted-foreground/40" />
              <p className="text-muted-foreground">Nenhum dado importado nesta tabela.</p>
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {schema?.columns.map((col) => (
                      <TableHead key={col.key}>{col.label}</TableHead>
                    ))}
                    <TableHead className="w-16">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row) => (
                    <TableRow key={row.id}>
                      {schema?.columns.map((col) => (
                        <TableCell key={col.key} className="whitespace-nowrap">
                          {formatValue(row[col.key], col.key)}
                        </TableCell>
                      ))}
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(row.id)}
                          disabled={deleting === row.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
