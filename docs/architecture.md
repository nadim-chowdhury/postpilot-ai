# PostPilot AI — System Architecture

> **Version:** 1.0.0  
> **Last Updated:** 2026-07-11  
> **Status:** Draft — Pending Approval

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Design Principles](#2-design-principles)
3. [Tech Stack](#3-tech-stack)
4. [System Architecture](#4-system-architecture)
5. [Directory Structure](#5-directory-structure)
6. [Database Schema](#6-database-schema)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [Meta Graph API Integration](#8-meta-graph-api-integration)
9. [AI Content Engine](#9-ai-content-engine)
10. [Scheduling & Queue System](#10-scheduling--queue-system)
11. [API Design](#11-api-design)
12. [Frontend Architecture](#12-frontend-architecture)
13. [State Management](#13-state-management)
14. [Design System & Theming](#14-design-system--theming)
15. [Error Handling Strategy](#15-error-handling-strategy)
16. [Security](#16-security)
17. [Deployment & Infrastructure](#17-deployment--infrastructure)
18. [Naming Conventions](#18-naming-conventions)
19. [Development Phases](#19-development-phases)

---

## 1. Product Overview

### What It Is

PostPilot AI is a centralized content automation platform for managing Facebook Page publishing at scale. It enables a single operator to generate AI-driven content, schedule posts across multiple pages with distinct topics, and monitor publishing health — all from one dashboard.

### Core Problems Solved

| Pain Point                                         | Solution                                       |
| -------------------------------------------------- | ---------------------------------------------- |
| Manually posting to 10+ pages daily                | Automated scheduling with time-jitter          |
| Creating unique content per topic/page             | AI content engine with per-page personas       |
| Risking Meta spam flags from duplicate content     | Content uniqueness enforcement per post        |
| No centralized visibility into what's posted where | Unified dashboard with calendar + activity log |
| Scaling to more pages over time                    | Dynamic page management (add / remove / pause) |

### Key Features

- **Page Management** — Connect, disconnect, pause, and configure Facebook Pages
- **AI Content Generation** — Bulk-generate topic-aware posts with per-page personas
- **Smart Scheduling** — Multi-page, multi-time scheduling with random jitter
- **Content Calendar** — Visual timeline of all scheduled, posted, and failed content
- **Post Queue** — Review, edit, approve, or reject AI-generated posts before publishing
- **Activity Log** — Full audit trail of every action (generated, scheduled, posted, failed)
- **Analytics Dashboard** — Post success rates, page health, and queue statistics

---

## 2. Design Principles

These principles govern every architectural and implementation decision:

| Principle                           | Meaning                                                                                                 |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **Separation of Concerns**          | Each module owns one responsibility. No god files.                                                      |
| **Convention Over Configuration**   | Consistent naming, file structure, and patterns eliminate guesswork.                                    |
| **Fail Loudly, Recover Gracefully** | Errors surface immediately in logs and UI; retries handle transient failures.                           |
| **Server-First**                    | Data fetching and mutations happen on the server. Client components only when interactivity demands it. |
| **Type Everything**                 | Zero `any`. Shared types live in a single source of truth.                                              |
| **Design for Deletion**             | Every feature should be removable without cascading breakage.                                           |

---

## 3. Tech Stack

### Core

| Layer         | Technology                                   | Rationale                                                         |
| ------------- | -------------------------------------------- | ----------------------------------------------------------------- |
| **Framework** | Next.js 16 (App Router)                      | Full-stack React with RSC, Server Actions, Route Handlers         |
| **Language**  | TypeScript 5 (strict mode)                   | End-to-end type safety                                            |
| **Database**  | PostgreSQL (via Neon / Supabase)             | Relational integrity for pages ↔ content ↔ schedules              |
| **ORM**       | Prisma 7+                                    | Type-safe queries, schema-driven migrations, auto-generated types |
| **Auth**      | NextAuth.js v4 (→ migrate to v5 when stable) | OAuth flow for Meta login, session management                     |
| **State**     | Redux Toolkit + React Redux                  | Predictable client state for complex UI (calendar, queue)         |
| **Styling**   | Tailwind CSS v4 + shadcn/ui (base-nova)      | Utility-first CSS with accessible component primitives            |
| **Icons**     | Lucide React                                 | Consistent, tree-shakable icon set                                |

### AI & Content

| Layer            | Technology                                           | Rationale                                       |
| ---------------- | ---------------------------------------------------- | ----------------------------------------------- |
| **AI SDK**       | Vercel AI SDK                                        | Streaming, structured output, provider-agnostic |
| **LLM Provider** | OpenAI GPT-4o (primary), Anthropic Claude (fallback) | Best quality for social content generation      |
| **Image Gen**    | OpenAI DALL-E 3 / Replicate                          | On-demand image generation for visual posts     |

### Background & Infrastructure

| Layer            | Technology                      | Rationale                                        |
| ---------------- | ------------------------------- | ------------------------------------------------ |
| **Job Queue**    | Upstash QStash (serverless)     | Serverless-native scheduling; no Redis to manage |
| **Cron**         | Vercel Cron / Upstash Scheduler | Periodic queue polling (every 5 min)             |
| **Rate Limiter** | Upstash Ratelimit               | Protect API routes and respect Meta rate limits  |
| **Logging**      | Pino (structured JSON)          | Fast, structured, production-grade logging       |
| **Monitoring**   | Sentry                          | Error tracking and performance monitoring        |

### Dev Tooling

| Tool                            | Purpose                    |
| ------------------------------- | -------------------------- |
| ESLint 9 + `eslint-config-next` | Linting with Next.js rules |
| Prettier                        | Code formatting            |
| Husky + lint-staged             | Pre-commit hooks           |
| Prisma Studio                   | Visual database inspection |
| `next dev --turbopack`          | Fast local development     |

---

## 4. System Architecture

### High-Level Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (CLIENT)                         │
│  ┌───────────┐  ┌────────────┐  ┌──────────┐  ┌─────────────┐  │
│  │ Dashboard │  │  Calendar  │  │  Queue   │  │   Settings  │  │
│  └─────┬─────┘  └─────┬──────┘  └────┬─────┘  └──────┬──────┘  │
│        │               │              │               │         │
│        └───────────────┴──────────────┴───────────────┘         │
│                         Redux Store                             │
└─────────────────────────────┬───────────────────────────────────┘
                              │ RSC + Server Actions
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NEXT.JS SERVER (APP ROUTER)                  │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │  Server Actions   │  │  Route Handlers  │  │  Middleware   │  │
│  │  (mutations)      │  │  (webhooks/api)  │  │  (auth guard) │  │
│  └────────┬─────────┘  └────────┬─────────┘  └──────────────┘  │
│           │                     │                               │
│  ┌────────▼─────────────────────▼──────────┐                    │
│  │            Service Layer                 │                    │
│  │  ┌────────────┐ ┌───────────┐ ┌───────┐ │                    │
│  │  │ page.svc   │ │ post.svc  │ │ai.svc │ │                    │
│  │  └────────────┘ └───────────┘ └───────┘ │                    │
│  └────────┬─────────────┬──────────┬───────┘                    │
│           │             │          │                             │
│  ┌────────▼─────┐ ┌─────▼────┐ ┌──▼──────────┐                 │
│  │   Prisma DB  │ │ Meta API │ │ OpenAI API  │                 │
│  └──────────────┘ └──────────┘ └─────────────┘                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   BACKGROUND WORKERS                            │
│                                                                 │
│  ┌─────────────────────┐    ┌──────────────────────────┐        │
│  │  Upstash QStash     │───▶│  /api/jobs/publish-post  │        │
│  │  (scheduled tasks)  │    │  /api/jobs/refresh-token │        │
│  └─────────────────────┘    │  /api/jobs/generate-bulk │        │
│                              └──────────────────────────┘        │
│  ┌─────────────────────┐                                        │
│  │  Vercel Cron         │───▶ /api/cron/process-queue           │
│  │  (every 5 min)       │───▶ /api/cron/check-token-expiry     │
│  └─────────────────────┘                                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        DATA STORES                              │
│                                                                 │
│  ┌──────────────────┐        ┌──────────────────┐               │
│  │   PostgreSQL     │        │   Upstash Redis   │              │
│  │   (Neon)         │        │   (rate limits,   │              │
│  │                  │        │    cache, locks)   │              │
│  └──────────────────┘        └──────────────────┘               │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow: Scheduled Post Lifecycle

```
1. USER creates content (manual or AI-generated)
       │
       ▼
2. Content saved to `posts` table (status: DRAFT)
       │
       ▼
3. USER reviews → approves → assigns schedule
       │
       ▼
4. Schedule entry created in `schedules` table (status: PENDING)
   + QStash message enqueued with target timestamp
       │
       ▼
5. At scheduled time, QStash calls /api/jobs/publish-post
       │
       ▼
6. Job handler:
   a. Fetches post + page token from DB
   b. Validates token freshness
   c. Calls Meta Graph API: POST /{page-id}/feed
   d. On success → update status to POSTED, save fb_post_id
   e. On failure → update status to FAILED, log error, enqueue retry (max 3)
       │
       ▼
7. Activity log entry created for audit trail
```

---

## 5. Directory Structure

The project follows the **"store project files outside of app"** strategy recommended by Next.js — the `app/` directory is reserved purely for routing, while shared logic lives in top-level directories.

```
postpilot-ai/
│
├── app/                              # ROUTING ONLY — pages, layouts, API routes
│   ├── (auth)/                       # Route group: auth pages (no sidebar)
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   │
│   ├── (dashboard)/                  # Route group: main app (with sidebar)
│   │   ├── layout.tsx                # Sidebar + header shell
│   │   ├── page.tsx                  # Dashboard home (overview)
│   │   ├── pages/                    # /pages — FB page management
│   │   │   ├── page.tsx
│   │   │   └── [pageId]/
│   │   │       └── page.tsx
│   │   ├── content/                  # /content — AI content pool
│   │   │   ├── page.tsx
│   │   │   └── [postId]/
│   │   │       └── page.tsx
│   │   ├── calendar/                 # /calendar — schedule calendar view
│   │   │   └── page.tsx
│   │   ├── queue/                    # /queue — post review queue
│   │   │   └── page.tsx
│   │   ├── activity/                 # /activity — audit log
│   │   │   └── page.tsx
│   │   └── settings/                 # /settings — app configuration
│   │       └── page.tsx
│   │
│   ├── api/                          # Route handlers (REST endpoints)
│   │   ├── auth/
│   │   │   └── [...nextauth]/
│   │   │       └── route.ts
│   │   ├── meta/
│   │   │   ├── callback/
│   │   │   │   └── route.ts          # OAuth callback from Meta
│   │   │   └── webhooks/
│   │   │       └── route.ts          # Meta webhook receiver
│   │   ├── jobs/                     # Background job endpoints (QStash targets)
│   │   │   ├── publish-post/
│   │   │   │   └── route.ts
│   │   │   ├── generate-bulk/
│   │   │   │   └── route.ts
│   │   │   └── refresh-token/
│   │   │       └── route.ts
│   │   └── cron/                     # Cron job endpoints
│   │       ├── process-queue/
│   │       │   └── route.ts
│   │       └── check-token-expiry/
│   │           └── route.ts
│   │
│   ├── layout.tsx                    # Root layout (html, body, providers)
│   ├── globals.css                   # Global styles + Tailwind + theme tokens
│   ├── loading.tsx                   # Root loading skeleton
│   ├── error.tsx                     # Root error boundary
│   └── not-found.tsx                 # 404 page
│
├── components/                       # SHARED UI COMPONENTS
│   ├── ui/                           # shadcn/ui primitives (button, dialog, etc.)
│   ├── layout/                       # Shell components
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   ├── nav-item.tsx
│   │   └── user-menu.tsx
│   ├── pages/                        # Feature: page management
│   │   ├── page-card.tsx
│   │   ├── page-list.tsx
│   │   ├── page-connect-dialog.tsx
│   │   └── page-status-badge.tsx
│   ├── content/                      # Feature: content & posts
│   │   ├── post-card.tsx
│   │   ├── post-editor.tsx
│   │   ├── post-preview.tsx
│   │   └── ai-generate-form.tsx
│   ├── calendar/                     # Feature: calendar
│   │   ├── calendar-view.tsx
│   │   ├── calendar-day-cell.tsx
│   │   └── calendar-event.tsx
│   ├── queue/                        # Feature: review queue
│   │   ├── queue-list.tsx
│   │   ├── queue-item.tsx
│   │   └── queue-actions.tsx
│   ├── activity/                     # Feature: activity log
│   │   ├── activity-list.tsx
│   │   └── activity-item.tsx
│   ├── shared/                       # Cross-feature reusables
│   │   ├── empty-state.tsx
│   │   ├── stat-card.tsx
│   │   ├── status-badge.tsx
│   │   ├── confirm-dialog.tsx
│   │   ├── data-table.tsx
│   │   └── search-input.tsx
│   └── providers/                    # React context providers
│       ├── theme-provider.tsx
│       └── store-provider.tsx
│
├── lib/                              # CORE BUSINESS LOGIC (server-side)
│   ├── prisma.ts                     # Prisma client singleton
│   ├── utils.ts                      # General utilities (cn, formatDate, etc.)
│   ├── constants.ts                  # App-wide constants & enums
│   │
│   ├── services/                     # Service layer — all business logic
│   │   ├── page.service.ts           # FB page CRUD + token management
│   │   ├── post.service.ts           # Post CRUD + content pool ops
│   │   ├── schedule.service.ts       # Schedule creation + queue management
│   │   ├── ai.service.ts             # AI content generation orchestration
│   │   ├── publisher.service.ts      # Meta Graph API publishing logic
│   │   └── activity.service.ts       # Audit log writes
│   │
│   ├── meta/                         # Meta Graph API client
│   │   ├── client.ts                 # HTTP client wrapper for Graph API
│   │   ├── auth.ts                   # OAuth helpers, token exchange/refresh
│   │   ├── pages.ts                  # Page listing + info endpoints
│   │   ├── publish.ts                # Post publishing + media upload
│   │   └── types.ts                  # Meta API response types
│   │
│   ├── ai/                           # AI content generation
│   │   ├── client.ts                 # Vercel AI SDK setup
│   │   ├── prompts.ts                # System prompts, templates
│   │   ├── personas.ts               # Per-niche persona definitions
│   │   └── schemas.ts                # Zod schemas for structured AI output
│   │
│   ├── queue/                        # Background job infrastructure
│   │   ├── client.ts                 # QStash client setup
│   │   ├── jobs.ts                   # Job definitions (publish, generate, etc.)
│   │   └── retry.ts                  # Retry logic + exponential backoff
│   │
│   └── validations/                  # Zod schemas for input validation
│       ├── page.schema.ts
│       ├── post.schema.ts
│       └── schedule.schema.ts
│
├── actions/                          # SERVER ACTIONS (Next.js mutations)
│   ├── page.actions.ts               # connectPage, disconnectPage, togglePause
│   ├── post.actions.ts               # createPost, updatePost, deletePost
│   ├── schedule.actions.ts           # createSchedule, cancelSchedule
│   ├── ai.actions.ts                 # generateContent, generateBulk
│   └── auth.actions.ts               # signIn, signOut
│
├── store/                            # REDUX STATE (client-side only)
│   ├── index.ts                      # Store configuration
│   ├── hooks.ts                      # Typed useAppSelector, useAppDispatch
│   └── slices/
│       ├── calendar.slice.ts         # Calendar view state (selected date, filters)
│       ├── queue.slice.ts            # Queue filters, selections
│       └── ui.slice.ts               # Sidebar collapsed, modals, toasts
│
├── types/                            # SHARED TYPESCRIPT TYPES
│   ├── index.ts                      # Re-exports
│   ├── page.types.ts                 # Page-related types
│   ├── post.types.ts                 # Post & content types
│   ├── schedule.types.ts             # Schedule & job types
│   └── api.types.ts                  # API request/response types
│
├── hooks/                            # CUSTOM REACT HOOKS (client-side)
│   ├── use-pages.ts                  # SWR/query for pages data
│   ├── use-posts.ts                  # SWR/query for posts data
│   ├── use-calendar.ts               # Calendar navigation logic
│   └── use-debounce.ts               # Debounce utility hook
│
├── prisma/                           # DATABASE
│   ├── schema.prisma                 # Schema definition
│   ├── migrations/                   # Migration history
│   └── seed.ts                       # Development seed data
│
├── config/                           # APP CONFIGURATION
│   ├── site.ts                       # Site metadata (name, description, URLs)
│   ├── nav.ts                        # Navigation items definition
│   └── meta-api.ts                   # Meta API constants (scopes, endpoints)
│
├── docs/                             # PROJECT DOCUMENTATION
│   ├── architecture.md               # ← You are here
│   ├── api-reference.md              # API endpoint documentation
│   ├── meta-setup-guide.md           # Meta Developer Portal setup instructions
│   └── deployment-guide.md           # Deployment runbook
│
├── public/                           # STATIC ASSETS
│   ├── favicon.ico
│   └── images/
│       └── logo.svg
│
├── .env.example                      # Environment variable template
├── .env.local                        # Local env (git-ignored)
├── next.config.ts                    # Next.js configuration
├── tailwind.config.ts                # Tailwind CSS configuration
├── tsconfig.json                     # TypeScript configuration
├── components.json                   # shadcn/ui configuration
├── eslint.config.mjs                 # ESLint configuration
├── postcss.config.mjs                # PostCSS configuration
└── package.json
```

---

## 6. Database Schema

### Entity Relationship Diagram

```
┌──────────────┐       ┌──────────────────┐       ┌──────────────────┐
│    users     │       │    fb_pages      │       │     posts        │
├──────────────┤       ├──────────────────┤       ├──────────────────┤
│ id (PK)      │──┐    │ id (PK)          │──┐    │ id (PK)          │
│ email        │  │    │ user_id (FK)     │  │    │ user_id (FK)     │
│ name         │  │    │ meta_page_id     │  │    │ fb_page_id (FK)  │
│ image        │  │    │ name             │  │    │ title            │
│ role         │  │    │ access_token     │  │    │ body             │
│ created_at   │  │    │ token_expires_at │  │    │ media_url        │
│ updated_at   │  │    │ topic            │  │    │ media_type       │
└──────────────┘  │    │ persona_prompt   │  │    │ status           │
                  │    │ status           │  │    │ fb_post_id       │
                  │    │ avatar_url       │  │    │ ai_generated     │
                  │    │ created_at       │  │    │ ai_model         │
                  │    │ updated_at       │  │    │ created_at       │
                  │    └──────────────────┘  │    │ updated_at       │
                  │                          │    │ published_at     │
                  │    ┌──────────────────┐  │    └──────────────────┘
                  │    │   schedules      │  │              │
                  │    ├──────────────────┤  │              │
                  │    │ id (PK)          │  │              │
                  └───▶│ user_id (FK)     │  │              │
                       │ post_id (FK)  ◀──│──│──────────────┘
                       │ fb_page_id (FK)◀─│──┘
                       │ scheduled_at    │
                       │ published_at    │
                       │ status          │
                       │ jitter_seconds  │
                       │ retry_count     │
                       │ error_message   │
                       │ qstash_msg_id   │
                       │ created_at      │
                       └──────────────────┘

┌──────────────────┐
│  activity_logs   │
├──────────────────┤
│ id (PK)          │
│ user_id (FK)     │
│ entity_type      │      # 'page' | 'post' | 'schedule'
│ entity_id        │
│ action           │      # 'created' | 'published' | 'failed' | ...
│ metadata (JSON)  │      # Flexible context data
│ created_at       │
└──────────────────┘
```

### Prisma Schema (Core Models)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  ADMIN
  EDITOR
}

enum PageStatus {
  ACTIVE          // Posting enabled
  PAUSED          // Temporarily stopped
  DISCONNECTED    // Token revoked or expired
  TOKEN_EXPIRING  // Token expires within 7 days
}

enum PostStatus {
  DRAFT           // Created, not yet approved
  APPROVED        // Reviewed and ready to schedule
  SCHEDULED       // Assigned to a schedule slot
  PUBLISHING      // Currently being posted via API
  POSTED          // Successfully published to FB
  FAILED          // Publish attempt failed
  ARCHIVED        // Soft-deleted / retired
}

enum ScheduleStatus {
  PENDING         // Waiting for scheduled time
  IN_PROGRESS     // Job picked up, publishing
  COMPLETED       // Successfully posted
  FAILED          // All retries exhausted
  CANCELLED       // Manually cancelled by user
}

enum MediaType {
  NONE
  IMAGE
  VIDEO
  LINK
}

model User {
  id          String   @id @default(cuid())
  email       String   @unique
  name        String?
  image       String?
  role        UserRole @default(ADMIN)

  fbPages     FbPage[]
  posts       Post[]
  schedules   Schedule[]
  activities  ActivityLog[]

  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt      @map("updated_at")

  @@map("users")
}

model FbPage {
  id              String     @id @default(cuid())
  userId          String     @map("user_id")
  metaPageId      String     @unique @map("meta_page_id")
  name            String
  accessToken     String     @map("access_token")
  tokenExpiresAt  DateTime?  @map("token_expires_at")
  topic           String                              // e.g. "wildlife photography"
  personaPrompt   String?    @db.Text @map("persona_prompt")  // AI system prompt for this page
  status          PageStatus @default(ACTIVE)
  avatarUrl       String?    @map("avatar_url")

  user            User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  posts           Post[]
  schedules       Schedule[]

  createdAt       DateTime   @default(now()) @map("created_at")
  updatedAt       DateTime   @updatedAt      @map("updated_at")

  @@index([userId])
  @@index([status])
  @@map("fb_pages")
}

model Post {
  id            String     @id @default(cuid())
  userId        String     @map("user_id")
  fbPageId      String     @map("fb_page_id")
  title         String?                             // Internal reference title
  body          String     @db.Text                 // Post caption / text content
  mediaUrl      String?    @map("media_url")
  mediaType     MediaType  @default(NONE) @map("media_type")
  status        PostStatus @default(DRAFT)
  fbPostId      String?    @map("fb_post_id")       // Meta's post ID after publishing
  aiGenerated   Boolean    @default(false) @map("ai_generated")
  aiModel       String?    @map("ai_model")         // e.g. "gpt-4o"

  user          User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  fbPage        FbPage     @relation(fields: [fbPageId], references: [id], onDelete: Cascade)
  schedules     Schedule[]

  createdAt     DateTime   @default(now()) @map("created_at")
  updatedAt     DateTime   @updatedAt      @map("updated_at")
  publishedAt   DateTime?  @map("published_at")

  @@index([userId])
  @@index([fbPageId])
  @@index([status])
  @@map("posts")
}

model Schedule {
  id            String         @id @default(cuid())
  userId        String         @map("user_id")
  postId        String         @map("post_id")
  fbPageId      String         @map("fb_page_id")
  scheduledAt   DateTime       @map("scheduled_at")
  publishedAt   DateTime?      @map("published_at")
  status        ScheduleStatus @default(PENDING)
  jitterSeconds Int            @default(0) @map("jitter_seconds")
  retryCount    Int            @default(0) @map("retry_count")
  errorMessage  String?        @map("error_message")
  qstashMsgId   String?        @map("qstash_msg_id")

  user          User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  post          Post           @relation(fields: [postId], references: [id], onDelete: Cascade)
  fbPage        FbPage         @relation(fields: [fbPageId], references: [id], onDelete: Cascade)

  createdAt     DateTime       @default(now()) @map("created_at")

  @@index([status, scheduledAt])
  @@index([fbPageId])
  @@map("schedules")
}

model ActivityLog {
  id          String   @id @default(cuid())
  userId      String   @map("user_id")
  entityType  String   @map("entity_type")    // 'page' | 'post' | 'schedule'
  entityId    String   @map("entity_id")
  action      String                           // 'created' | 'published' | 'failed' | etc.
  metadata    Json?                            // Flexible context (error details, etc.)

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  createdAt   DateTime @default(now()) @map("created_at")

  @@index([userId, createdAt])
  @@index([entityType, entityId])
  @@map("activity_logs")
}
```

---

## 7. Authentication & Authorization

### Flow

```
User clicks "Connect with Facebook"
        │
        ▼
NextAuth.js → Meta OAuth consent screen
        │
        ▼
User grants permissions → Meta redirects to /api/auth/callback/facebook
        │
        ▼
NextAuth receives access token + user profile
        │
        ▼
Exchange short-lived token for long-lived user token (60 days)
        │
        ▼
Fetch /me/accounts to get Page Access Tokens (non-expiring*)
        │
        ▼
Save user session + page tokens to database
```

> \* Page Access Tokens obtained from a long-lived user token do not expire unless the user changes their Facebook password, deauthorizes the app, or the admin role on the page changes.

### NextAuth Configuration

- **Provider:** Facebook (Meta)
- **Scopes:** `pages_manage_posts`, `pages_read_engagement`, `pages_show_list`, `pages_read_user_content`
- **Strategy:** JWT (stateless sessions) for Next.js server-side
- **Session data:** `userId`, `email`, `name`, `image`
- **Token storage:** Page access tokens stored encrypted in PostgreSQL, **never** in the JWT

### Auth Middleware

```
middleware.ts → protects all routes under /(dashboard)/*
             → redirects unauthenticated users to /login
             → allows /api/jobs/* and /api/cron/* with QStash signature verification
```

---

## 8. Meta Graph API Integration

### API Version Policy

- Use the **latest stable** Graph API version (currently v24.0+)
- Store version in `config/meta-api.ts` as a single constant
- Monitor Meta Developer changelog for breaking changes and deprecations

### Required Permissions

| Permission                | Purpose                              | Access Level                   |
| ------------------------- | ------------------------------------ | ------------------------------ |
| `pages_manage_posts`      | Create, edit, delete posts on Pages  | Advanced (requires App Review) |
| `pages_read_engagement`   | Read post metrics, comments          | Advanced                       |
| `pages_show_list`         | List all Pages managed by user       | Advanced                       |
| `pages_read_user_content` | Read user-generated content on Pages | Advanced                       |
| `publish_video`           | Publish video content to Pages       | Advanced (if video support)    |

### Key Endpoints

| Action                 | Method | Endpoint                                                            |
| ---------------------- | ------ | ------------------------------------------------------------------- |
| List managed pages     | GET    | `/me/accounts`                                                      |
| Get page info          | GET    | `/{page-id}?fields=name,picture,fan_count`                          |
| Publish text post      | POST   | `/{page-id}/feed` with `message`                                    |
| Publish photo post     | POST   | `/{page-id}/photos` with `url` + `caption`                          |
| Schedule post (native) | POST   | `/{page-id}/feed` with `published=false` + `scheduled_publish_time` |
| Delete post            | DELETE | `/{post-id}`                                                        |

### Compliance Rules (Anti-Spam)

These rules are **non-negotiable** and enforced at the code level:

1. **Time Jitter** — Every scheduled time gets a random offset of ±1–8 minutes. Never post at exact clock intervals.
2. **Content Uniqueness** — The system rejects duplicate body text across pages within a 24-hour window. AI rewrites variations automatically.
3. **Rate Limiting** — Maximum 1 API call per page per 3 minutes. Global cap of 200 calls/hour across all pages.
4. **Natural Cadence** — Maximum 6 posts per page per day, spread across waking hours (8 AM–10 PM in the page's timezone).
5. **Token Health Checks** — Cron job validates token freshness daily. Alert at 7 days before expiry. Auto-pause page at 1 day before expiry.

### Client Architecture

```typescript
// lib/meta/client.ts — simplified structure

class MetaGraphClient {
  private version: string;
  private baseUrl: string;
  private rateLimiter: Ratelimit;

  constructor(pageAccessToken: string) {
    /* ... */
  }

  async publishPost(
    pageId: string,
    content: PublishPayload,
  ): Promise<MetaPostResponse>;
  async schedulePost(
    pageId: string,
    content: PublishPayload,
    scheduledAt: Date,
  ): Promise<MetaPostResponse>;
  async getPageInfo(pageId: string): Promise<MetaPageInfo>;
  async listPages(userAccessToken: string): Promise<MetaPage[]>;
  async deletePost(postId: string): Promise<void>;
}
```

---

## 9. AI Content Engine

### Architecture

```
User triggers "Generate Content"
        │
        ▼
┌───────────────────────────────────┐
│         AI Service Layer          │
│                                   │
│  1. Load page's persona prompt    │
│  2. Load topic constraints        │
│  3. Build system + user prompt    │
│  4. Call LLM via Vercel AI SDK    │
│  5. Parse structured output (Zod) │
│  6. Validate uniqueness           │
│  7. Save to posts table (DRAFT)   │
└───────────────────────────────────┘
```

### Persona System

Each Facebook Page has a `persona_prompt` stored in the database. This is the system prompt that defines the AI's writing style, tone, and content boundaries for that specific page/topic.

```
Example persona for a wildlife photography page:

"You are an expert wildlife and nature photographer with 15 years of
field experience. Write engaging, educational captions that teach
followers about animal behavior, habitat conservation, and photography
techniques. Tone: warm, knowledgeable, conversational. Never use
clickbait. Always include one actionable tip. Keep posts under 280
characters for maximum engagement."
```

### Structured Output

All AI-generated content returns a structured JSON object validated by Zod:

```typescript
// lib/ai/schemas.ts

const GeneratedPostSchema = z.object({
  title: z.string().max(100), // Internal reference title
  body: z.string().min(10).max(2000), // The actual post text
  hashtags: z.array(z.string()).max(5), // Suggested hashtags
  tone: z.enum(["educational", "inspirational", "conversational", "humorous"]),
  suggestImage: z.boolean(), // Whether an image would enhance this post
  imagePrompt: z.string().optional(), // DALL-E prompt if image suggested
});
```

### Bulk Generation

The "Generate Week's Content" feature:

1. Loops through all **active** pages
2. For each page, generates N posts (configurable, default 7 — one per day)
3. Uses page's persona + topic to create unique content
4. Validates no two generated posts are semantically too similar (cosine similarity check)
5. All posts saved as `DRAFT` for human review before scheduling

---

## 10. Scheduling & Queue System

### Why Not Next.js Cron Alone?

Next.js API routes (and Vercel serverless functions) have execution time limits (10–60 seconds depending on plan). They cannot reliably hold a connection open for precisely-timed future execution. We need a **dedicated scheduling layer**.

### Architecture: Hybrid Approach

| Component          | Role                                                                                                 |
| ------------------ | ---------------------------------------------------------------------------------------------------- |
| **Upstash QStash** | Delivers HTTP requests to our API at specific future timestamps. Acts as the reliable "alarm clock." |
| **Vercel Cron**    | Runs every 5 minutes to sweep the `schedules` table for any missed jobs (safety net).                |
| **Route Handlers** | `/api/jobs/*` endpoints receive QStash payloads and execute the actual publishing.                   |

### Scheduling Flow

```
1. User schedules a post for July 15 at 2:30 PM
2. System adds random jitter: +4 min → actual time = 2:34 PM
3. Schedule row inserted: status=PENDING, scheduledAt=2:34 PM
4. QStash message enqueued:
   - URL: /api/jobs/publish-post
   - Body: { scheduleId: "xxx" }
   - Deliver at: 2:34 PM UTC
   - Retries: 3, backoff: exponential
5. QStash stores the message ID → saved to schedule.qstashMsgId
```

### Retry Strategy

| Attempt | Delay      | Action                                 |
| ------- | ---------- | -------------------------------------- |
| 1st     | Immediate  | First publish attempt                  |
| 2nd     | 30 seconds | Retry after transient error            |
| 3rd     | 2 minutes  | Final retry                            |
| —       | —          | Mark as FAILED, log error, notify user |

### QStash Signature Verification

All `/api/jobs/*` routes verify the `Upstash-Signature` header to ensure requests originate from QStash and not malicious actors.

---

## 11. API Design

### Route Handler Conventions

All API routes live under `app/api/` and follow RESTful conventions:

| Route                          | Method | Purpose                          | Auth               |
| ------------------------------ | ------ | -------------------------------- | ------------------ |
| `/api/meta/callback`           | GET    | OAuth callback from Meta         | Public             |
| `/api/meta/webhooks`           | POST   | Webhook events from Meta         | Signature verified |
| `/api/jobs/publish-post`       | POST   | Publish a scheduled post         | QStash signature   |
| `/api/jobs/generate-bulk`      | POST   | Bulk AI content generation       | QStash signature   |
| `/api/jobs/refresh-token`      | POST   | Refresh expiring tokens          | QStash signature   |
| `/api/cron/process-queue`      | GET    | Sweep for missed scheduled posts | Vercel Cron secret |
| `/api/cron/check-token-expiry` | GET    | Alert on expiring tokens         | Vercel Cron secret |

### Server Actions (Preferred for UI Mutations)

For all user-initiated mutations (form submissions, button clicks), we use **Next.js Server Actions** instead of REST API routes. This gives us:

- Automatic CSRF protection
- Type-safe request/response
- Progressive enhancement (works without JavaScript)
- No need to build a REST API for client consumption

```typescript
// actions/post.actions.ts — example signature

"use server";

export async function createPost(
  formData: CreatePostInput,
): Promise<ActionResult<Post>>;
export async function updatePost(
  id: string,
  data: UpdatePostInput,
): Promise<ActionResult<Post>>;
export async function deletePost(id: string): Promise<ActionResult<void>>;
export async function approvePost(id: string): Promise<ActionResult<Post>>;
```

### Standardized Response Type

```typescript
// types/api.types.ts

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };
```

---

## 12. Frontend Architecture

### Rendering Strategy

| Page                | Rendering                         | Reason                                       |
| ------------------- | --------------------------------- | -------------------------------------------- |
| `/login`            | Static (SSG)                      | No dynamic data                              |
| `/` (Dashboard)     | Server Component                  | Fetches latest stats from DB at request time |
| `/pages`            | Server Component                  | Lists pages from DB                          |
| `/pages/[pageId]`   | Server Component + Client Islands | Page detail with interactive edit forms      |
| `/content`          | Server Component                  | Content pool listing                         |
| `/content/[postId]` | Server Component + Client Islands | Post editor with preview                     |
| `/calendar`         | Client Component                  | Highly interactive calendar UI               |
| `/queue`            | Server Component + Client Islands | List with inline approve/reject actions      |
| `/activity`         | Server Component                  | Read-only audit log                          |
| `/settings`         | Server Component + Client Islands | Forms for app configuration                  |

### Component Design Rules

1. **Server Components by default** — Only add `"use client"` when the component needs: event handlers, `useState`, `useEffect`, browser APIs, or Redux.
2. **Client islands pattern** — Server Component pages wrap small Client Components for interactivity. Never make an entire page `"use client"`.
3. **No prop drilling beyond 2 levels** — Use composition, context, or Redux.
4. **Every component gets its own file** — No barrel exports of multiple components from one file.
5. **Co-locate component-specific types** — If a type is only used by one component, define it in the same file.

---

## 13. State Management

### What Goes Where

| Data Type                                          | Where It Lives                      | Why                                                    |
| -------------------------------------------------- | ----------------------------------- | ------------------------------------------------------ |
| **Database entities** (pages, posts, schedules)    | Server Components via Prisma        | Single source of truth; no stale client cache          |
| **Form state**                                     | React `useState` / `useActionState` | Local, ephemeral, no sharing needed                    |
| **Calendar navigation** (selected date, view mode) | Redux `calendar.slice`              | Persisted across navigation, shared between components |
| **Queue filters** (status filter, search query)    | Redux `queue.slice`                 | Complex filter state, survives re-renders              |
| **UI state** (sidebar collapsed, active modal)     | Redux `ui.slice`                    | Global UI coordination                                 |

### Redux Store Configuration

```typescript
// store/index.ts

import { configureStore } from "@reduxjs/toolkit";
import calendarReducer from "./slices/calendar.slice";
import queueReducer from "./slices/queue.slice";
import uiReducer from "./slices/ui.slice";

export const store = configureStore({
  reducer: {
    calendar: calendarReducer,
    queue: queueReducer,
    ui: uiReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

---

## 14. Design System & Theming

### Visual Identity

| Token                 | Value                                   | Usage                                    |
| --------------------- | --------------------------------------- | ---------------------------------------- |
| **Primary Font**      | Geist Sans                              | All body text, headings                  |
| **Mono Font**         | Geist Mono                              | Code, IDs, timestamps                    |
| **Border Radius**     | 0.625rem (10px) base                    | Consistent rounded corners               |
| **Color System**      | OKLCH via CSS custom properties         | shadcn/ui neutral palette + brand accent |
| **Theme**             | Dark mode primary, light mode supported | `next-themes` with system detection      |
| **Component Library** | shadcn/ui (base-nova style)             | Accessible, composable primitives        |
| **Motion**            | `tw-animate-css` + custom transitions   | Subtle micro-animations                  |

### Brand Accent Color

The neutral shadcn/ui palette is extended with a single brand accent for CTAs and active states:

```css
:root {
  --brand: oklch(0.65 0.19 250); /* Refined blue */
  --brand-foreground: oklch(0.985 0 0);
}

.dark {
  --brand: oklch(0.72 0.17 250); /* Slightly lighter for dark mode */
  --brand-foreground: oklch(0.145 0 0);
}
```

### Layout Structure

```
┌────────────────────────────────────────────────────────┐
│ Sidebar (240px, collapsible to 64px)  │    Header     │
│                                        │  (user menu,  │
│  ┌─ Logo ─────────────────────────┐   │   breadcrumb) │
│  │                                │   ├───────────────┤
│  │  Dashboard                     │   │               │
│  │  Pages                         │   │               │
│  │  Content                       │   │   Main        │
│  │  Calendar                      │   │   Content     │
│  │  Queue                         │   │   Area        │
│  │  Activity                      │   │               │
│  │                                │   │   (scrollable)│
│  │  ─────────                     │   │               │
│  │  Settings                      │   │               │
│  └────────────────────────────────┘   │               │
└────────────────────────────────────────┴───────────────┘
```

---

## 15. Error Handling Strategy

### Layers

| Layer                      | Mechanism                                | Example                                                         |
| -------------------------- | ---------------------------------------- | --------------------------------------------------------------- |
| **Input Validation**       | Zod schemas in Server Actions            | Invalid form data rejected before DB hit                        |
| **Service Layer**          | Custom `AppError` class with error codes | `throw new AppError("TOKEN_EXPIRED", "Page token has expired")` |
| **API/Action Response**    | Standardized `ActionResult<T>` type      | `{ success: false, error: "...", code: "TOKEN_EXPIRED" }`       |
| **React Error Boundaries** | `error.tsx` at route segment level       | Catches render errors, shows recovery UI                        |
| **Background Jobs**        | Try/catch + retry + dead letter logging  | Failed jobs retried 3x, then logged for manual review           |
| **Global**                 | Sentry integration                       | All unhandled errors captured with context                      |

### Custom Error Class

```typescript
// lib/errors.ts

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public metadata?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

// Error codes as constants
export const ErrorCodes = {
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  RATE_LIMITED: "RATE_LIMITED",
  DUPLICATE_CONTENT: "DUPLICATE_CONTENT",
  META_API_ERROR: "META_API_ERROR",
  AI_GENERATION_FAILED: "AI_GENERATION_FAILED",
  SCHEDULE_CONFLICT: "SCHEDULE_CONFLICT",
} as const;
```

---

## 16. Security

| Concern                      | Mitigation                                                                          |
| ---------------------------- | ----------------------------------------------------------------------------------- |
| **Access Tokens at rest**    | Encrypted with AES-256-GCM before storing in PostgreSQL. Decryption key in env var. |
| **Access Tokens in transit** | HTTPS only. Tokens never sent to the client.                                        |
| **CSRF**                     | Server Actions have built-in CSRF protection. API routes verify origin.             |
| **XSS**                      | React's default escaping + Content Security Policy headers.                         |
| **SQL Injection**            | Prisma's parameterized queries. No raw SQL without explicit review.                 |
| **Background Job Auth**      | QStash signature verification on all `/api/jobs/*` routes.                          |
| **Cron Job Auth**            | `CRON_SECRET` header verification on all `/api/cron/*` routes.                      |
| **Rate Limiting**            | Upstash Ratelimit on all public-facing routes.                                      |
| **Environment Variables**    | `.env.local` gitignored. `.env.example` committed as template.                      |
| **Dependency Security**      | `npm audit` in CI pipeline. Dependabot enabled.                                     |

---

## 17. Deployment & Infrastructure

### Recommended: Vercel + Neon

| Service     | Role                                        | Tier                                     |
| ----------- | ------------------------------------------- | ---------------------------------------- |
| **Vercel**  | Next.js hosting, serverless functions, cron | Pro (for cron + longer function timeout) |
| **Neon**    | PostgreSQL database with connection pooling | Free/Launch                              |
| **Upstash** | QStash (scheduling) + Redis (rate limiting) | Free/Pay-as-you-go                       |
| **Sentry**  | Error monitoring                            | Developer (free)                         |

### Environment Variables

```bash
# .env.example

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://...

# Auth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<random-32-char-string>

# Meta / Facebook
META_APP_ID=<from-meta-developer-portal>
META_APP_SECRET=<from-meta-developer-portal>
META_GRAPH_API_VERSION=v24.0

# AI
OPENAI_API_KEY=<your-key>
ANTHROPIC_API_KEY=<optional-fallback>

# Upstash
QSTASH_URL=https://qstash.upstash.io
QSTASH_TOKEN=<your-token>
QSTASH_CURRENT_SIGNING_KEY=<signing-key>
QSTASH_NEXT_SIGNING_KEY=<next-signing-key>
UPSTASH_REDIS_REST_URL=<redis-url>
UPSTASH_REDIS_REST_TOKEN=<redis-token>

# Security
ENCRYPTION_KEY=<32-byte-hex-key>
CRON_SECRET=<random-string-for-cron-auth>

# Monitoring
SENTRY_DSN=<your-sentry-dsn>
```

---

## 18. Naming Conventions

Consistency is enforced across the entire codebase:

### Files & Directories

| Type               | Convention              | Example                              |
| ------------------ | ----------------------- | ------------------------------------ |
| Route pages        | `page.tsx`              | `app/(dashboard)/pages/page.tsx`     |
| Route layouts      | `layout.tsx`            | `app/(dashboard)/layout.tsx`         |
| API routes         | `route.ts`              | `app/api/jobs/publish-post/route.ts` |
| Components         | `kebab-case.tsx`        | `components/pages/page-card.tsx`     |
| Services           | `kebab-case.service.ts` | `lib/services/page.service.ts`       |
| Server Actions     | `kebab-case.actions.ts` | `actions/post.actions.ts`            |
| Redux slices       | `kebab-case.slice.ts`   | `store/slices/calendar.slice.ts`     |
| Type files         | `kebab-case.types.ts`   | `types/post.types.ts`                |
| Validation schemas | `kebab-case.schema.ts`  | `lib/validations/post.schema.ts`     |
| Hooks              | `use-kebab-case.ts`     | `hooks/use-pages.ts`                 |
| Config files       | `kebab-case.ts`         | `config/meta-api.ts`                 |

### Code Identifiers

| Type                  | Convention                    | Example                            |
| --------------------- | ----------------------------- | ---------------------------------- |
| React components      | `PascalCase`                  | `PageCard`, `QueueList`            |
| Functions             | `camelCase`                   | `createPost`, `generateContent`    |
| Constants             | `SCREAMING_SNAKE_CASE`        | `MAX_POSTS_PER_DAY`, `API_VERSION` |
| Types / Interfaces    | `PascalCase`                  | `PostStatus`, `CreatePostInput`    |
| Enums (Prisma)        | `PascalCase`                  | `PostStatus.DRAFT`                 |
| Database columns      | `snake_case`                  | `created_at`, `fb_page_id`         |
| CSS variables         | `kebab-case` with `--` prefix | `--brand`, `--sidebar-foreground`  |
| Environment variables | `SCREAMING_SNAKE_CASE`        | `DATABASE_URL`, `META_APP_ID`      |

### Commit Messages

Follow **Conventional Commits**:

```
feat(calendar): add weekly view toggle
fix(publisher): handle rate limit 429 response
chore(deps): upgrade prisma to v7.2
docs(architecture): add scheduling flow diagram
```

---

## 19. Development Phases

### Phase 1 — Foundation & Meta Integration

> **Goal:** A working app where you can log in, connect Facebook Pages, and manually publish a single post.

| Task                                                           | Status         |
| -------------------------------------------------------------- | -------------- |
| Project scaffolding (Next.js 16, TypeScript, Tailwind, shadcn) | ✅ Done        |
| Database setup (Neon + Prisma schema + migrations)             | ✅ Done        |
| NextAuth.js with Meta/Facebook OAuth provider                  | ✅ Done        |
| Page connection flow (OAuth → fetch pages → save tokens)       | ✅ Done        |
| Page management UI (list, pause, disconnect)                   | ✅ Done        |
| Manual "Post Now" feature via Meta Graph API                   | ✅ Done        |
| Activity logging foundation                                    | ✅ Done        |

### Phase 2 — Scheduling & Queue System

> **Goal:** Schedule posts for future times. Posts auto-publish at the scheduled time with jitter.

| Task                                                   | Status         |
| ------------------------------------------------------ | -------------- |
| Upstash QStash integration                             | ⬜ Not started |
| Schedule creation with jitter logic                    | ⬜ Not started |
| Background job: `publish-post`                         | ⬜ Not started |
| Retry mechanism (3 attempts + exponential backoff)     | ⬜ Not started |
| Vercel Cron: `process-queue` safety-net sweeper        | ⬜ Not started |
| Post queue UI (approve / reject / edit before publish) | ⬜ Not started |
| Calendar view UI                                       | ⬜ Not started |

### Phase 3 — AI Content Engine

> **Goal:** Generate topic-aware, persona-driven content for any page via AI.

| Task                                                      | Status         |
| --------------------------------------------------------- | -------------- |
| Vercel AI SDK integration (OpenAI provider)               | ⬜ Not started |
| Per-page persona system (CRUD for persona prompts)        | ⬜ Not started |
| Single post generation (one page, one post)               | ⬜ Not started |
| Bulk generation ("Generate Week's Content" for all pages) | ⬜ Not started |
| Content uniqueness validation                             | ⬜ Not started |
| AI generation UI (prompt input, preview, edit, save)      | ⬜ Not started |
| Image generation integration (DALL-E 3)                   | ⬜ Not started |

### Phase 4 — Polish & Production Hardening

> **Goal:** A production-ready, reliable, and delightful experience.

| Task                                                    | Status         |
| ------------------------------------------------------- | -------------- |
| Dashboard overview page (stats, health, upcoming posts) | ⬜ Not started |
| Activity log UI with filtering                          | ⬜ Not started |
| Token health monitoring (cron: check-token-expiry)      | ⬜ Not started |
| Error boundaries on every route segment                 | ⬜ Not started |
| Loading skeletons on every route segment                | ⬜ Not started |
| Sentry integration for error monitoring                 | ⬜ Not started |
| Rate limiting on all API routes                         | ⬜ Not started |
| Token encryption at rest                                | ⬜ Not started |
| Comprehensive `.env.example`                            | ⬜ Not started |
| Deployment to Vercel (production)                       | ⬜ Not started |

### Phase 5 — Future Enhancements (Backlog)

| Feature                                         | Priority |
| ----------------------------------------------- | -------- |
| Instagram integration (via same Meta Graph API) | Medium   |
| Post performance analytics (engagement, reach)  | Medium   |
| A/B testing for AI-generated content            | Low      |
| Team collaboration (multiple users, roles)      | Low      |
| Webhook listeners for post comments/reactions   | Low      |
| Mobile-responsive PWA                           | Medium   |
| Export activity log to CSV                      | Low      |

---

> **End of Architecture Document**
>
> This document is the single source of truth for all technical decisions.
> Update it as the project evolves. Every PR that changes architecture
> should include a corresponding update to this file.
