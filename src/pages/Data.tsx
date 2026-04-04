import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAllowedTables } from "@/hooks/useAllowedTables";
import { tableSchemas } from "@/lib/csv-schemas";
import { formatValue } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Database, Trash2, RefreshCw, ChevronLeft, ChevronRight, Download } from "lucide-react";
import * as XLSX from "xlsx";

type ValidTableName = "investimentos" | "dre" | "balanco" | "fluxo_de_caixa" | "folha_de_pagamento" | "projetos" | "fornecedores";

const PAGE_SIZE = 50;

export default function DataPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { allowedTables, loading: tablesLoading } = useAllowedTables();
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [data, setData] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Confirm delete all dialog
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const allowedSchemas = tableSchemas.filter((s) => allowedTables.includes(s.name));
  const schema = tableSchemas.find((s) => s.name === selectedTable);

  // Auto-select first allowed table
  useEffect(() => {
    if (!tablesLoading && allowedSchemas.length > 0 && !selectedTable) {
      setSelectedTable(allowedSchemas[0].name);
    }
  }, [tablesLoading, allowedSchemas]);

  const loadData = async () => {
    if (!user || !schema || !allowedTables.includes(selectedTable)) return;
    setLoading(true);

    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const [{ data: rows, error, count }] = await Promise.all([
      supabase
        .from(selectedTable as ValidTableName)
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to),
    ]);

    if (error) {
      toast({ title: "Erro ao carregar dados", description: error.message, variant: "destructive" });
    } else {
      setData(rows || []);
      setTotalCount(count || 0);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (selectedTable && allowedTables.includes(selectedTable)) {
      setPage(0);
    }
  }, [selectedTable]);

  useEffect(() => {
    loadData();
  }, [user, selectedTable, page, allowedTables]);

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
      setTotalCount((prev) => prev - 1);
      toast({ title: "Registro excluído" });
    }
    setDeleting(null);
  };

  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!user || !schema || !allowedTables.includes(selectedTable)) return;
    setDownloading(true);
    try {
      // Fetch all rows (paginate past the 1000 limit)
      let allRows: Record<string, any>[] = [];
      let from = 0;
      const batchSize = 1000;
      while (true) {
        const { data: rows, error } = await supabase
          .from(selectedTable as ValidTableName)
          .select("*")
          .order("created_at", { ascending: false })
          .range(from, from + batchSize - 1);
        if (error) {
          toast({ title: "Erro ao exportar", description: error.message, variant: "destructive" });
          setDownloading(false);
          return;
        }
        if (!rows || rows.length === 0) break;
        allRows = allRows.concat(rows);
        if (rows.length < batchSize) break;
        from += batchSize;
      }

      // Map to friendly column names
      const mapped = allRows.map((row) => {
        const obj: Record<string, any> = {};
        for (const col of schema.columns) {
          obj[col.label] = row[col.key] ?? "";
        }
        return obj;
      });

      const ws = XLSX.utils.json_to_sheet(mapped);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, schema.label.slice(0, 31));
      XLSX.writeFile(wb, `${schema.label}.xlsx`);
    } finally {
      setDownloading(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!user || !schema) return;
    const { error } = await supabase
      .from(selectedTable as ValidTableName)
      .delete()
      .eq("user_id", user.id);

    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      setData([]);
      setTotalCount(0);
      setPage(0);
      toast({ title: "Todos os registros excluídos" });
    }
    setDeleteAllOpen(false);
    setDeleteConfirmText("");
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  if (tablesLoading) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px] w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dados Importados</h1>
          <p className="text-muted-foreground">Visualize e gerencie os dados de cada tabela.</p>
        </div>
        <Select value={selectedTable} onValueChange={setSelectedTable}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent>
            {allowedSchemas.map((s) => (
              <SelectItem key={s.name} value={s.name}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {schema && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Database className="h-5 w-5 text-primary" />
              {schema.label} — {totalCount} registros
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
                <RefreshCw className={`mr-1 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Atualizar
              </Button>
              {totalCount > 0 && (
                <Button variant="destructive" size="sm" onClick={() => setDeleteAllOpen(true)}>
                  <Trash2 className="mr-1 h-4 w-4" />
                  Excluir todos
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : data.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Database className="mb-4 h-10 w-10 text-muted-foreground/40" />
                <p className="text-muted-foreground">Nenhum dado importado nesta tabela.</p>
              </div>
            ) : (
              <>
                <div className="max-h-[60vh] overflow-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {schema.columns.map((col) => (
                          <TableHead key={col.key}>{col.label}</TableHead>
                        ))}
                        <TableHead className="w-16">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.map((row) => (
                        <TableRow key={row.id}>
                          {schema.columns.map((col) => (
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

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4">
                    <p className="text-sm text-muted-foreground">
                      Página {page + 1} de {totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page === 0}>
                        <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages - 1}>
                        Próximo <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Delete all confirmation dialog */}
      <Dialog open={deleteAllOpen} onOpenChange={(open) => { setDeleteAllOpen(open); setDeleteConfirmText(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir todos os registros</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Esta ação é irreversível. Para confirmar, digite <strong>{schema?.label}</strong> abaixo:
          </p>
          <Input
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder={schema?.label}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteAllOpen(false); setDeleteConfirmText(""); }}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={deleteConfirmText !== schema?.label}
              onClick={handleDeleteAll}
            >
              Excluir tudo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
