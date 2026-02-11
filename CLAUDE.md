# CLAUDE.md

This file provides guidance for AI assistants working with the rental-admin-mvp codebase.

## Project Overview

A Korean-language Next.js 14 full-stack application for managing short-term rental property listings. Features include an admin dashboard for reviewing/approving properties, a multi-step host registration form, AI-powered property inspection (OpenAI GPT-4o), and electronic contract signing (Modusign). The backend uses Supabase (PostgreSQL + Auth + Storage).

## Tech Stack

- **Framework**: Next.js 14.2 with App Router, React 18.3, TypeScript 5.5
- **Styling**: Tailwind CSS 3.4 with CSS variable theming (HSL), shadcn/ui (Radix UI primitives)
- **Forms**: React Hook Form 7.71 + Zod 4.3 validation
- **Database/Auth**: Supabase (PostgreSQL with RLS, Auth, Storage)
- **AI**: OpenAI SDK (`openai` package) for property inspection
- **Contracts**: Modusign API for electronic signing
- **Tables**: @tanstack/react-table 8
- **Icons**: Lucide React

## Commands

```bash
npm run dev          # Dev server on port 3001 (sets ulimit -n 4096)
npm run build        # Production build
npm run start        # Production server
npm run lint         # ESLint (next/core-web-vitals)
```

There is no test runner configured. Type checking is done via `npx tsc --noEmit`.

## Project Structure

```
app/                          # Next.js App Router
├── layout.tsx                # Root layout (Toaster provider)
├── page.tsx                  # Landing page
├── globals.css               # CSS variables, global styles
├── admin/                    # Admin routes (auth-protected)
│   ├── layout.tsx            # Admin navigation layout
│   ├── page.tsx              # Dashboard with stats
│   ├── login/                # Login page + server action
│   └── properties/           # Property CRUD
│       ├── page.tsx          # List view
│       ├── actions.ts        # Server actions (fetch, approve, reject)
│       └── [id]/             # Detail view
│           ├── page.tsx
│           ├── actions.ts    # Property-specific actions
│           └── ai-actions.ts # AI inspection action
├── host/register/            # 6-step registration wizard
│   ├── page.tsx              # Form orchestrator
│   ├── types.ts              # Zod schema + constants
│   └── components/           # Step1-6 components, ImageUploader, etc.
├── actions/                  # Shared server actions
│   └── property.ts           # createProperty
├── api/                      # API route handlers
│   ├── webhook/modusign/     # Modusign webhook
│   ├── clean-images/         # Image cleanup
│   └── delete-all-properties/
└── auth/actions.ts           # signOut action

components/
├── ui/                       # shadcn/ui components (button, card, dialog, etc.)
├── LogoutButton.tsx
└── PropertyCard.tsx

lib/
└── utils.ts                  # cn() helper (clsx + tailwind-merge)

utils/
├── supabase/
│   ├── client.ts             # Browser Supabase client
│   ├── server.ts             # Server Supabase client
│   └── middleware.ts         # Auth session + route protection
└── modusign/
    └── api.ts                # Modusign API wrapper

supabase/migrations/          # SQL migration files
middleware.ts                 # Next.js middleware entry point
```

## Architecture Patterns

### Server vs Client Components
- Components are **server components by default** (no directive needed).
- Add `"use client"` only when the component needs interactivity (event handlers, hooks, browser APIs).
- Server actions use `"use server"` directive at the top of the file.

### Data Flow
1. **Mutations**: Client forms -> Server actions (`"use server"`) -> Supabase
2. **Queries**: Server components or server actions -> Supabase client -> rendered on server
3. **Cache**: Use `revalidatePath()` after mutations to refresh data
4. **API routes**: Only used for external webhooks and utility endpoints

