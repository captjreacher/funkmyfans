import type {
  BriefingProviderId,
  CommercialOpportunity,
  CommercialOpportunityKey,
  JourneyStage,
  MorningBrief,
  OfConversationIntelligence,
  OfSubscriberRelationship,
  OperatorBriefing,
  SubscriberPersona,
  SubscriberPersonaKey
} from "@funkmyfans/of-types";

export interface SubscriberAgencyIntelligenceInput {
  relationship: Partial<OfSubscriberRelationship> & Record<string, unknown>;
  intelligence?: Partial<OfConversationIntelligence> | null;
  relationshipScores?: {
    revenue_opportunity_score?: number;
    urgency_score?: number;
    churn_risk?: number;
    vip_score?: number;
    engagement_score?: number;
    ai_confidence_score?: number;
  };
  now?: Date;
  provider?: BriefingProviderId;
}

export interface SubscriberAgencyIntelligenceBundle {
  provider: BriefingProviderId;
  persona: SubscriberPersona;
  opportunity: CommercialOpportunity;
  journey_stage: JourneyStage;
  journey_stage_reason: string;
  operator_briefing: OperatorBriefing;
}

export interface FocusQueueInput {
  subscribers: Array<Partial<OfSubscriberRelationship> & Record<string, unknown>>;
  provider?: BriefingProviderId;
}

type PersonaRow = SubscriberPersona & { key: SubscriberPersonaKey; score: number };

const personaCatalog: Array<Pick<SubscriberPersona, "key" | "name" | "emoji" | "color" | "description" | "recommended_strategy">> = [
  { key: "new_fan", name: "New Fan", emoji: "👋", color: "#38bdf8", description: "Recently subscribed and still learning their preferences.", recommended_strategy: "Build relationship." },
  { key: "warm_buyer", name: "Warm Buyer", emoji: "🔥", color: "#f97316", description: "Responsive and already showing purchase behaviour.", recommended_strategy: "Continue monetisation." },
  { key: "vip", name: "VIP", emoji: "💎", color: "#f472b6", description: "High value subscriber who deserves premium treatment.", recommended_strategy: "Prioritise human relationship." },
  { key: "collector", name: "Collector", emoji: "🎁", color: "#84cc16", description: "Buys content frequently and usually prefers products over chat.", recommended_strategy: "Lean into content-first offers." },
  { key: "conversational", name: "Conversational", emoji: "💬", color: "#22d3ee", description: "Responds quickly and is more likely to buy through dialogue.", recommended_strategy: "Use human-led conversation." },
  { key: "drifting_away", name: "Drifting Away", emoji: "⚠️", color: "#f59e0b", description: "Engagement is cooling and the relationship needs attention.", recommended_strategy: "Prioritise retention." },
  { key: "dormant", name: "Dormant", emoji: "❄", color: "#94a3b8", description: "Little recent activity and low engagement.", recommended_strategy: "Only re-engage when there is a clear reason." }
];

const opportunityCatalog: Array<Pick<CommercialOpportunity, "key" | "name" | "emoji" | "color" | "description" | "recommended_action" | "expected_outcome">> = [
  { key: "welcome", name: "Welcome", emoji: "👋", color: "#38bdf8", description: "Introduce the relationship and start building trust.", recommended_action: "Send the welcome script.", expected_outcome: "Higher first-response rate." },
  { key: "upsell_ppv", name: "Upsell PPV", emoji: "🎁", color: "#84cc16", description: "Offer a relevant locked post, PPV, or premium clip.", recommended_action: "Send the PPV prompt.", expected_outcome: "Medium-to-high conversion on content." },
  { key: "offer_custom", name: "Offer Custom", emoji: "✨", color: "#a855f7", description: "Pitch custom content while the relationship is warm.", recommended_action: "Offer a custom content menu.", expected_outcome: "Higher-value one-off purchase." },
  { key: "retention", name: "Retention", emoji: "⚠️", color: "#f59e0b", description: "Re-engage before the subscriber drops off.", recommended_action: "Send a retention check-in.", expected_outcome: "Reduced churn risk." },
  { key: "renewal", name: "Renewal", emoji: "🔁", color: "#0ea5e9", description: "Prompt renewal when the subscription window matters.", recommended_action: "Send the renewal reminder.", expected_outcome: "Higher chance of keeping the subscription active." },
  { key: "vip_outreach", name: "VIP Outreach", emoji: "💎", color: "#f472b6", description: "Make the relationship feel premium and human.", recommended_action: "Prioritise a personal VIP message.", expected_outcome: "Stronger loyalty and retention." },
  { key: "human_conversation", name: "Human Conversation", emoji: "💬", color: "#22d3ee", description: "Keep the relationship moving through authentic dialogue.", recommended_action: "Continue the chat personally.", expected_outcome: "More replies and a warmer relationship." },
  { key: "no_action", name: "No Action", emoji: "🕊", color: "#94a3b8", description: "Hold steady until a meaningful signal appears.", recommended_action: "No immediate action.", expected_outcome: "Avoid unnecessary outreach." }
];

