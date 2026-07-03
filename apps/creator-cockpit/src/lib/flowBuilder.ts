import type {
  MessageScriptStepType,
  MessageScriptTemplate,
  OfMessageScript,
  ScriptBuilderBranchRule,
  ScriptBuilderConfig,
  ScriptBuilderCondition,
  ScriptBuilderStepMetadata,
  ScriptVisualBuilderConfig,
  ScriptVisualBuilderConnection,
  ScriptVisualBuilderNode,
  ScriptVisualBuilderNodeCategory,
  ScriptVisualBuilderNodeType
} from "@funkmyfans/of-types";

export type FlowValidationSeverity = "error" | "warning";

export type FlowValidationIssue = {
  severity: FlowValidationSeverity;
  nodeId?: string;
  message: string;
};

export type NodeRegistryEntry = {
  type: ScriptVisualBuilderNodeType;
  label: string;
  description: string;
  category: ScriptVisualBuilderNodeCategory;
  icon: string;
  configurationSchema: Array<{
    key: string;
    label: string;
    input: "text" | "textarea" | "number" | "select";
    required?: boolean;
    options?: Array<{ value: string; label: string }>;
  }>;
  defaultConfig: Record<string, unknown>;
  runtimeMapping: {
    stepType: MessageScriptStepType;
    kind: ScriptBuilderStepMetadata["kind"];
  };
  validate: (node: ScriptVisualBuilderNode, flow: ScriptVisualBuilderConfig) => FlowValidationIssue[];
  compile: (node: ScriptVisualBuilderNode, context: FlowCompilerContext) => MessageScriptTemplate["steps"][number];
};

export type FlowCompilerContext = {
  order: number;
  connections: ScriptVisualBuilderConnection[];
};

export const nodeCategoryLabels: Record<ScriptVisualBuilderNodeCategory, string> = {
  conversation: "Conversation",
  ai: "AI",
  logic: "Logic",
  human: "Human",
  commerce: "Commerce",
  timing: "Timing"
};

const textBodyField = [{ key: "body", label: "Content", input: "textarea" as const, required: true }];
const conditionFields = [
  { key: "conditionKey", label: "Condition key", input: "text" as const, required: true },
  { key: "conditionValue", label: "Condition value", input: "text" as const }
];
const outcomeFields = [
  { key: "outcomeKey", label: "Outcome key", input: "text" as const },
  { key: "outcomeLabel", label: "Outcome label", input: "text" as const },
  { key: "terminalType", label: "Terminal type", input: "text" as const }
];
const fallbackRouteKey = "fallback";

