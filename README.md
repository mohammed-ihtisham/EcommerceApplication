# Virellio Shoes

A luxury footwear e-commerce platform built with Next.js 15, featuring a resilient checkout flow designed to handle an unreliable payment provider.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Database**: SQLite via Prisma ORM
- **Payments**: `@henrylabs-interview/payments` SDK (embedded checkout)

## Getting Started

```bash
# Install dependencies
npm install

# Generate Prisma client and push schema
npm run db:generate
npm run db:push

# Start development server
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

### Environment Variables

Create a `.env` file:

```
DATABASE_URL="file:./dev.db"
PAYMENT_API_KEY="your-api-key"
```

## Architecture

### Order Lifecycle

```
checkout_draft → pending_payment → payment_processing → paid
                                                       → payment_failed
                                                       → fraud_rejected
```

### Payment Attempt States

```
created → confirming → processing → succeeded
                                   → failed
                                   → fraud_rejected
                                   → timed_out
```

### Key Design Decisions

- **Server-side cart validation**: Totals are always recomputed server-side. Client totals are never trusted.
- **Idempotent webhooks**: `WebhookEvent` table deduplicates events by provider event ID.
- **Automatic retries**: Both server-side (3 attempts) and client-side (3 attempts) retry logic for transient payment provider failures (deferred responses, server busy).
- **Ref-based callbacks**: The embedded checkout payment token callback uses `useRef` to avoid stale closure issues with React effect cleanup.
- **Bun polyfill**: The payment SDK uses Bun-specific APIs internally. A Node.js polyfill (`src/lib/bun-polyfill.ts`) provides compatible `Bun.file()` and `Bun.write()` implementations using `fs`.
- **Currency enforcement**: Cart only allows items of a single currency. Adding a different currency item is rejected.

### Project Structure

```
src/
  app/                    # Next.js App Router pages and API routes
    api/
      products/           # GET - product catalog
      cart/validate/      # POST - server-side cart validation
      checkout/create/    # POST - create order + payment session
      checkout/confirm/   # POST - confirm payment with token
      orders/[id]/        # GET - order status (polling)
      payments/webhook/   # POST - payment provider webhooks
  components/             # React components
  lib/                    # Utilities (prisma, money formatting, logger)
  server/
    orders/               # State machine, queries
    payments/             # Payment gateway wrapper
    services/             # Business logic (cart, order, payment)
data/
  products.json           # Product catalog (10 items, 3 currencies)
prisma/
  schema.prisma           # Database schema
```

## Resilience

The payment provider is intentionally unreliable, returning:
- **202-deferred**: Checkout creation accepted but not immediately ready
- **502-fraud**: Random fraud rejection
- **503-retry**: Server busy

The application handles these with:
1. Automatic server-side retries with backoff
2. Client-side retry loop for transparent user experience
3. Order status polling for deferred payment confirmation
4. Webhook handling for async payment resolution
5. Clear error messaging with retry affordances
