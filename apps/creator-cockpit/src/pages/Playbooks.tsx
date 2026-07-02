import { FileText, Sparkles } from "lucide-react";
import { Scripts } from "./Scripts";

export function Playbooks() {
  return (
    <main className="space-y-4 animate-in-soft">
      <section className="glass-panel rounded-[28px] p-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-sm font-semibold text-cyan-200">
          <FileText className="h-4 w-4" aria-hidden="true" />
          Playbooks
        </div>
        <h2 className="mt-4 text-3xl font-semibold text-white">Build reusable conversation automation.</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-100/68">
          The wizard occupies the full workspace, templates are reusable, and version history stays attached to each playbook.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-blue-500/15 bg-[#0D1B2A]/60 px-4 py-3 text-sm text-blue-100/72">
          <Sparkles className="h-4 w-4 text-cyan-300" aria-hidden="true" />
          Create, customise, activate, deactivate, and test in one place.
        </div>
      </section>

      <Scripts />
    </main>
  );
}