export function calculateSubscriberAgencyIntelligence(input: SubscriberAgencyIntelligenceInput): SubscriberAgencyIntelligenceBundle {
  const now = input.now ?? new Date();
  const relationship = input.relationship;
  const intelligence = input.intelligence ?? firstRecord(relationship.of_conversation_intelligence);
  const scoreInput = input.relationshipScores ?? {};

  const lifetimeSpend = numberValue(relationship.lifetime_spend);
  const purchaseCount = numberValue(relationship.purchase_count);
  const ppvPurchases = numberValue(relationship.ppv_purchases);
  const customsPurchased = numberValue(relationship.customs_purchased);
  const conversationCount = numberValue(relationship.conversation_count);
  const pendingActions = numberValue(relationship.pending_actions);
  const pendingApprovals = numberValue(relationship.pending_approvals);
  const churnRisk = numberValue(scoreInput.churn_risk ?? relationship.churn_risk);
  const vipScore = numberValue(scoreInput.vip_score ?? relationship.vip_score);
  const engagementScore = numberValue(scoreInput.engagement_score ?? relationship.engagement_score);
  const revenueOpportunityScore = numberValue(scoreInput.revenue_opportunity_score ?? relationship.revenue_opportunity_score);
  const urgencyScore = numberValue(scoreInput.urgency_score ?? relationship.urgency_score);
  const aiConfidenceScore = numberValue(scoreInput.ai_confidence_score ?? relationship.ai_confidence_score, 50);
  const likelyPpvBuyer = numberValue(intelligence?.likely_ppv_buyer);
  const customBuyer = numberValue(intelligence?.custom_buyer);
  const renewalLikelihood = numberValue(intelligence?.renewal_likelihood);
  const daysSinceFirstSeen = ageDays(relationship.first_seen_at as string | null | undefined, now);
  const daysSinceSeen = ageDays((relationship.last_seen_at ?? relationship.last_subscriber_message_at) as string | null | undefined, now);
  const daysSincePurchase = ageDays(relationship.last_purchase_at as string | null | undefined, now);
  const activeSubscription = isActiveSubscription(String(relationship.current_subscription_status ?? ""));
  const expiredSubscription = isExpiredSubscription(String(relationship.current_subscription_status ?? "")) || relationship.relationship_state === "expired";
  const hasConversation = conversationCount > 0;
  const hasRevenue = lifetimeSpend > 0 || purchaseCount > 0;

  const personaOptions = personaCatalog.map((persona) => ({
    ...persona,
    score: personaScoreFor(persona.key, {
      lifetimeSpend,
      purchaseCount,
      ppvPurchases,
      customsPurchased,
      conversationCount,
      pendingActions,
      pendingApprovals,
      churnRisk,
      vipScore,
      engagementScore,
      revenueOpportunityScore,
      aiConfidenceScore,
      likelyPpvBuyer,
      customBuyer,
      renewalLikelihood,
      daysSinceFirstSeen,
      daysSinceSeen,
      daysSincePurchase,
      activeSubscription,
      expiredSubscription,
      hasConversation,
      hasRevenue
    })
  }));

  const rankedPersonas = [...personaOptions].sort((left, right) => right.score - left.score);
  const selectedPersona = rankedPersonas[0] ?? personaOptions[0];
  const nextPersona = rankedPersonas[1] ?? null;
  const persona: SubscriberPersona = {
    key: selectedPersona.key,
    name: selectedPersona.name,
    emoji: selectedPersona.emoji,
    color: selectedPersona.color,
    description: selectedPersona.description,
    recommended_strategy: selectedPersona.recommended_strategy,
    confidence: confidenceFromMargin(selectedPersona.score, nextPersona?.score),
    reason: personaReasonFor(selectedPersona.key, {
      lifetimeSpend,
      purchaseCount,
      ppvPurchases,
      conversationCount,
      churnRisk,
      engagementScore,
      revenueOpportunityScore,
      vipScore,
      likelyPpvBuyer,
      customBuyer,
      daysSinceFirstSeen,
      daysSinceSeen,
      expiredSubscription,
      activeSubscription
    })
  };

  const opportunity = chooseOpportunity({
    personaKey: persona.key,
    lifetimeSpend,
    purchaseCount,
    ppvPurchases,
    customsPurchased,
    conversationCount,
    churnRisk,
    vipScore,
    engagementScore,
    revenueOpportunityScore,
    urgencyScore,
    likelyPpvBuyer,
    customBuyer,
    renewalLikelihood,
    daysSinceFirstSeen,
    daysSinceSeen,
    daysSincePurchase,
    activeSubscription,
    expiredSubscription
  });

  const journey = determineJourneyStage({
    relationship,
    personaKey: persona.key,
    lifetimeSpend,
    purchaseCount,
    ppvPurchases,
    conversationCount,
    churnRisk,
    vipScore,
    engagementScore,
    revenueOpportunityScore,
    daysSinceFirstSeen,
    daysSinceSeen,
    daysSincePurchase,
    activeSubscription,
    expiredSubscription,
    hasConversation,
    hasRevenue
  });

  const operatorBriefing = buildOperatorBriefing({
    provider: input.provider ?? "deterministic-v1",
    relationship,
    persona,
    opportunity,
    journeyStage: journey.stage,
    journeyReason: journey.reason,
    lifetimeSpend,
    purchaseCount,
    ppvPurchases,
    conversationCount,
    churnRisk,
    engagementScore,
    revenueOpportunityScore,
    likelyPpvBuyer,
    customBuyer,
    renewalLikelihood,
    daysSinceFirstSeen,
    daysSinceSeen,
    daysSincePurchase,
    activeSubscription,
    expiredSubscription
  });

  return {
    provider: input.provider ?? "deterministic-v1",
    persona,
    opportunity,
    journey_stage: journey.stage,
    journey_stage_reason: journey.reason,
    operator_briefing: operatorBriefing
  };
}

