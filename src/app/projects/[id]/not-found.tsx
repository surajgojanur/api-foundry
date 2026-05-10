import Link from "next/link";
import { SearchX } from "lucide-react";

export default function ProjectNotFound() {
  return (
    <div className="glass-card mx-auto mt-16 max-w-2xl rounded-3xl p-8 text-center">
      <div className="mx-auto mb-4 inline-flex rounded-2xl border border-amber-400/35 bg-amber-500/10 p-3 text-amber-200">
        <SearchX className="h-6 w-6" />
      </div>
      <h1 className="text-2xl font-semibold text-slate-100">Project not found</h1>
      <p className="mt-3 text-slate-400">This competitor project does not exist in demo mode.</p>
      <Link
        href="/"
        className="mt-6 inline-flex rounded-xl border border-cyan-400/35 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-200"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
