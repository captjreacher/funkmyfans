import {
  Bell,
  Bot,
  Clock3,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  Users,
  Wifi
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type {
  AgencyDefaultsSettings,
  CreatorAiSafetySettings,
  CreatorPreferenceSettings,
  CreatorSettingsBundle,
  MessageScriptActionMode,
  SettingsWorkspaceData
} from "@funkmyfans/of-types";
import {
  fetchSettingsWorkspace,
  updateAgencySettings,
  updateCreatorAiSafety,
  updateCreatorPreferences
} from "../lib/api";

type TabKey = "agency" | "creator" | "ai" | "safety" | "runtime" | "audit";

const tabs: Array<{ key: TabKey; label: string; icon: typeof Sparkles }> = [
  { key: "agency", label: "Agency", icon: Sparkles },
  { key: "creator", label: "Creator", icon: Users },
  { key: "ai", label: "AI", icon: Bot },
  { key: "safety", label: "Safety", icon: ShieldCheck },
  { key: "runtime", label: "Runtime", icon: Wifi },
  { key: "audit", label: "Audit", icon: Bell }
];

const approvalModes: MessageScriptActionMode[] = ["task_only", "draft_for_approval", "auto_send"];
const aiModes = ["disabled", "draft_only", "approval_required", "auto_send"] as const;
const emojiLevels = ["none", "light", "moderate", "heavy"] as const;
const flirtyLevels = ["low", "medium", "high"] as const;
const salesLevels = ["soft", "balanced", "assertive"] as const;

export function Settings() {
  const [workspace, setWorkspace] = useState<SettingsWorkspaceData | null>(null);
  const [tab, setTab] = useState<TabKey>("agency");
  const [selectedCreatorId, setSelectedCreatorId] = useState<string>("");
  const [agencyDraft, setAgencyDraft] = useState<AgencyDefaultsSettings | null>(null);
  const [creatorPreferencesDraft, setCreatorPreferencesDraft] = useState<CreatorPreferenceSettings | null>(null);
  const [creatorAiSafetyDraft, setCreatorAiSafetyDraft] = useState<CreatorAiSafetySettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    void loadWorkspace();
  }, []);

  useEffect(() => {
    if (!workspace) return;
    const initialCreator = selectedCreatorId || workspace.creators[0]?.creator.id || "";
    setSelectedCreatorId(initialCreator);
    const selected = workspace.creators.find((item) => item.creator.id === initialCreator) ?? workspace.creators[0] ?? null;
    setAgencyDraft(workspace.agency);
    setCreatorPreferencesDraft(selected?.preferences ?? null);
    setCreatorAiSafetyDraft(selected?.ai_safety ?? null);
  }, [selectedCreatorId, workspace]);

  const selectedCreator = useMemo(
    () => workspace?.creators.find((item) => item.creator.id === selectedCreatorId) ?? null,
    [selectedCreatorId, workspace]
  );

  const agencyDirty = agencyDraft && workspace ? JSON.stringify(agencyDraft) !== JSON.stringify(workspace.agency) : false;
  const creatorPreferencesDirty =
    creatorPreferencesDraft && selectedCreator ? JSON.stringify(creatorPreferencesDraft) !== JSON.stringify(selectedCreator.preferences) : false;
  const creatorAiDirty = creatorAiSafetyDraft && selectedCreator ? JSON.stringify(creatorAiSafetyDraft.ai_behavior) !== JSON.stringify(selectedCreator.ai_safety.ai_behavior) : false;
  const creatorSafetyDirty = creatorAiSafetyDraft && selectedCreator ? JSON.stringify(creatorAiSafetyDraft.safety) !== JSON.stringify(selectedCreator.ai_safety.safety) : false;
  const unsaved =
    (tab === "agency" && agencyDirty) ||
    (tab === "creator" && creatorPreferencesDirty) ||
    (tab === "ai" && creatorAiDirty) ||
    (tab === "safety" && creatorSafetyDirty);

  async function loadWorkspace() {
    try {
      const result = await fetchSettingsWorkspace();
      setWorkspace(result);
      setSuccess(null);
      setError(null);
    } catch (loadError) {
      setError(errorMessage(loadError));
    }
  }

  async function saveCurrentTab() {
    if (!workspace) return;
    setBusy(true);
    setSuccess(null);
    try {
      if (tab === "agency" && agencyDraft) {
        await updateAgencySettings(agencyDraft);
        setSuccess("Agency defaults saved.");
      }
      if (tab === "creator" && creatorPreferencesDraft && selectedCreatorId) {
        await updateCreatorPreferences(selectedCreatorId, creatorPreferencesDraft);
        setSuccess("Creator preferences saved.");
      }
      if ((tab === "ai" || tab === "safety") && creatorAiSafetyDraft && selectedCreatorId) {
        await updateCreatorAiSafety(selectedCreatorId, creatorAiSafetyDraft);
        setSuccess(tab === "ai" ? "AI behaviour saved." : "Safety settings saved.");
      }
      await loadWorkspace();
    } catch (saveError) {
      setError(errorMessage(saveError));
      setSuccess(null);
    } finally {
      setBusy(false);
    }
  }

  if (!workspace || !agencyDraft) {
    return (
      <div className="glass-panel rounded-3xl p-6">
        <div className="mb-4 h-5 w-56 rounded-full shimmer" />
        <div className="text-sm text-blue-100/70">Loading settings workspace...</div>
      </div>
    );
  }

  return (
    <section className="space-y-5">
      <div className="glass-panel rounded-[28px] p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.26em] text-cyan-300/85">Administration</div>
            <h2 className="mt-2 text-3xl font-semibold text-white">Governance control panel for approvals, AI guardrails, runtime health, and creator preferences</h2>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-blue-100/72">
              Keep the system human-in-the-loop by default, make auto-send opt-in only, and tune each creator’s automation posture without exposing any secrets.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void loadWorkspace()} className="rounded-2xl border border-blue-400/20 bg-[#102338]/72 px-4 py-3 text-sm font-semibold text-blue-50">
              <span className="inline-flex items-center gap-2">
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Refresh
              </span>
            </button>
            <button
              type="button"
              onClick={() => void saveCurrentTab()}
              disabled={busy || !unsaved}
              className="selected-glow rounded-2xl px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
            >
              <span className="inline-flex items-center gap-2">
                <Save className="h-4 w-4" aria-hidden="true" />
                {busy ? "Saving..." : unsaved ? "Save Changes" : "Saved"}
              </span>
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={ShieldCheck} label="Approval Default" value={labelizeMode(workspace.agency.default_approval_mode)} detail="Human review stays the default stance" />
          <MetricCard icon={Clock3} label="Quiet Hours" value={workspace.agency.quiet_hours.enabled ? `${workspace.agency.quiet_hours.startHour}:00-${workspace.agency.quiet_hours.endHour}:00` : "Off"} detail={workspace.agency.default_timezone} />
          <MetricCard icon={Bot} label="AI Default" value={labelizeMode(workspace.agency.default_ai_mode)} detail="Auto-send remains opt-in only" />
          <MetricCard icon={Wifi} label="Runtime" value={workspace.runtime.betterfansApiKeyConfigured && workspace.runtime.supabaseConfigured ? "Configured" : "Attention"} detail={workspace.runtime.eventStreamStatus.connectionStatus} />
        </div>
      </div>

      {error ? <div className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}
      {success ? <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{success}</div> : null}

      <div className="glass-panel rounded-[28px] p-3">
        <div className="flex flex-wrap gap-2">
          {tabs.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={`rounded-2xl px-4 py-3 text-sm font-semibold ${tab === item.key ? "selected-glow text-white" : "text-blue-100/68 hover:bg-[#1A3655]/55 hover:text-white"}`}
              >
                <span className="inline-flex items-center gap-2">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {tab === "agency" ? (
        <div className="glass-panel rounded-[28px] p-5">
          <SectionTitle icon={Sparkles} title="Agency Defaults" subtitle="Baseline behaviour every creator inherits unless their own settings override it." />
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            <Field label="Default Approval Mode">
              <select value={agencyDraft.default_approval_mode} onChange={(event) => setAgencyDraft({ ...agencyDraft, default_approval_mode: event.target.value as MessageScriptActionMode })} className="command-card w-full rounded-2xl px-4 py-3 text-sm">
                {approvalModes.map((option) => (
                  <option key={option} value={option}>
                    {labelizeMode(option)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Default AI Mode">
              <select value={agencyDraft.default_ai_mode} onChange={(event) => setAgencyDraft({ ...agencyDraft, default_ai_mode: event.target.value as AgencyDefaultsSettings["default_ai_mode"] })} className="command-card w-full rounded-2xl px-4 py-3 text-sm">
                {aiModes.map((option) => (
                  <option key={option} value={option}>
                    {labelizeMode(option)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Default Timezone">
              <input value={agencyDraft.default_timezone} onChange={(event) => setAgencyDraft({ ...agencyDraft, default_timezone: event.target.value })} className="command-card w-full rounded-2xl px-4 py-3 text-sm" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <ToggleField label="Quiet Hours Enabled" checked={agencyDraft.quiet_hours.enabled} onChange={(checked) => setAgencyDraft({ ...agencyDraft, quiet_hours: { ...agencyDraft.quiet_hours, enabled: checked } })} />
              <Field label="Quiet Start Hour">
                <input type="number" min={0} max={23} value={agencyDraft.quiet_hours.startHour} onChange={(event) => setAgencyDraft({ ...agencyDraft, quiet_hours: { ...agencyDraft.quiet_hours, startHour: toHour(event.target.value, 22) } })} className="command-card w-full rounded-2xl px-4 py-3 text-sm" />
              </Field>
              <Field label="Quiet End Hour">
                <input type="number" min={0} max={23} value={agencyDraft.quiet_hours.endHour} onChange={(event) => setAgencyDraft({ ...agencyDraft, quiet_hours: { ...agencyDraft.quiet_hours, endHour: toHour(event.target.value, 8) } })} className="command-card w-full rounded-2xl px-4 py-3 text-sm" />
              </Field>
            </div>
            <Field label="Cooldown Between Automated Messages (minutes)">
              <input type="number" min={0} value={agencyDraft.default_cooldown_minutes} onChange={(event) => setAgencyDraft({ ...agencyDraft, default_cooldown_minutes: toInt(event.target.value, 60) })} className="command-card w-full rounded-2xl px-4 py-3 text-sm" />
            </Field>
            <Field label="Daily Outbound Cap Per Creator">
              <input type="number" min={0} value={agencyDraft.daily_outbound_cap_per_creator} onChange={(event) => setAgencyDraft({ ...agencyDraft, daily_outbound_cap_per_creator: toInt(event.target.value, 150) })} className="command-card w-full rounded-2xl px-4 py-3 text-sm" />
            </Field>
            <Field label="Daily Outbound Cap Per Fan">
              <input type="number" min={0} value={agencyDraft.daily_outbound_cap_per_fan} onChange={(event) => setAgencyDraft({ ...agencyDraft, daily_outbound_cap_per_fan: toInt(event.target.value, 20) })} className="command-card w-full rounded-2xl px-4 py-3 text-sm" />
            </Field>
          </div>
        </div>
      ) : null}

      {tab === "creator" || tab === "ai" || tab === "safety" ? (
        <div className="space-y-5">
          <div className="glass-panel rounded-[28px] p-5">
            <SectionTitle icon={Users} title="Creator Selector" subtitle="Switch between creator-level preferences, AI behaviour, and safety policy." />
            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              <Field label="Selected Creator">
                <select
                  value={selectedCreatorId}
                  onChange={(event) => {
                    const next = workspace.creators.find((item) => item.creator.id === event.target.value) ?? null;
                    setSelectedCreatorId(event.target.value);
                    setCreatorPreferencesDraft(next?.preferences ?? null);
                    setCreatorAiSafetyDraft(next?.ai_safety ?? null);
                    setSuccess(null);
                  }}
                  className="command-card w-full rounded-2xl px-4 py-3 text-sm"
                >
                  {workspace.creators.map((item) => (
                    <option key={item.creator.id} value={item.creator.id}>
                      {item.creator.display_name || item.creator.username}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <MiniStat label="Connected" value={selectedCreator?.creator.status ?? "unknown"} />
                <MiniStat label="Last Sync" value={formatDate(selectedCreator?.creator.last_sync_at)} />
                <MiniStat label="BetterFans Account" value={selectedCreator?.creator.betterfans_account_id ?? "none"} />
                <MiniStat label="Onboarding" value={selectedCreator?.creator.onboarding_status ?? "unknown"} />
              </div>
            </div>
          </div>

          {tab === "creator" && creatorPreferencesDraft ? (
            <div className="glass-panel rounded-[28px] p-5">
              <SectionTitle icon={Users} title="Creator Preferences" subtitle="Control which automations this creator allows and the context the agency should respect." />
              <div className="mt-5 grid gap-4 xl:grid-cols-2">
                <ToggleField label="Automation Enabled" checked={creatorPreferencesDraft.automation_enabled} onChange={(checked) => setCreatorPreferencesDraft({ ...creatorPreferencesDraft, automation_enabled: checked })} />
                <ToggleField label="Chat Automation Enabled" checked={creatorPreferencesDraft.chat_automation_enabled} onChange={(checked) => setCreatorPreferencesDraft({ ...creatorPreferencesDraft, chat_automation_enabled: checked })} />
                <ToggleField label="PPV Automation Enabled" checked={creatorPreferencesDraft.ppv_automation_enabled} onChange={(checked) => setCreatorPreferencesDraft({ ...creatorPreferencesDraft, ppv_automation_enabled: checked })} />
                <div />
                <Field label="Creator Tone / Personality Notes">
                  <textarea value={creatorPreferencesDraft.tone_notes ?? ""} onChange={(event) => setCreatorPreferencesDraft({ ...creatorPreferencesDraft, tone_notes: emptyToNull(event.target.value) })} rows={4} className="command-card w-full rounded-2xl px-4 py-3 text-sm" />
                </Field>
                <Field label="Boundaries / Restricted Topics">
                  <textarea value={creatorPreferencesDraft.restricted_topics.join(", ")} onChange={(event) => setCreatorPreferencesDraft({ ...creatorPreferencesDraft, restricted_topics: csv(event.target.value) })} rows={4} className="command-card w-full rounded-2xl px-4 py-3 text-sm" placeholder="No offline meetups, no family roleplay, no illegal requests" />
                </Field>
                <Field label="Escalation Notes">
                  <textarea value={creatorPreferencesDraft.escalation_notes ?? ""} onChange={(event) => setCreatorPreferencesDraft({ ...creatorPreferencesDraft, escalation_notes: emptyToNull(event.target.value) })} rows={4} className="command-card w-full rounded-2xl px-4 py-3 text-sm" />
                </Field>
              </div>
            </div>
          ) : null}

          {tab === "ai" && creatorAiSafetyDraft ? (
            <div className="glass-panel rounded-[28px] p-5">
              <SectionTitle icon={Bot} title="AI Behaviour" subtitle="Tune how aggressive, flirtatious, and context-heavy the AI can be for this creator." />
              <div className="mt-5 grid gap-4 xl:grid-cols-2">
                <Field label="AI Mode">
                  <select value={creatorAiSafetyDraft.ai_behavior.ai_mode} onChange={(event) => setCreatorAiSafetyDraft({ ...creatorAiSafetyDraft, ai_behavior: { ...creatorAiSafetyDraft.ai_behavior, ai_mode: event.target.value as CreatorAiSafetySettings["ai_behavior"]["ai_mode"] } })} className="command-card w-full rounded-2xl px-4 py-3 text-sm">
                    {aiModes.map((option) => (
                      <option key={option} value={option}>
                        {labelizeMode(option)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Max Message Length">
                  <input type="number" min={40} value={creatorAiSafetyDraft.ai_behavior.max_message_length} onChange={(event) => setCreatorAiSafetyDraft({ ...creatorAiSafetyDraft, ai_behavior: { ...creatorAiSafetyDraft.ai_behavior, max_message_length: Math.max(40, toInt(event.target.value, 240)) } })} className="command-card w-full rounded-2xl px-4 py-3 text-sm" />
                </Field>
                <Field label="Emoji Level">
                  <select value={creatorAiSafetyDraft.ai_behavior.emoji_level} onChange={(event) => setCreatorAiSafetyDraft({ ...creatorAiSafetyDraft, ai_behavior: { ...creatorAiSafetyDraft.ai_behavior, emoji_level: event.target.value as CreatorAiSafetySettings["ai_behavior"]["emoji_level"] } })} className="command-card w-full rounded-2xl px-4 py-3 text-sm">
                    {emojiLevels.map((option) => (
                      <option key={option} value={option}>
                        {labelizeMode(option)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Flirty Level">
                  <select value={creatorAiSafetyDraft.ai_behavior.flirty_level} onChange={(event) => setCreatorAiSafetyDraft({ ...creatorAiSafetyDraft, ai_behavior: { ...creatorAiSafetyDraft.ai_behavior, flirty_level: event.target.value as CreatorAiSafetySettings["ai_behavior"]["flirty_level"] } })} className="command-card w-full rounded-2xl px-4 py-3 text-sm">
                    {flirtyLevels.map((option) => (
                      <option key={option} value={option}>
                        {labelizeMode(option)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Sales Aggressiveness">
                  <select value={creatorAiSafetyDraft.ai_behavior.sales_aggressiveness} onChange={(event) => setCreatorAiSafetyDraft({ ...creatorAiSafetyDraft, ai_behavior: { ...creatorAiSafetyDraft.ai_behavior, sales_aggressiveness: event.target.value as CreatorAiSafetySettings["ai_behavior"]["sales_aggressiveness"] } })} className="command-card w-full rounded-2xl px-4 py-3 text-sm">
                    {salesLevels.map((option) => (
                      <option key={option} value={option}>
                        {labelizeMode(option)}
                      </option>
                    ))}
                  </select>
                </Field>
                <ToggleField label="Use Creator Memory / Context" checked={creatorAiSafetyDraft.ai_behavior.use_creator_memory} onChange={(checked) => setCreatorAiSafetyDraft({ ...creatorAiSafetyDraft, ai_behavior: { ...creatorAiSafetyDraft.ai_behavior, use_creator_memory: checked } })} />
                <Field label="Escalate High-Value Fan Threshold">
                  <input type="number" min={0} value={creatorAiSafetyDraft.ai_behavior.escalate_high_value_fan_threshold} onChange={(event) => setCreatorAiSafetyDraft({ ...creatorAiSafetyDraft, ai_behavior: { ...creatorAiSafetyDraft.ai_behavior, escalate_high_value_fan_threshold: toInt(event.target.value, 100) } })} className="command-card w-full rounded-2xl px-4 py-3 text-sm" />
                </Field>
              </div>
            </div>
          ) : null}

          {tab === "safety" && creatorAiSafetyDraft ? (
            <div className="glass-panel rounded-[28px] p-5">
              <SectionTitle icon={ShieldCheck} title="Safety & Approval" subtitle="Hard stops that keep automation from becoming accidentally autonomous." />
              <div className="mt-5 grid gap-4 xl:grid-cols-2">
                <ToggleField label="Require Approval for First Message" checked={creatorAiSafetyDraft.safety.require_approval_first_message} onChange={(checked) => setCreatorAiSafetyDraft({ ...creatorAiSafetyDraft, safety: { ...creatorAiSafetyDraft.safety, require_approval_first_message: checked } })} />
                <ToggleField label="Require Approval for PPV Offers" checked={creatorAiSafetyDraft.safety.require_approval_ppv_offers} onChange={(checked) => setCreatorAiSafetyDraft({ ...creatorAiSafetyDraft, safety: { ...creatorAiSafetyDraft.safety, require_approval_ppv_offers: checked } })} />
                <Field label="Require Approval Above Spend Threshold">
                  <input type="number" min={0} value={creatorAiSafetyDraft.safety.require_approval_above_spend_threshold} onChange={(event) => setCreatorAiSafetyDraft({ ...creatorAiSafetyDraft, safety: { ...creatorAiSafetyDraft.safety, require_approval_above_spend_threshold: toInt(event.target.value, 100) } })} className="command-card w-full rounded-2xl px-4 py-3 text-sm" />
                </Field>
                <ToggleField label="Require Approval for VIP Fans" checked={creatorAiSafetyDraft.safety.require_approval_vip_fans} onChange={(checked) => setCreatorAiSafetyDraft({ ...creatorAiSafetyDraft, safety: { ...creatorAiSafetyDraft.safety, require_approval_vip_fans: checked } })} />
                <ToggleField label="Require Approval for Custom Requests" checked={creatorAiSafetyDraft.safety.require_approval_custom_requests} onChange={(checked) => setCreatorAiSafetyDraft({ ...creatorAiSafetyDraft, safety: { ...creatorAiSafetyDraft.safety, require_approval_custom_requests: checked } })} />
                <ToggleField label="Allow Auto-Send for VIP Fans" checked={creatorAiSafetyDraft.safety.allow_auto_send_for_vip} onChange={(checked) => setCreatorAiSafetyDraft({ ...creatorAiSafetyDraft, safety: { ...creatorAiSafetyDraft.safety, allow_auto_send_for_vip: checked } })} />
                <Field label="Restricted Keywords">
                  <textarea value={creatorAiSafetyDraft.safety.restricted_keywords.join(", ")} onChange={(event) => setCreatorAiSafetyDraft({ ...creatorAiSafetyDraft, safety: { ...creatorAiSafetyDraft.safety, restricted_keywords: csv(event.target.value) } })} rows={4} className="command-card w-full rounded-2xl px-4 py-3 text-sm" placeholder="refund, off-platform, meet, illegal" />
                </Field>
                <div className="rounded-[24px] border border-amber-400/20 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100/82">
                  Auto-send still only proceeds when creator automation is enabled, agency defaults allow it, the rule allows it, the script allows it, quiet hours are inactive, daily caps are below threshold, and VIP exceptions are explicitly allowed.
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === "runtime" ? (
        <div className="glass-panel rounded-[28px] p-5">
          <SectionTitle icon={Wifi} title="BetterFans / Runtime" subtitle="Configuration and health indicators without exposing any secrets." />
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            <HealthCard label="BetterFans API Configured" ok={workspace.runtime.betterfansApiKeyConfigured} detail="Boolean only. Secret value is never exposed." />
            <HealthCard label="BetterFans Base URL Configured" ok={workspace.runtime.betterfansBaseUrlConfigured} detail="Checks whether the runtime has a base URL configured." />
            <HealthCard label="Supabase Configured" ok={workspace.runtime.supabaseConfigured} detail="Confirms worker runtime has Supabase connection values." />
            <HealthCard label="Event Stream Status" ok={workspace.runtime.eventStreamStatus.connectionStatus === "receiver_ready"} detail={workspace.runtime.eventStreamStatus.message} />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MiniStat label="Last Successful Event" value={workspace.runtime.lastSuccessfulEventType ?? "none"} />
            <MiniStat label="Success Received" value={formatDate(workspace.runtime.lastSuccessfulEventReceivedAt)} />
            <MiniStat label="Last Failed Event" value={workspace.runtime.lastFailedEventType ?? "none"} />
            <MiniStat label="Failed At" value={formatDate(workspace.runtime.lastFailedEventAt)} />
            <MiniStat label="Last Sync Run" value={workspace.runtime.lastSyncRunStatus ?? "none"} />
            <MiniStat label="Sync Time" value={formatDate(workspace.runtime.lastSyncRunAt)} />
            <MiniStat label="Transport" value={workspace.runtime.eventStreamStatus.transport} />
            <MiniStat label="Persistent WS" value={workspace.runtime.eventStreamStatus.persistentWebSocket} />
          </div>
        </div>
      ) : null}

      {tab === "audit" ? (
        <div className="glass-panel rounded-[28px] p-5">
          <SectionTitle icon={Bell} title="Audit / Policy" subtitle="Recent settings changes recorded for agency accountability." />
          <div className="mt-5 space-y-3">
            {workspace.audit.map((entry) => (
              <div key={entry.id} className="rounded-[24px] border border-blue-400/20 bg-[#091827]/55 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-white">{entry.change_summary}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.16em] text-cyan-200/80">{entry.entity_type}</div>
                  </div>
                  <div className="text-right text-xs text-blue-100/58">
                    <div>{entry.actor_label ?? "operator"}</div>
                    <div className="mt-1">{formatDate(entry.created_at)}</div>
                  </div>
                </div>
                <pre className="mt-3 overflow-x-auto rounded-2xl bg-[#071423]/80 p-3 text-xs text-blue-100/72">{JSON.stringify(entry.payload, null, 2)}</pre>
              </div>
            ))}
            {!workspace.audit.length ? <div className="text-sm text-blue-100/58">No settings changes recorded yet.</div> : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function MetricCard({ icon: Icon, label, value, detail }: { icon: typeof Sparkles; label: string; value: string; detail: string }) {
  return (
    <div className="premium-card rounded-[24px] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/80">{label}</div>
          <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
      <div className="mt-2 text-sm text-blue-100/64">{detail}</div>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, subtitle }: { icon: typeof Sparkles; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <div>
        <div className="text-lg font-semibold text-white">{title}</div>
        <div className="text-sm text-blue-100/64">{subtitle}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-medium text-blue-100/62">{label}</div>
      {children}
    </label>
  );
}

function ToggleField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="command-card flex items-center justify-between rounded-2xl px-4 py-3 text-sm">
      <span>{label}</span>
      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${checked ? "bg-emerald-500/14 text-emerald-200" : "bg-blue-400/12 text-blue-100"}`}>{checked ? "Yes" : "No"}</span>
    </button>
  );
}

function HealthCard({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <div className="rounded-[24px] border border-blue-400/20 bg-[#091827]/55 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-white">{label}</div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${ok ? "bg-emerald-500/14 text-emerald-200" : "bg-rose-500/14 text-rose-200"}`}>
          {ok ? "OK" : "Needs attention"}
        </span>
      </div>
      <div className="mt-2 text-sm leading-6 text-blue-100/68">{detail}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-blue-400/20 bg-[#091827]/55 px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-100/58">{label}</div>
      <div className="mt-2 text-base font-semibold text-white">{value}</div>
    </div>
  );
}

function toInt(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : fallback;
}

function toHour(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(23, Math.floor(parsed))) : fallback;
}

function csv(value: string) {
  return [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))];
}

function emptyToNull(value: string) {
  return value.trim() ? value : null;
}

function labelizeMode(value: string) {
  return value.replaceAll("_", " ");
}

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : "unknown";
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected settings workspace error";
}