export function buildDailyFocusQueue(input: FocusQueueInput) {
  const provider = input.provider ?? "deterministic-v1";
  const subscribers = input.subscribers;

  return [
    {
      key: "warm_buyers",
      title: "Warm Buyers",
      emoji: "🔥",
      color: "#f97316",
      description: "Responsive fans who already show buying intent.",
      filter: { persona: "warm_buyer" },
      reason: "They are most likely to respond quickly to a monetisation prompt.",
      count: countBy(subscribers, (subscriber) => personaKey(subscriber) === "warm_buyer")
    },
    {
      key: "vip",
      title: "VIPs",
      emoji: "💎",
      color: "#f472b6",
      description: "High lifetime value subscribers who deserve human attention.",
      filter: { persona: "vip" },
      reason: "They protect the most revenue and relationship equity.",
      count: countBy(subscribers, (subscriber) => personaKey(subscriber) === "vip")
    },
    {
      key: "churn_risks",
      title: "Churn Risks",
      emoji: "⚠",
      color: "#f59e0b",
      description: "Subscribers showing cooling behaviour or elevated churn signals.",
      filter: { persona: "drifting_away" },
      reason: "Retention work is most urgent when engagement is slipping.",
      count: countBy(subscribers, (subscriber) => personaKey(subscriber) === "drifting_away" || journeyStage(subscriber) === "At Risk")
    },
    {
      key: "new_fans",
      title: "New Fans",
      emoji: "👋",
      color: "#38bdf8",
      description: "Recently joined subscribers who need a welcome touchpoint.",
      filter: { persona: "new_fan" },
      reason: "Early response has the biggest relationship impact.",
      count: countBy(subscribers, (subscriber) => personaKey(subscriber) === "new_fan")
    },
    {
      key: "conversations_waiting",
      title: "Conversations Waiting",
      emoji: "💬",
      color: "#22d3ee",
      description: "Highly conversational fans and unanswered relationship threads.",
      filter: { persona: "conversational" },
      reason: "These subscribers often convert through dialogue, not automation.",
      count: countBy(subscribers, (subscriber) => personaKey(subscriber) === "conversational")
    },
    {
      key: "ppv_opportunities",
      title: "PPV Opportunities",
      emoji: "🎁",
      color: "#84cc16",
      description: "Subscribers with a likely content-first buying pattern.",
      filter: { opportunity: "upsell_ppv" },
      reason: "This is where deterministic revenue prompts can land fastest.",
      count: countBy(subscribers, (subscriber) => opportunityKey(subscriber) === "upsell_ppv" || personaKey(subscriber) === "collector")
    }
  ];
}

