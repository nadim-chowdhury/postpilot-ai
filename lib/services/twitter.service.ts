import { AppError, ErrorCodes } from "@/lib/errors";

export interface TwitterPublishPayload {
  text: string;
  link?: string;
}

/**
 * Publish content to X (Twitter) using Twitter API v2.
 * If accessToken is 'mock' or begins with 'mock', it simulates a successful publish.
 */
export async function publishToTwitter(
  accessToken: string,
  payload: TwitterPublishPayload
): Promise<string> {
  const isMock = accessToken.toLowerCase().startsWith("mock");

  if (isMock) {
    console.log(`[Twitter Mock Publish] Tweet text: "${payload.text}"`);
    if (payload.link) {
      console.log(`[Twitter Mock Publish] Attached link: ${payload.link}`);
    }
    // Simulate minor delay
    await new Promise((resolve) => setTimeout(resolve, 800));
    return `twitter_mock_${Math.random().toString(36).substring(2, 15)}`;
  }

  // Construct Tweet content
  let tweetText = payload.text;
  if (payload.link) {
    tweetText = `${tweetText}\n\n${payload.link}`;
  }

  // Enforce Twitter's 280 character limit
  if (tweetText.length > 280) {
    throw new AppError(
      ErrorCodes.CONTENT_TOO_LONG,
      "Tweet exceeds X (Twitter) character limit of 280 characters.",
      400
    );
  }

  try {
    const response = await fetch("https://api.twitter.com/2/tweets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        text: tweetText,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[Twitter API Error]", data);
      throw new AppError(
        ErrorCodes.INTERNAL_ERROR,
        data?.detail ?? data?.title ?? "X (Twitter) API response error",
        response.status
      );
    }

    return data?.data?.id ?? `twitter_${Date.now()}`;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      ErrorCodes.INTERNAL_ERROR,
      `Network/System error posting to X (Twitter): ${(error as Error).message}`
    );
  }
}
