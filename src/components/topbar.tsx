import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { StatusBadge } from "./status-badge";

export function Topbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/55 px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="group relative w-full max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-300" />
          <input
            readOnly
            placeholder="Search competitors, alerts, changes..."
            className="h-11 w-full rounded-xl border border-slate-800 bg-slate-900/80 pl-10 pr-4 text-sm text-slate-200 outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60"
          />
        </label>

        <div className="flex items-center gap-2">
          <StatusBadge status="demo" className="hidden sm:inline-flex" />
          <span className="rounded-full border border-violet-400/40 bg-violet-500/10 px-3 py-1 text-xs text-violet-200">
            Simple Mode
          </span>
          <Link
            href="/demo"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-500"
          >
            Demo
          </Link>
          <Link
            href="/projects/new"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2 text-sm font-medium text-white shadow-[0_0_24px_rgba(34,211,238,0.35)] transition hover:from-cyan-400 hover:to-blue-400"
          >
            <Plus className="h-4 w-4" />
            Add Competitor
          </Link>
        </div>
      </div>
    </header>
  );
}
