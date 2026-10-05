# Online Shop Platform

Multi-tenant SaaS e-commerce platform. Each subscribed shop owner gets their
own storefront on a subdomain (e.g. `acme.myshops.com`), customers browse a
mobile-first, photo-gallery-style catalog (categories → item grid → item
detail), add to cart, and check out with online payment. Shop owners manage
branding, categories, items (multi-image/video via S3), discounts, coupons,
bank payout details, and order fulfillment status.

## Stack
- **Backend**: Spring Boot 4 (Java 21), PostgreSQL, Flyway, Spring Security, JWT
- **Frontend**: Next.js (TypeScript, Tailwind), mobile-first responsive
- **Storage**: AWS S3 (+ CloudFront for frontend/media delivery)
- **Infra**: Docker on a single EC2 t3.small, RDS PostgreSQL, ECR, GitHub Actions CI/CD

## Architecture decisions
- **Multi-tenancy**: subdomain-per-shop, resolved per-request from the Host
  header (`TenantResolutionFilter` → `TenantContext`), built in from day 1.
- **Payments**: simple gateway integration at checkout (Razorpay, India/INR)
  now; shop-owner payouts to their own bank account are settled manually
  until a marketplace/split-payment gateway is integrated later.
- **Stock integrity**: available stock is re-validated and atomically
  decremented at checkout (DB-level locking) so that with `n` units in
  stock, at most `n` concurrent orders can succeed — no overselling.
- **Auth**: email + password for both shop owners and customers, with
  email-OTP login and email-based password reset. Order confirmation and
  status-change emails are sent to the customer's email.

## Local development

```bash
docker compose up --build
```
- Backend: http://localhost:8080 (health: `/actuator/health`)
- Frontend: http://localhost:3000
- Postgres: localhost:55432 (db/user/pass: `shopplatform`)
- Mailhog (dev email viewer): http://localhost:8025 — all transactional emails
  (OTP, password reset, order notifications) land here instead of real inboxes.

To exercise S3-backed logo/product-media uploads locally, export real
`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` (or point `app.aws.*` at
LocalStack) before starting `backend`; without credentials the upload
endpoints fail fast with a clear SDK error.

## Repository layout
```
backend/   Spring Boot API (Maven)
frontend/  Next.js storefront + shop-owner dashboard
docker-compose.yml   Local dev stack
.github/workflows/   CI (build + test)
```

## Roadmap (epics)
Tracked as todos for this build: platform foundation (this commit) → shop
owner auth & onboarding → subscription & billing → catalog management →
customer storefront browsing → cart/checkout/payment → customer auth →
order management & tracking → infra/CI-CD (EC2, RDS, S3+CloudFront, ECR).
