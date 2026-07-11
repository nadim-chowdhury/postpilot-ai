import { Client } from "@upstash/qstash";

// Lazy initialize QStash client to prevent crashing if environment variables are missing
let qstashClient: Client | null = null;

function getQStashClient() {
  if (qstashClient) return qstashClient;

  const token = process.env.QSTASH_TOKEN;
  if (!token) {
    console.warn("QSTASH_TOKEN environment variable is not set. QStash operations will run in mock mode.");
    return null;
  }

  qstashClient = new Client({ token });
  return qstashClient;
}

/**
 * Schedule an HTTP POST to our publish-post job handler at a target timestamp.
 * Returns the QStash message ID, or a mock ID if credentials are missing.
 */
export async function publishPostSchedule(
  scheduleId: string,
  scheduledTime: Date,
): Promise<string> {
  const client = getQStashClient();
  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/jobs/publish-post`;

  if (!client) {
    const mockId = `mock_qstash_${Math.random().toString(36).substring(7)}`;
    console.log(`[QStash Mock] Scheduled callback to ${callbackUrl} for scheduleId ${scheduleId} at ${scheduledTime.toISOString()}. Assigned ID: ${mockId}`);
    return mockId;
  }

  const delaySeconds = Math.max(0, Math.floor((scheduledTime.getTime() - Date.now()) / 1000));

  const response = await client.publishJSON({
    url: callbackUrl,
    body: { scheduleId },
    delay: delaySeconds, // QStash supports delay in seconds
  });

  return response.messageId;
}

/**
 * Cancel a scheduled call in QStash by its message ID.
 */
export async function cancelPostSchedule(qstashMsgId: string): Promise<void> {
  const client = getQStashClient();
  if (!client) {
    console.log(`[QStash Mock] Cancelled callback for message ID ${qstashMsgId}`);
    return;
  }

  try {
    await client.messages.delete(qstashMsgId);
  } catch (error) {
    console.error(`Failed to delete message ${qstashMsgId} from QStash:`, error);
    // Do not throw to keep system resilient to manual cleanup issues
  }
}
