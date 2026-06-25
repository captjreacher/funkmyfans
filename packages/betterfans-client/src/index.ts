import { OfApiClient, OfWsClient } from "@betterfans/link-sdk";
import type { CreatorOperationalData } from "@funkmyfans/of-types";

type JsonRecord = Record<string, unknown>;

export interface BetterFansClientOptions {
  apiKey: string;
  baseUrl?: string;
  source?: string;
}

export interface BetterFansRealtimeOptions extends BetterFansClientOptions {
  wsToken?: string;
  accountIds?: string[];
  onEvent: (event: {
    accountId: string | null;
    eventType: string;
    payload: JsonRecord;
    receivedAt: string;
  }) => void | Promise<void>;
  onStateChange?: (state: string) => void;
}

export type BetterFansCockpitEventType = (typeof cockpitRealtimeEventTypes)[number];

export interface ProviderRealtimeEvent {
  provider: "betterfans";
  providerEventId: string | null;
  accountId: string | null;
  eventType: BetterFansCockpitEventType;
  payload: JsonRecord;
  receivedAt: string;
}

export interface BetterFansEventStreamOptions extends BetterFansClientOptions {
  wsToken?: string;
  accountIds?: string[];
  onEvent: (event: ProviderRealtimeEvent) => void | Promise<void>;
  onStateChange?: (state: string) => void;
  onError?: (error: unknown) => void;
}

export interface BetterFansSendMessageResult {
  providerMessageId: string;
  raw: unknown;
}

export const cockpitRealtimeEventTypes = [
  "chat_message",
  "subscriber_created",
  "subscriber_expired",
  "transaction_created"
] as const;

export class BetterFansOperationalClient {
  private readonly client: OfApiClient;

  constructor(options: BetterFansClientOptions) {
    this.client = new OfApiClient({
      apiKey: options.apiKey,
      baseUrl: options.baseUrl,
      source: options.source ?? "of-pilot-creator-cockpit",
      telemetry: {
        sdkIntegration: "of-pilot-creator-cockpit"
      }
    });
  }

  async syncCreator(accountId: string): Promise<CreatorOperationalData> {
    const [profile, stats, subscribers, chats] = await Promise.all([
      this.getCreatorProfile(accountId),
      this.getStatsOverview(accountId),
      this.getSubscribers(accountId),
      this.getChats(accountId)
    ]);

    return normalizeOperationalData(accountId, profile, stats, subscribers, chats);
  }

  async getCreatorProfile(accountId: string): Promise<unknown> {
    const result = await this.client.for(accountId).request("GET /users/me", {});
    return unwrap("GET /users/me", result);
  }

  async getStatsOverview(accountId: string): Promise<unknown> {
    const result = await this.client.for(accountId).request("GET /users/me/stats/overview", {});
    return unwrap("GET /users/me/stats/overview", result);
  }

  async getSubscribers(accountId: string, options: { limit?: number; offset?: number; type?: "all" | "active" | "activity" | "expired" } = {}): Promise<unknown> {
    const result = await this.client.for(accountId).request("GET /subscriptions/subscribers", {
      query: {
        limit: options.limit ?? 100,
        offset: options.offset ?? 0,
        type: options.type ?? "active"
      }
    });
    return unwrap("GET /subscriptions/subscribers", result);
  }

  async getChats(accountId: string, options: { limit?: number; offset?: number } = {}): Promise<unknown> {
    const result = await this.client.for(accountId).request("GET /chats", {
      query: {
        limit: options.limit ?? 100,
        offset: options.offset ?? 0
      }
    });
    return unwrap("GET /chats", result);
  }

