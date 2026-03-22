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
import { Send, Bot, User, Loader2, Plus, MessageSquare, Trash2 } from "lucide-react";
import ChatChart, { parseChartBlocks } from "@/components/ChatChart";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };
type Conversation = { id: string; title: string | null; updated_at: string };

export default function ChatPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load conversations
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

  const send = async () => {
    if (!input.trim() || isLoading || !user) return;
    const userMsg: Msg = { role: "user", content: input.trim() };
    setInput("");
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    let convId = activeConvId;

    // Create conversation if new
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

    // Save user message
    if (convId) {
      await supabase.from("chat_messages").insert({
        conversation_id: convId,
        user_id: user.id,
        role: "user",
        content: userMsg.content,
      });
    }

    let assistantSoFar = "";
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

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantSoFar += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
                }
                return [...prev, { role: "assistant", content: assistantSoFar }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Save assistant message
      if (convId && assistantSoFar) {
        await supabase.from("chat_messages").insert({
          conversation_id: convId,
          user_id: user.id,
          role: "assistant",
          content: assistantSoFar,
        });
        // Update conversation updated_at
        await supabase.from("chat_conversations").update({ updated_at: new Date().toISOString() }).eq("id", convId);
      }

      loadConversations();
    } catch (e: any) {
      toast({ title: "Erro no chat", description: e.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full">
      {/* Conversation sidebar */}
      <div className={cn(
        "border-r bg-muted/30 flex-shrink-0 flex flex-col transition-all duration-200",
        sidebarOpen ? "w-64" : "w-0 overflow-hidden"
      )}>
        <div className="p-3 border-b space-y-2">
          <Button variant="outline" size="sm" className="w-full" onClick={newConversation}>
            <Plus className="mr-2 h-4 w-4" /> Nova conversa
          </Button>
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
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Bot className="mb-4 h-12 w-12 text-muted-foreground/40" />
                <h3 className="text-lg font-medium">Pergunte sobre seus dados</h3>
                <p className="max-w-md text-sm text-muted-foreground">
                  Exemplos: "Qual o saldo de investimentos da Empresa X?", "Qual o EBITDA da safra 2024?", "Quais fornecedores têm contrato ativo?"
                </p>
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

            {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
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
