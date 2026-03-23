import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BarChart3, Shield, Users, Upload, MessageSquare, TrendingUp, ArrowRight, CheckCircle2 } from "lucide-react";

const features = [
  {
    icon: MessageSquare,
    title: "Chat com IA",
    description: "Converse com seus dados financeiros usando inteligência artificial. Faça perguntas em linguagem natural e receba análises instantâneas.",
  },
  {
    icon: TrendingUp,
    title: "Dashboard Inteligente",
    description: "Visualize DRE, Balanço, Fluxo de Caixa e Investimentos em painéis dinâmicos com comparação entre Real, Orçado e Forecast.",
  },
  {
    icon: Upload,
    title: "Importação Simples",
    description: "Importe seus dados financeiros via planilhas CSV. Baixe modelos prontos para cada tipo de relatório e comece em minutos.",
  },
  {
    icon: Users,
    title: "Compartilhamento Seguro",
    description: "Convide membros da sua equipe para visualizar ou colaborar nos dados da empresa com permissões configuráveis.",
  },
  {
    icon: Shield,
    title: "Controle de Acesso",
    description: "Defina perfis de acesso granulares por tabela. Restrinja dados sensíveis como folha de pagamento a usuários autorizados.",
  },
  {
    icon: BarChart3,
    title: "Análise Comparativa",
    description: "Compare automaticamente dados reais, orçados e forecast para identificar desvios e oportunidades de melhoria.",
  },
];

const tables = [
  "DRE", "Balanço Patrimonial", "Fluxo de Caixa", "Investimentos",
  "Folha de Pagamento", "Projetos", "Fornecedores",
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <BarChart3 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold">FinAnalyticsIA</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost" size="sm">Entrar</Button>
            </Link>
            <Link to="/auth">
              <Button size="sm">
                Criar Conta <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="relative mx-auto max-w-6xl px-6 py-24 md:py-36">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm font-medium text-muted-foreground">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
              Powered by Gemini AI
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
              Seus dados financeiros,{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                uma conversa de distância
              </span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground md:text-xl">
              Importe planilhas, converse com IA e obtenha insights instantâneos sobre DRE, Balanço, Fluxo de Caixa, Investimentos e muito mais. Tudo em um só lugar.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link to="/auth">
                <Button size="lg" className="gap-2 px-8 text-base">
                  Começar Gratuitamente <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Tables supported */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <p className="mb-6 text-center text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Tabelas Suportadas
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {tables.map((t) => (
              <span key={t} className="rounded-full border bg-card px-4 py-2 text-sm font-medium">
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Tudo que você precisa para analisar suas finanças
          </h2>
          <p className="mt-4 text-muted-foreground">
            Uma plataforma completa para importar, visualizar e conversar com seus dados financeiros.
          </p>
        </div>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <div key={title} className="group rounded-2xl border bg-card p-6 transition-all hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">{title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-t bg-muted/20">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <h2 className="mb-16 text-center text-3xl font-bold tracking-tight sm:text-4xl">
            Como funciona
          </h2>
          <div className="grid gap-12 md:grid-cols-3">
            {[
              { step: "01", title: "Importe seus dados", desc: "Faça upload das suas planilhas financeiras. Baixe modelos prontos para cada tabela." },
              { step: "02", title: "Converse com a IA", desc: "Pergunte sobre receitas, despesas, indicadores. A IA analisa todas as suas tabelas." },
              { step: "03", title: "Tome decisões", desc: "Receba gráficos, comparações entre Real vs Orçado vs Forecast e insights acionáveis." },
            ].map(({ step, title, desc }) => (
              <div key={step} className="relative text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-xl font-bold">
                  {step}
                </div>
                <h3 className="mb-2 text-lg font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="rounded-3xl bg-gradient-to-br from-primary to-primary/80 p-12 text-center text-primary-foreground md:p-16">
          <h2 className="text-3xl font-bold sm:text-4xl">Pronto para transformar sua análise financeira?</h2>
          <p className="mx-auto mt-4 max-w-xl text-primary-foreground/80">
            Crie sua conta gratuitamente e comece a importar seus dados em minutos.
          </p>
          <Link to="/auth">
            <Button size="lg" variant="secondary" className="mt-8 gap-2 px-8 text-base">
              Começar Agora <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">FinAnalyticsIA</span>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} FinAnalyticsIA. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
