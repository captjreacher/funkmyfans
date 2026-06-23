import "dotenv/config";
import { BetterFansEventStream } from "@of-pilot/betterfans-client";

const webhookUrl =
  process.env.BETTERFANS_EVENT_WEBHOOK_URL ??
  "http://localhost:8787/api/events/betterfans";

const apiKey = process.env.BETTERFANS_API_KEY;

if (!apiKey) {
  throw new Error("Missing BETTERFANS_API_KEY");
}

const stream = new BetterFansEventStream({
  apiKey,
  onEvent: async (event) => {
    console.log("[betterfans:event]", event.eventType, event.providerEventId);

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(event)
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("[webhook:failed]", response.status, text);
    }
  }
});

stream.connectEvents();

console.log("[betterfans] event stream connected");
console.log("[betterfans] forwarding to", webhookUrl);

process.on("SIGINT", () => {
  stream.disconnectEvents();
  process.exit(0);
});