"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Bell, Code2, LayoutDashboard, RadioTower, Scale, Store, Presentation } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./status-badge";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects/new", label: "Competitors", icon: Store },
  { href: "/live-tracking", label: "Live Tracking", icon: RadioTower },
  { href: "/telegram", label: "Telegram Alerts", icon: Bell },
  { href: "/compare", label: "Compare", icon: Scale },
  { href: "/demo", label: "Demo", icon: Presentation },
  { href: "/api-docs", label: "Advanced APIs", icon: Code2 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-72 shrink-0 border-r border-slate-800/80 bg-slate-950/65 p-6 backdrop-blur-xl lg:flex lg:flex-col">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/35 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-200">
          <Activity className="h-3.5 w-3.5" />
          PricePulse
        </div>
        <h2 className="mt-4 text-xl font-semibold text-slate-100">PricePulse</h2>
        <p className="mt-1 text-sm text-slate-400">Competitor Alert Assistant</p>
      </div>

      <nav className="space-y-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition",
                active
                  ? "border border-cyan-400/35 bg-cyan-500/10 text-cyan-200"
                  : "border border-transparent text-slate-300 hover:border-slate-700 hover:bg-slate-900/70",
              )}
            >
              <Icon className={cn("h-4 w-4", active ? "text-cyan-300" : "text-slate-500 group-hover:text-slate-300")} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/50 p-4">
        <StatusBadge status="demo" className="w-fit" />
        <p className="text-xs text-slate-400">PricePulse engine powered by Anakin + OpenAI</p>
      </div>
    </aside>
  );
}
