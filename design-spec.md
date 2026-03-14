# Virellio Shoes — AI Implementation Specification

## Purpose

This document provides **explicit implementation instructions** for building the Virellio Shoes e-commerce application.

The goal is to create a **small but production-minded storefront** that demonstrates:

* reliable checkout architecture
* correct payment handling
* resilience to payment failures
* a clear order lifecycle
* thoughtful backend design

The system must prioritize **correctness and reliability over unnecessary complexity**.

---

# System Overview

This application is a small e-commerce storefront that sells **10 luxury footwear products**.

Customers must be able to:

1. Browse products
2. Add products to a cart
3. Checkout
4. Process payment via a provided SDK
5. Receive an order confirmation

Although the catalog is small, the system must behave like a **real production commerce system**.

---

# Critical Constraint

The payment provider is **unreliable**.

Payments may:

* fail
* be rejected by fraud detection
* take a long time
* complete asynchronously

The system must therefore:

* persist order state
* support retries
* prevent duplicate charges
* gracefully handle delayed confirmation

---

# Technology Stack

Use the following stack unless explicitly instructed otherwise.

Frontend

* Next.js (App Router)
* React
* TailwindCSS
* TypeScript

Backend

* Next.js Route Handlers

Database

* Prisma ORM
* SQLite

Libraries

* Zod (validation)
* uuid
* localStorage cart persistence

Payments

* `@henrylabs-interview/payments`
API Key (secret): 824c951e-dfac-4342-8e03

---

# Architecture Overview

The system has four main domains:

```
Catalog
Cart
Checkout
Orders
```

The application owns all business logic.

The payment SDK is treated as an **external dependency**.

The application database is the **source of truth for order state**.

---

# Product Data

Products are loaded from a static JSON file:

```
data/products.json
```

Example:

```json
{
  "id": 1,
  "name": "Noir Gold Sneaker",
  "description": "...",
  "imgUrl": "...",
  "amount": 3250,
  "currency": "USD"
}
```

---

# Currency Rule

The catalog includes multiple currencies.

To avoid complex conversions:

**A cart may only contain items of one currency.**

If a user attempts to add an item with a different currency:

Reject the action.

Display:

> Your cart contains items priced in USD. Please complete that purchase or clear your cart before adding items in another currency.

---

# Folder Structure

The codebase must follow this structure.

```
src/

  app/
    page.tsx
    checkout/page.tsx
    order/[publicOrderId]/page.tsx

    api/
      products/route.ts
      cart/validate/route.ts
      checkout/create/route.ts
      checkout/confirm/route.ts
      orders/[publicOrderId]/route.ts
      payments/webhook/route.ts

  components/
    ProductCard.tsx
    ProductGrid.tsx
    CartDrawer.tsx
    CartItemRow.tsx
    CheckoutSummary.tsx
    PaymentSection.tsx
    OrderStatusView.tsx
    StatusBadge.tsx
    ErrorBanner.tsx

  lib/
    money.ts
    products.ts
    env.ts
    logger.ts
    zod.ts

  server/
    services/
      cartService.ts
      orderService.ts
      paymentService.ts

    payments/
      PaymentGateway.ts

    orders/
      stateMachine.ts
      orderQueries.ts

data/
  products.json

prisma/
  schema.prisma
```

---

# Database Schema

Implement with Prisma.

## Order

```
id (UUID)
publicOrderId
status
currency
subtotalAmount
createdAt
updatedAt
```

---

## OrderItem

```
id
orderId
productId
productNameSnapshot
productImageSnapshot
unitAmountSnapshot
currencySnapshot
quantity
lineTotalAmount
```

---

## PaymentAttempt

```
id
orderId
status
providerCheckoutId
providerPaymentId
idempotencyKey
amount
currency
failureCode
failureMessage
createdAt
updatedAt
```

---

## WebhookEvent

```
id
providerEventId
type
payloadJson
processedAt
```

Used for idempotent webhook handling.

---

# Order State Machine

Orders must follow these states:

```
checkout_draft
pending_payment
payment_processing
paid
payment_failed
fraud_rejected
cancelled
```

---

# Payment Attempt States

```
created
confirming
processing
succeeded
failed
fraud_rejected
timed_out
```

---

# API Specifications

## GET /api/products

Returns catalog from `products.json`.

---

