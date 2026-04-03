import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Send, Bot, User, Plus, MessageSquare, Trash2, X,
  TrendingUp, DollarSign, BarChart3, PieChart, FileText, Search,
  Loader2, CheckCircle2, Database, BrainCircuit, Download
} from "lucide-react";
import ChatChart, { parseChartBlocks } from "@/components/ChatChart";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

type ContextData = Record<string, { label: string; rows: any[] }>;
type Msg = { role: "user" | "assistant"; content: string; contextData?: ContextData };
type Conversation = { id: string; title: string | null; updated_at: string };
type StatusStep = {
  step: "planning" | "analyzing" | "fetching" | "responding";
  message: string;
};

const SUGGESTED_QUESTIONS = [
  { icon: DollarSign, text: "Qual a posição atual de caixa?", color: "text-emerald-600" },
  { icon: TrendingUp, text: "Qual o EBITDA acumulado do ano?", color: "text-blue-600" },
  { icon: BarChart3, text: "Compare o faturamento real vs orçado", color: "text-violet-600" },
  { icon: PieChart, text: "Qual a composição do balanço patrimonial?", color: "text-amber-600" },
  { icon: FileText, text: "Quais fornecedores têm contrato ativo?", color: "text-rose-600" },
  { icon: Search, text: "Qual o saldo total de investimentos?", color: "text-cyan-600" },
];

const STATUS_CONFIG: Record<string, { icon: typeof Loader2; label: string }> = {
  planning: { icon: BrainCircuit, label: "Consultando a IA..." },
  analyzing: { icon: Search, label: "Analisando o pedido..." },
  fetching: { icon: Database, label: "Buscando dados..." },
  responding: { icon: Bot, label: "Gerando resposta..." },
};

