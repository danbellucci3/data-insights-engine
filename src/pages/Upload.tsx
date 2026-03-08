import { useState, useCallback } from "react";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { tableSchemas, TableSchema } from "@/lib/csv-schemas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Upload as UploadIcon, FileSpreadsheet, Trash2, CheckCircle2 } from "lucide-react";

type ValidTableName = "investimentos" | "dre" | "balanco" | "fluxo_de_caixa" | "folha_de_pagamento" | "projetos" | "fornecedores";

export default function UploadPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [previewData, setPreviewData] = useState<Record<string, any>[]>([]);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState("");

  const schema = tableSchemas.find((s) => s.name === selectedTable);

  const handleFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !schema) return;
      setFileName(file.name);

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const mapped = results.data.map((row: any) => {
            const mapped: Record<string, any> = {};
            schema.columns.forEach((col) => {
              const csvKey = Object.keys(row).find(
                (k) => k.trim().toLowerCase() === col.label.toLowerCase() || k.trim().toLowerCase() === col.key.toLowerCase()
              );
              let value = csvKey ? row[csvKey]?.toString().trim() : "";
              if (col.type === "number" && value) {
                value = parseFloat(value.replace(/[^\\d.,-]/g, "").replace(",", "."));
                if (isNaN(value)) value = null;
              }
              if (col.type === "date" && value) {
                // Try to parse date, keep as string
                const parts = value.split("/");
                if (parts.length === 3) {
                  value = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
                }
              }
              mapped[col.key] = value === "" ? null : value;
            });
            return mapped;
          });
          setPreviewData(mapped.slice(0, 100));
        },
        error: () => toast({ title: "Erro ao ler CSV", variant: "destructive" }),
      });
    },
    [schema, toast]
  );

  const handleImport = async () => {
    if (!user || !schema || previewData.length === 0) return;
    setImporting(true);

    const tableName = schema.name as ValidTableName;
    const rows = previewData.map((row) => ({ ...row, user_id: user.id }));

    const { error } = await supabase.from(tableName).insert(rows);

    if (error) {
      toast({ title: "Erro na importação", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Dados importados!", description: `${rows.length} registros importados em ${schema.label}.` });
      setPreviewData([]);
      setFileName("");
    }
    setImporting(false);
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Importar Dados</h1>
        <p className="text-muted-foreground">Faça upload de arquivos CSV para alimentar suas tabelas.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Selecionar Tabela</CardTitle>
          <CardDescription>Escolha a tabela e faça upload do CSV correspondente.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedTable} onValueChange={(v) => { setSelectedTable(v); setPreviewData([]); setFileName(""); }}>
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue placeholder="Selecione a tabela..." />
            </SelectTrigger>
            <SelectContent>
              {tableSchemas.map((s) => (
                <SelectItem key={s.name} value={s.name}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {schema && (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                <strong>Colunas esperadas:</strong>{" "}
                {schema.columns.map((c) => c.label).join(", ")}
              </div>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed border-border p-6 transition-colors hover:border-primary/50 hover:bg-muted/50">
                <UploadIcon className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="font-medium">{fileName || "Clique para selecionar o arquivo CSV"}</p>
                  <p className="text-sm text-muted-foreground">Formato: .csv com cabeçalhos</p>
                </div>
                <input type="file" accept=".csv" className="hidden" onChange={handleFile} />
              </label>
            </div>
          )}
        </CardContent>
      </Card>

      {previewData.length > 0 && schema && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                Preview ({previewData.length} linhas)
              </CardTitle>
              <CardDescription>Confira os dados antes de importar.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { setPreviewData([]); setFileName(""); }}>
                <Trash2 className="mr-1 h-4 w-4" /> Limpar
              </Button>
              <Button size="sm" onClick={handleImport} disabled={importing}>
                <CheckCircle2 className="mr-1 h-4 w-4" />
                {importing ? "Importando..." : "Importar"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {schema.columns.map((col) => (
                      <TableHead key={col.key}>{col.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((row, i) => (
                    <TableRow key={i}>
                      {schema.columns.map((col) => (
                        <TableCell key={col.key} className="whitespace-nowrap">
                          {row[col.key] ?? "—"}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