### Authentication & Authorization
- Supabase Auth handles sessions via cookies (managed in `utils/supabase/middleware.ts`).
- Middleware in `middleware.ts` protects `/admin/*` routes; unauthenticated users redirect to `/admin/login`.
- Admin role is determined by `raw_user_meta_data->>'role' = 'admin'` in Supabase.
- RLS policies enforce data access: users see only their own properties; admins see all.

### Form Handling
- Multi-step wizard pattern in `app/host/register/` using React Hook Form.
- Zod schemas defined in `types.ts` with Korean validation messages.
- Each step component receives the form context and validates via `trigger()` before advancing.
- Image uploads handled via `ImageUploader` component with HEIC-to-JPEG conversion.

## Database Schema

Key table: **properties**
- Core: `id`, `user_id`, `title`, `address`, `description`, `status` (pending/approved/rejected)
- Pricing: `price_per_week`, `monthly_price`, `deposit`, `maintenance_fee`
- Details: `room_count`, `bathroom_count`, `area_sqm`, `amenities[]`, `building_type`
- Admin: `admin_comment`, `ai_review_score`, `ai_review_result`
- Timestamps: `created_at`, `updated_at`

Other tables: `contracts` (Modusign), `kyc_verifications`, `ai_shadow_logs`

Migrations live in `supabase/migrations/` and are ordered by timestamp.

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL       # Supabase project URL (required)
NEXT_PUBLIC_SUPABASE_ANON_KEY  # Supabase anon key (required)
OPENAI_API_KEY                 # OpenAI API key (for AI inspection)
MODUSIGN_API_KEY               # Modusign API key (for contracts)
MODUSIGN_BASE_URL              # https://api.modusign.co.kr
```

Environment files (`.env.local`, etc.) are gitignored. Never commit secrets.

## Code Conventions

### Naming
- **Components**: PascalCase files and exports (`Step1Location.tsx`, `PropertyCard.tsx`)
- **Functions**: camelCase (`createProperty`, `fetchProperties`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_IMAGES`, `BUILDING_TYPES`)
- **Types**: PascalCase (`RegisterFormData`, `Property`)

### UI Text
- All user-facing text is in **Korean**. Maintain Korean for labels, messages, and validation errors.
- Date formatting uses `toLocaleString("ko-KR")`.

### Server Actions Pattern
```typescript
"use server"

export async function doSomething(params: SomeType) {
  const supabase = await createClient()
  try {
    // Supabase operation
    revalidatePath("/admin/properties")
    return { success: true }
  } catch (error) {
    console.error("Error:", error)
    return { success: false, error: "message" }
  }
}
```

### Imports
- Path alias: `@/*` maps to the project root (e.g., `@/components/ui/button`, `@/utils/supabase/server`).
- shadcn/ui components live in `components/ui/` and are imported from there.

### Styling
- Use Tailwind utility classes directly. Custom colors reference CSS variables defined in `globals.css`.
- The `cn()` utility from `lib/utils.ts` merges Tailwind classes safely.
- Primary brand color: `#EA5C2B` (rental orange).

### Images
- Property images stored in Supabase Storage bucket `property-images`.
- HEIC/HEIF files are converted to JPEG client-side via `heic2any`.
- Min 5, max 30 images per property.
- Remote images from `*.supabase.co` are allowed in `next.config.js`.

### Error Handling
- Server actions return `{ success: boolean, error?: string }` objects.
- Toast notifications (`components/ui/toaster.tsx`) for user feedback.
- Try-catch with `console.error` for server-side logging.
- Middleware returns a safe fallback response on errors to prevent crashes.

## Important Notes

- The dev server uses port **3001** (not the default 3000). The `ulimit -n 4096` in the dev script avoids macOS file descriptor limits.
- No test framework is set up. Validate changes with `npm run build` and `npm run lint`.
- The shadcn/ui components in `components/ui/` are generated and can be extended but follow the Radix + CVA + Tailwind pattern.
- Supabase migrations should be added with incremental timestamp-prefixed SQL files in `supabase/migrations/`.
