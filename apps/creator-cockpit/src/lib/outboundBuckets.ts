import type { OfOutboundMessage } from "@funkmyfans/of-types";

export type OutboundBucketKey =
  | "needsApproval"
  | "humanReview"
  | "readyToSend"
  | "sending"
  | "sent"
  | "failed";

export type OutboundBuckets = Record<OutboundBucketKey, OfOutboundMessage[]>;

export function buildOutboundBuckets(messages: OfOutboundMessage[]): OutboundBuckets {
  const buckets: OutboundBuckets = {
    needsApproval: [],
    humanReview: [],
    readyToSend: [],
    sending: [],
    sent: [],
    failed: []
  };

  for (const message of messages) {
    buckets[classifyOutboundMessage(message)].push(message);
  }

  return buckets;
}

function classifyOutboundMessage(message: OfOutboundMessage): OutboundBucketKey {
  const metadata = isRecord(message.metadata) ? message.metadata : {};

  if (message.status === "pending_approval" || message.approval_status === "pending") {
    return "needsApproval";
  }

  if ((message.status === "failed" && isTruthy(metadata.follow_up_required)) || message.approval_status === "rejected") {
    return "humanReview";
  }

  if (message.status === "sending") {
    return "sending";
  }

  if (message.status === "sent") {
    return "sent";
  }

  if (message.status === "queued" || message.approval_status === "approved") {
    return "readyToSend";
  }

  if (message.status === "failed" || message.status === "rejected") {
    return "failed";
  }

  return "failed";
}

function isTruthy(value: unknown) {
  return value === true || value === "true" || value === 1 || value === "1";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