  async sendMessage(accountId: string, subscriberId: string, messageText: string): Promise<BetterFansSendMessageResult> {
    const trimmedMessage = messageText.trim();
    if (!trimmedMessage) throw new Error("BetterFans message text is required");

    console.log("[betterfans:sendMessage] sending", {
      accountId,
      subscriberId,
      textLength: trimmedMessage.length
    });

    const result = await this.client.for(accountId).request(
      "POST /chats/:id/messages",
      {
        pathParams: {
          id: subscriberId as never
        },
        body: {
          lockedText: false,
          mediaFiles: [],
          previews: [],
          price: 0,
          rfGuest: [],
          rfPartner: [],
          rfTag: [],
          rfUser: [],
          text: trimmedMessage
        }
      },
      { retry: false }
    );
    const data = unwrap("POST /chats/:id/messages", result);
    const providerMessageId = extractProviderMessageId(data);

    console.log("[betterfans:sendMessage] sent", {
      accountId,
      subscriberId,
      providerMessageId
    });

    return {
      providerMessageId,
      raw: data
    };
  }
}

export class BetterFansEventStream {
  private readonly client: OfWsClient;
  private unsubscribeEnvelope?: () => void;

  constructor(private readonly options: BetterFansEventStreamOptions) {
    const subscribe = ["chat_message", "new_subscriber", "returning_subscriber", "ppv_purchase", "tip"] as const;
    this.client = new OfWsClient({
      apiKey: options.apiKey,
      wsToken: options.wsToken ?? options.apiKey,
      baseUrl: options.baseUrl,
      subscribe: [...subscribe],
      filter: options.accountIds?.length ? { accountIds: options.accountIds } : undefined,
      onStateChange: options.onStateChange,
      onError: (_type: string, _payload: unknown, error: unknown) => options.onError?.(error)
    });
  }

  connectEvents() {
    this.subscribeToCreatorEvents();
    this.client.connect();
    return this;
  }

  subscribeToCreatorEvents(accountIds?: string[]) {
    if (accountIds?.length) {
      this.options.accountIds = accountIds;
    }

    this.unsubscribeEnvelope?.();
    this.unsubscribeEnvelope = this.client.onAnyEnvelope((ctx) => {
      const eventType = toCockpitEventType(ctx.type);
      if (!isCockpitRealtimeEventType(eventType)) return;

      void this.options.onEvent({
        provider: "betterfans",
        providerEventId: ctx.id || null,
        accountId: ctx.accountId,
        eventType,
        payload: asRecord(ctx.payload),
        receivedAt: ctx.receivedAt.toISOString()
      });
    });
    return this;
  }

  disconnectEvents() {
    this.unsubscribeEnvelope?.();
    this.unsubscribeEnvelope = undefined;
    this.client.disconnect();
  }

  getConnectionStatus() {
    return this.client.state;
  }
}

export function createBetterFansRealtimeClient(options: BetterFansRealtimeOptions) {
  const stream = new BetterFansEventStream({
    ...options,
    onEvent: (event) => options.onEvent({
      accountId: event.accountId,
      eventType: event.eventType,
      payload: event.payload,
      receivedAt: event.receivedAt
    })
  });
  stream.subscribeToCreatorEvents();
  return stream;
}

export function normalizeCreatorProfile(accountId: string, profile: unknown): CreatorOperationalData["creator"] {
  const profileRecord = asRecord(profile);
  return {
    betterfans_account_id: accountId,
    username: stringFrom(profileRecord.username, profileRecord.name, accountId),
    display_name: nullableString(profileRecord.name, profileRecord.displayName),
    bio: nullableString(profileRecord.about, profileRecord.bio),
    location: nullableString(profileRecord.location),
    status: "connected",
    onboarding_status: "ready",
    active: true,
    last_sync_at: new Date().toISOString()
  };
}

