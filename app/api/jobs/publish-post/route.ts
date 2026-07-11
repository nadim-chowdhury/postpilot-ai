import { NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";
import { prisma } from "@/lib/prisma";
import { publishPostNowInternal } from "@/actions/post.actions";
import { logActivity } from "@/actions/activity.actions";
import { MAX_RETRY_ATTEMPTS } from "@/lib/constants";

// Lazy initialize QStash Receiver to avoid crashes if variables are missing
let receiver: Receiver | null = null;

function getReceiver() {
  if (receiver) return receiver;

  const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;

  if (!currentSigningKey || !nextSigningKey) {
    console.warn("QStash signing keys are missing. Signature verification is disabled.");
    return null;
  }

  receiver = new Receiver({ currentSigningKey, nextSigningKey });
  return receiver;
}

export async function POST(request: Request) {
  const bodyText = await request.text();
  const signature = request.headers.get("upstash-signature");

  // Verify QStash Signature
  const qstashReceiver = getReceiver();
  if (qstashReceiver && signature) {
    const isValid = await qstashReceiver.verify({
      signature,
      body: bodyText,
    });

    if (!isValid) {
      return new Response("Unauthorized signature", { status: 401 });
    }
  }

  // Parse payload
  let scheduleId: string;
  try {
    const payload = JSON.parse(bodyText);
    scheduleId = payload.scheduleId;
    if (!scheduleId) throw new Error("Missing scheduleId in payload");
  } catch (err) {
    return NextResponse.json({ success: false, error: "Invalid payload" }, { status: 400 });
  }

  // Retrieve schedule record
  const schedule = await prisma.schedule.findUnique({
    where: { id: scheduleId },
    include: { post: { include: { fbPage: true } } },
  });

  if (!schedule) {
    return NextResponse.json({ success: false, error: "Schedule record not found" }, { status: 404 });
  }

  // Prevent double execution
  if (schedule.status === "COMPLETED" || schedule.status === "FAILED") {
    return NextResponse.json({ success: true, message: "Job already finished previously" }, { status: 200 });
  }

  try {
    // Update schedule state to IN_PROGRESS
    await prisma.schedule.update({
      where: { id: scheduleId },
      data: { status: "IN_PROGRESS" },
    });

    // Execute direct Meta API publishing action from Phase 1B
    const publishResult = await publishPostNowInternal(schedule.postId);

    if (!publishResult.success) {
      throw new Error(publishResult.error || "Meta publishing action failed");
    }

    // Success: Mark schedule completed
    await prisma.schedule.update({
      where: { id: scheduleId },
      data: {
        status: "COMPLETED",
        publishedAt: new Date(),
        errorMessage: null,
      },
    });

    return NextResponse.json({ success: true, fbPostId: publishResult.data.fbPostId });
  } catch (error: any) {
    console.error(`Error executing scheduled job ${scheduleId}:`, error);

    const errorMessage = error.message || "Unknown publishing error";
    const nextRetryAttempt = schedule.retryCount + 1;

    // Retry handling policy
    if (nextRetryAttempt >= MAX_RETRY_ATTEMPTS) {
      // Retries exhausted: mark schedule as FAILED
      await prisma.$transaction([
        prisma.schedule.update({
          where: { id: scheduleId },
          data: {
            status: "FAILED",
            errorMessage: `Failed after ${MAX_RETRY_ATTEMPTS} attempts: ${errorMessage}`,
            retryCount: nextRetryAttempt,
          },
        }),
        prisma.post.update({
          where: { id: schedule.postId },
          data: { status: "FAILED" },
        }),
      ]);

      // Return 200 so QStash stops retrying

      // Return 200 so QStash stops retrying
      return NextResponse.json({ success: false, error: "Max retries reached. Job marked as failed." }, { status: 200 });
    } else {
      // Increment retry counts and return 500 so QStash schedules another retry
      await prisma.schedule.update({
        where: { id: scheduleId },
        data: {
          retryCount: nextRetryAttempt,
          errorMessage: `Attempt ${nextRetryAttempt} failed: ${errorMessage}`,
        },
      });

      return NextResponse.json({ success: false, error: `Attempt ${nextRetryAttempt} failed. Enqueuing retry.` }, { status: 500 });
    }
  }
}