export function buildMorningBrief(input: { subscribers: Array<Partial<OfSubscriberRelationship> & Record<string, unknown>>; provider?: BriefingProviderId }): MorningBrief {
  const provider = input.provider ?? "deterministic-v1";
  const ranked = [...input.subscribers].sort((left, right) => scorePriority(right) - scorePriority(left));
  const highest = ranked[0] ?? null;
  const overdueWelcome = countBy(input.subscribers, (subscriber) => personaKey(subscriber) === "new_fan" && numberValue(subscriber.conversation_count) === 0);
  const churnRisks = countBy(input.subscribers, (subscriber) => personaKey(subscriber) === "drifting_away" || journeyStage(subscriber) === "At Risk");
  const missedRevenue = Math.round(
    input.subscribers.reduce((sum, subscriber) => {
      const persona = personaKey(subscriber);
      const opportunity = opportunityKey(subscriber);
      const base = persona === "vip" || opportunity === "vip_outreach" ? 220 : persona === "warm_buyer" || opportunity === "upsell_ppv" ? 145 : persona === "collector" ? 110 : 55;
      return sum + base * Math.max(0.1, numberValue(subscriber.revenue_opportunity_score ?? 0) / 100);
    }, 0)
  );

  return {
    headline: highest ? `${displayName(highest)} is the highest priority subscriber.` : "No subscriber signals are available yet.",
    summary: highest
      ? `Primary persona ${labelize(personaKey(highest))}. ${labelize(opportunityKey(highest))}. ${journeyStage(highest)} journey.`
      : "The subscriber list is not populated enough to form a meaningful morning brief.",
    highest_priority_subscriber: highest ? displayName(highest) : "No subscribers yet",
    highest_priority_reason: highest ? reasonForSubscriber(highest) : "No scoring signals available.",
    missed_revenue: missedRevenue,
    overdue_welcome_conversations: overdueWelcome + churnRisks,
    provider
  };
}

function personaScoreFor(
  key: SubscriberPersonaKey,
  input: {
    lifetimeSpend: number;
    purchaseCount: number;
    ppvPurchases: number;
    customsPurchased: number;
    conversationCount: number;
    pendingActions: number;
    pendingApprovals: number;
    churnRisk: number;
    vipScore: number;
    engagementScore: number;
    revenueOpportunityScore: number;
    aiConfidenceScore: number;
    likelyPpvBuyer: number;
    customBuyer: number;
    renewalLikelihood: number;
    daysSinceFirstSeen: number;
    daysSinceSeen: number;
    daysSincePurchase: number;
    activeSubscription: boolean;
    expiredSubscription: boolean;
    hasConversation: boolean;
    hasRevenue: boolean;
  }
) {
  switch (key) {
    case "new_fan":
      return clampScore(92 - input.conversationCount * 10 - input.purchaseCount * 8 - input.lifetimeSpend / 18 + (input.daysSinceFirstSeen <= 3 ? 8 : 0) + (input.activeSubscription ? 5 : 0));
    case "warm_buyer":
      return clampScore(28 + input.purchaseCount * 10 + input.ppvPurchases * 8 + input.engagementScore * 0.28 + input.revenueOpportunityScore * 0.22 + input.likelyPpvBuyer * 0.22 + (input.hasRevenue ? 18 : 0) - (input.expiredSubscription ? 16 : 0));
    case "vip":
      return clampScore(input.vipScore * 0.48 + input.lifetimeSpend / 7 + input.purchaseCount * 4 + input.engagementScore * 0.16 + input.aiConfidenceScore * 0.1);
    case "collector":
      return clampScore(14 + input.ppvPurchases * 14 + input.purchaseCount * 6 + input.lifetimeSpend / 20 + input.revenueOpportunityScore * 0.18 + input.likelyPpvBuyer * 0.22 - input.conversationCount * 2 - input.customsPurchased * 4);
    case "conversational":
      return clampScore(18 + input.conversationCount * 11 + input.engagementScore * 0.32 + input.aiConfidenceScore * 0.12 + (input.daysSinceSeen <= 7 ? 12 : 0) + (input.purchaseCount <= 2 ? 10 : 0) - input.lifetimeSpend / 24);
    case "drifting_away":
      return clampScore(16 + input.churnRisk * 0.44 + input.daysSinceSeen * 1.3 + input.daysSincePurchase * 0.6 + (input.pendingActions + input.pendingApprovals) * 3 + (input.expiredSubscription ? 18 : 0) - input.engagementScore * 0.18 - input.renewalLikelihood * 0.16);
    case "dormant":
      return clampScore(22 + input.daysSinceSeen * 1.6 + input.daysSincePurchase * 0.9 + (input.hasConversation ? -14 : 10) + (input.hasRevenue ? -8 : 15) + (input.conversationCount === 0 ? 12 : -6) + input.churnRisk * 0.12 - input.engagementScore * 0.1);
  }
  return 0;
}

