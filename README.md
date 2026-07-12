<p align="center">
  <h1 align="center">🚀 PostPilot AI</h1>
  <p align="center">
    <strong>Centralized content automation for Facebook Pages</strong>
  </p>
  <p align="center">
    AI-powered content generation · Smart scheduling · Engagement analytics
  </p>
</p>

---

## 📖 Overview

**PostPilot AI** is a full-stack SaaS dashboard that helps social media managers automate their Facebook Page content workflow. Connect your Facebook Pages, generate on-brand posts with AI, schedule them with smart timing, and track engagement — all from one place.

### ✨ Key Features

| Feature                      | Description                                                                                                     |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **🔗 Page Management**       | Connect and manage multiple Facebook Pages with OAuth. Configure topics, persona prompts, and avatars per page. |
| **🤖 AI Content Generation** | Generate posts using **Google Gemini**, **Anthropic Claude**, or **OpenAI** with automatic provider fallback.   |
| **📅 Smart Scheduling**      | Schedule posts with configurable jitter, posting-hour windows (8 AM–10 PM), and minimum gap enforcement.        |
| **📊 Analytics Dashboard**   | Track likes, comments, shares, and engagement trends with interactive charts powered by Recharts.               |
| **📋 Publishing Queue**      | Background queue powered by Upstash QStash with automatic retries and failure handling.                         |
| **📆 Calendar View**         | Visual calendar to plan and review your scheduled content at a glance.                                          |
| **📝 Activity Log**          | Full audit trail of all actions across pages, posts, and schedules.                                             |
| **🔒 Token Monitoring**      | Daily cron checks for expiring Facebook access tokens with status alerts.                                       |
| **🌙 Dark / Light Theme**    | System-aware theming with manual toggle via `next-themes`.                                                      |

---

## 🛠️ Tech Stack