## POST /api/cart/validate

Input:

```
{
  items: [
    { productId: number, quantity: number }
  ]
}
```

Server must:

* validate products exist
* validate quantities
* enforce currency rule
* recompute totals

---

## POST /api/checkout/create

Responsibilities:

1. Validate cart
2. Recompute totals
3. Enforce currency rule
4. Create Order
5. Create OrderItems
6. Create PaymentAttempt
7. Call `PaymentProcessor.checkout.create()`
8. Store provider checkout ID
9. Return session info

---

## POST /api/checkout/confirm

Responsibilities:

1. Validate order exists
2. Ensure order not already paid
3. Ensure payment attempt valid
4. Call `PaymentProcessor.checkout.confirm()`
5. Map provider result to internal state

Possible states:

```
paid
failed
fraud_rejected
processing
```

---

## GET /api/orders/:publicOrderId

Returns order status.

Used for polling during delayed payment.

---

## POST /api/payments/webhook

Responsibilities:

1. Validate webhook authenticity
2. Deduplicate event
3. Find payment attempt
4. Apply valid state transition
5. Persist state

---

# Payment Gateway Wrapper

All SDK usage must be isolated in:

```
server/payments/PaymentGateway.ts
```

The wrapper must expose:

```
createCheckout()
confirmCheckout()
parseWebhookEvent()
```

This prevents SDK-specific logic from leaking into the application.

---

# Frontend Pages

## Product Listing

Route:

```
/
```

Displays product grid.

Each card includes:

* image
* name
* description
* price
* add to cart

---

## Cart

Cart must:

* persist to localStorage
* allow quantity changes
* enforce currency rule

---

## Checkout

Displays:

* order summary
* total
* payment form
* submit button

Button must be disabled during submission.

---

## Order Status Page

Route:

```
/order/[publicOrderId]
```

Possible states:

```
paid
failed
fraud_rejected
processing
```

If `processing`, poll order status every 5 seconds.

---

# Payment Reliability Handling

Because payments may take time:

If payment result is ambiguous:

```
Order.status = payment_processing
```

Redirect user to order status page.

Continue polling until order reaches terminal state.

---

# Error Messaging

Processing:

> Processing your payment securely...

Slow processing:

> This is taking longer than usual. Your payment may still complete.

Failure:

> We couldn't complete your payment. Please try again.

Fraud rejection:

> Your payment was rejected. Please try another payment method.

Success:

> Order confirmed. Your confirmation ID is VIR-XXXXXX.

---

# Edge Cases

The system must handle:

Cart

* invalid product IDs
* negative quantities
* mixed currency items

Checkout

* duplicate submissions
* network failures
* payment SDK errors

Payments

* async confirmation
* delayed results
* duplicate webhook events

Orders

* page refresh during payment
* revisiting confirmation page
* retry after failure

---

# Implementation Phases

## Phase 1 — Project Setup

Create project.

Install:

```
Next.js
Prisma
Tailwind
Zod
Payment SDK
```

---

## Phase 2 — Catalog

Implement:

* product loader
* Zod validation
* product grid
* money formatting

---

## Phase 3 — Cart

Implement:

* cart state
* localStorage persistence
* add/remove/update logic
* currency enforcement

---

## Phase 4 — Database

Create Prisma schema.

Run migrations.

Implement order service.

---

## Phase 5 — Checkout

Implement:

* checkout creation endpoint
* order persistence
* PaymentProcessor checkout.create()

---

## Phase 6 — Payment Confirmation

Implement:

* confirm endpoint
* PaymentProcessor checkout.confirm()
* state mapping

---

## Phase 7 — Async Handling

Implement:

* order status polling
* webhook endpoint
* idempotent event handling

---

## Phase 8 — Polish

Add:

* loading states
* UX messaging
* edge case tests
* README

---

# AI Development Rules

When implementing:

1. Do not expose payment API keys to the frontend.
2. Never trust client cart totals.
3. Always recompute totals on the server.
4. Prevent duplicate payment submissions.
5. Treat payment responses as potentially asynchronous.

---

# Design Philosophy

Even though this project is small, it should reflect how **real commerce systems handle unreliable payment infrastructure**.

Key priorities:

* reliable order state
* idempotent payment handling
* graceful user experience during uncertainty

The system must remain correct even when the payment provider behaves unpredictably.

---