function personaReasonFor(
  key: SubscriberPersonaKey,
  input: {
    lifetimeSpend: number;
    purchaseCount: number;
    ppvPurchases: number;
    conversationCount: number;
    churnRisk: number;
    engagementScore: number;
    revenueOpportunityScore: number;
    vipScore: number;
    likelyPpvBuyer: number;
    customBuyer: number;
    daysSinceFirstSeen: number;
    daysSinceSeen: number;
    expiredSubscription: boolean;
    activeSubscription: boolean;
  }
) {
  switch (key) {
    case "new_fan":
      return input.daysSinceFirstSeen <= 3 && input.purchaseCount === 0 ? "Recently subscribed, with little conversation and no purchases yet." : "This fan is still early in the relationship and needs a welcome touchpoint.";
    case "warm_buyer":
      return input.revenueOpportunityScore >= 60 || input.likelyPpvBuyer >= 60 ? "Engaged, responsive, and already showing a repeat buying pattern." : "This fan is active enough to continue monetisation with a relevant offer.";
    case "vip":
      return input.lifetimeSpend >= 500 || input.vipScore >= 75 || input.purchaseCount >= 5 ? "High lifetime value and strong relationship signals justify premium treatment." : "This subscriber looks and behaves like a top-tier relationship.";
    case "collector":
      return input.ppvPurchases >= 3 || input.purchaseCount >= 4 ? "Buys content frequently and tends to prefer offers over chat." : "Content-first behaviour is the strongest pattern in this relationship.";
    case "conversational":
      return input.conversationCount >= 4 || input.engagementScore >= 60 ? "Message volume is high and the relationship is better advanced through conversation." : "This subscriber is more likely to convert through human-led messaging.";
    case "drifting_away":
      return input.churnRisk >= 70 || input.expiredSubscription ? "Engagement is cooling, follow-up is overdue, and retention is the priority." : "Signals suggest the relationship is starting to drift and needs retention attention.";
    case "dormant":
      return input.daysSinceSeen > 30 && input.engagementScore < 25 ? "There has been little recent activity, so this subscriber should stay low-touch." : "The relationship is quiet and not ready for proactive outreach yet.";
  }
  return "Deterministic persona derived from relationship signals.";
}

function chooseOpportunity(input: {
  personaKey: SubscriberPersonaKey;
  lifetimeSpend: number;
  purchaseCount: number;
  ppvPurchases: number;
  customsPurchased: number;
  conversationCount: number;
  churnRisk: number;
  vipScore: number;
  engagementScore: number;
  revenueOpportunityScore: number;
  urgencyScore: number;
  likelyPpvBuyer: number;
  customBuyer: number;
  renewalLikelihood: number;
  daysSinceFirstSeen: number;
  daysSinceSeen: number;
  daysSincePurchase: number;
  activeSubscription: boolean;
  expiredSubscription: boolean;
}) {
  const scored = opportunityCatalog.map((opportunity) => ({
    ...opportunity,
    score: opportunityScoreFor(opportunity.key, input)
  }));
  const ranked = scored.sort((left, right) => right.score - left.score);
  const selected = ranked[0] ?? scored[scored.length - 1];
  const next = ranked[1] ?? null;

  return {
    key: selected.key,
    name: selected.name,
    emoji: selected.emoji,
    color: selected.color,
    description: selected.description,
    recommended_action: selected.recommended_action,
    confidence: confidenceFromMargin(selected.score, next?.score),
    reason: opportunityReasonFor(selected.key, input),
    expected_outcome: selected.expected_outcome
  } satisfies CommercialOpportunity;
}

function opportunityScoreFor(
  key: CommercialOpportunityKey,
  input: {
    personaKey: SubscriberPersonaKey;
    lifetimeSpend: number;
    purchaseCount: number;
    ppvPurchases: number;
    customsPurchased: number;
    conversationCount: number;
    churnRisk: number;
    vipScore: number;
    engagementScore: number;
    revenueOpportunityScore: number;
    urgencyScore: number;
    likelyPpvBuyer: number;
    customBuyer: number;
    renewalLikelihood: number;
    daysSinceFirstSeen: number;
    daysSinceSeen: number;
    daysSincePurchase: number;
    activeSubscription: boolean;
    expiredSubscription: boolean;
  }
) {
  switch (key) {
    case "welcome":
      return 88 + (input.personaKey === "new_fan" ? 18 : 0) + (input.daysSinceFirstSeen <= 2 ? 12 : 0) + (input.purchaseCount === 0 ? 10 : 0) - input.conversationCount * 8;
    case "upsell_ppv":
      return 48 + input.ppvPurchases * 10 + input.likelyPpvBuyer * 0.4 + input.revenueOpportunityScore * 0.32 + (input.personaKey === "collector" ? 18 : 0);
    case "offer_custom":
      return 34 + input.customBuyer * 0.42 + input.conversationCount * 8 + input.engagementScore * 0.18 + (input.personaKey === "conversational" ? 14 : 0);
    case "retention":
      return 42 + input.churnRisk * 0.52 + (input.expiredSubscription ? 20 : 0) + (input.daysSinceSeen > 14 ? 10 : 0) + (input.personaKey === "drifting_away" ? 14 : 0);
    case "renewal":
      return 30 + input.renewalLikelihood * 0.54 + (input.activeSubscription ? 18 : 0) + (input.daysSincePurchase <= 30 ? 8 : 0);
    case "vip_outreach":
      return input.vipScore * 0.62 + input.lifetimeSpend / 8 + (input.personaKey === "vip" ? 20 : 0);
    case "human_conversation":
      return 36 + input.conversationCount * 10 + input.engagementScore * 0.44 + (input.personaKey === "conversational" ? 18 : 0) - input.purchaseCount * 2;
    case "no_action":
      return 72 - input.urgencyScore * 0.34 - input.churnRisk * 0.12 + (input.personaKey === "dormant" ? 24 : 0);
  }
  return 0;
}

