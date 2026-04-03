import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const tableSchemas: Record<string, string[]> = {
  investimentos: ["empresa", "visao", "data", "ativo", "banco", "carencia", "id_lancamento", "tipo_lancamento", "valor_bruto", "receita_bruta_dia", "remuneracao_dia_cdi", "imposto_renda", "aux1"],
  dre: ["empresa", "visao", "safra", "faturamento", "custos", "despesa", "impostos", "ebitda", "lucro_liquido"],
  balanco: ["empresa", "visao", "safra", "ativo_circulante", "ativo_nao_circulante", "passivo_circulante", "passivo_nao_circulante", "patrimonio_liquido"],
  fluxo_de_caixa: ["empresa", "visao", "data", "total_entradas", "total_saidas", "saldo_conta_corrente"],
  folha_de_pagamento: ["empresa", "visao", "safra", "nome_funcionario", "tipo_recebimento", "valor"],
  projetos: ["empresa", "visao", "safra", "nome_projeto", "status"],
  fornecedores: ["empresa", "visao", "safra", "nome_fornecedor", "data_inicio_contrato", "data_fim_contrato", "valor_contrato"],
};

const continuousColumns = new Set([
  "valor_bruto", "receita_bruta_dia", "remuneracao_dia_cdi", "imposto_renda",
  "faturamento", "custos", "despesa", "impostos", "ebitda", "lucro_liquido",
  "ativo_circulante", "ativo_nao_circulante", "passivo_circulante",
  "passivo_nao_circulante", "patrimonio_liquido",
  "total_entradas", "total_saidas", "saldo_conta_corrente",
  "valor", "valor_contrato",
]);