export const nodeRegistry: NodeRegistryEntry[] = [
  registryNode("trigger", "Trigger", "Starts a conversation flow.", "conversation", "Route", { eventType: "manual" }, "message", "send_message", [
    { key: "eventType", label: "Trigger event", input: "text", required: true }
  ]),
  registryNode("message", "Send Message", "Sends a prepared message.", "conversation", "MessageSquareText", { body: "Write the message here." }, "message", "send_message", textBodyField),
  registryNode("ask_question", "Ask Question", "Asks the fan a question.", "conversation", "CircleHelp", { body: "What would you like next?" }, "question", "ask_question", textBodyField),
  registryNode("wait", "Wait", "Waits for a reply or event.", "conversation", "MessageCircleMore", { body: "Wait for reply.", waitForReply: "true" }, "wait", "wait", textBodyField),
  registryNode("delay", "Delay", "Continues after a delay.", "timing", "Hourglass", { delayMinutes: 180 }, "follow_up", "wait", [
    { key: "delayMinutes", label: "Delay minutes", input: "number", required: true },
    { key: "body", label: "Follow-up note", input: "textarea" }
  ]),
  registryNode("draft_reply", "Draft Reply", "Creates an AI-assisted draft.", "ai", "Bot", { body: "Draft a reply in the creator voice." }, "set_variable", "set_variable", textBodyField),
  registryNode("generate_response", "Generate Response", "Generates response text for review.", "ai", "Sparkles", { body: "Generate a response from the conversation context." }, "set_variable", "set_variable", textBodyField),
  registryNode("analyse_conversation", "Analyse Conversation", "Analyses recent conversation context.", "ai", "ScanText", { body: "Analyse tone, risk, and purchase intent." }, "set_variable", "set_variable", textBodyField),
  registryNode("classify_intent", "Classify Intent", "Classifies fan intent.", "ai", "Tags", { body: "Classify the current fan intent." }, "set_variable", "set_variable", textBodyField),
  registryNode("if_else", "If / Else", "Routes between yes and no paths.", "logic", "GitBranch", { conditionKey: "spend_level", conditionValue: "high" }, "branch", "branch", conditionFields),
  registryNode("branch", "Branch", "Creates labelled flow paths.", "logic", "Split", { conditionKey: "intent", conditionValue: "buy" }, "branch", "branch", conditionFields),
  registryNode("switch", "Switch", "Routes by a field value.", "logic", "Workflow", { conditionKey: "response_class", cases: defaultRoutingCases() }, "branch", "branch", [
    { key: "conditionKey", label: "Routing variable", input: "text", required: true }
  ]),
  registryNode("filter", "Filter", "Stops or continues by condition.", "logic", "Filter", { conditionKey: "safe_to_continue", conditionValue: "true" }, "branch", "branch", conditionFields),
  registryNode("approve", "Approve", "Requires human approval.", "human", "UserCheck", { approvalNote: "Approve before continuing.", destination: "Review Queue" }, "message", "send_message", [
    { key: "approvalNote", label: "Approval note", input: "textarea", required: true },
    { key: "destination", label: "Approval destination", input: "text", required: true },
    ...outcomeFields
  ]),
  registryNode("assign", "Assign", "Assigns work to a queue or operator.", "human", "UsersRound", { queueName: "Review Queue" }, "message", "send_message", [
    { key: "queueName", label: "Queue", input: "text", required: true },
    ...outcomeFields
  ]),
  registryNode("pause", "Pause", "Pauses the flow for human handling.", "human", "PauseCircle", { body: "Pause for human review." }, "wait", "wait", [...textBodyField, ...outcomeFields]),
  registryNode("escalate", "Escalate", "Escalates to a senior operator.", "human", "BadgeAlert", { queueName: "Escalations" }, "message", "send_message", [
    { key: "queueName", label: "Escalation queue", input: "text", required: true },
    ...outcomeFields
  ]),
  registryNode("ppv_offer", "PPV Offer", "Drafts a PPV offer.", "commerce", "BadgeDollarSign", { title: "Premium drop", price: 20, body: "I have something premium for you." }, "message", "send_message", [
    { key: "title", label: "Offer title", input: "text", required: true },
    { key: "price", label: "Price", input: "number" },
    { key: "body", label: "Message", input: "textarea", required: true }
  ]),
  registryNode("bundle", "Bundle", "Offers a bundle.", "commerce", "Package", { title: "Bundle", body: "I can bundle this for you." }, "message", "send_message", textBodyField),
  registryNode("custom_content", "Custom Content", "Handles custom content intent.", "commerce", "Gem", { body: "Tell me what custom you want." }, "question", "ask_question", textBodyField),
  registryNode("renew_subscription", "Renew Subscription", "Prompts renewal.", "commerce", "RefreshCw", { body: "Want to renew and keep this going?" }, "message", "send_message", textBodyField),
  registryNode("schedule", "Schedule", "Schedules a later step.", "timing", "CalendarClock", { scheduleLabel: "Tonight" }, "wait", "wait", [
    { key: "scheduleLabel", label: "Schedule", input: "text", required: true }
  ]),
  registryNode("expiry", "Expiry", "Expires a path after a window.", "timing", "TimerOff", { delayMinutes: 1440 }, "wait", "wait", [
    { key: "delayMinutes", label: "Expiry minutes", input: "number", required: true }
  ]),
  registryNode("end", "End", "Ends the conversation flow.", "conversation", "CheckCircle2", { outcomeKey: "complete", outcomeLabel: "Complete", terminalType: "completed" }, "end", "end_conversation", outcomeFields)
];

export const nodeRegistryByType = new Map(nodeRegistry.map((entry) => [entry.type, entry]));

export function createBuilderNode(type: ScriptVisualBuilderNodeType, position: { x: number; y: number }): ScriptVisualBuilderNode {
  const entry = getNodeRegistryEntry(type);
  return {
    id: tempId(type),
    type,
    label: entry.label,
    category: entry.category,
    x: position.x,
    y: position.y,
    config: { ...entry.defaultConfig }
  };
}