function opportunityReasonFor(
  key: CommercialOpportunityKey,
  input: {
    personaKey: SubscriberPersonaKey;
    likelyPpvBuyer: number;
    customBuyer: number;
    churnRisk: number;
    renewalLikelihood: number;
    vipScore: number;
    engagementScore: number;
    activeSubscription: boolean;
    expiredSubscription: boolean;
  }
) {
  switch (key) {
    case "welcome":
      return "New fan with little conversation history.";
    case "upsell_ppv":
      return input.likelyPpvBuyer >= 60 ? "PPV buying behaviour is present or strongly implied." : "This is the most natural monetisation move.";
    case "offer_custom":
      return input.customBuyer >= 55 || input.personaKey === "conversational" ? "There is enough conversational momentum for a custom pitch." : "Custom content is supported by current signals.";
    case "retention":
      return input.churnRisk >= 60 || input.personaKey === "drifting_away" ? "The relationship is cooling and needs a retention move." : "Retention is the safest action for a declining relationship.";
    case "renewal":
      return input.renewalLikelihood >= 55 || input.activeSubscription ? "Renewal likelihood is high enough to justify a reminder." : "Renewal timing is the clearest commercial signal.";
    case "vip_outreach":
      return input.personaKey === "vip" || input.vipScore >= 70 ? "High lifetime value makes personal outreach worthwhile." : "VIP treatment protects and grows top-tier relationships.";
    case "human_conversation":
      return input.personaKey === "conversational" || input.engagementScore >= 60 ? "This subscriber responds best through conversation." : "The strongest lever here is human response quality.";
    case "no_action":
      return input.personaKey === "dormant" ? "The relationship is quiet and should stay low-touch." : "No higher-value action is currently justified.";
  }
  return "No higher-value action is currently justified.";
}

function determineJourneyStage(input: {
  relationship: Record<string, unknown>;
  personaKey: SubscriberPersonaKey;
  lifetimeSpend: number;
  purchaseCount: number;
  ppvPurchases: number;
  conversationCount: number;
  churnRisk: number;
  vipScore: number;
  engagementScore: number;
  revenueOpportunityScore: number;
  daysSinceFirstSeen: number;
  daysSinceSeen: number;
  daysSincePurchase: number;
  activeSubscription: boolean;
  expiredSubscription: boolean;
  hasConversation: boolean;
  hasRevenue: boolean;
}) {
  if (input.expiredSubscription || input.churnRisk >= 80 || input.daysSinceSeen > 60) return { stage: "Dormant" as JourneyStage, reason: "Subscription is inactive or the relationship has been quiet for too long." };
  if (input.relationship.relationship_state === "reactivated" || (input.activeSubscription && input.daysSinceSeen <= 14 && input.churnRisk < 55 && input.hasRevenue)) return { stage: "Recovering" as JourneyStage, reason: "The relationship is reactivating after a quiet or expired period." };
  if (input.vipScore >= 78 || input.lifetimeSpend >= 500 || input.personaKey === "vip") return { stage: "VIP" as JourneyStage, reason: "Lifetime value and engagement signals mark this relationship as premium." };
  if (input.churnRisk >= 72 || input.personaKey === "drifting_away") return { stage: "At Risk" as JourneyStage, reason: "Recent activity has cooled enough to require retention attention." };
  if (input.purchaseCount > 0 && (input.ppvPurchases > 0 || input.revenueOpportunityScore >= 60)) return { stage: "Purchasing" as JourneyStage, reason: "The subscriber is already converting and shows a clear buying pattern." };
  if (input.hasRevenue && input.engagementScore >= 55) return { stage: "Growing" as JourneyStage, reason: "The relationship is building value and engagement is still trending up." };
  if (input.conversationCount >= 3 || input.engagementScore >= 45) return { stage: "Engaged" as JourneyStage, reason: "Conversation activity shows the relationship is actively developing." };
  if (input.daysSinceFirstSeen <= 3 || (!input.hasConversation && !input.hasRevenue)) return { stage: "New" as JourneyStage, reason: "The subscriber is still early in the relationship." };
  return { stage: "Welcomed" as JourneyStage, reason: "A first touchpoint has happened, but the relationship is still early." };
}

