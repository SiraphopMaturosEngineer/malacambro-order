# หม่าล่าแคมโบร๋ — Project Notes

QR-code ordering + kitchen display system for the mala buffet shop "หม่าล่าแคมโบร๋".
Stack: Next.js (App Router, JavaScript) + Supabase + Vercel.

## ⚠️ Next.js version note — READ BEFORE BUILDING DYNAMIC ROUTES

This project uses a recent version of Next.js in which **`params` (and `searchParams`) on
Dynamic Route pages/layouts are a `Promise`, not a plain object.**

Always unwrap them with React's `use()`:

```js
'use client';
import { use } from 'react';

export default function TablePage({ params }) {
  const { tableId } = use(params); // ✅ correct
  // const { tableId } = params;   // ❌ will break / warn
  ...
}
```

In Server Components, `await` them instead:

```js
export default async function TablePage({ params }) {
  const { tableId } = await params; // ✅ correct in a Server Component
  ...
}
```

Apply this in every future page under a dynamic segment (e.g. `/order/[tableId]`).

## Database schema (already exists in Supabase — reference only, do not recreate)

- **sessions**: `id`, `table_number`, `adult_count`, `child_count`, `status`, `created_at`
- **menu_categories**: `id`, `name`, `sort_order`
- **menu_items**: `id`, `category_id`, `name`
- **orders**: `id`, `session_id`, `table_number`, `items` (jsonb), `status`, `created_at`

## Pricing (buffet, per head)

- Adult: **229 บาท**
- Child: **129 บาท**

Used later to calculate the bill total from `sessions.adult_count` / `sessions.child_count`.

## Environment variables

Set these in `.env.local` (local) and in the Vercel project settings (production):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

See `.env.local.example`.

## Current pages (scaffold only, for deploy verification)

- `/` — shows shop name and links to the pages below
- `/generate-qr` — placeholder, to be built next
- `/kitchen` — placeholder, to be built next

## Getting started

```bash
npm install
npm run dev
```
