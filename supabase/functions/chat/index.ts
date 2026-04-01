import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const { messages, userId } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const allTables = [
      "investimentos", "dre", "balanco", "fluxo_de_caixa",
      "folha_de_pagamento", "projetos", "fornecedores"
    ];

    // Tables restricted by default (when user has no profile assigned)
    const defaultRestrictedTables = ["folha_de_pagamento"];

    // Check user's access profile
    const { data: userProfiles } = await supabase
      .from("user_access_profiles")
      .select("profile_id")
      .eq("user_id", userId);

    let allowedTables: string[];
    let restrictedTables: string[];

    if (userProfiles && userProfiles.length > 0) {
      // User has profile(s) assigned — use profile permissions
      const profileIds = userProfiles.map((p: any) => p.profile_id);
      const { data: profileTables } = await supabase
        .from("access_profile_tables")
        .select("table_name")
        .in("profile_id", profileIds);

      if (profileTables && profileTables.length > 0) {
        allowedTables = [...new Set(profileTables.map((t: any) => t.table_name))];
        restrictedTables = allTables.filter(t => !allowedTables.includes(t));
      } else {
        // Profile exists but no tables assigned
        allowedTables = allTables.filter(t => !defaultRestrictedTables.includes(t));
        restrictedTables = defaultRestrictedTables;
      }
    } else {
      // No profile assigned — apply default restrictions
      allowedTables = allTables.filter(t => !defaultRestrictedTables.includes(t));
      restrictedTables = defaultRestrictedTables;
    }

    // Check if user is admin (admins get full access)
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isAdmin = roles?.some((r: any) => r.role === "admin");
    if (isAdmin) {
      allowedTables = allTables;
      restrictedTables = [];
    }

    // Get list of user IDs whose data this user can access (own + shared)
    const accessibleUserIds = [userId];
    const { data: sharedAccess } = await supabase
      .from("data_sharing")
      .select("owner_id")
      .eq("shared_with_id", userId);
    if (sharedAccess) {
      for (const s of sharedAccess) {
        if (!accessibleUserIds.includes(s.owner_id)) {
          accessibleUserIds.push(s.owner_id);
        }
      }
    }

    // Fetch rows with a hard cap to avoid exceeding token limits
    const MAX_ROWS_PER_TABLE = 200;

    async function fetchRows(table: string, userIds: string[]) {
      const { data } = await supabase
        .from(table)
        .select("*")
        .in("user_id", userIds)
        .order("created_at", { ascending: false })
        .limit(MAX_ROWS_PER_TABLE);
      return data || [];
    }

    const dataContext: Record<string, { rows: any[]; totalCount: number }> = {};
    for (const table of allowedTables) {
      // Get total count first
      const { count } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true })
        .in("user_id", accessibleUserIds);

      const rows = await fetchRows(table, accessibleUserIds);
      if (rows.length > 0) {
        const cleaned = rows.map(({ user_id, id, created_at, ...rest }: any) => rest);
        dataContext[table] = { rows: cleaned, totalCount: count || cleaned.length };
      }
    }

    // Build context with compact JSON (no pretty print) to save tokens
    const contextParts = Object.entries(dataContext).map(([table, { rows, totalCount }]) => {
      const truncNote = totalCount > rows.length
        ? ` (mostrando ${rows.length} de ${totalCount} registros mais recentes)`
        : "";
      return `\n### ${table.toUpperCase()} (${totalCount} registros${truncNote}):\n${JSON.stringify(rows)}`;
    });

    // Estimate token count (~4 chars per token) and further truncate if needed
    let contextStr = contextParts.join("\n");
    const estimatedTokens = contextStr.length / 4;
    if (estimatedTokens > 800000) {
      // Too large even after limiting rows — reduce to summary only
      const summaryParts = Object.entries(dataContext).map(([table, { rows, totalCount }]) => {
        const sample = rows.slice(0, 20);
        return `\n### ${table.toUpperCase()} (${totalCount} registros, amostra de ${sample.length}):\n${JSON.stringify(sample)}`;
      });
      contextStr = summaryParts.join("\n");
    }

    const tableLabels: Record<string, string> = {
      investimentos: "Investimentos",
      dre: "DRE",
      balanco: "Balanço",
      fluxo_de_caixa: "Fluxo de Caixa",
      folha_de_pagamento: "Folha de Pagamento",
      projetos: "Projetos",
      fornecedores: "Fornecedores",
    };

    const restrictedInfo = restrictedTables.length > 0
      ? `\n\nTABELAS RESTRITAS (o usuário NÃO tem acesso):
${restrictedTables.map(t => `- ${tableLabels[t] || t}`).join("\n")}

IMPORTANTE: Se o usuário perguntar sobre dados dessas tabelas restritas, informe educadamente que ele não tem permissão para acessar esses dados conforme seu perfil de acesso. Não invente dados dessas tabelas.`
      : "";

    const systemPrompt = `Você é um assistente financeiro inteligente. Analise os dados do usuário e responda perguntas de forma clara e precisa em português brasileiro.

DADOS DO USUÁRIO:
${contextStr}
${restrictedInfo}

ANÁLISE DE VISÕES (REAL vs ORÇADO vs FORECAST):
Quando houver dados com diferentes visões (real, orçado, forecast) na mesma tabela:
- SEMPRE compare os valores entre as visões automaticamente
- Calcule desvios percentuais: (Real - Orçado) / Orçado * 100
- Identifique tendências e variações significativas
- Destaque os maiores desvios (positivos e negativos)
- Use gráficos comparativos quando apropriado

INSTRUÇÕES:
- Responda sempre em português brasileiro
- Use formatação markdown para organizar a resposta
- Formate valores monetários no padrão brasileiro (R$ X.XXX,XX)
- Se os dados não contiverem informação suficiente, informe isso
- Faça cálculos quando necessário (somas, médias, comparações, desvios)
- Seja conciso mas completo
- Quando houver dados tabulares, SEMPRE use tabelas markdown (com | e ---) para exibir os dados de forma organizada. Exemplo:
| Coluna A | Coluna B |
|---|---|
| Valor 1 | Valor 2 |

GRÁFICOS:
Quando o usuário pedir um gráfico, visualização ou comparação visual, inclua um bloco de código especial com a linguagem "chart" contendo JSON válido. Formato:
\`\`\`chart
{
  "type": "bar" ou "line",
  "title": "Título do gráfico",
  "xKey": "nome_da_chave_do_eixo_x",
  "series": [{"key": "chave_valor", "label": "Rótulo exibido"}],
  "data": [{"chave_x": "valor", "chave_valor": 123}, ...]
}
\`\`\`
- Use "bar" para comparações e "line" para evolução temporal
- Os valores em "data" devem ser numéricos (sem formatação)
- Sempre agregue/calcule os dados antes de montar o gráfico
- Você pode incluir texto explicativo antes e/ou depois do bloco chart
- Para comparar visões, crie gráficos com múltiplas séries (Real, Orçado, Forecast)`;

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