export function flowFromConversationFlow(script: OfMessageScript): ScriptVisualBuilderConfig {
  const existing = script.builder_config?.workspace?.visualBuilder;
  if (existing?.nodes?.length) {
    return {
      schemaVersion: 1,
      selectedNodeId: existing.selectedNodeId ?? existing.nodes[0]?.id ?? null,
      nodes: existing.nodes.map(normalizeNode),
      connections: existing.connections ?? [],
      viewport: existing.viewport
    };
  }

  const trigger = normalizeNode({
    id: "trigger",
    type: "trigger",
    label: "Trigger",
    category: "conversation",
    x: 80,
    y: 220,
    config: { eventType: script.trigger_event_type }
  });
  const stepNodes = (script.steps ?? []).map((step, index) =>
    normalizeNode({
      id: step.id,
      type: nodeTypeFromStep(step.step_type, step.metadata),
      label: step.metadata?.label ?? labelFromStep(step.step_type),
      x: 360 + index * 280,
      y: step.step_type === "branch" ? 110 : 220 + (index % 2 === 0 ? 0 : 110),
      config: {
        body: step.message_body ?? "",
        delayMinutes: step.delay_minutes ?? 0,
        conditionKey: step.condition_key ?? step.metadata?.branchRules?.[0]?.condition.key ?? "",
        conditionValue: step.condition_value ?? "",
        approvalNote: step.metadata?.notes ?? "",
        destination: step.metadata?.variableValue ?? "Review Queue",
        queueName: step.metadata?.variableValue ?? "Review Queue",
        variableKey: step.metadata?.variableKey ?? "",
        variableValue: step.metadata?.variableValue ?? "",
        cases: routeCasesFromMetadata(step.metadata),
        outcomeKey: step.metadata?.outcomeKey ?? "complete",
        outcomeLabel: step.metadata?.outcomeLabel ?? step.metadata?.label ?? "Complete",
        terminalType: step.metadata?.terminalType ?? "completed"
      }
    })
  );
  const end = normalizeNode({
    id: "end",
    type: "end",
    label: "End",
    category: "conversation",
    x: 360 + Math.max(stepNodes.length, 1) * 280,
    y: 220,
    config: { outcome: "complete" }
  });

  return {
    schemaVersion: 1,
    selectedNodeId: "trigger",
    nodes: [trigger, ...stepNodes, end],
    connections: connectionsFromScript(script),
    viewport: { x: 0, y: 0, zoom: 0.9 }
  };
}

export function compileBuilderFlow(script: OfMessageScript, flow: ScriptVisualBuilderConfig): MessageScriptTemplate {
  const compiled = compileFlowSteps(flow);
  const trigger = flow.nodes.find((node) => node.type === "trigger");
  return {
    name: script.name.replace(/\bScript\b/g, "Flow"),
    description: script.description ?? "",
    triggerEventType: stringValue(trigger?.config.eventType) || script.trigger_event_type || "manual",
    autoSendEnabled: script.auto_send_enabled,
    requiresApproval: script.requires_approval,
    actionMode: script.action_mode,
    cooldownHours: script.cooldown_hours,
    maxSendsPerFan: script.max_sends_per_fan,
    folderName: script.folder_name ?? "Playbooks",
    category: script.category ?? "General",
    tags: script.tags ?? ["playbook", "flow"],
    versionNumber: script.version_number ?? 1,
    sourceScriptId: script.source_script_id ?? null,
    builderConfig: {
      schemaVersion: 1,
      variables: script.builder_config?.variables ?? defaultVariables(),
      workspace: {
        ...defaultWorkspaceConfig(),
        ...script.builder_config?.workspace,
        visualBuilder: flow
      }
    },
    steps: compiled.length ? compiled : [getNodeRegistryEntry("end").compile(createBuilderNode("end", { x: 0, y: 0 }), { order: 0, connections: [] })]
  };
}