const tableLabels: Record<string, string> = {
  investimentos: "Investimentos",
  dre: "DRE",
  balanco: "Balanço",
  fluxo_de_caixa: "Fluxo de Caixa",
  folha_de_pagamento: "Folha de Pagamento",
  projetos: "Projetos",
  fornecedores: "Fornecedores",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const encoder = new TextEncoder();
  let closed = false;

  function sseEvent(type: string, data: any): Uint8Array {
    return encoder.encode(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  function safeEnqueue(controller: ReadableStreamDefaultController, chunk: Uint8Array) {
    if (!closed) {
      try { controller.enqueue(chunk); } catch { closed = true; }
    }
  }

  function safeClose(controller: ReadableStreamDefaultController) {
    if (!closed) {
      closed = true;
      try { controller.close(); } catch { /* already closed */ }
    }
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
        if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

        const { messages, userId } = await req.json();

        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const allTables = Object.keys(tableSchemas);
        const defaultRestrictedTables = ["folha_de_pagamento"];

        // Determine allowed tables
        const { data: userProfiles } = await supabase
          .from("user_access_profiles")
          .select("profile_id")
          .eq("user_id", userId);

        let allowedTables: string[];
        let restrictedTables: string[];

        if (userProfiles && userProfiles.length > 0) {
          const profileIds = userProfiles.map((p: any) => p.profile_id);
          const { data: profileTables } = await supabase
            .from("access_profile_tables")
            .select("table_name")
            .in("profile_id", profileIds);
          if (profileTables && profileTables.length > 0) {
            allowedTables = [...new Set(profileTables.map((t: any) => t.table_name))];
            restrictedTables = allTables.filter(t => !allowedTables.includes(t));
          } else {
            allowedTables = allTables.filter(t => !defaultRestrictedTables.includes(t));
            restrictedTables = defaultRestrictedTables;
          }
        } else {
          allowedTables = allTables.filter(t => !defaultRestrictedTables.includes(t));
          restrictedTables = defaultRestrictedTables;
        }

        const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
        const isAdmin = roles?.some((r: any) => r.role === "admin");
        if (isAdmin) { allowedTables = allTables; restrictedTables = []; }

        // Accessible user IDs
        const accessibleUserIds = [userId];
        const { data: sharedAccess } = await supabase.from("data_sharing").select("owner_id").eq("shared_with_id", userId);
        if (sharedAccess) {
          for (const s of sharedAccess) {
            if (!accessibleUserIds.includes(s.owner_id)) accessibleUserIds.push(s.owner_id);
          }
        }

        // === Step 1: Map discrete values ===
        safeEnqueue(controller, sseEvent("status", {
          step: "planning",
          message: "Mapeando valores disponíveis nas tabelas...",
          details: { sent: `Consultando valores únicos das colunas categóricas de ${allowedTables.length} tabelas permitidas: ${allowedTables.map(t => tableLabels[t] || t).join(", ")}` },
        }));

        const discreteValuesMap: Record<string, Record<string, string[]>> = {};
        await Promise.all(allowedTables.map(async (tableName) => {
          const cols = tableSchemas[tableName];
          const discreteCols = cols.filter(c => !continuousColumns.has(c));
          const tableValues: Record<string, string[]> = {};

          await Promise.all(discreteCols.map(async (col) => {
            const allVals: any[] = [];
            const PAGE = 1000;
            let offset = 0;
            let more = true;
            while (more) {
              const { data: rows } = await supabase
                .from(tableName)
                .select(col)
                .in("user_id", accessibleUserIds)
                .range(offset, offset + PAGE - 1);
              if (rows && rows.length > 0) {
                allVals.push(...rows);
                offset += rows.length;
                if (rows.length < PAGE) more = false;
              } else { more = false; }
            }
            if (allVals.length > 0) {
              const uniqueVals = [...new Set(allVals.map((r: any) => r[col]).filter((v: any) => v !== null && v !== undefined).map(String))];
              uniqueVals.sort();
              tableValues[col] = uniqueVals;
            }
          }));

          discreteValuesMap[tableName] = tableValues;
        }));

        // Build schema description
        const schemaDescription = allowedTables.map(t => {
          const dateField = (t === "fluxo_de_caixa" || t === "investimentos") ? "data (formato: YYYY-MM-DD)" : "safra (formato: MM/YYYY)";
          const cols = tableSchemas[t];
          const discreteInfo = Object.entries(discreteValuesMap[t] || {})
            .filter(([_, vals]) => vals.length > 0)
            .map(([col, vals]) => `    - ${col}: [${vals.join(", ")}]`)
            .join("\n");
          return `- **${tableLabels[t] || t}** (tabela: \`${t}\`): colunas: ${cols.join(", ")}. Campo de período: ${dateField}${discreteInfo ? `\n  Valores existentes:\n${discreteInfo}` : ""}`;
        }).join("\n");

        const restrictedInfo = restrictedTables.length > 0
          ? `\n\nTabelas RESTRITAS (sem acesso): ${restrictedTables.map(t => tableLabels[t] || t).join(", ")}`
          : "";

        // Build a compact summary of discrete values for the status event
        const discreteSummary: Record<string, Record<string, number>> = {};
        for (const [tbl, colVals] of Object.entries(discreteValuesMap)) {
          const summary: Record<string, number> = {};
          for (const [col, vals] of Object.entries(colVals)) {
            summary[col] = vals.length;
          }
          if (Object.keys(summary).length > 0) discreteSummary[tableLabels[tbl] || tbl] = summary;
        }

        // === Step 2: Ask AI what data it needs ===
        safeEnqueue(controller, sseEvent("status", {
          step: "analyzing",
          message: "Consultando a IA sobre quais dados são necessários...",
          details: {
            sent: `Esquema de ${allowedTables.length} tabelas com valores categóricos mapeados`,
            schemaPreview: discreteSummary,
          },
        }));

        const planningPrompt = `Você é um assistente que analisa perguntas financeiras. Dado a pergunta do usuário e o esquema das tabelas disponíveis, responda APENAS com um JSON indicando quais dados você precisa para responder.

TABELAS DISPONÍVEIS:
${schemaDescription}
${restrictedInfo}

Responda SOMENTE com JSON válido no formato:
{
  "needs_data": true,
  "tables": [
    {
      "table": "nome_da_tabela",
      "columns": ["col1", "col2"],
      "filters": {
        "safra_gte": "01/2024",
        "safra_lte": "12/2024",
        "data_gte": "2024-01-01",
        "data_lte": "2024-12-31",
        "empresa": "opcional"
      }
    }
  ]
}

Se a pergunta não requer dados das tabelas (ex: saudação, pergunta genérica), retorne:
{"needs_data": false, "tables": []}

REGRAS:
- Use APENAS tabelas e colunas que existem no esquema acima
- Sempre inclua "empresa" e "visao" nas colunas solicitadas
- Para tabelas com "safra", use safra_gte/safra_lte no formato MM/YYYY
- Para tabelas com "data", use data_gte/data_lte no formato YYYY-MM-DD
- Se não há filtro de período específico, omita os campos de filtro de período
- Solicite apenas as colunas necessárias para responder a pergunta
- NÃO inclua texto fora do JSON`;

        const conversationContext = messages.slice(-6).map((m: any) => ({ role: m.role, content: m.content }));

        const planResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${GEMINI_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "gemini-2.5-flash",
            messages: [{ role: "system", content: planningPrompt }, ...conversationContext],
            temperature: 0,
          }),
        });

        if (!planResponse.ok) {
          const t = await planResponse.text();
          console.error("Planning step error:", planResponse.status, t);
          safeEnqueue(controller, encoder.encode(`data: ${JSON.stringify({ error: planResponse.status === 429 ? "Rate limit exceeded" : "AI gateway error" })}\n\n`));
          safeClose(controller);
          return;
        }

        const planJson = await planResponse.json();
        const planText = planJson.choices?.[0]?.message?.content || "";

        let plan: { needs_data: boolean; tables: any[] };
        try {
          const jsonMatch = planText.match(/\{[\s\S]*\}/);
          plan = jsonMatch ? JSON.parse(jsonMatch[0]) : { needs_data: false, tables: [] };
          console.log("AI Plan:", JSON.stringify(plan));
        } catch {
          console.error("Failed to parse plan:", planText);
          plan = { needs_data: false, tables: [] };
        }

        // === Step 3: Fetch data ===
        let contextStr = "";
        const contextDataForDownload: Record<string, { label: string; rows: any[] }> = {};

        if (plan.needs_data && plan.tables && plan.tables.length > 0) {
          const requestedSummary = plan.tables.map((t: any) => {
            const label = tableLabels[t.table] || t.table;
            const cols = (t.columns || []).join(", ");
            const filtersStr = t.filters ? Object.entries(t.filters).map(([k, v]) => `${k}=${v}`).join(", ") : "sem filtros";
            return `${label}: colunas [${cols}], filtros: ${filtersStr}`;
          });

          safeEnqueue(controller, sseEvent("status", {
            step: "fetching",
            message: "Buscando dados solicitados pela IA...",
            details: {
              requestedByAI: requestedSummary,
            },
          }));

          const dataParts: string[] = [];

          for (const tableReq of plan.tables) {
            const tableName = tableReq.table;
            if (!allowedTables.includes(tableName)) continue;

            const validCols = tableSchemas[tableName] || [];
            const requestedCols = (tableReq.columns || validCols).filter((c: string) => validCols.includes(c));
            const selectCols = [...new Set(["empresa", "visao", ...requestedCols])];

            let query = supabase.from(tableName).select(selectCols.join(",")).in("user_id", accessibleUserIds);

            const filters = tableReq.filters || {};
            const dateField = (tableName === "fluxo_de_caixa" || tableName === "investimentos") ? "data" : "safra";

            if (dateField === "data") {
              if (filters.data_gte) query = query.gte("data", filters.data_gte);
              if (filters.data_lte) query = query.lte("data", filters.data_lte);
            } else {
              if (filters.safra_gte) query = query.gte("safra", filters.safra_gte);
              if (filters.safra_lte) query = query.lte("safra", filters.safra_lte);
            }
            if (filters.empresa) query = query.eq("empresa", filters.empresa);
            query = query.order(dateField, { ascending: true });

            // Paginate to fetch ALL rows
            const allRows: any[] = [];
            const PAGE_SIZE = 1000;
            let offset = 0;
            let keepFetching = true;
            while (keepFetching) {
              const { data: pageRows, error: pageError } = await query.range(offset, offset + PAGE_SIZE - 1);
              if (pageError) { console.error(`Error fetching ${tableName}:`, pageError); break; }
              if (pageRows && pageRows.length > 0) {
                allRows.push(...pageRows);
                offset += pageRows.length;
                if (pageRows.length < PAGE_SIZE) keepFetching = false;
              } else { keepFetching = false; }
            }

            console.log(`Table ${tableName}: fetched ${allRows.length} rows total`);

            if (allRows.length > 0) {
              const cleanRows = allRows.map((r: any) => {
                const { user_id, id, created_at, ...rest } = r;
                return rest;
              });
              dataParts.push(`### ${tableLabels[tableName] || tableName} (${cleanRows.length} registros):\n${JSON.stringify(cleanRows)}`);
              contextDataForDownload[tableName] = {
                label: tableLabels[tableName] || tableName,
                rows: cleanRows,
              };
            } else {
              dataParts.push(`### ${tableLabels[tableName] || tableName}: Nenhum registro encontrado com os filtros aplicados.`);
            }
          }
          contextStr = dataParts.join("\n\n");

          if (Object.keys(contextDataForDownload).length > 0) {
            safeEnqueue(controller, sseEvent("context_data", contextDataForDownload));
          }
        }

        // === Step 4: Generate response ===
        const fetchedSummary = Object.entries(contextDataForDownload).map(([tbl, { label, rows }]) =>
          `${label}: ${rows.length} registros`
        );

        safeEnqueue(controller, sseEvent("status", {
          step: "responding",
          message: "Gerando resposta...",
          details: {
            sent: fetchedSummary.length > 0
              ? `Enviados ${fetchedSummary.join(", ")} para a IA processar`
              : "Nenhum dado de tabela necessário para esta resposta",
          },
        }));

        const restrictedFinalInfo = restrictedTables.length > 0
          ? `\n\nTABELAS RESTRITAS (o usuário NÃO tem acesso):\n${restrictedTables.map(t => `- ${tableLabels[t] || t}`).join("\n")}\nSe o usuário perguntar sobre dados dessas tabelas, informe que ele não tem permissão.`
          : "";

        const systemPrompt = `Você é um assistente financeiro inteligente. Analise os dados do usuário e responda perguntas de forma clara e precisa em português brasileiro.

${contextStr ? `DADOS DO USUÁRIO:\n${contextStr}` : "Nenhum dado disponível nas tabelas para esta consulta."}
${restrictedFinalInfo}

ANÁLISE DE VISÕES (REAL vs ORÇADO vs FORECAST):
Quando houver dados com diferentes visões (real, orçado, forecast):
- Compare os valores entre as visões
- Calcule desvios percentuais: (Real - Orçado) / Orçado * 100
- Destaque os maiores desvios

INSTRUÇÕES:
- Responda sempre em português brasileiro
- Use formatação markdown
- Formate valores monetários: R$ X.XXX,XX
- Se os dados não contiverem informação suficiente, informe isso
- Faça cálculos quando necessário
- Seja conciso mas completo
- Use tabelas markdown para dados tabulares

GRÁFICOS:
Quando o usuário pedir gráfico ou comparação visual, inclua:
\`\`\`chart
{
  "type": "bar" ou "line",
  "title": "Título",
  "xKey": "chave_eixo_x",
  "series": [{"key": "chave_valor", "label": "Rótulo"}],
  "data": [{"chave_x": "valor", "chave_valor": 123}]
}
\`\`\`
- Use "bar" para comparações e "line" para evolução temporal
- Valores numéricos sem formatação
- Para comparar visões, use múltiplas séries`;

        const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${GEMINI_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "gemini-2.5-flash",
            messages: [{ role: "system", content: systemPrompt }, ...messages],
            stream: true,
          }),
        });

        if (!response.ok) {
          const t = await response.text();
          console.error("AI gateway error:", response.status, t);
          safeEnqueue(controller, encoder.encode(`data: ${JSON.stringify({ error: response.status === 429 ? "Rate limit exceeded" : "AI gateway error" })}\n\n`));
          safeClose(controller);
          return;
        }

        const reader = response.body!.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          safeEnqueue(controller, value);
        }
        safeClose(controller);
      } catch (e) {
        console.error("chat error:", e);
        safeEnqueue(controller, encoder.encode(`data: ${JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" })}\n\n`));
        safeClose(controller);
      }
    },
  });

  return new Response(stream, {
    headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
  });
});
