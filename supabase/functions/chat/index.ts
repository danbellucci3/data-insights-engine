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

    // Fetch user data from all tables to provide context
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const tables = [
      "investimentos", "dre", "balanco", "fluxo_de_caixa",
      "folha_de_pagamento", "projetos", "fornecedores"
    ];

    const dataContext: Record<string, any[]> = {};
    for (const table of tables) {
      const { data } = await supabase.from(table).select("*").eq("user_id", userId).limit(500);
      if (data && data.length > 0) {
        dataContext[table] = data.map(({ user_id, id, created_at, ...rest }) => rest);
      }
    }

    const systemPrompt = `Você é um assistente financeiro inteligente. Analise os dados do usuário e responda perguntas de forma clara e precisa em português brasileiro.

DADOS DO USUÁRIO:
${Object.entries(dataContext).map(([table, rows]) => 
  `\n### ${table.toUpperCase()} (${rows.length} registros):\n${JSON.stringify(rows, null, 2)}`
).join("\n")}

INSTRUÇÕES:
- Responda sempre em português brasileiro
- Use formatação markdown para organizar a resposta
- Formate valores monetários no padrão brasileiro (R$ X.XXX,XX)
- Se os dados não contiverem informação suficiente, informe isso
- Faça cálculos quando necessário (somas, médias, comparações)
- Seja conciso mas completo`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
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