export function validateBuilderFlow(flow: ScriptVisualBuilderConfig): FlowValidationIssue[] {
  const issues: FlowValidationIssue[] = [];
  const triggerNodes = flow.nodes.filter((node) => node.type === "trigger");
  if (!triggerNodes.length) issues.push({ severity: "error", message: "Missing trigger node." });
  if (triggerNodes.length > 1) issues.push({ severity: "error", message: "Multiple entry trigger nodes." });

  for (const node of flow.nodes) {
    const entry = getNodeRegistryEntry(node.type);
    issues.push(...entry.validate(node, flow));
    const incoming = flow.connections.filter((connection) => connection.to === node.id);
    const outgoing = flow.connections.filter((connection) => connection.from === node.id);
    if (node.type !== "trigger" && incoming.length === 0) issues.push({ severity: "warning", nodeId: node.id, message: `${node.label} is unconnected from the entry path.` });
    if (node.type !== "end" && outgoing.length === 0) issues.push({ severity: "warning", nodeId: node.id, message: `${node.label} has no outgoing path.` });
    if (isHumanApprovalNode(node) && !stringValue(node.config.destination) && !stringValue(node.config.queueName)) {
      issues.push({ severity: "error", nodeId: node.id, message: "Approval node needs an approval destination." });
    }
    if (isBranchNode(node)) {
      if (node.type === "switch") {
        issues.push(...validateSwitchNode(node, outgoing));
      } else {
        const labelled = new Set(outgoing.map((connection) => connection.label ?? "next"));
        if (!labelled.has("yes") || !labelled.has("no")) issues.push({ severity: "error", nodeId: node.id, message: "Branch nodes need yes and no paths." });
      }
    }
  }

  const reachable = reachableNodeIds(flow);
  for (const node of flow.nodes) {
    if (!reachable.has(node.id)) issues.push({ severity: "warning", nodeId: node.id, message: `${node.label} is not reachable from the trigger.` });
  }
  if (hasCycle(flow)) issues.push({ severity: "warning", message: "Potential loop detected. Confirm this is intentional before publishing." });
  return issues;
}

export function compileFlowSteps(flow: ScriptVisualBuilderConfig): MessageScriptTemplate["steps"] {
  return orderedRuntimeNodes(flow).map((node, index) => getNodeRegistryEntry(node.type).compile(node, { order: index, connections: flow.connections }));
}

export function isBranchNode(node: ScriptVisualBuilderNode) {
  return node.type === "if_else" || node.type === "branch" || node.type === "switch" || node.type === "filter" || node.type === "condition";
}

export function getNodeRegistryEntry(type: ScriptVisualBuilderNodeType) {
  return nodeRegistryByType.get(type) ?? nodeRegistryByType.get("message")!;
}

export function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function numberValue(value: unknown) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : 0;
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
}

function registryNode(
  type: ScriptVisualBuilderNodeType,
  label: string,
  description: string,
  category: ScriptVisualBuilderNodeCategory,
  icon: string,
  defaultConfig: Record<string, unknown>,
  stepType: MessageScriptStepType,
  kind: ScriptBuilderStepMetadata["kind"],
  configurationSchema: NodeRegistryEntry["configurationSchema"]
): NodeRegistryEntry {
  return {
    type,
    label,
    description,
    category,
    icon,
    configurationSchema,
    defaultConfig,
    runtimeMapping: { stepType, kind },
    validate: (node) =>
      configurationSchema
        .filter((field) => field.required && !String(node.config[field.key] ?? "").trim())
        .map((field) => ({ severity: "error" as const, nodeId: node.id, message: `${label} is missing ${field.label.toLowerCase()}.` })),
    compile: (node, context) => nodeToStepTemplate(node, context.order, context.connections, stepType, kind)
  };
}

