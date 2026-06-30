import { env } from "../../core/config/env";
import { GovQueueMessage } from "./gov-queue.schema";

let govPublisherChannel: import("amqplib").Channel | null = null;

export function setGovPublisherChannel(channel: import("amqplib").Channel | null): void {
  govPublisherChannel = channel;
}

export async function publishToGovQueue(message: GovQueueMessage): Promise<void> {
  if (!govPublisherChannel) {
    console.warn("[rabbitmq] Gov queue publisher not ready — skipping", message.type);
    return;
  }
  govPublisherChannel.sendToQueue(
    env.RABBITMQ_GOV_QUEUE,
    Buffer.from(JSON.stringify(message)),
    { contentType: "application/json", persistent: true },
  );
}
