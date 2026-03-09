import { useState, useCallback } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { tableSchemas, TableSchema } from "@/lib/csv-schemas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Upload as UploadIcon, FileSpreadsheet, Trash2, CheckCircle2, Download } from "lucide-react";

type ValidTableName = "investimentos" | "dre" | "balanco" | "fluxo_de_caixa" | "folha_de_pagamento" | "projetos" | "fornecedores";

function parseExcelDate(value: string): Date | null {
  const num = Number(value);
  if (!isNaN(num) && num > 10000) {
    const excelEpoch = new Date(1899, 11, 30);
    return new Date(excelEpoch.getTime() + num * 86400000);
  }
  // dd/mm/yyyy
  const parts = value.split("/");
  if (parts.length === 3) {
    return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
  }
  return null;
}

const SAFRA_KEYS = new Set(["safra"]);

function normalize(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[_\s]+/g, " ").trim().toLowerCase();
}

function mapRows(rawRows: Record<string, any>[], schema: TableSchema): Record<string, any>[] {
  return rawRows.map((row) => {
    const mapped: Record<string, any> = {};
    schema.columns.forEach((col) => {
      const colLabelNorm = normalize(col.label);
      const colKeyNorm = normalize(col.key);
      const csvKey = Object.keys(row).find(
        (k) => { const n = normalize(k); return n === colLabelNorm || n === colKeyNorm; }
      );
      let value: any = csvKey ? row[csvKey]?.toString().trim() : "";

      if (SAFRA_KEYS.has(col.key) && value) {
        // Safra: convert to mm/yyyy for display, store as mm/yyyy
        const d = parseExcelDate(value);
        if (d) {
          value = `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
        } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
          // Already dd/mm/yyyy, convert to mm/yyyy
          const parts = value.split("/");
          value = `${parts[1]}/${parts[2]}`;
        }
      } else if (col.type === "number" && value) {
        value = parseFloat(value.replace(/[^\d.,-]/g, "").replace(",", "."));
        if (isNaN(value)) value = null;
      } else if (col.type === "date" && value) {
        const d = parseExcelDate(value);
        if (d) {
          value = d.toISOString().split("T")[0];
        }
      }

      mapped[col.key] = value === "" ? null : value;
    });
    return mapped;
  });
}

export default function UploadPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [selectedVisao, setSelectedVisao] = useState<"real" | "orçado" | "forecast">("real");
  const [previewData, setPreviewData] = useState<Record<string, any>[]>([]);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState("");

  const schema = tableSchemas.find((s) => s.name === selectedTable);

  const handleFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !schema) return;
      setFileName(file.name);

      const ext = file.name.split(".").pop()?.toLowerCase();

      if (ext === "csv") {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            setPreviewData(mapRows(results.data as Record<string, any>[], schema).slice(0, 100));
          },
          error: () => toast({ title: "Erro ao ler CSV", variant: "destructive" }),
        });
      } else if (ext === "xls" || ext === "xlsx") {
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const wb = XLSX.read(evt.target?.result, { type: "array" });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "" });
            setPreviewData(mapRows(rawRows, schema).slice(0, 100));
          } catch {
            toast({ title: "Erro ao ler planilha", variant: "destructive" });
          }
        };
        reader.readAsArrayBuffer(file);
      } else {
        toast({ title: "Formato não suportado", description: "Use .csv, .xls ou .xlsx", variant: "destructive" });
      }
    },
    [schema, toast]
  );

  const downloadTemplate = (tableSchema: TableSchema) => {
    const headers = tableSchema.columns.map((c) => c.label);
    const exampleRow = tableSchema.columns.map((c) => {
      if (c.key === "visao") return "real";
      if (c.type === "number") return "0";
      if (c.type === "date") return "01/01/2024";
      return "Exemplo";
    });
    
    const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
    ws["!cols"] = headers.map(() => ({ wch: 18 }));
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dados");
    XLSX.writeFile(wb, `modelo_${tableSchema.name}.xlsx`);
  };

  const handleImport = async () => {
    if (!user || !schema || previewData.length === 0) return;
    setImporting(true);

    const tableName = schema.name as ValidTableName;
    const rows = previewData.map((row) => ({ 
      ...row, 
      user_id: user.id,
      visao: selectedVisao 
    }));

    const { error } = await supabase.from(tableName).insert(rows as any);

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
        <p className="text-muted-foreground">Faça upload de arquivos CSV ou Excel para alimentar suas tabelas.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Modelos de Planilha</CardTitle>
          <CardDescription>Baixe um modelo em branco para cada tabela e preencha com seus dados.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {tableSchemas.map((schema) => (
              <Button
                key={schema.name}
                variant="outline"
                size="sm"
                onClick={() => downloadTemplate(schema)}
                className="flex flex-col items-center gap-2 h-auto py-3"
              >
                <Download className="h-4 w-4" />
                <span className="text-xs text-center">{schema.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
        <CardHeader>
          <CardTitle className="text-lg">Selecionar Tabela</CardTitle>
          <CardDescription>Escolha a tabela e faça upload do arquivo correspondente.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
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

            <Select value={selectedVisao} onValueChange={(v) => setSelectedVisao(v as "real" | "orçado" | "forecast")}>
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="real">Real</SelectItem>
                <SelectItem value="orçado">Orçado</SelectItem>
                <SelectItem value="forecast">Forecast</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {schema && (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                <strong>Tabela:</strong> {schema.label} | <strong>Visão:</strong> {selectedVisao.charAt(0).toUpperCase() + selectedVisao.slice(1)}
              </div>
              <div className="text-sm text-muted-foreground">
                <strong>Colunas esperadas:</strong>{" "}
                {schema.columns.map((c) => c.label).join(", ")}
              </div>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed border-border p-6 transition-colors hover:border-primary/50 hover:bg-muted/50">
                <UploadIcon className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="font-medium">{fileName || "Clique para selecionar o arquivo"}</p>
                  <p className="text-sm text-muted-foreground">Formatos: .csv, .xls, .xlsx</p>
                </div>
                <input type="file" accept=".csv,.xls,.xlsx" className="hidden" onChange={handleFile} />
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