function nodeToStepTemplate(
  node: ScriptVisualBuilderNode,
  order: number,
  connections: ScriptVisualBuilderConnection[],
  stepType: MessageScriptStepType,
  kind: ScriptBuilderStepMetadata["kind"]
): MessageScriptTemplate["steps"][number] {
  const next = nextConnection(node, connections);
  const fallback = fallbackConnection(node, connections);
  return {
    id: node.id,
    order,
    type: stepType,
    body: bodyFromNode(node),
    delayMinutes: node.type === "delay" || node.type === "expiry" ? numberValue(node.config.delayMinutes) : undefined,
    condition: stringValue(node.config.conditionKey) ? { key: stringValue(node.config.conditionKey), value: stringValue(node.config.conditionValue) } : undefined,
    nextStepId: next?.to && next.to !== "end" ? next.to : undefined,
    fallbackStepId: fallback?.to && fallback.to !== "end" ? fallback.to : undefined,
    metadata: {
      kind,
      label: node.label,
      nodeKey: node.id,
      outcomeKey: outcomeKeyFromNode(node),
      outcomeLabel: outcomeLabelFromNode(node),
      terminalType: terminalTypeFromNode(node),
      variableKey: node.type === "classify_intent" || node.type === "draft_reply" || node.type === "generate_response" || node.type === "analyse_conversation" ? stringValue(node.config.variableKey) || undefined : undefined,
      waitForReply: node.type === "wait",
      messageGenerationMode: isAiNode(node) ? "ai_generated" : "template",
      notes: notesFromNode(node),
      variableValue: stringValue(node.config.variableValue) || stringValue(node.config.destination) || stringValue(node.config.queueName) || undefined,
      ppvTitle: stringValue(node.config.title) || undefined,
      ppvPrice: node.config.price == null ? undefined : numberValue(node.config.price),
      branchRules: isBranchNode(node) ? branchRulesFromNode(node, connections) : undefined
    }
  };
}

function normalizeNode(node: ScriptVisualBuilderNode): ScriptVisualBuilderNode {
  const normalizedType = normalizeNodeType(node.type);
  const entry = getNodeRegistryEntry(normalizedType);
  return {
    ...node,
    type: normalizedType,
    label: node.label || entry.label,
    category: entry.category,
    config: { ...entry.defaultConfig, ...(node.config ?? {}) }
  };
}

function normalizeNodeType(type: ScriptVisualBuilderNodeType): ScriptVisualBuilderNodeType {
  if (type === "ai_prompt") return "draft_reply";
  if (type === "condition") return "if_else";
  if (type === "human_approval") return "approve";
  if (type === "assign_queue") return "assign";
  return type;
}

function nodeTypeFromStep(type: MessageScriptStepType, metadata?: ScriptBuilderStepMetadata): ScriptVisualBuilderNodeType {
  if (metadata?.kind === "branch" && (metadata.branchRules?.length ?? 0) > 1) return "switch";
  if (metadata?.kind === "branch") return "if_else";
  if (metadata?.kind === "set_variable") return "draft_reply";
  if (type === "follow_up" || type === "wait") return "delay";
  if (type === "question") return "ask_question";
  if (type === "branch") return "if_else";
  if (type === "set_variable") return "draft_reply";
  if (type === "end") return "end";
  return "message";
}

function connectionsFromScript(script: OfMessageScript): ScriptVisualBuilderConnection[] {
  const steps = script.steps ?? [];
  if (!steps.length) return [{ id: "edge-trigger-end", from: "trigger", to: "end" }];
  const connections: ScriptVisualBuilderConnection[] = [{ id: "edge-trigger", from: "trigger", to: steps[0].id }];
  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index];
    const metadata = step.metadata;
    const nextStep = step.next_step_id || steps[index + 1]?.id || "end";
    const branchRules = metadata?.branchRules ?? [];
    if (step.step_type === "branch" && branchRules.length > 1) {
      for (const rule of branchRules) {
        if (rule.nextStepId) connections.push({ id: `edge-${step.id}-${routeCaseKey(rule)}`, from: step.id, to: rule.nextStepId, label: routeCaseKey(rule) });
      }
      if (step.fallback_step_id) connections.push({ id: `edge-${step.id}-${fallbackRouteKey}`, from: step.id, to: step.fallback_step_id, label: fallbackRouteKey });
    } else {
      connections.push({ id: `edge-${step.id}-next`, from: step.id, to: nextStep, label: step.step_type === "branch" ? "yes" : undefined });
      if (step.fallback_step_id) connections.push({ id: `edge-${step.id}-fallback`, from: step.id, to: step.fallback_step_id, label: "no" });
    }
  }
  return connections;
}

