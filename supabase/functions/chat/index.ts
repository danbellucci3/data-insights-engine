import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

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

    // Fetch all rows using pagination (Supabase default limit is 1000)
    async function fetchAllRows(table: string, userId: string) {
      const allRows: any[] = [];
      const pageSize = 1000;
      let from = 0;
      while (true) {
        const { data } = await supabase
          .from(table)
          .select("*")
          .eq("user_id", userId)
          .range(from, from + pageSize - 1);
        if (!data || data.length === 0) break;
        allRows.push(...data);
        if (data.length < pageSize) break;
        from += pageSize;
      }
      return allRows;
    }

    const dataContext: Record<string, any[]> = {};
    for (const table of allowedTables) {
      const rows = await fetchAllRows(table, userId);
      if (rows.length > 0) {
        dataContext[table] = rows.map(({ user_id, id, created_at, ...rest }: any) => rest);
      }
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
${Object.entries(dataContext).map(([table, rows]) => 
  `\n### ${table.toUpperCase()} (${rows.length} registros):\n${JSON.stringify(rows, null, 2)}`
).join("\n")}
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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
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