function buildOperatorBriefing(input: {
  provider: BriefingProviderId;
  relationship: Record<string, unknown>;
  persona: SubscriberPersona;
  opportunity: CommercialOpportunity;
  journeyStage: JourneyStage;
  journeyReason: string;
  lifetimeSpend: number;
  purchaseCount: number;
  ppvPurchases: number;
  conversationCount: number;
  churnRisk: number;
  engagementScore: number;
  revenueOpportunityScore: number;
  likelyPpvBuyer: number;
  customBuyer: number;
  renewalLikelihood: number;
  daysSinceFirstSeen: number;
  daysSinceSeen: number;
  daysSincePurchase: number;
  activeSubscription: boolean;
  expiredSubscription: boolean;
}): OperatorBriefing {
  const intro = relationshipIntro(input.relationship, input.daysSinceFirstSeen, input.daysSinceSeen);
  const conversation = input.conversationCount === 0 ? "Hasn't chatted yet." : input.engagementScore >= 60 ? "Conversation is strong and recent." : "Conversation exists, but it is still light.";
  const revenue = input.purchaseCount === 0 ? "No purchases have been recorded." : input.ppvPurchases > 0 ? `PPV has been purchased ${input.ppvPurchases} time${input.ppvPurchases === 1 ? "" : "s"}.` : "The fan has purchased, but not through PPV yet.";
  const signal = input.opportunity.key === "upsell_ppv" ? `PPV intent is elevated at ${input.likelyPpvBuyer}/100.` : input.opportunity.key === "offer_custom" ? `Custom intent is elevated at ${input.customBuyer}/100.` : input.opportunity.key === "vip_outreach" ? "This subscriber deserves personal attention." : input.opportunity.key === "retention" ? "Retention is more important than monetisation right now." : input.opportunity.key === "renewal" ? "Renewal timing should be surfaced now." : input.opportunity.key === "human_conversation" ? "Human conversation is the strongest next move." : "No immediate action is required.";
  const journey = journeyPhrase(input.journeyStage, input.activeSubscription, input.expiredSubscription, input.churnRisk);
  const estimatedRevenue = estimateRevenueOpportunity({
    opportunityKey: input.opportunity.key,
    lifetimeSpend: input.lifetimeSpend,
    revenueOpportunityScore: input.revenueOpportunityScore,
    vipScore: input.persona.key === "vip" ? Math.max(input.revenueOpportunityScore, input.likelyPpvBuyer) : input.revenueOpportunityScore,
    likelyPpvBuyer: input.likelyPpvBuyer,
    customBuyer: input.customBuyer,
    renewalLikelihood: input.renewalLikelihood,
    engagementScore: input.engagementScore
  });

  return {
    provider: input.provider,
    headline: `${input.persona.emoji} ${input.persona.name} / ${input.opportunity.name}`,
    summary: [intro, conversation, revenue, signal, journey].join(" "),
    recommended_next_action: input.opportunity.recommended_action,
    expected_outcome: input.opportunity.expected_outcome,
    estimated_revenue_opportunity: money(estimatedRevenue),
    reason: `${input.persona.reason} ${input.journeyReason}`
  };
}

function relationshipIntro(relationship: Record<string, unknown>, daysSinceFirstSeen: number, daysSinceSeen: number) {
  const name = displayName(relationship);
  if (daysSinceFirstSeen <= 1) return `${name} joined today.`;
  if (daysSinceFirstSeen <= 3) return `${name} joined recently.`;
  if (daysSinceSeen > 30) return `${name} has gone quiet for ${daysSinceSeen} days.`;
  return `${name} is an active relationship.`;
}

function journeyPhrase(stage: JourneyStage, activeSubscription: boolean, expiredSubscription: boolean, churnRisk: number) {
  if (stage === "At Risk") return "Churn risk needs immediate attention.";
  if (stage === "Recovering") return "The relationship is recovering and should be handled carefully.";
  if (stage === "Dormant") return expiredSubscription ? "The subscriber is dormant and inactive." : "There has not been enough activity to justify a push.";
  if (stage === "VIP") return "This is a premium relationship that should stay human-led.";
  if (stage === "Purchasing") return "Commercial momentum is already present.";
  if (stage === "Growing") return "The relationship is strengthening.";
  if (stage === "Engaged") return "The relationship is active and responsive.";
  if (stage === "Welcomed") return activeSubscription ? "The subscriber has been welcomed, but the relationship is still early." : "The subscriber still needs a proper welcome.";
  return churnRisk > 50 ? "There are some churn signals, but the relationship is not critical yet." : "The relationship is still new and light-touch.";
}