function orderedRuntimeNodes(flow: ScriptVisualBuilderConfig) {
  const trigger = flow.nodes.find((node) => node.type === "trigger");
  const byId = new Map(flow.nodes.map((node) => [node.id, node]));
  const ordered: ScriptVisualBuilderNode[] = [];
  const seen = new Set<string>();
  const visit = (nodeId: string | undefined) => {
    if (!nodeId || seen.has(nodeId)) return;
    const node = byId.get(nodeId);
    if (!node || node.type === "trigger") return;
    seen.add(nodeId);
    ordered.push(node);
    for (const edge of flow.connections.filter((connection) => connection.from === nodeId)) visit(edge.to);
  };
  for (const edge of flow.connections.filter((connection) => connection.from === trigger?.id)) visit(edge.to);
  for (const node of flow.nodes.filter((item) => item.type !== "trigger" && !seen.has(item.id)).sort((a, b) => a.x - b.x || a.y - b.y)) ordered.push(node);
  return ordered.filter((node) => node.type !== "trigger");
}

function reachableNodeIds(flow: ScriptVisualBuilderConfig) {
  const trigger = flow.nodes.find((node) => node.type === "trigger");
  const reachable = new Set<string>();
  const visit = (nodeId: string | undefined) => {
    if (!nodeId || reachable.has(nodeId)) return;
    reachable.add(nodeId);
    for (const edge of flow.connections.filter((connection) => connection.from === nodeId)) visit(edge.to);
  };
  visit(trigger?.id);
  return reachable;
}

