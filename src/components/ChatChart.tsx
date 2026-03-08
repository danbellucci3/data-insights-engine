import { useState } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Maximize2 } from "lucide-react";

export interface ChartData {
  type: "bar" | "line";
  title?: string;
  xKey: string;
  series: { key: string; label: string; color?: string }[];
  data: Record<string, any>[];
}

const DEFAULT_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#8b5cf6",
];

function ChartRenderer({ chart, height = 300 }: { chart: ChartData; height?: number }) {
  const colors = chart.series.map((s, i) => s.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length]);

  const formatValue = (value: number) =>
    new Intl.NumberFormat("pt-BR", { notation: "compact", compactDisplay: "short" }).format(value);

  const ChartComponent = chart.type === "line" ? LineChart : BarChart;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ChartComponent data={chart.data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey={chart.xKey} tick={{ fontSize: 12 }} className="fill-muted-foreground" />
        <YAxis tickFormatter={formatValue} tick={{ fontSize: 12 }} className="fill-muted-foreground" />
        <Tooltip
          formatter={(value: number) => new Intl.NumberFormat("pt-BR").format(value)}
          contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
        />
        <Legend />
        {chart.series.map((s, i) =>
          chart.type === "line" ? (
            <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={colors[i]} strokeWidth={2} dot={false} />
          ) : (
            <Bar key={s.key} dataKey={s.key} name={s.label} fill={colors[i]} radius={[4, 4, 0, 0]} />
          )
        )}
      </ChartComponent>
    </ResponsiveContainer>
  );
}

export default function ChatChart({ chart }: { chart: ChartData }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="my-3">
      {chart.title && <p className="mb-2 text-sm font-semibold">{chart.title}</p>}
      <div className="relative rounded-lg border bg-card p-3">
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 z-10 h-7 w-7"
          onClick={() => setExpanded(true)}
          title="Expandir"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
        <ChartRenderer chart={chart} height={250} />
      </div>

      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="max-w-4xl">
          <DialogTitle>{chart.title || "Gráfico"}</DialogTitle>
          <ChartRenderer chart={chart} height={450} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Parse chart JSON blocks from markdown text. Returns segments of text and charts. */
export function parseChartBlocks(content: string): Array<{ type: "text"; value: string } | { type: "chart"; value: ChartData }> {
  const regex = /```chart\s*\n([\s\S]*?)```/g;
  const segments: Array<{ type: "text"; value: string } | { type: "chart"; value: ChartData }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: content.slice(lastIndex, match.index) });
    }
    try {
      const chartData = JSON.parse(match[1]) as ChartData;
      if (chartData.data && chartData.xKey && chartData.series) {
        segments.push({ type: "chart", value: chartData });
      } else {
        segments.push({ type: "text", value: match[0] });
      }
    } catch {
      segments.push({ type: "text", value: match[0] });
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    segments.push({ type: "text", value: content.slice(lastIndex) });
  }

  return segments;
}
