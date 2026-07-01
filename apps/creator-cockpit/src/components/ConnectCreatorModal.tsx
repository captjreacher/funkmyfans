import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, RefreshCw, ShieldCheck, Sparkles, SquareCheckBig, TestTube2, UserRoundPlus, type LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createCreator, generateCreatorTasks, syncCreatorSection, validateCreatorConnection, type CreatorCreatePayload, type CreatorOnboardingService } from "../lib/api";
import type { OfCreator, SyncType } from "@funkmyfans/of-types";

const serviceOptions: Array<{ key: CreatorOnboardingService; label: string; description: string }> = [
  { key: "chat_management", label: "Chat management", description: "Cover daily inbox and relationship replies." },
  { key: "welcome_automation", label: "Welcome automation", description: "Handle new subscriber onboarding." },
  { key: "subscriber_crm", label: "Subscriber CRM", description: "Track segments, notes, and follow-up work." },
  { key: "content_vault", label: "Content vault", description: "Organize content access and reuse." },
  { key: "analytics", label: "Analytics", description: "Keep an eye on revenue and activity." },
  { key: "ai_coach", label: "AI coach", description: "Use AI-guided next actions and prompts." }
];

const stepLabels = ["Creator details", "BetterFans connection", "Services", "Finish"] as const;

type CreationState =
  | { kind: "idle" }
  | { kind: "validating" }
  | { kind: "ready"; duplicate: boolean; message: string }
  | { kind: "creating" }
  | { kind: "created"; creator: OfCreator }
  | { kind: "syncing"; label: string }
  | { kind: "action"; message: string }
  | { kind: "error"; message: string };

const initialForm = {
  platform_provider: "betterfans",
  betterfans_account_id: "",
  username: "",
  display_name: "",
  location: "",
  status: "pending",
  onboarding_status: "draft",
  notes: "",
  services: [] as CreatorOnboardingService[],
  runInitialSync: false
};