function hasCycle(flow: ScriptVisualBuilderConfig) {
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (nodeId: string): boolean => {
    if (visiting.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;
    visiting.add(nodeId);
    for (const edge of flow.connections.filter((connection) => connection.from === nodeId)) {
      if (visit(edge.to)) return true;
    }
    visiting.delete(nodeId);
    visited.add(nodeId);
    return false;
  };
  return flow.nodes.some((node) => visit(node.id));
}

function bodyFromNode(node: ScriptVisualBuilderNode) {
  if (node.type === "assign" || node.type === "assign_queue") return `Assign to ${stringValue(node.config.queueName) || "Review Queue"}`;
  if (node.type === "approve" || node.type === "human_approval") return stringValue(node.config.approvalNote);
  if (node.type === "delay" || node.type === "expiry") return stringValue(node.config.body) || "Continue after delay.";
  if (node.type === "schedule") return `Scheduled for ${stringValue(node.config.scheduleLabel) || "later"}.`;
  if (node.type === "end") return "Conversation flow ended.";
  return stringValue(node.config.body) || stringValue(node.config.title) || undefined;
}

function notesFromNode(node: ScriptVisualBuilderNode) {
  return stringValue(node.config.approvalNote) || stringValue(node.config.body) || stringValue(node.config.notes) || undefined;
}

function branchCondition(node: ScriptVisualBuilderNode): ScriptBuilderCondition {
  return { source: "variable", key: stringValue(node.config.conditionKey) || "condition", operator: "equals", value: stringValue(node.config.conditionValue) };
}

function nextConnection(node: ScriptVisualBuilderNode, connections: ScriptVisualBuilderConnection[]) {
  const outgoing = connections.filter((connection) => connection.from === node.id);
  if (node.type === "switch") return outgoing.find((connection) => !connection.label);
  return outgoing.find((connection) => !connection.label || connection.label === "yes");
}

function fallbackConnection(node: ScriptVisualBuilderNode, connections: ScriptVisualBuilderConnection[]) {
  const fallbackLabel = node.type === "switch" ? fallbackRouteKey : "no";
  return connections.find((connection) => connection.from === node.id && connection.label === fallbackLabel);
}

function branchRulesFromNode(node: ScriptVisualBuilderNode, connections: ScriptVisualBuilderConnection[]): ScriptBuilderBranchRule[] {
  if (node.type === "switch") {
    return routeCasesFromNode(node).map((routeCase) => ({
      id: `${node.id}-${routeCase.key}`,
      label: routeCase.label,
      condition: { source: "variable", key: stringValue(node.config.conditionKey) || "response_class", operator: "equals", value: routeCase.key },
      nextStepId: connections.find((connection) => connection.from === node.id && connection.label === routeCase.key)?.to ?? null
    }));
  }
  const next = nextConnection(node, connections);
  return [
    {
      id: `${node.id}-yes`,
      label: "yes",
      condition: branchCondition(node),
      nextStepId: next?.to && next.to !== "end" ? next.to : null
    }
  ];
}

function validateSwitchNode(node: ScriptVisualBuilderNode, outgoing: ScriptVisualBuilderConnection[]): FlowValidationIssue[] {
  const issues: FlowValidationIssue[] = [];
  const routeCases = routeCasesFromNode(node);
  const keys = new Set<string>();
  for (const routeCase of routeCases) {
    if (!routeCase.key) {
      issues.push({ severity: "warning", nodeId: node.id, message: "Switch route is missing a case key." });
      continue;
    }
    if (keys.has(routeCase.key)) issues.push({ severity: "warning", nodeId: node.id, message: `Switch route key "${routeCase.key}" is duplicated.` });
    keys.add(routeCase.key);
    if (!routeCase.label.trim()) issues.push({ severity: "warning", nodeId: node.id, message: `Switch route "${routeCase.key}" needs a label.` });
    if (!outgoing.some((connection) => connection.label === routeCase.key)) {
      issues.push({ severity: "warning", nodeId: node.id, message: `Switch route "${routeCase.label || routeCase.key}" has no target.` });
    }
  }
  if (!outgoing.some((connection) => connection.label === fallbackRouteKey)) {
    issues.push({ severity: "warning", nodeId: node.id, message: "Switch route needs a fallback path before publishing." });
  }
  return issues;
}

function routeCasesFromMetadata(metadata?: ScriptBuilderStepMetadata) {
  const branchRules = metadata?.branchRules ?? [];
  if (!branchRules.length) return defaultRoutingCases();
  return branchRules.map((rule) => ({ key: routeCaseKey(rule), label: rule.label || routeCaseKey(rule) }));
}

function routeCasesFromNode(node: ScriptVisualBuilderNode) {
  const raw = Array.isArray(node.config.cases) ? node.config.cases : [];
  const cases = raw
    .map((item) => (isRecord(item) ? { key: stringValue(item.key).trim(), label: stringValue(item.label).trim() } : null))
    .filter((item): item is { key: string; label: string } => Boolean(item));
  return cases.length ? cases : defaultRoutingCases();
}

function routeCaseKey(rule: ScriptBuilderBranchRule) {
  return rule.condition.value || rule.id;
}

function defaultRoutingCases() {
  return [
    { key: "warm_enthusiastic", label: "Warm / enthusiastic" },
    { key: "short_low_effort", label: "Short / low effort" },
    { key: "compliment", label: "Compliment" },
    { key: "purchase_intent", label: "Purchase intent" }
  ];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isAiNode(node: ScriptVisualBuilderNode) {
  return node.category === "ai" || ["draft_reply", "generate_response", "analyse_conversation", "classify_intent", "ai_prompt"].includes(node.type);
}

function isHumanApprovalNode(node: ScriptVisualBuilderNode) {
  return node.type === "approve" || node.type === "human_approval";
}

function outcomeKeyFromNode(node: ScriptVisualBuilderNode) {
  if (!isOutcomeNode(node)) return undefined;
  if (node.type === "end") return stringValue(node.config.outcomeKey) || "complete";
  return stringValue(node.config.outcomeKey) || undefined;
}

function outcomeLabelFromNode(node: ScriptVisualBuilderNode) {
  if (!isOutcomeNode(node)) return undefined;
  if (node.type === "end") return stringValue(node.config.outcomeLabel) || node.label || "Complete";
  return stringValue(node.config.outcomeLabel) || undefined;
}

function terminalTypeFromNode(node: ScriptVisualBuilderNode) {
  if (!isOutcomeNode(node)) return undefined;
  if (node.type === "end") return stringValue(node.config.terminalType) || "completed";
  return stringValue(node.config.terminalType) || undefined;
}

function isOutcomeNode(node: ScriptVisualBuilderNode) {
  return node.type === "end" || node.type === "approve" || node.type === "assign" || node.type === "pause" || node.type === "escalate";
}

function labelFromStep(type: MessageScriptStepType) {
  if (type === "follow_up") return "Delay";
  if (type === "set_variable") return "Draft Reply";
  return type.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function defaultWorkspaceConfig(): NonNullable<ScriptBuilderConfig["workspace"]> {
  return {
    archivedAt: null,
    execution: { mode: "immediate" },
    ai: { mode: "draft_only" },
    approval: { mode: "always_approve" },
    conditions: []
  };
}

function defaultVariables() {
  return [
    { key: "subscriber_name", label: "Subscriber Name", defaultValue: "there" },
    { key: "creator_name", label: "Creator Name", defaultValue: "creator" }
  ];
}

function tempId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}