export function normalizeCreatorSnapshot(stats: unknown, profile: unknown = {}, subscribersPayload: unknown = [], chatsPayload: unknown = []): CreatorOperationalData["snapshot"] {
  const profileRecord = asRecord(profile);
  const statsRecord = asRecord(stats);
  const subscriberItems = extractList(subscribersPayload);
  const chatItems = extractList(chatsPayload);
  const subscribersCount = numberFrom(statsRecord.subscribersCount, profileRecord.subscribersCount, subscriberItems.length);
  const activeSubscribers = numberFrom(
    statsRecord.activeSubscribers,
    statsRecord.activeSubscribersCount,
    subscriberItems.filter((subscriber) => !isExpiredSubscriber(subscriber)).length
  );
  const expiredSubscribers = numberFrom(statsRecord.expiredSubscribers, statsRecord.expiredSubscribersCount, Math.max(0, subscribersCount - activeSubscribers));
  const priorityChatCount = numberFrom(
    statsRecord.priorityChatCount,
    chatItems.filter((chat) => booleanFrom(chat.isPriority, chat.priority, chat.isPinned)).length
  );

  return {
    snapshot_date: new Date().toISOString().slice(0, 10),
    subscribers_count: subscribersCount,
    active_subscribers: activeSubscribers,
    expired_subscribers: expiredSubscribers,
    revenue: numberFrom(statsRecord.earnings, statsRecord.totalEarnings, statsRecord.revenue, 0),
    chat_count: numberFrom(statsRecord.chatCount, chatItems.length),
    priority_chat_count: priorityChatCount,
    posts_count: numberFrom(profileRecord.postsCount, statsRecord.postsCount, 0)
  };
}

export function normalizeSubscribers(subscribersPayload: unknown): CreatorOperationalData["subscribers"] {
  return extractList(subscribersPayload).map((subscriber) => {
    const subscriberId = stringFrom(subscriber.id, subscriber.userId, crypto.randomUUID());
    return {
      betterfans_subscriber_id: subscriberId,
      platform_subscriber_id: subscriberId,
      username: nullableString(subscriber.username),
      display_name: nullableString(subscriber.name, subscriber.displayName),
      status: nullableString(subscriber.status, nestedString(subscriber.subscribedByData, "status"), subscriber.subscribedByData ? "active" : undefined),
      subscription_status: nullableString(subscriber.status, nestedString(subscriber.subscribedByData, "status"), subscriber.subscribedByData ? "active" : undefined),
      renewal_date: nullableString(subscriber.renewalDate, subscriber.renewedAt, nestedString(subscriber.subscribedByData, "renewedAt")),
      renews_at: nullableString(subscriber.renewalDate, subscriber.renewedAt, nestedString(subscriber.subscribedByData, "renewedAt")),
      total_spend: nullableNumber(subscriber.totalSumm, subscriber.totalSpend, nestedNumber(subscriber.subscribedByData, "totalSumm")),
      last_seen_at: nullableString(subscriber.lastSeenAt, subscriber.lastActivityAt, subscriber.lastOnlineAt),
      raw_payload: subscriber
    };
  });
}

export function normalizeChats(chatsPayload: unknown): CreatorOperationalData["chats"] {
  return extractList(chatsPayload).map((chat) => ({
    platform_chat_id: stringFrom(chat.id, nestedString(chat.withUser, "id"), crypto.randomUUID()),
    platform_user_id: nullableString(chat.userId, nestedString(chat.withUser, "id")),
    fan_username: nullableString(chat.username, nestedString(chat.withUser, "username")),
    fan_display_name: nullableString(chat.name, chat.displayName, nestedString(chat.withUser, "name"), nestedString(chat.withUser, "displayName")),
    last_activity_at: nullableString(chat.lastActivityAt, chat.lastMessageDate, chat.lastMessageAt, nestedString(chat.lastMessage, "createdAt")),
    last_message_at: nullableString(chat.lastMessageDate, chat.lastMessageAt, nestedString(chat.lastMessage, "createdAt")),
    unread: booleanFrom(chat.hasUnreadMessages, chat.unread, chat.isUnread),
    unread_count: numberFrom(chat.unreadCount, chat.countUnread, booleanFrom(chat.hasUnreadMessages, chat.unread, chat.isUnread) ? 1 : 0),
    priority: booleanFrom(chat.isPriority, chat.priority, chat.isPinned),
    raw_payload: chat
  }));
}