export default function ChatPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [statusSteps, setStatusSteps] = useState<StatusStep[]>([]);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, statusSteps]);

  useEffect(() => {
    if (!user) return;
    loadConversations();
  }, [user]);

  const loadConversations = async () => {
    const { data } = await supabase
      .from("chat_conversations")
      .select("id, title, updated_at")
      .eq("user_id", user!.id)
      .order("updated_at", { ascending: false });
    setConversations(data || []);
  };

  const loadMessages = async (convId: string) => {
    const { data } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("conversation_id", convId)
      .eq("user_id", user!.id)
      .order("created_at", { ascending: true });
    setMessages((data as Msg[]) || []);
  };

  const selectConversation = async (convId: string) => {
    setActiveConvId(convId);
    await loadMessages(convId);
  };

  const newConversation = () => {
    setActiveConvId(null);
    setMessages([]);
  };

  const deleteConversation = async (convId: string) => {
    await supabase.from("chat_messages").delete().eq("conversation_id", convId);
    await supabase.from("chat_conversations").delete().eq("id", convId);
    if (activeConvId === convId) {
      setActiveConvId(null);
      setMessages([]);
    }
    loadConversations();
  };

  const deleteAllConversations = async () => {
    if (!user) return;
    const confirmed = window.confirm("Tem certeza que deseja apagar todo o histórico de conversas? Esta ação não pode ser desfeita.");
    if (!confirmed) return;
    for (const conv of conversations) {
      await supabase.from("chat_messages").delete().eq("conversation_id", conv.id);
      await supabase.from("chat_conversations").delete().eq("id", conv.id);
    }
    setActiveConvId(null);
    setMessages([]);
    setConversations([]);
    toast({ title: "Histórico apagado", description: "Todas as conversas foram removidas." });
  };

  const send = async (overrideInput?: string) => {
    const text = overrideInput ?? input.trim();
    if (!text || isLoading || !user) return;
    const userMsg: Msg = { role: "user", content: text };
    setInput("");
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    setStatusSteps([]);
    setCurrentStep(null);

    let convId = activeConvId;

    if (!convId) {
      const title = userMsg.content.slice(0, 60);
      const { data: newConv } = await supabase
        .from("chat_conversations")
        .insert({ user_id: user.id, title })
        .select()
        .single();
      if (newConv) {
        convId = newConv.id;
        setActiveConvId(convId);
      }
    }

    if (convId) {
      await supabase.from("chat_messages").insert({
        conversation_id: convId, user_id: user.id, role: "user", content: userMsg.content,
      });
    }

    let assistantSoFar = "";
    let capturedContextData: ContextData | undefined;
    const allMessages = [...messages, userMsg];

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ messages: allMessages, userId: user.id }),
        }
      );

      if (resp.status === 429) {
        toast({ title: "Limite de requisições", description: "Tente novamente em alguns segundos.", variant: "destructive" });
        setIsLoading(false);
        return;
      }
      if (resp.status === 402) {
        toast({ title: "Créditos insuficientes", description: "Adicione créditos ao seu workspace.", variant: "destructive" });
        setIsLoading(false);
        return;
      }
      if (!resp.ok || !resp.body) throw new Error("Falha ao iniciar stream");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamingStarted = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.trim() === "") continue;

          // Handle custom SSE events
          if (line.startsWith("event: ")) {
            continue;
          }

          if (line.startsWith("data: ") && !streamingStarted) {
            const jsonStr = line.slice(6).trim();
            try {
              const parsed = JSON.parse(jsonStr);
              // Handle context_data event
              if (parsed && typeof parsed === "object" && !parsed.step && !parsed.choices) {
                // Check if it looks like context data (has table keys with label+rows)
                const keys = Object.keys(parsed);
                if (keys.length > 0 && parsed[keys[0]]?.rows) {
                  capturedContextData = parsed as ContextData;
                  continue;
                }
              }
              if (parsed.step && parsed.message) {
                setStatusSteps(prev => [...prev, { step: parsed.step, message: parsed.message }]);
                setCurrentStep(parsed.step);
                continue;
              }
            } catch { /* not a status event, continue */ }
          }

          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              if (!streamingStarted) {
                streamingStarted = true;
                setStatusSteps([]);
                setCurrentStep(null);
              }
              assistantSoFar += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar, contextData: capturedContextData } : m));
                }
                return [...prev, { role: "assistant", content: assistantSoFar, contextData: capturedContextData }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      if (convId && assistantSoFar) {
        await supabase.from("chat_messages").insert({
          conversation_id: convId, user_id: user.id, role: "assistant", content: assistantSoFar,
        });
        await supabase.from("chat_conversations").update({ updated_at: new Date().toISOString() }).eq("id", convId);
      }

      loadConversations();
    } catch (e: any) {
      toast({ title: "Erro no chat", description: e.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
      setStatusSteps([]);
      setCurrentStep(null);
    }
  };

  const downloadContextData = (contextData: ContextData) => {
    const wb = XLSX.utils.book_new();
    for (const [, { label, rows }] of Object.entries(contextData)) {
      if (rows.length === 0) continue;
      const ws = XLSX.utils.json_to_sheet(rows);
      const sheetName = label.slice(0, 31); // Excel limit
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }
    XLSX.writeFile(wb, "dados_analise.xlsx");
  };

  const stepOrder = ["planning", "analyzing", "fetching", "responding"];

  return (
    <div className="flex h-full">
      {/* Conversation sidebar */}
      <div className={cn(
        "border-r bg-muted/30 flex-shrink-0 flex flex-col transition-all duration-200",
        sidebarOpen ? "w-64 absolute md:relative z-20 h-full bg-background md:bg-muted/30" : "w-0 overflow-hidden"
      )}>
        <div className="p-3 border-b space-y-2">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" className="flex-1" onClick={newConversation}>
              <Plus className="mr-2 h-4 w-4" /> Nova conversa
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden ml-1" onClick={() => setSidebarOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          {conversations.length > 0 && (
            <Button variant="ghost" size="sm" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10" onClick={deleteAllConversations}>
              <Trash2 className="mr-2 h-4 w-4" /> Apagar histórico
            </Button>
          )}
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={cn(
                  "group flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors",
                  activeConvId === conv.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted"
                )}
                onClick={() => selectConversation(conv.id)}
              >
                <MessageSquare className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate flex-1">{conv.title || "Nova conversa"}</span>
                <button
                  className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {conversations.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8">Nenhuma conversa</p>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main chat area */}
      <div className="flex flex-1 flex-col min-w-0">
        <div className="border-b p-4 md:p-6 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <MessageSquare className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Chat com IA</h1>
            <p className="text-sm text-muted-foreground">Faça perguntas sobre seus dados financeiros.</p>
          </div>
        </div>

        <ScrollArea className="flex-1 p-4 md:p-6">
          <div className="mx-auto max-w-3xl space-y-4">
            {/* Empty state with suggestion buttons */}
            {messages.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-in">
                <Bot className="mb-4 h-12 w-12 text-muted-foreground/40" />
                <h3 className="text-lg font-medium mb-2">Pergunte sobre seus dados</h3>
                <p className="max-w-md text-sm text-muted-foreground mb-8">
                  Selecione uma sugestão abaixo ou digite sua própria pergunta.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                  {SUGGESTED_QUESTIONS.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => send(q.text)}
                      className="flex items-center gap-3 rounded-xl border bg-card p-4 text-left text-sm transition-all duration-200 hover:bg-accent hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <q.icon className={cn("h-5 w-5 flex-shrink-0", q.color)} />
                      <span className="text-foreground">{q.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
                {msg.role === "assistant" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
                    <Bot className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
                <Card className={`max-w-[80%] p-4 ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-card"}`}>
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      {parseChartBlocks(msg.content).map((seg, j) =>
                        seg.type === "chart" ? (
                          <ChatChart key={j} chart={seg.value} />
                        ) : (
                          <ReactMarkdown key={j} remarkPlugins={[remarkGfm]}>{seg.value}</ReactMarkdown>
                        )
                      )}
                    </div>
                  ) : (
                    <p className="text-sm">{msg.content}</p>
                  )}
                </Card>
                {msg.role === "user" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}

            {/* Multi-step status animation */}
            {isLoading && statusSteps.length > 0 && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex gap-3 animate-fade-in">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
                  <Bot className="h-4 w-4 text-primary-foreground" />
                </div>
                <Card className="p-4 w-full max-w-[80%]">
                  <div className="space-y-3">
                    {stepOrder.map((stepKey) => {
                      const completed = statusSteps.some(s => s.step === stepKey) &&
                        stepOrder.indexOf(currentStep || "") > stepOrder.indexOf(stepKey);
                      const active = currentStep === stepKey;
                      const pending = !statusSteps.some(s => s.step === stepKey);
                      const config = STATUS_CONFIG[stepKey];
                      if (pending) return null;

                      const Icon = config.icon;
                      const statusMsg = statusSteps.find(s => s.step === stepKey)?.message || config.label;

                      return (
                        <div
                          key={stepKey}
                          className={cn(
                            "flex items-center gap-3 text-sm transition-all duration-300",
                            active ? "text-foreground" : "text-muted-foreground"
                          )}
                        >
                          {completed ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                          ) : active ? (
                            <Loader2 className="h-4 w-4 animate-spin text-primary flex-shrink-0" />
                          ) : (
                            <Icon className="h-4 w-4 flex-shrink-0" />
                          )}
                          <span className={cn(completed && "line-through opacity-60")}>
                            {statusMsg}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>
            )}

            {/* Fallback loading if no status events yet */}
            {isLoading && statusSteps.length === 0 && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
                  <Bot className="h-4 w-4 text-primary-foreground" />
                </div>
                <Card className="p-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </Card>
              </div>
            )}

            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        <div className="border-t p-4">
          <form
            onSubmit={(e) => { e.preventDefault(); send(); }}
            className="mx-auto flex max-w-3xl gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pergunte sobre seus dados financeiros..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading || !input.trim()} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
