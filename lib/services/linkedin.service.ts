import { AppError, ErrorCodes } from "@/lib/errors";

export interface LinkedInPublishPayload {
  text: string;
  link?: string;
  authorId: string; // Can be a full URN (urn:li:organization:XYZ) or just the numeric ID
}

/**
 * Publish content to LinkedIn using v2 ugcPosts API.
 * If accessToken is 'mock' or begins with 'mock', it simulates a successful publish.
 */
export async function publishToLinkedIn(
  accessToken: string,
  payload: LinkedInPublishPayload
): Promise<string> {
  const isMock = accessToken.toLowerCase().startsWith("mock");

  if (isMock) {
    console.log(`[LinkedIn Mock Publish] Author: ${payload.authorId}, Share text: "${payload.text}"`);
    if (payload.link) {
      console.log(`[LinkedIn Mock Publish] Attached link: ${payload.link}`);
    }
    // Simulate minor delay
    await new Promise((resolve) => setTimeout(resolve, 800));
    return `linkedin_mock_${Math.random().toString(36).substring(2, 15)}`;
  }

  // Ensure authorId is formatted as a full URN
  let authorUrn = payload.authorId;
  if (!authorUrn.startsWith("urn:li:")) {
    // Default to organization if it's purely numeric or custom string
    authorUrn = `urn:li:organization:${payload.authorId}`;
  }

  // Build the request body matching LinkedIn UGC Posts specification
  const requestBody: Record<string, any> = {
    author: authorUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: {
          text: payload.text,
        },
        shareMediaCategory: "NONE",
      },
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
    },
  };

  // If there's an attached link, structure it accordingly
  if (payload.link) {
    requestBody.specificContent["com.linkedin.ugc.ShareContent"] = {
      shareCommentary: {
        text: payload.text,
      },
      shareMediaCategory: "ARTICLE",
      media: [
        {
          status: "READY",
          originalUrl: payload.link,
          title: {
            text: "Shared Link",
          },
        },
      ],
    };
  }

  try {
    const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[LinkedIn API Error]", data);
      throw new AppError(
        ErrorCodes.INTERNAL_ERROR,
        data?.message ?? "LinkedIn API response error",
        response.status
      );
    }

    return data?.id ?? `linkedin_${Date.now()}`;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      ErrorCodes.INTERNAL_ERROR,
      `Network/System error posting to LinkedIn: ${(error as Error).message}`
    );
  }
}