function toCockpitEventType(sdkEventType: string): string {
  if (sdkEventType === "new_subscriber" || sdkEventType === "returning_subscriber") return "subscriber_created";
  if (sdkEventType === "ppv_purchase" || sdkEventType === "tip") return "transaction_created";
  return sdkEventType;
}

function isCockpitRealtimeEventType(eventType: string): eventType is BetterFansCockpitEventType {
  return (cockpitRealtimeEventTypes as readonly string[]).includes(eventType);
}

function unwrap<T>(label: string, result: [{ message: string }, null] | [null, T]): T {
  const [error, data] = result;
  if (error) {
    throw new Error(`${label} failed: ${error.message}`);
  }
  return data;
}

function extractProviderMessageId(payload: unknown): string {
  const record = asRecord(payload);
  const id = stringFrom(record.id, record.messageId, record.message_id);
  if (id) return id;

  const nested = asRecord(record.message);
  const nestedId = stringFrom(nested.id, nested.messageId, nested.message_id);
  if (nestedId) return nestedId;

  throw new Error("BetterFans send response did not include a message id");
}

function normalizeOperationalData(
  accountId: string,
  profile: unknown,
  stats: unknown,
  subscribersPayload: unknown,
  chatsPayload: unknown
): CreatorOperationalData {
  const profileRecord = asRecord(profile);
  const statsRecord = asRecord(stats);
  const subscriberItems = extractList(subscribersPayload);
  const chatItems = extractList(chatsPayload);

  const subscribersCount = numberFrom(profileRecord.subscribersCount, statsRecord.subscribersCount, subscriberItems.length);
  const activeSubscribers = subscriberItems.filter((subscriber) => !isExpiredSubscriber(subscriber)).length;
  const expiredSubscribers = Math.max(0, subscribersCount - activeSubscribers);
  const priorityChatCount = chatItems.filter((chat) => booleanFrom(chat.isPriority, chat.priority, chat.isPinned)).length;

  return {
    creator: normalizeCreatorProfile(accountId, profile),
    snapshot: normalizeCreatorSnapshot(stats, profile, subscribersPayload, chatsPayload),
    subscribers: normalizeSubscribers(subscribersPayload),
    chats: normalizeChats(chatsPayload),
    raw: {
      profile,
      stats,
      subscribers: subscribersPayload,
      chats: chatsPayload
    }
  };
}

function extractList(payload: unknown): JsonRecord[] {
  if (Array.isArray(payload)) {
    return payload.map(asRecord);
  }
  const record = asRecord(payload);
  for (const key of ["list", "data", "items", "results"]) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value.map(asRecord);
    }
  }
  return [];
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function stringFrom(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.length > 0) return value;
    if (typeof value === "number") return String(value);
  }
  return "";
}

function nullableString(...values: unknown[]): string | null {
  const value = stringFrom(...values);
  return value || null;
}

function numberFrom(...values: unknown[]): number {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
  }
  return 0;
}

function nullableNumber(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
  }
  return null;
}

function booleanFrom(...values: unknown[]): boolean {
  return values.some((value) => value === true || value === "true" || value === 1);
}

function nestedString(parent: unknown, key: string): string | null {
  return nullableString(asRecord(parent)[key]);
}

function nestedNumber(parent: unknown, key: string): number | null {
  return nullableNumber(asRecord(parent)[key]);
}

function isExpiredSubscriber(subscriber: JsonRecord): boolean {
  const status = stringFrom(subscriber.status, nestedString(subscriber.subscribedByData, "status")).toLowerCase();
  return status.includes("expire") || status.includes("expired") || Boolean(subscriber.isExpired);
}