export function ConnectCreatorModal({
  open,
  onClose,
  onOpenCreator,
  onRefresh
}: {
  open: boolean;
  onClose: () => void;
  onOpenCreator: (creatorId: string) => void;
  onRefresh: () => Promise<void>;
}) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [validation, setValidation] = useState<CreationState>({ kind: "idle" });
  const [createdCreator, setCreatedCreator] = useState<OfCreator | null>(null);
  const [validationCount, setValidationCount] = useState(0);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setForm(initialForm);
    setValidation({ kind: "idle" });
    setValidationCount(0);
    setCreatedCreator(null);
  }, [open]);

  const selectedServices = useMemo(() => serviceOptions.filter((option) => form.services.includes(option.key)), [form.services]);
  const duplicateBlocked = validation.kind === "ready" && validation.duplicate;

  if (!open) return null;

  async function handleValidate() {
    if (!form.betterfans_account_id.trim()) return;
    setValidation({ kind: "validating" });
    try {
      const result = await validateCreatorConnection(form.betterfans_account_id.trim());
      setValidationCount((count) => count + 1);
      setValidation({
        kind: "ready",
        duplicate: result.duplicate,
        message: result.duplicate
          ? `Account ${result.creator.betterfans_account_id} is already connected.`
          : `Connection validated for @${result.creator.username}.`
      });
      setForm((current) => ({
        ...current,
        username: current.username || result.creator.username,
        display_name: current.display_name || result.creator.display_name || "",
        location: current.location || result.creator.location || ""
      }));
    } catch (error) {
      setValidation({ kind: "error", message: error instanceof Error ? error.message : "Validation failed" });
    }
  }

  async function handleCreate() {
    setValidation({ kind: "creating" });
    try {
      const payload: CreatorCreatePayload = {
        platform_provider: form.platform_provider,
        betterfans_account_id: form.betterfans_account_id.trim(),
        username: form.username.trim(),
        display_name: form.display_name.trim(),
        location: form.location.trim(),
        status: form.status,
        onboarding_status: form.onboarding_status,
        services: form.services,
        notes: form.notes.trim()
      };

      const result = await createCreator(payload);
      await onRefresh();
      setCreatedCreator(result.creator);
      setValidation({ kind: "created", creator: result.creator });

      if (form.runInitialSync) {
        await handleSync("all", result.creator.id, "Running initial sync...");
      }
    } catch (error) {
      setValidation({ kind: "error", message: error instanceof Error ? error.message : "Creator creation failed" });
    }
  }

  async function handleSync(syncType: SyncType, creatorId: string, label: string) {
    setValidation({ kind: "syncing", label });
    try {
      const result = await syncCreatorSection(creatorId, syncType);
      await onRefresh();
      if (result.status === "failed") {
        setValidation({
          kind: "action",
          message: result.error ?? result.syncRun.error_message ?? `${label} failed`
        });
        return;
      }
      setValidation({ kind: "action", message: `${label} completed.` });
    } catch (error) {
      setValidation({
        kind: "error",
        message: error instanceof Error ? error.message : `${label} failed`
      });
    }
  }

  async function handleGenerateTasks(creatorId: string) {
    setValidation({ kind: "syncing", label: "Generating tasks..." });
    try {
      await generateCreatorTasks(creatorId);
      await onRefresh();
      setValidation({ kind: "action", message: "Task set generated." });
    } catch (error) {
      setValidation({
        kind: "error",
        message: error instanceof Error ? error.message : "Task generation failed"
      });
    }
  }

  const canSubmit = Boolean(form.betterfans_account_id.trim() && form.username.trim() && form.display_name.trim() && form.location.trim() && !duplicateBlocked);
  const currentValidationMessage =
    validation.kind === "ready" || validation.kind === "error" || validation.kind === "action"
      ? validation.message
      : validation.kind === "syncing"
        ? validation.label
        : null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/72 p-4 backdrop-blur-sm">
      <div className="flex h-full min-h-0 w-full items-center justify-center overflow-hidden">
        <div className="flex max-h-full w-full max-w-6xl min-w-0 flex-col overflow-hidden rounded-2xl border border-blue-500/25 bg-[#071423] shadow-[0_28px_120px_rgba(0,0,0,0.5)]">
          <div className="shrink-0 flex items-center justify-between gap-3 border-b border-blue-500/20 px-5 py-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-cyan-300">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Connect Creator
            </div>
            <h2 className="mt-1 text-xl font-semibold text-white">Onboard a creator into the Conversation Operations Platform</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl border border-blue-500/20 bg-white/5 px-3 py-2 text-sm font-semibold text-blue-100/72 hover:bg-white/10">
            Close
          </button>
        </div>

          <div className="grid flex-1 min-h-0 min-w-0 gap-0 overflow-hidden lg:grid-cols-[260px_minmax(0,1fr)]">
            <aside className="min-h-0 overflow-y-auto border-b border-blue-500/20 bg-[#0B1A2A] p-4 lg:border-b-0 lg:border-r">
            <div className="space-y-2">
              {stepLabels.map((label, index) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setStep(index)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold ${
                    step === index ? "selected-glow text-white" : "text-blue-100/68 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-blue-500/20 bg-white/5 text-xs">{index + 1}</span>
                  <span className="min-w-0 truncate">{label}</span>
                </button>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-blue-500/15 bg-white/5 p-4 text-sm text-blue-100/66">
              <div className="flex items-center gap-2 font-semibold text-white">
                <ShieldCheck className="h-4 w-4 text-cyan-300" aria-hidden="true" />
                Flow summary
              </div>
              <div className="mt-3 space-y-1">
                <div>{selectedServices.length} services selected</div>
                <div>{validationCount} connection check{validationCount === 1 ? "" : "s"} run</div>
                <div>{form.runInitialSync ? "Initial sync enabled" : "Initial sync disabled"}</div>
              </div>
            </div>
          </aside>

            <div className="flex min-h-0 min-w-0 flex-col overflow-hidden p-5">
            {createdCreator ? (
              <SuccessPanel
                creator={createdCreator}
                selectedServices={selectedServices}
                syncAfterCreate={form.runInitialSync}
                statusMessage={
                  validation.kind === "syncing"
                    ? validation.label
                    : validation.kind === "action"
                      ? validation.message
                      : validation.kind === "error"
                        ? validation.message
                        : form.runInitialSync
                          ? "Creator created. Initial sync will run now."
                          : "Creator created. Next actions are ready."
                }
                onOpenCreator={onOpenCreator}
                onClose={onClose}
                onSyncProfile={async () => handleSync("profile", createdCreator.id, "Sync profile")}
                onSyncSubscribers={async () => handleSync("subscribers", createdCreator.id, "Sync subscribers")}
                onGenerateTasks={async () => handleGenerateTasks(createdCreator.id)}
              />
            ) : (
              <>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-white">
                    Step {step + 1} of 4
                  </div>
                  {currentValidationMessage ? (
                    <div className={`rounded-xl px-3 py-2 text-sm ${validation.kind === "error" ? "bg-rose-500/10 text-rose-200" : "bg-cyan-500/10 text-cyan-200"}`}>
                      {currentValidationMessage}
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden pr-1">
                  {step === 0 ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Display name">
                        <input value={form.display_name} onChange={(event) => setForm({ ...form, display_name: event.target.value })} className="w-full rounded-xl border border-blue-500/20 bg-[#0D1B2A] px-3 py-2.5 text-sm outline-none" placeholder="Creator name" />
                      </Field>
                      <Field label="Username / handle">
                        <input value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} className="w-full rounded-xl border border-blue-500/20 bg-[#0D1B2A] px-3 py-2.5 text-sm outline-none" placeholder="@handle" />
                      </Field>
                      <Field label="Location">
                        <input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} className="w-full rounded-xl border border-blue-500/20 bg-[#0D1B2A] px-3 py-2.5 text-sm outline-none" placeholder="City, country" />
                      </Field>
                      <Field label="Status">
                        <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className="w-full rounded-xl border border-blue-500/20 bg-[#0D1B2A] px-3 py-2.5 text-sm outline-none">
                          <option value="pending">Pending</option>
                          <option value="connected">Connected</option>
                          <option value="attention">Needs attention</option>
                          <option value="paused">Paused</option>
                          <option value="disconnected">Disconnected</option>
                        </select>
                      </Field>
                      <Field label="Onboarding status">
                        <select value={form.onboarding_status} onChange={(event) => setForm({ ...form, onboarding_status: event.target.value })} className="w-full rounded-xl border border-blue-500/20 bg-[#0D1B2A] px-3 py-2.5 text-sm outline-none">
                          <option value="draft">Draft</option>
                          <option value="pending">Pending</option>
                          <option value="connected">Connected</option>
                          <option value="syncing">Syncing</option>
                          <option value="ready">Ready</option>
                          <option value="needs_attention">Needs attention</option>
                        </select>
                      </Field>
                    </div>
                  ) : null}

                  {step === 1 ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Platform provider">
                        <select value={form.platform_provider} onChange={(event) => setForm({ ...form, platform_provider: event.target.value })} className="w-full rounded-xl border border-blue-500/20 bg-[#0D1B2A] px-3 py-2.5 text-sm outline-none">
                          <option value="betterfans">BetterFans</option>
                        </select>
                      </Field>
                      <Field label="BetterFans account ID">
                        <div className="flex gap-2">
                          <input value={form.betterfans_account_id} onChange={(event) => setForm({ ...form, betterfans_account_id: event.target.value })} className="min-w-0 flex-1 rounded-xl border border-blue-500/20 bg-[#0D1B2A] px-3 py-2.5 text-sm outline-none" placeholder="account id" />
                          <button type="button" onClick={handleValidate} disabled={!form.betterfans_account_id.trim() || validation.kind === "validating"} className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2.5 text-sm font-semibold text-cyan-200 disabled:cursor-not-allowed disabled:opacity-50">
                            {validation.kind === "validating" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <TestTube2 className="h-4 w-4" aria-hidden="true" />}
                            Test connection
                          </button>
                        </div>
                      </Field>
                      <Field label="Notes" className="md:col-span-2">
                        <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows={6} className="w-full rounded-xl border border-blue-500/20 bg-[#0D1B2A] px-3 py-2.5 text-sm outline-none" placeholder="Optional onboarding notes, constraints, or context" />
                      </Field>
                    </div>
                  ) : null}

                  {step === 2 ? (
                    <div className="space-y-4">
                      <div className="text-sm text-blue-100/66">Pick the first services this creator should have in their operating stack. These are stored in metadata.</div>
                      <div className="grid gap-3 md:grid-cols-2">
                        {serviceOptions.map((service) => {
                          const checked = form.services.includes(service.key);
                          return (
                            <label key={service.key} className={`flex cursor-pointer gap-3 rounded-2xl border p-4 ${checked ? "border-cyan-300/30 bg-cyan-400/10" : "border-blue-500/15 bg-white/5"}`}>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(event) =>
                                  setForm({
                                    ...form,
                                    services: event.target.checked
                                      ? [...form.services, service.key]
                                      : form.services.filter((item) => item !== service.key)
                                  })
                                }
                                className="mt-1 h-4 w-4 rounded border-blue-500/30 bg-[#0D1B2A]"
                              />
                              <span className="min-w-0">
                                <span className="block font-semibold text-white">{service.label}</span>
                                <span className="block text-sm text-blue-100/58">{service.description}</span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  {step === 3 ? (
                    <div className="space-y-5">
                      <div className="grid gap-4 md:grid-cols-2">
                        <Summary label="Display name" value={form.display_name || "n/a"} />
                        <Summary label="Username" value={`@${form.username || "n/a"}`} />
                        <Summary label="BetterFans account ID" value={form.betterfans_account_id || "n/a"} />
                        <Summary label="Status" value={form.status} />
                      </div>

                      <div className="rounded-2xl border border-blue-500/15 bg-white/5 p-4">
                        <div className="text-sm font-semibold text-white">Selected services</div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {selectedServices.length ? selectedServices.map((service) => <span key={service.key} className="rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1 text-sm text-cyan-200">{service.label}</span>) : <span className="text-sm text-blue-100/58">No services selected yet.</span>}
                        </div>
                      </div>

                      <label className="flex items-center gap-3 rounded-2xl border border-blue-500/15 bg-white/5 p-4">
                        <input
                          type="checkbox"
                          checked={form.runInitialSync}
                          onChange={(event) => setForm({ ...form, runInitialSync: event.target.checked })}
                          className="h-4 w-4 rounded border-blue-500/30 bg-[#0D1B2A]"
                        />
                        <span>
                          <span className="block font-semibold text-white">Run initial sync after creation</span>
                          <span className="block text-sm text-blue-100/58">Pull the creator profile, stats, subscribers, and chats immediately.</span>
                        </span>
                      </label>

                      <div className="flex flex-wrap gap-3">
                        <button type="button" onClick={handleCreate} disabled={!canSubmit || validation.kind === "creating"} className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50">
                          {validation.kind === "creating" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <UserRoundPlus className="h-4 w-4" aria-hidden="true" />}
                          Create creator
                        </button>
                        <button type="button" onClick={() => setStep(0)} className="inline-flex items-center gap-2 rounded-xl border border-blue-500/20 bg-white/5 px-4 py-3 text-sm font-semibold text-blue-100/72 hover:bg-white/10">
                          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                          Review details
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="shrink-0 mt-4 flex items-center justify-between gap-3 border-t border-blue-500/15 pt-4">
                  <button type="button" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0} className="inline-flex items-center gap-2 rounded-xl border border-blue-500/20 bg-white/5 px-4 py-2.5 text-sm font-semibold text-blue-100/72 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40">
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Back
                  </button>
                  <div className="flex items-center gap-2">
                    {step < 2 ? (
                      <button type="button" onClick={() => setStep((current) => Math.min(3, current + 1))} className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950">
                        Next
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </button>
                    ) : null}
                    {step === 2 ? (
                      <button type="button" onClick={() => setStep(3)} disabled={!canSubmit} className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50">
                        Finish
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </button>
                    ) : null}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`space-y-2 ${className}`}>
      <span className="text-sm font-semibold text-white">{label}</span>
      {children}
    </label>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-blue-500/15 bg-white/5 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-blue-100/54">{label}</div>
      <div className="mt-1 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function SuccessPanel({
  creator,
  selectedServices,
  syncAfterCreate,
  statusMessage,
  onOpenCreator,
  onClose,
  onSyncProfile,
  onSyncSubscribers,
  onGenerateTasks
}: {
  creator: OfCreator;
  selectedServices: Array<{ key: CreatorOnboardingService; label: string; description: string }>;
  syncAfterCreate: boolean;
  statusMessage: string;
  onOpenCreator: (creatorId: string) => void;
  onClose: () => void;
  onSyncProfile: () => Promise<void>;
  onSyncSubscribers: () => Promise<void>;
  onGenerateTasks: () => Promise<void>;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-200">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          Creator created
        </div>
        <div className="mt-2 text-lg font-semibold text-white">{creator.display_name || creator.username}</div>
        <div className="mt-1 text-sm text-blue-100/64">@{creator.username} · {creator.status} · {creator.onboarding_status}</div>
        <div className="mt-2 text-sm text-blue-100/58">{statusMessage}</div>
        <div className="mt-3 text-sm text-blue-100/58">Stored services: {selectedServices.length ? selectedServices.map((service) => service.label).join(", ") : "none"}</div>
        <div className="mt-1 text-sm text-blue-100/58">{syncAfterCreate ? "Initial sync was requested after creation." : "Initial sync was skipped."}</div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <ActionButton onClick={onSyncProfile} icon={RefreshCw} label="Sync Profile" />
        <ActionButton onClick={onSyncSubscribers} icon={RefreshCw} label="Sync Subscribers" />
        <ActionButton
          onClick={() => {
            onOpenCreator(creator.id);
            onClose();
          }}
          icon={UserRoundPlus}
          label="Open Creator"
        />
        <ActionButton onClick={onGenerateTasks} icon={SquareCheckBig} label="Generate Queue Items" />
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-blue-500/15 pt-4">
        <button type="button" onClick={onClose} className="inline-flex items-center gap-2 rounded-xl border border-blue-500/20 bg-white/5 px-4 py-2.5 text-sm font-semibold text-blue-100/72 hover:bg-white/10">
          Close
        </button>
      </div>
    </div>
  );
}

function ActionButton({ onClick, icon: Icon, label }: { onClick: () => Promise<void> | void; icon: LucideIcon; label: string }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-500/20 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10">
      <Icon className="h-4 w-4 text-cyan-300" aria-hidden="true" />
      {label}
    </button>
  );
}
