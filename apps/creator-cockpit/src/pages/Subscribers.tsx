import { Brain, CheckCircle2, ClipboardList, MessageSquare, PauseCircle, Plus, RefreshCw, Search, ShieldAlert, Sparkles, TrendingUp, UserRound, Workflow, type LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import type { OfConversationIntelligence, OfCreator, OfSubscriberRelationship, OfTask, SubscriberWorkspaceTimelineItem, TaskStatus } from "@funkmyfans/of-types";
import {
  createSubscriberTask,
  fetchSubscriberDetail,
  fetchSubscribers,
  recalculateSubscriberIntelligence,
  recalculateSubscriberScore,
  updateSubscriberRelationship,
  updateTask,
  type SubscriberDetailData,
  type SubscribersData
} from "../lib/api";

type SortKey = "relationship_score" | "lifetime_spend" | "newest" | "last_seen" | "open_tasks";

export function Subscribers({
  initialCreators,
  initialSubscribers,
  initialTasks,
  onOpenTasks
}: {
  initialCreators: OfCreator[];
  initialSubscribers: OfSubscriberRelationship[];
  initialTasks: OfTask[];
  onOpenTasks: () => void;
}) {
  const [data, setData] = useState<SubscribersData>({ creators: initialCreators, subscribers: initialSubscribers, tasks: initialTasks });
  const [selectedId, setSelectedId] = useState<string | null>(initialSubscribers[0]?.id ?? null);
  const [detail, setDetail] = useState<SubscriberDetailData | null>(null);
  const [creator, setCreator] = useState("all");
  const [subscription, setSubscription] = useState("all");
  const [stage, setStage] = useState("all");
  const [hasOpenTasks, setHasOpenTasks] = useState(false);
  const [vipOnly, setVipOnly] = useState(false);
  const [churnOnly, setChurnOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("relationship_score");
  const [query, setQuery] = useState("");

  useEffect(() => {
    void refreshList();
  }, [creator, subscription, stage, hasOpenTasks, vipOnly, churnOnly, sort]);

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
  }, [selectedId]);

  const stages = useMemo(() => Array.from(new Set(data.subscribers.map((item) => item.relationship_state))).sort(), [data.subscribers]);
  const visibleSubscribers = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return data.subscribers;
    return data.subscribers.filter((subscriber) =>
      [subscriber.username, subscriber.display_name, subscriber.betterfans_subscriber_id, subscriber.recommended_next_action, creatorName(subscriber.creator_id, data.creators)]
        .some((value) => value?.toLowerCase().includes(needle))
    );
  }, [data.creators, data.subscribers, query]);
  const selectedSubscriber = detail?.subscriber ?? data.subscribers.find((item) => item.id === selectedId) ?? visibleSubscribers[0] ?? null;

  async function refreshList() {
    const result = await fetchSubscribers({
      creator,
      subscription,
      stage,
      hasOpenTasks: hasOpenTasks ? "true" : "all",
      vip: vipOnly ? "true" : "all",
      churn: churnOnly ? "true" : "all",
      sort
    });
    setData(result);
    setSelectedId((current) => current ?? result.subscribers[0]?.id ?? null);
  }

  async function loadDetail(id: string) {
    const result = await fetchSubscriberDetail(id);
    setDetail(result);
  }

  async function handleTaskStatus(task: OfTask, status: TaskStatus) {
    const result = await updateTask(task.id, { status, actor: "operator" });
    if (!detail) return;
    setDetail({
      ...detail,
      tasks: detail.tasks.map((item) => (item.id === task.id ? result.task : item))
    });
  }

  async function handleRelationshipPatch(patch: Partial<Pick<OfSubscriberRelationship, "automation_paused" | "human_takeover" | "auto_send_enabled" | "current_workflow">>) {
    if (!selectedSubscriber) return;
    const result = await updateSubscriberRelationship(selectedSubscriber.id, patch);
    setDetail((current) => current ? { ...current, subscriber: result.subscriber } : current);
    setData((current) => ({
      ...current,
      subscribers: current.subscribers.map((item) => (item.id === result.subscriber.id ? result.subscriber : item))
    }));
  }

  async function handleRecalculateIntelligence() {
    if (!selectedSubscriber) return;
    const intelligenceResult = await recalculateSubscriberIntelligence(selectedSubscriber.id);
    const scoreResult = await recalculateSubscriberScore(selectedSubscriber.id);
    setDetail((current) => current ? { ...current, intelligence: intelligenceResult.intelligence, subscriber: scoreResult.subscriber } : current);
    setData((current) => ({
      ...current,
      subscribers: current.subscribers.map((item) => (item.id === scoreResult.subscriber.id ? scoreResult.subscriber : item))
    }));
  }

  return (
    <main className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Subscribers" value={data.subscribers.length} icon={UserRound} />
        <Metric label="VIP" value={data.subscribers.filter((item) => item.vip_score >= 75).length} icon={Sparkles} />
        <Metric label="At Risk" value={data.subscribers.filter((item) => item.churn_risk >= 70).length} icon={ShieldAlert} />
        <Metric label="Open Tasks" value={data.tasks.filter((task) => isActiveTask(task.status)).length} icon={ClipboardList} />
        <Metric label="Total LTV" value={money(data.subscribers.reduce((sum, item) => sum + item.lifetime_spend, 0))} icon={CheckCircle2} />
      </section>

      <section className="grid gap-3 rounded-md border border-stone-200 bg-white p-3 xl:grid-cols-[1fr_150px_150px_160px_150px]">
        <label className="flex min-h-10 items-center gap-2 rounded-md border border-stone-200 px-3">
          <Search className="h-4 w-4 text-stone-500" aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent text-sm outline-none" placeholder="Search fans, creators, actions" />
        </label>
        <select value={creator} onChange={(event) => setCreator(event.target.value)} className="rounded-md border border-stone-200 px-3 py-2 text-sm">
          <option value="all">All creators</option>
          {data.creators.map((item) => <option key={item.id} value={item.id}>{item.display_name || item.username}</option>)}
        </select>
        <select value={subscription} onChange={(event) => setSubscription(event.target.value)} className="rounded-md border border-stone-200 px-3 py-2 text-sm">
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
        </select>
        <select value={stage} onChange={(event) => setStage(event.target.value)} className="rounded-md border border-stone-200 px-3 py-2 text-sm">
          <option value="all">All stages</option>
          {stages.map((item) => <option key={item} value={item}>{labelize(item)}</option>)}
        </select>
        <select value={sort} onChange={(event) => setSort(event.target.value as SortKey)} className="rounded-md border border-stone-200 px-3 py-2 text-sm">
          <option value="relationship_score">Relationship</option>
          <option value="lifetime_spend">Lifetime spend</option>
          <option value="newest">Newest</option>
          <option value="last_seen">Last seen</option>
          <option value="open_tasks">Open tasks</option>
        </select>
        <div className="flex flex-wrap gap-2 xl:col-span-5">
          <Toggle label="Has open tasks" checked={hasOpenTasks} onChange={setHasOpenTasks} />
          <Toggle label="VIP" checked={vipOnly} onChange={setVipOnly} />
          <Toggle label="Churn risk" checked={churnOnly} onChange={setChurnOnly} />
        </div>
      </section>

      <section className="grid min-h-[720px] overflow-hidden rounded-md border border-stone-200 bg-white xl:grid-cols-[430px_1fr]">
        <div className="border-b border-stone-200 xl:border-b-0 xl:border-r">
          <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
            <h2 className="text-base font-semibold text-stone-950">Subscribers</h2>
            <span className="text-sm font-medium text-stone-500">{visibleSubscribers.length}</span>
          </div>
          <div className="max-h-[660px] overflow-y-auto">
            {visibleSubscribers.map((subscriber) => (
              <button
                key={subscriber.id}
                type="button"
                onClick={() => setSelectedId(subscriber.id)}
                className={`block w-full border-b border-stone-100 px-4 py-3 text-left hover:bg-stone-50 ${selectedSubscriber?.id === subscriber.id ? "bg-teal-50" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <Avatar subscriber={subscriber} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="truncate font-semibold text-stone-950">{subscriber.display_name || subscriber.username || subscriber.betterfans_subscriber_id}</div>
                        <div className="text-xs text-stone-500">@{subscriber.username || subscriber.betterfans_subscriber_id} / {creatorName(subscriber.creator_id, data.creators)}</div>
                      </div>
                      <span className="rounded-md bg-stone-100 px-2 py-1 text-xs font-bold text-stone-700">{subscriber.relationship_score}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className={stateTone(subscriber.relationship_state)}>{labelize(subscriber.relationship_state)}</span>
                      <span className="rounded-md bg-emerald-50 px-2 py-1 font-semibold text-emerald-800">{money(subscriber.lifetime_spend)}</span>
                      <span className="rounded-md bg-amber-50 px-2 py-1 font-semibold text-amber-900">{openTaskCount(subscriber, data.tasks)} open</span>
                    </div>
                    <div className="mt-2 line-clamp-2 text-sm text-stone-600">{subscriber.recommended_next_action ?? "Monitor relationship"}</div>
                  </div>
                </div>
              </button>
            ))}
            {!visibleSubscribers.length ? <div className="p-6 text-sm text-stone-500">No subscribers match these filters.</div> : null}
          </div>
        </div>

        {selectedSubscriber ? (
          <SubscriberDetail
            detail={detail}
            fallbackSubscriber={selectedSubscriber}
            creators={data.creators}
            onOpenTasks={onOpenTasks}
            onTaskStatus={handleTaskStatus}
            onCreateTask={async (body) => {
              const created = await createSubscriberTask(selectedSubscriber.id, body);
              await loadDetail(selectedSubscriber.id);
              setData((current) => ({ ...current, tasks: [created.task, ...current.tasks] }));
            }}
            onRelationshipPatch={handleRelationshipPatch}
            onRecalculateIntelligence={handleRecalculateIntelligence}
          />
        ) : (
          <div className="flex items-center justify-center p-8 text-sm text-stone-500">Select a subscriber.</div>
        )}
      </section>
    </main>
  );
}

function SubscriberDetail({
  detail,
  fallbackSubscriber,
  creators,
  onOpenTasks,
  onTaskStatus,
  onCreateTask,
  onRelationshipPatch,
  onRecalculateIntelligence
}: {
  detail: SubscriberDetailData | null;
  fallbackSubscriber: OfSubscriberRelationship;
  creators: OfCreator[];
  onOpenTasks: () => void;
  onTaskStatus: (task: OfTask, status: TaskStatus) => void;
  onCreateTask: (body: { title: string; reason?: string; priorityScore?: number; dueAt?: string | null; recommendedAction?: string }) => Promise<void>;
  onRelationshipPatch: (patch: Partial<Pick<OfSubscriberRelationship, "automation_paused" | "human_takeover" | "auto_send_enabled" | "current_workflow">>) => Promise<void>;
  onRecalculateIntelligence: () => Promise<void>;
}) {
  const subscriber = detail?.subscriber ?? fallbackSubscriber;
  const intelligence = detail?.intelligence ?? firstRelatedRecord<OfConversationIntelligence>(subscriber.of_conversation_intelligence) ?? null;
  const tasks = detail?.tasks ?? [];
  const openTasks = tasks.filter((task) => isActiveTask(task.status));
  const closedTasks = tasks.filter((task) => !isActiveTask(task.status));
  const topTask = openTasks[0] ?? null;
  const [note, setNote] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [manualReason, setManualReason] = useState("");
  const [workflow, setWorkflow] = useState(subscriber.current_workflow ?? "");
  const [recalculating, setRecalculating] = useState(false);

  useEffect(() => {
    setWorkflow(subscriber.current_workflow ?? "");
  }, [subscriber.id, subscriber.current_workflow]);

  async function submitManualTask(event: FormEvent) {
    event.preventDefault();
    await onCreateTask({
      title: manualTitle || "Manual subscriber follow-up",
      reason: manualReason || undefined,
      priorityScore: 55,
      recommendedAction: "Review subscriber context and follow up."
    });
    setManualTitle("");
    setManualReason("");
  }

  async function handleRecalculate() {
    setRecalculating(true);
    try {
      await onRecalculateIntelligence();
    } finally {
      setRecalculating(false);
    }
  }

  return (
    <div className="min-w-0">
      <header className="border-b border-stone-200 px-5 py-4">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div className="flex gap-4">
            <Avatar subscriber={subscriber} large />
            <div>
              <div className="text-sm font-semibold text-teal-700">{creatorName(subscriber.creator_id, creators)}</div>
              <h2 className="mt-1 text-2xl font-semibold text-stone-950">{subscriber.display_name || subscriber.username || subscriber.betterfans_subscriber_id}</h2>
              <div className="mt-2 flex flex-wrap gap-2 text-sm">
                <span className={stateTone(subscriber.relationship_state)}>{labelize(subscriber.relationship_state)}</span>
                <span className="rounded-md bg-stone-100 px-2 py-1 font-semibold text-stone-700">{subscriber.current_subscription_status ?? "unknown"}</span>
                <span className="rounded-md bg-emerald-50 px-2 py-1 font-semibold text-emerald-800">{money(subscriber.lifetime_spend)} LTV</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <QuickButton label="Open Chat" icon={MessageSquare} onClick={() => window.alert("Chat workspace is not connected yet.")} />
            <QuickButton label="Open Tasks" icon={ClipboardList} onClick={onOpenTasks} />
            <QuickButton label={subscriber.automation_paused ? "Resume Automation" : "Pause Automation"} icon={PauseCircle} onClick={() => void onRelationshipPatch({ automation_paused: !subscriber.automation_paused })} />
          </div>
        </div>
      </header>

      <div className="grid gap-5 p-5 xl:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <Panel title="Recommended Action">
            <div className="rounded-md bg-teal-50 p-3">
              <div className="text-sm font-semibold text-teal-900">{intelligence?.recommended_next_action ?? subscriber.recommended_next_action ?? "Monitor relationship"}</div>
              <div className="mt-1 text-sm text-teal-800">{topTask ? `Highest priority task: ${topTask.title}` : "No active task is currently blocking this subscriber."}</div>
              {intelligence?.suggested_script || topTask?.suggested_script ? <div className="mt-1 text-sm text-teal-800">Suggested script: {intelligence?.suggested_script ?? topTask?.suggested_script}</div> : null}
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <Flag label="Automation Paused" active={subscriber.automation_paused} />
              <Flag label="Human Takeover" active={subscriber.human_takeover} />
              <Flag label="Auto-send" active={subscriber.auto_send_enabled} />
            </div>
          </Panel>

          <Panel title="Conversation Intelligence">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
              <div className="min-w-0">
                <p className="text-sm leading-6 text-stone-700">{intelligence?.rolling_summary ?? "No conversation intelligence has been calculated yet."}</p>
                <div className="mt-3 grid gap-3 md:grid-cols-4">
                  <Field label="Current Intent" value={intelligence?.current_intent ? labelize(intelligence.current_intent) : "unknown"} />
                  <Field label="Sentiment" value={intelligence?.conversation_sentiment ? labelize(intelligence.conversation_sentiment) : "unknown"} />
                  <Field label="Temperature" value={intelligence?.relationship_temperature ?? "unknown"} />
                  <Field label="Confidence" value={intelligence ? `${intelligence.confidence}/100` : "unknown"} />
                </div>
              </div>
              <button type="button" onClick={() => void handleRecalculate()} disabled={recalculating} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-stone-200 px-3 text-sm font-semibold text-stone-700 disabled:opacity-60">
                <RefreshCw className={`h-4 w-4 ${recalculating ? "animate-spin" : ""}`} aria-hidden="true" />
                Recalculate
              </button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <Signal label="Sentiment" value={intelligence?.sentiment_score ?? 0} icon={Brain} />
              <Signal label="Engagement" value={intelligence?.engagement_score ?? subscriber.engagement_score} icon={MessageSquare} />
              <Signal label="Trend" value={intelligence?.engagement_trend ?? "unknown"} icon={TrendingUp} />
            </div>
          </Panel>

          <Panel title="Profile Summary">
            <div className="grid gap-3 md:grid-cols-4">
              <Field label="Relationship" value={`${subscriber.relationship_score}/100`} />
              <Field label="Revenue Opportunity" value={`${subscriber.revenue_opportunity_score}/100`} />
              <Field label="Urgency" value={`${subscriber.urgency_score}/100`} />
              <Field label="Engagement" value={`${subscriber.engagement_score}/100`} />
              <Field label="VIP" value={`${subscriber.vip_score}/100`} />
              <Field label="Churn Risk" value={`${subscriber.churn_risk}/100`} />
              <Field label="AI Confidence" value={`${subscriber.ai_confidence_score}/100`} />
              <Field label="First Seen" value={date(subscriber.first_seen_at)} />
              <Field label="Last Seen" value={date(subscriber.last_seen_at)} />
              <Field label="Country" value={subscriber.country ?? "unknown"} />
              <Field label="Tier" value={subscriber.subscription_tier ?? "unknown"} />
            </div>
          </Panel>

          <Panel title="Relationship Intelligence">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <ScoreCard label="Relationship" value={subscriber.relationship_score} reason={subscriber.relationship_score_reason} />
              <ScoreCard label="Revenue Opportunity" value={subscriber.revenue_opportunity_score} reason={subscriber.revenue_opportunity_score_reason} />
              <ScoreCard label="Urgency" value={subscriber.urgency_score} reason={subscriber.urgency_score_reason} />
              <ScoreCard label="Churn Risk" value={subscriber.churn_risk} reason={subscriber.churn_risk_reason} />
              <ScoreCard label="VIP Potential" value={subscriber.vip_score} reason={subscriber.vip_score_reason} />
              <ScoreCard label="Engagement" value={subscriber.engagement_score} reason={subscriber.engagement_score_reason} />
              <ScoreCard label="AI Confidence" value={subscriber.ai_confidence_score} reason={subscriber.ai_confidence_score_reason} />
            </div>
          </Panel>

          <Panel title="Revenue Summary">
            <div className="grid gap-3 md:grid-cols-5">
              <Field label="Lifetime" value={money(subscriber.lifetime_spend)} />
              <Field label="Subs" value={money(subscriber.subscription_spend)} />
              <Field label="PPV" value={money(subscriber.ppv_purchases)} />
              <Field label="Tips" value={money(subscriber.tips)} />
              <Field label="AOV" value={money(subscriber.average_order_value)} />
            </div>
          </Panel>

          <Panel title="Tasks">
            <TaskSection title="Open Tasks" tasks={openTasks} onStatus={onTaskStatus} />
            <TaskSection title="Completed / Ignored / Cancelled" tasks={closedTasks} onStatus={onTaskStatus} />
          </Panel>

          <Panel title="Relationship Timeline">
            <Timeline items={detail?.timeline ?? []} />
          </Panel>
        </div>

        <aside className="space-y-5">
          <Panel title="Revenue Signals">
            <div className="grid gap-3">
              <Signal label="Likely PPV Buyer" value={intelligence?.likely_ppv_buyer ?? 0} icon={Sparkles} />
              <Signal label="Custom Buyer" value={intelligence?.custom_buyer ?? 0} icon={MessageSquare} />
              <Signal label="Tipper" value={intelligence?.tipper ?? 0} icon={CheckCircle2} />
              <Signal label="Renewal" value={intelligence?.renewal_likelihood ?? 0} icon={Workflow} />
              <Signal label="Churn" value={intelligence?.churn_probability ?? subscriber.churn_risk} icon={ShieldAlert} />
              <Signal label="Whale Potential" value={intelligence?.whale_potential ?? 0} icon={Sparkles} />
            </div>
          </Panel>

          <Panel title="AI Briefing">
            <pre className="whitespace-pre-wrap text-sm leading-6 text-stone-700">{intelligence?.ai_briefing ?? "No AI briefing yet."}</pre>
          </Panel>

          <Panel title="Workflow">
            <Field label="Active Script" value={subscriber.active_script_id ?? "none"} />
            <Field label="Current Workflow" value={subscriber.current_workflow ?? "none"} />
            <div className="mt-3 flex gap-2">
              <input value={workflow} onChange={(event) => setWorkflow(event.target.value)} className="min-w-0 flex-1 rounded-md border border-stone-200 px-3 py-2 text-sm" placeholder="Workflow name" />
              <button type="button" onClick={() => void onRelationshipPatch({ current_workflow: workflow || null })} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-stone-950 px-3 text-sm font-semibold text-white">
                <Workflow className="h-4 w-4" aria-hidden="true" />
                Mark
              </button>
            </div>
            <div className="mt-3 grid gap-2">
              <Toggle label="Human takeover" checked={subscriber.human_takeover} onChange={(checked) => void onRelationshipPatch({ human_takeover: checked })} />
              <Toggle label="Auto-send enabled" checked={subscriber.auto_send_enabled} onChange={(checked) => void onRelationshipPatch({ auto_send_enabled: checked })} />
            </div>
          </Panel>

          <Panel title="Create Task">
            <form className="space-y-3" onSubmit={(event) => void submitManualTask(event)}>
              <input value={manualTitle} onChange={(event) => setManualTitle(event.target.value)} className="w-full rounded-md border border-stone-200 px-3 py-2 text-sm" placeholder="Task title" />
              <textarea value={manualReason} onChange={(event) => setManualReason(event.target.value)} className="min-h-20 w-full rounded-md border border-stone-200 px-3 py-2 text-sm" placeholder="Reason" />
              <button type="submit" className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white">
                <Plus className="h-4 w-4" aria-hidden="true" />
                Create Task
              </button>
            </form>
          </Panel>

          <Panel title="Conversation Memory">
            <MemoryList title="Unresolved Topics" items={intelligence?.unresolved_topics ?? []} />
            <MemoryList title="Promises Made" items={intelligence?.promises_made ?? []} />
            <MemoryList title="Important Facts" items={intelligence?.important_facts ?? []} />
          </Panel>

          <Panel title="Manual Notes">
            <textarea value={note} onChange={(event) => setNote(event.target.value)} className="min-h-32 w-full rounded-md border border-stone-200 px-3 py-2 text-sm" placeholder="Local note placeholder. Persistent notes will be added in a later sprint." />
          </Panel>
        </aside>
      </div>
    </div>
  );
}

function TaskSection({ title, tasks, onStatus }: { title: string; tasks: OfTask[]; onStatus: (task: OfTask, status: TaskStatus) => void }) {
  return (
    <div className="mb-4 last:mb-0">
      <h4 className="mb-2 text-sm font-semibold text-stone-950">{title}</h4>
      <div className="divide-y divide-stone-100 rounded-md border border-stone-200">
        {tasks.map((task) => (
          <div key={task.id} className="px-3 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold text-stone-950">{task.title}</div>
                <div className="mt-1 text-sm text-stone-500">{task.reason ?? task.description}</div>
              </div>
              <span className="rounded-md bg-stone-100 px-2 py-1 text-xs font-bold text-stone-700">{task.priority_score}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {isActiveTask(task.status) ? (
                <>
                  <SmallButton label="Start" onClick={() => onStatus(task, "in_progress")} />
                  <SmallButton label="Complete" onClick={() => onStatus(task, "completed")} />
                  <SmallButton label="Ignore" onClick={() => onStatus(task, "ignored")} />
                </>
              ) : (
                <SmallButton label="Reopen" onClick={() => onStatus(task, "open")} />
              )}
            </div>
          </div>
        ))}
        {!tasks.length ? <div className="p-3 text-sm text-stone-500">No tasks in this group.</div> : null}
      </div>
    </div>
  );
}

function Timeline({ items }: { items: SubscriberWorkspaceTimelineItem[] }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={`${item.source}:${item.id}`} className="border-l-2 border-teal-700 pl-3">
          <div className="font-medium text-stone-950">{item.title}</div>
          <div className="text-sm text-stone-500">{labelize(item.type)} / {item.actor} / {date(item.occurred_at)}</div>
          {item.detail ? <div className="mt-1 text-sm text-stone-600">{item.detail}</div> : null}
        </div>
      ))}
      {!items.length ? <div className="text-sm text-stone-500">No timeline entries yet.</div> : null}
    </div>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: string | number; icon: LucideIcon }) {
  return (
    <div className="rounded-md border border-stone-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-stone-500">{label}</div>
          <div className="mt-1 text-2xl font-semibold text-stone-950">{value}</div>
        </div>
        <Icon className="h-5 w-5 text-teal-700" aria-hidden="true" />
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-md border border-stone-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">{title}</h3>
      {children}
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-stone-950">{value}</div>
    </div>
  );
}

function Signal({ label, value, icon: Icon }: { label: string; value: number | string; icon: LucideIcon }) {
  const numeric = typeof value === "number";
  return (
    <div className="rounded-md border border-stone-200 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</div>
          <div className="mt-1 text-sm font-semibold text-stone-950">{numeric ? `${value}/100` : labelize(String(value))}</div>
        </div>
        <Icon className="h-4 w-4 shrink-0 text-teal-700" aria-hidden="true" />
      </div>
      {numeric ? <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-100"><div className="h-full rounded-full bg-teal-700" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div> : null}
    </div>
  );
}

function ScoreCard({ label, value, reason }: { label: string; value: number; reason: string | null | undefined }) {
  const score = Math.max(0, Math.min(100, value ?? 0));
  const tone = score >= 75 ? "bg-emerald-600" : score >= 50 ? "bg-teal-700" : "bg-amber-600";
  return (
    <div className="rounded-md border border-stone-200 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</div>
          <div className="mt-1 text-lg font-semibold text-stone-950">{score}/100</div>
        </div>
        <div className="h-2 w-16 overflow-hidden rounded-full bg-stone-100">
          <div className={`h-full rounded-full ${tone}`} style={{ width: `${score}%` }} />
        </div>
      </div>
      <p className="mt-2 text-sm leading-5 text-stone-600">{reason ?? "No score reason recorded yet."}</p>
    </div>
  );
}

function MemoryList({ title, items }: { title: string; items: unknown[] }) {
  return (
    <div className="mb-4 last:mb-0">
      <div className="text-xs font-medium uppercase tracking-wide text-stone-500">{title}</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((item, index) => <span key={`${title}:${index}`} className="rounded-md bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-700">{String(item)}</span>)}
        {!items.length ? <span className="text-sm text-stone-500">None captured.</span> : null}
      </div>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="inline-flex min-h-9 items-center gap-2 rounded-md border border-stone-200 px-3 text-sm font-semibold text-stone-700">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}

function QuickButton({ label, icon: Icon, onClick }: { label: string; icon: LucideIcon; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-stone-200 px-3 text-sm font-semibold text-stone-700">
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </button>
  );
}

function SmallButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="rounded-md border border-stone-200 px-2 py-1 text-xs font-semibold text-stone-700">{label}</button>;
}

function Flag({ label, active }: { label: string; active: boolean }) {
  return <span className={`rounded-md px-2 py-1 text-xs font-semibold ${active ? "bg-amber-50 text-amber-900" : "bg-stone-100 text-stone-600"}`}>{label}: {active ? "yes" : "no"}</span>;
}

function Avatar({ subscriber, large = false }: { subscriber: OfSubscriberRelationship; large?: boolean }) {
  const size = large ? "h-14 w-14" : "h-10 w-10";
  if (subscriber.avatar_url) return <img src={subscriber.avatar_url} alt="" className={`${size} rounded-md object-cover`} />;
  const initial = (subscriber.display_name || subscriber.username || subscriber.betterfans_subscriber_id).slice(0, 1).toUpperCase();
  return <div className={`${size} flex shrink-0 items-center justify-center rounded-md bg-teal-700 text-sm font-bold text-white`}>{initial}</div>;
}

function openTaskCount(subscriber: OfSubscriberRelationship, tasks: OfTask[]) {
  return tasks.filter((task) => isActiveTask(task.status) && ((task.source_type === "subscriber" && task.source_id === subscriber.id) || task.subscriber_id === subscriber.subscriber_id)).length;
}

function creatorName(creatorId: string, creators: OfCreator[]) {
  const creator = creators.find((item) => item.id === creatorId);
  return creator?.display_name || creator?.username || "Unknown creator";
}

function isActiveTask(status: TaskStatus) {
  return status === "open" || status === "in_progress" || status === "waiting";
}

function stateTone(state: string) {
  if (state === "vip" || state === "reactivated") return "rounded-md bg-emerald-50 px-2 py-1 font-semibold text-emerald-800";
  if (state === "at_risk" || state === "expired") return "rounded-md bg-rose-50 px-2 py-1 font-semibold text-rose-800";
  if (state === "cooling") return "rounded-md bg-amber-50 px-2 py-1 font-semibold text-amber-900";
  return "rounded-md bg-teal-50 px-2 py-1 font-semibold text-teal-800";
}

function labelize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function money(value: number | null | undefined) {
  return value == null ? "unknown" : `$${value.toLocaleString()}`;
}

function date(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : "unknown";
}

function firstRelatedRecord<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}
