import { Copy } from "lucide-react";

type EndpointCodeBlockProps = {
  endpoint: string;
  method?: "GET" | "POST";
};

export function EndpointCodeBlock({ endpoint, method = "GET" }: EndpointCodeBlockProps) {
  return (
    <div className="glass-card neon-glow rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Generated Endpoint</p>
        <button className="inline-flex items-center gap-2 rounded-lg border border-slate-700/70 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-300 transition hover:border-cyan-400/60 hover:text-cyan-200">
          <Copy className="h-3.5 w-3.5" />
          Copy
        </button>
      </div>
      <div className="gradient-border rounded-xl bg-[#070c1f]/90 p-3">
        <code className="text-sm text-slate-100">
          <span className="mr-2 text-emerald-300">{method}</span>
          <span className="text-cyan-200">{endpoint}</span>
        </code>
      </div>
    </div>
  );
}
