import { APP_NAME, APP_DESCRIPTION } from "@/lib/constants";

export const siteConfig = {
  name: APP_NAME,
  description: APP_DESCRIPTION,
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ogImage: "/images/og.png",
  creator: "PostPilot AI",
  keywords: [
    "facebook automation",
    "social media scheduler",
    "ai content generation",
    "page management",
  ],
} as const;