function estimateRevenueOpportunity(input: {
  opportunityKey: CommercialOpportunityKey;
  lifetimeSpend: number;
  revenueOpportunityScore: number;
  vipScore: number;
  likelyPpvBuyer: number;
  customBuyer: number;
  renewalLikelihood: number;
  engagementScore: number;
}) {
  switch (input.opportunityKey) {
    case "vip_outreach":
      return input.lifetimeSpend * 0.45 + input.vipScore * 4;
    case "offer_custom":
      return input.customBuyer * 3 + input.engagementScore * 2;
    case "upsell_ppv":
      return input.likelyPpvBuyer * 2.4 + input.revenueOpportunityScore * 1.2;
    case "renewal":
      return input.renewalLikelihood * 2.1 + input.lifetimeSpend * 0.15;
    case "retention":
      return input.lifetimeSpend * 0.2 + input.revenueOpportunityScore * 0.5;
    case "human_conversation":
      return input.engagementScore * 1.1 + input.lifetimeSpend * 0.08;
    case "welcome":
      return 45 + input.engagementScore * 0.5;
    case "no_action":
      return 0;
  }
}

function personaKey(subscriber: Record<string, unknown>) {
  return stringValue(subscriber.persona_key, "new_fan") as SubscriberPersonaKey;
}

function opportunityKey(subscriber: Record<string, unknown>) {
  return stringValue(subscriber.opportunity_classification, "no_action") as CommercialOpportunityKey;
}

function journeyStage(subscriber: Record<string, unknown>) {
  return stringValue(subscriber.journey_stage, stringValue(subscriber.relationship_stage, "New")) as JourneyStage;
}

function reasonForSubscriber(subscriber: Record<string, unknown>) {
  return stringValue(subscriber.persona_reason) || stringValue(subscriber.journey_stage_reason) || "Deterministic subscriber brief.";
}

function displayName(value: Record<string, unknown>) {
  return (
    stringValue(value.display_name) ||
    stringValue(value.username) ||
    stringValue(value.betterfans_subscriber_id) ||
    stringValue(value.platform_subscriber_id) ||
    "Unknown subscriber"
  );
}

function firstRecord(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) return isRecord(value[0]) ? value[0] : null;
  return isRecord(value) ? value : null;
}

function countBy(items: Array<Record<string, unknown>>, predicate: (item: Record<string, unknown>) => boolean) {
  return items.reduce((count, item) => count + (predicate(item) ? 1 : 0), 0);
}

function scorePriority(subscriber: Record<string, unknown>) {
  const persona = personaKey(subscriber);
  const opportunity = opportunityKey(subscriber);
  const urgency = numberValue(subscriber.urgency_score);
  const revenue = numberValue(subscriber.revenue_opportunity_score);
  const vip = numberValue(subscriber.vip_score);
  const churn = numberValue(subscriber.churn_risk);
  const engagement = numberValue(subscriber.engagement_score);
  const journey = journeyStage(subscriber);
  return urgency * 1.2 + revenue * 0.8 + vip * 0.6 + churn * 0.7 + engagement * 0.4 + (persona === "drifting_away" ? 45 : 0) + (persona === "vip" ? 35 : 0) + (persona === "new_fan" ? 28 : 0) + (opportunity === "upsell_ppv" ? 18 : 0) + (opportunity === "vip_outreach" ? 22 : 0) + (journey === "At Risk" ? 40 : 0);
}

function confidenceFromMargin(selected: number, next: number | null | undefined) {
  const margin = selected - (next ?? 0);
  return clampScore(52 + Math.min(36, selected * 0.28) + Math.min(20, margin * 1.8));
}

function money(value: number) {
  return `$${Math.round(value).toLocaleString()}`;
}

function labelize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function numberValue(value: unknown, fallback = 0) {
  const number = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : fallback;
  return Number.isFinite(number) ? number : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function ageDays(value: string | null | undefined, now: Date) {
  const date = parseDate(value);
  if (!date) return 999;
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / 86_400_000));
}

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isActiveSubscription(status: string) {
  const normalized = status.toLowerCase();
  return Boolean(normalized) && !isExpiredSubscription(normalized);
}

function isExpiredSubscription(status: string) {
  return ["expired", "cancelled", "canceled", "inactive"].some((term) => status.toLowerCase().includes(term));
}