| Layer                | Technology                                                                                                      |
| -------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Framework**        | [Next.js 16](https://nextjs.org) (App Router)                                                                   |
| **Language**         | TypeScript 5                                                                                                    |
| **UI**               | React 19, [Tailwind CSS 4](https://tailwindcss.com), [shadcn/ui](https://ui.shadcn.com), Radix UI, Lucide Icons |
| **Typography**       | Plus Jakarta Sans, JetBrains Mono (Google Fonts)                                                                |
| **State Management** | Redux Toolkit + React-Redux                                                                                     |
| **Database**         | PostgreSQL via [Prisma 7](https://www.prisma.io) (Neon / Supabase compatible)                                   |
| **Auth**             | [NextAuth.js](https://next-auth.js.org) (Meta / Facebook OAuth)                                                 |
| **AI**               | [Vercel AI SDK](https://sdk.vercel.ai) — Google Gemini, Anthropic Claude, OpenAI                                |
| **Queue / Jobs**     | [Upstash QStash](https://upstash.com/docs/qstash)                                                               |
| **Rate Limiting**    | [Upstash Redis](https://upstash.com/docs/redis) + `@upstash/ratelimit`                                          |
| **Charts**           | [Recharts](https://recharts.org)                                                                                |
| **Validation**       | [Zod 4](https://zod.dev)                                                                                        |
| **Deployment**       | [Vercel](https://vercel.com) (with Vercel Cron Jobs)                                                            |

---

## 📁 Project Structure

```
postpilot-ai/
├── app/
│   ├── (auth)/                 # Auth pages (login)
│   ├── (dashboard)/            # Protected dashboard routes
│   │   ├── page.tsx            #   → Dashboard home
│   │   ├── pages/              #   → Facebook Page management
│   │   ├── content/            #   → Post creation & AI generation
│   │   ├── calendar/           #   → Calendar view
│   │   ├── analytics/          #   → Engagement analytics
│   │   ├── queue/              #   → Publishing queue
│   │   ├── activity/           #   → Activity log
│   │   └── settings/           #   → User settings
│   └── api/
│       ├── auth/               # NextAuth API routes
│       ├── cron/               # Vercel cron endpoints
│       │   ├── process-queue/  #   → Runs every 5 minutes
│       │   └── check-token-expiry/ # → Runs daily
│       └── jobs/
│           └── publish-post/   # QStash webhook target
├── actions/                    # Server Actions
│   ├── ai.actions.ts           #   → AI content generation
│   ├── post.actions.ts         #   → Post CRUD
│   ├── page.actions.ts         #   → Page management
│   ├── schedule.actions.ts     #   → Scheduling logic
│   ├── analytics.actions.ts    #   → Analytics queries
│   ├── activity.actions.ts     #   → Activity log queries
│   └── dashboard.actions.ts    #   → Dashboard aggregates
├── components/
│   ├── layout/                 # Shell, sidebar, header
│   ├── pages/                  # Page-specific components
│   ├── content/                # Content editor components
│   ├── calendar/               # Calendar components
│   ├── analytics/              # Chart components
│   ├── queue/                  # Queue components
│   ├── activity/               # Activity components
│   ├── shared/                 # Reusable components
│   ├── providers/              # Theme, Store, Session providers
│   └── ui/                     # shadcn/ui primitives
├── lib/
│   ├── services/
│   │   ├── ai.service.ts       # Multi-provider AI service
│   │   ├── meta-api.service.ts # Facebook Graph API client
│   │   ├── qstash.service.ts   # QStash job dispatcher
│   │   ├── rate-limit.service.ts # Rate limiter
│   │   └── encryption.service.ts # Token encryption
│   ├── auth.ts                 # NextAuth configuration
│   ├── prisma.ts               # Prisma client singleton
│   ├── constants.ts            # App-wide constants
│   └── session.ts              # Session helpers
├── store/                      # Redux store & slices
├── types/                      # Shared TypeScript types
├── config/                     # Site, nav, and API config
├── prisma/
│   └── schema.prisma           # Database schema
├── public/                     # Static assets
└── docs/
    └── architecture.md         # Architecture documentation
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **PostgreSQL** database (or a managed service like [Neon](https://neon.tech) / [Supabase](https://supabase.com))
- **Meta Developer App** with Facebook Login configured
- **Upstash** account (for QStash + Redis)
- At least one AI provider API key (Gemini recommended for free tier)

### 1. Clone the repository

```bash
git clone https://github.com/nadim-chowdhury/postpilot-ai.git
cd postpilot-ai
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in your values. The required variables are:

| Variable          | Description                               |
| ----------------- | ----------------------------------------- |
| `DATABASE_URL`    | PostgreSQL connection string              |
| `NEXTAUTH_URL`    | App URL (`http://localhost:3000` for dev) |
| `NEXTAUTH_SECRET` | Random 32-character secret                |
| `META_APP_ID`     | Facebook App ID                           |
| `META_APP_SECRET` | Facebook App Secret                       |
| `ENCRYPTION_KEY`  | 32-byte hex key for token encryption      |

**AI Provider** — set at least one (priority: Gemini → Claude → OpenAI → mock fallback):

| Variable                       | Provider                      |
| ------------------------------ | ----------------------------- |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Google Gemini _(recommended)_ |
| `ANTHROPIC_API_KEY`            | Anthropic Claude              |
| `OPENAI_API_KEY`               | OpenAI                        |

**Upstash** (required for scheduling):

| Variable                     | Description             |
| ---------------------------- | ----------------------- |
| `QSTASH_TOKEN`               | QStash API token        |
| `QSTASH_CURRENT_SIGNING_KEY` | QStash signing key      |
| `QSTASH_NEXT_SIGNING_KEY`    | QStash next signing key |
| `UPSTASH_REDIS_REST_URL`     | Redis REST URL          |
| `UPSTASH_REDIS_REST_TOKEN`   | Redis REST token        |

### 4. Set up the database

```bash
npx prisma db push
```

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

---

## ⚙️ Cron Jobs

The app has two cron endpoints that are triggered **externally** (keeping Vercel on the free tier):

| Endpoint                       | Schedule          | Description                                                      |
| ------------------------------ | ----------------- | ---------------------------------------------------------------- |
| `/api/cron/process-queue`      | Every 5 minutes   | Processes pending scheduled posts and dispatches them via QStash |
| `/api/cron/check-token-expiry` | Daily at midnight | Flags pages with expiring Facebook access tokens                 |

Both endpoints are secured with `CRON_SECRET` — they accept `Authorization: Bearer <secret>` headers or `?secret=<secret>` query params.

### Option 1: GitHub Actions (included)

Two workflow files are included in `.github/workflows/`:

- **`cron.yml`** — Hits `/api/cron/process-queue` every 5 minutes
- **`cron-daily.yml`** — Hits `/api/cron/check-token-expiry` daily at midnight UTC

**Setup:**
1. Go to your GitHub repo → **Settings → Secrets and variables → Actions**
2. Add these repository secrets:
   - `APP_URL` — Your deployed Vercel URL (e.g. `https://postpilot-ai.vercel.app`)
   - `CRON_SECRET` — Same value as your `CRON_SECRET` env variable in Vercel
3. Push the workflow files — GitHub Actions will start running automatically

### Option 2: cron-job.org (alternative)

1. Go to [cron-job.org](https://cron-job.org) and create a free account
2. Create two cron jobs:
   - **Process Queue**: URL = `https://your-app.vercel.app/api/cron/process-queue?secret=YOUR_CRON_SECRET`, schedule = every 5 minutes
   - **Token Expiry**: URL = `https://your-app.vercel.app/api/cron/check-token-expiry?secret=YOUR_CRON_SECRET`, schedule = daily at midnight

### Local Development

Trigger cron endpoints manually:

```bash
curl http://localhost:3000/api/cron/process-queue
curl http://localhost:3000/api/cron/check-token-expiry
```

> **Note:** `CRON_SECRET` is optional in dev — if not set, the endpoints are publicly accessible with a console warning.

---

## 🧠 AI Content Generation

PostPilot supports **three AI providers** with automatic fallback:

1. **Google Gemini** — Recommended (free tier via AI Studio)
2. **Anthropic Claude** — High-quality alternative
3. **OpenAI** — Widely available

The system auto-detects which API keys are configured and uses the highest-priority available provider. If no keys are set, a mock fallback is used for development.

---

## 🏗️ Architecture Highlights

- **Server Actions** — All data mutations use Next.js Server Actions for type-safe, zero-API-route data flow
- **Service Layer** — Business logic is encapsulated in dedicated services (`lib/services/`)
- **Encrypted Tokens** — Facebook access tokens are encrypted at rest using AES
- **Smart Scheduling** — Posts are scheduled with configurable jitter (1–8 min) to avoid pattern detection, with a 3-minute minimum gap between posts to the same page
- **Rate Limiting** — Upstash Redis-based rate limiting protects against Meta API quota exhaustion (200 calls/hour)
- **Background Jobs** — QStash handles reliable post publishing with automatic retries (up to 3 attempts)

---

## 📜 Scripts

| Command              | Description                     |
| -------------------- | ------------------------------- |
| `npm run dev`        | Start development server        |
| `npm run build`      | Create production build         |
| `npm run start`      | Start production server         |
| `npm run lint`       | Run ESLint                      |
| `npx prisma studio`  | Open Prisma database GUI        |
| `npx prisma db push` | Push schema changes to database |

---

## 🚢 Deployment

The app is optimized for deployment on **Vercel** (free tier):

1. Push your repo to GitHub
2. Import the project on [Vercel](https://vercel.com/new)
3. Add all environment variables from `.env.example`
4. Deploy
5. Set up cron triggers using **GitHub Actions** or **cron-job.org** (see [Cron Jobs](#️-cron-jobs) above)

---

## 📄 License

This project is private and not licensed for public distribution.
