# From Laptop to Live Website: The Full Story of "theatti.com"

*A plain-language account of how this online shop platform was designed, built, and put on the internet — what we did, what broke, how we fixed it, and where things stand today.*

> This is a living document (v1). Read it, tell me what's missing, confusing, or wrong, and we'll refine it together.

---

## 1. What is this app, in one sentence?

A website where **any shop owner can create their own online store** (like a mini Shopify) —
customers browse products like a photo gallery, add items to a cart, check out, and track
their order; the shop owner manages products, prices, and orders from their own dashboard.
Multiple shops run on **one shared system**, each reachable at its own web address
(e.g. `royal-jewels.theatti.com`).

---

## 2. Plain-English glossary (refer back here anytime)

| Term | What it means here |
|---|---|
| **Backend** | The "engine" of the app — runs on a server, handles business logic (orders, payments, stock), talks to the database. Written in **Spring Boot** (a Java framework). |
| **Frontend** | What the user actually sees and clicks in their browser — built with **Next.js** (a React-based framework). |
| **Database (Postgres)** | Where all data is permanently stored (shops, products, orders, customers) — like a very organized spreadsheet system. |
| **Multi-tenant** | One app, many independent "tenants" (shops), each sees only their own data — like an apartment building where each shop has its own locked unit, but the building (code) is shared. |
| **Subdomain** | The part before the dot in a web address, e.g. in `royal-jewels.theatti.com`, `royal-jewels` is the subdomain. We use it to figure out *which shop* a visitor is looking at. |
| **Docker / Container** | A way of packaging an app with everything it needs to run, so it behaves identically on any computer/server. A "container" is one running instance of that package. |
| **Docker Compose** | A tool to start several related containers together (e.g. the backend + the database + the frontend) with one command. |
| **EC2** | Amazon's "rent a computer in the cloud" service. We rent one small virtual machine (called an "instance") to run our app. |
| **S3** | Amazon's cloud file-storage service — used here to store product photos/videos. |
| **ECR** | Amazon's private storage for Docker container images (like a private app store for our own containers). |
| **IAM** | Amazon's permission system — controls *who* (which person or server) is allowed to *do what* in our AWS account. |
| **CI/CD** | "Continuous Integration / Continuous Deployment" — automatically testing and shipping code every time it changes, instead of doing it by hand. We use **GitHub Actions** for this. |
| **Migration (Flyway)** | A versioned, ordered script that changes the database structure (e.g. "add a new column"). Each one runs exactly once, in order, so every environment (your laptop, the live server) ends up with an identical database shape. |
| **API** | The "menu" of requests the frontend can send to the backend (e.g. "get me this shop's products," "place this order"). |
| **JWT (JSON Web Token)** | A secure, signed digital "ID card" issued after login, proving who you are on later requests without logging in again each time. |
| **SES** | Amazon's email-sending service. |
| **DNS** | The internet's "phone book" — translates a human-friendly address like `theatti.com` into the numeric address (IP) of the server hosting it. |
| **TLS / HTTPS / SSL certificate** | The padlock-icon encryption that protects data between a visitor's browser and our server, and proves the site is really ours. A "certificate" is the digital proof issued by a trusted authority (we use the free **Let's Encrypt** service). |
| **Route53** | Amazon's DNS service — lets us manage `theatti.com`'s DNS records directly in AWS instead of at GoDaddy. |
| **nip.io** | A free trick service: any address like `65.1.140.121.nip.io` automatically "resolves" to the IP address embedded in it. Useful for testing before you own a real domain. |
| **Nginx** | A lightweight traffic-director program that sits in front of our app, deciding whether an incoming web request should go to the frontend or the backend, and (now) handling the HTTPS encryption. |
| **Stock / inventory race condition** | The risk of two customers both "winning" the last unit of a product at the same instant. We specifically engineered against this (see §5.3). |
| **Elastic IP** | A fixed, unchanging internet address AWS gives our server, so it doesn't change every time the server restarts. |

---

## 3. The big picture: what runs where today

```
                         Internet
                             |
                 theatti.com / *.theatti.com
                             |
                      [ AWS Route53 DNS ]
                     (points domain at the
                        server's address)
                             |
                     Elastic IP: 65.1.140.121
                             |
              ┌───────────────────────────────┐
              │   One AWS EC2 server (t3.small)│
              │                                │
              │   ┌─────────────────────────┐  │
              │   │ nginx (traffic router)   │  │
              │   │ - HTTPS (port 443)       │  │
              │   │ - redirects HTTP->HTTPS  │  │
              │   └───────────┬─────────────┘  │
              │               │                 │
              │   ┌───────────┴───────────┐     │
              │   │                       │     │
              │   ▼                       ▼     │
              │ frontend container   backend container
              │ (Next.js, port 3000) (Spring Boot, 8080)
              │                       │         │
              │                       ▼         │
              │              postgres container │
              │              (the database)     │
              └───────────────────────────────┘
                             │
                             ▼
                  AWS S3 (product photos/videos)
                  AWS SES (emails - best effort)
```

Everything (website + backend + database) currently runs **on a single rented server**,
organized into 4 Docker containers. This is intentionally the *cheapest, simplest* setup
for a beta/early-access launch — not the final "scale to thousands of shops" architecture,
but entirely capable of running real shops today.

---

## 4. How the multi-tenant trick works (important context for later sections)

Every incoming request carries the web address the visitor typed (the "Host" header,
e.g. `royal-jewels.theatti.com`). The backend has a small piece of code
(`TenantResolutionFilter`) that:
1. Looks at the address.
2. Takes the first word before the first dot (`royal-jewels`).
3. Looks up a shop with that "slug" in the database.
4. If found (and the shop's subscription is active), every following step of that
   request only sees *that* shop's data.

This is why a wildcard address (`*.theatti.com`) had to point at our server — any shop
name a shop owner picks automatically gets its own working web address with **zero
manual setup per shop**.

---

## 5. The build journey (chronological)

### Phase 0 — Starting fresh
You had an earlier "online shop" idea that turned out to be only HTML/CSS mockups, no
real app. You asked to scrap it and start a brand-new, fully functional platform, and
gave a long, detailed spec: mobile-first photo-gallery browsing, categories → items →
cart → checkout → online payment, shop owner self-service (branding, catalog, discounts,
coupons, bank details, subscriptions), strict stock integrity ("if there's only 1 in
stock, only 1 person can ever successfully order it"), and order status tracking
(packed → dispatched → in-transit → delivered). Stack: Spring Boot + Next.js + Postgres +
S3 + Docker/EC2/ECR + GitHub Actions.

We broke this into **9 backend "epics"** (big feature groups) and worked through them one
at a time, each one coded, compiled, and tested live before moving to the next:

1. **Foundation** — project skeleton, the subdomain multi-tenancy trick described above.
2. **Shop owner signup/login** — email+password, OTP (one-time code) login option,
   password reset, shop creation wizard, logo upload.
3. **Subscription & billing** — shop owners pay a recurring fee to keep their store live;
   wired up (but never activated with real money) Razorpay as the payment gateway.
4. **Catalog management** — categories, items (with multiple photos/videos), coupons.
5. **Storefront browsing** — the public, no-login pages customers actually see.
6. **Customer signup/login** — separate from shop-owner accounts, scoped per shop.
7. **Cart, checkout & payment** — see §5.3, this is where the stock-safety guarantee
   was built and proven.
8. **Order management & tracking** — shop owner updates order status; customer sees the
   same status.
9. **Infra & CI/CD** — Dockerizing everything and preparing automated deployment.

All 9 were completed, along with 4 matching frontend epics (foundation, storefront UI,
customer-auth UI, owner-dashboard UI).

### 5.1 — Early bug-hunting pattern: the "LazyInitializationException"
**What happened:** Several times early on, API calls crashed with a Java error
(`LazyInitializationException`) when returning data that included related records
(e.g. a product's list of photos).
**Why:** For performance, the database connection for a request closes as soon as the
main logic finishes — but some code was trying to read "extra" related data *after* that
connection had already closed, like trying to re-read a book after the library's closed
for the night.
**Fix:** Always package the full result (including related data) into a clean, library-closed
response object **before** the database connection closes, not after. This pattern was
applied consistently (and we specifically re-checked for it whenever a new feature touched
items with related records).

### 5.2 — Real AWS S3 integration (photos/videos)
Originally photos were only tested with placeholder/fake storage. We connected the app to
a **real AWS S3 bucket** so uploaded photos are genuinely stored in the cloud and
publicly viewable via a URL. Created a dedicated bucket, configured it so photos are
publicly *readable* (anyone can view a product photo) but not publicly *writable* (only
our backend, using real AWS credentials, can upload/delete). Verified end-to-end by
uploading a shop logo and item photos and confirming the URLs worked in a browser.

### 5.3 — The "no-overselling" guarantee (your most emphasized requirement)
**The requirement:** if a product has exactly 1 unit in stock, exactly 1 customer should
ever be able to successfully buy it — even if 100 people click "buy" in the same second.
**How we built it:** when a customer checks out, the backend doesn't just "read the stock
count and then decide" (which has a race-condition gap) — it issues a single database
instruction that says, in effect, *"reduce the stock by 1, but only if there's currently
enough stock to do so, and tell me whether that succeeded."* The database itself (not our
code) guarantees only one such instruction can win when two arrive at the exact same
moment — this is a core guarantee databases provide. If the instruction fails (someone else
already took the last unit), the customer immediately sees a clear error instead of being
allowed to "buy" something that doesn't exist.
**We proved it**, not just assumed it: we deliberately ran two real concurrent purchase
attempts against a product with stock=1 and confirmed only one succeeded and the stock
correctly ended at 0 (never negative).
Stock reserved this way is also **automatically released** if a customer abandons the
purchase without paying (a background job periodically cancels old unpaid orders and
restores their stock).

### 5.4 — Payment gateway reality check: Razorpay wasn't ready, so we built a manual-payment path
When it was time to actually connect a live payment gateway (Razorpay, chosen for India/UPI
support and low fees), signing up asked for a business website — which didn't exist yet.
Rather than block the whole project on that, we designed and built a **manual/offline
payment flow** as a genuine first-class alternative, not just a stopgap:
- Customer checks out and sees the shop's UPI ID / bank details.
- We even generate a **tap-to-pay UPI deep link** (opens the customer's own payment app
  pre-filled with the exact amount) wherever a shop owner has set up a UPI ID.
- The order sits in a clear "awaiting payment confirmation" state.
- The shop owner manually confirms once they've actually received the money, moving the
  order forward.
- The same stock-safety guarantee from §5.3 applies regardless of which payment method
  is used.

This was later extended further into **"guest checkout"** (§5.8) — letting customers skip
creating an account entirely.

### 5.5 — A long list of real-world UX fixes
Across many rounds of your feedback, we fixed (among others): desktop layouts that
stretched/cropped images awkwardly, missing form labels, category pages not letting you
click into a category's products, items not grouped sensibly, no saved delivery addresses,
a confusing cart/checkout flow, no way to resume an interrupted manual payment, mismatched
order-status options between the owner and customer views, and a real **performance bug**:
pages were taking ~5 seconds to load locally. That last one turned out to be a subtle DNS
issue — our test addresses only had an "IPv4" entry, so the browser's network stack was
timing out looking for a (non-existent) "IPv6" entry on every single request before falling
back. Adding the missing IPv6 entry dropped load times from ~5 seconds to under 200ms.

We also hit one **production-readiness incident during local development**: the local
Docker storage filled up completely (58GB/58GB used by an unrelated old container),
which caused the database to crash-loop with "no space left on device" errors — cleared
up by removing the old container and unused build cache.

### 5.6 — Pre-launch gap analysis
Before going anywhere near real users, we did a deliberate "what's still missing"
review and flagged: no real outgoing email service yet (only a local test-only email
catcher), only one (dev) S3 bucket, no automated test coverage, and TLS/HTTPS was
entirely unplanned-for at that point. This review directly shaped the next few phases.

### 5.7 — Real email (AWS SES) + separate production storage bucket
We split email-sending into two interchangeable implementations: a local, fake "test
inbox" version for development, and a real AWS SES version that only activates in
production — switching between them requires zero code changes elsewhere in the app, just
an environment setting. We also created a **second, separate S3 bucket** just for
production photos, so test/development uploads can never mix with real customer data.
*(AWS SES remained in "sandbox mode" throughout — see §6's open items — meaning real email
delivery to arbitrary customers is still not fully unlocked.)*

We also added **email verification at signup** for customers (enter email → receive a
one-time code → confirm) to stop obviously fake emails from being used.

### 5.8 — Guest checkout (no account needed at all)
After confirming AWS SES couldn't yet send email to just anyone, we pivoted: for now, let
customers **skip creating an account entirely**. They fill in their delivery address and
phone number, review their bill, and tap "share" — which builds a pre-written WhatsApp/
Instagram-ready message describing their order — to send directly to the shop owner's
personal account. The shop owner recognizes the customer (via phone/chat), the money
changes hands person-to-person, and the owner then marks the order confirmed inside our
system.

One nuance you specifically called out and we deliberately designed around: **a guest's
order does *not* automatically lock the stock the instant they submit it.** Since there's
no login and no commitment yet, an unresponsive stranger could otherwise lock a
one-of-a-kind item forever. Instead, the shop owner explicitly clicks **"Reserve stock &
accept"** once they've actually confirmed the order is real — only then does the
stock-safety guarantee from §5.3 kick in.

### 5.9 — Moving the code to GitHub
Before any of this could go live, the code needed a permanent, shareable home. We:
- Set it up under your **personal** GitHub account (same one as your other personal
  project), not any work account.
- Made sure every commit uses your personal identity and explicitly carries **no AI
  co-author credit**, per your instruction.
- Hit and fixed a minor Git quirk (an accidental "repo-inside-a-repo" from the frontend
  tooling) and a flaky network path to GitHub (worked around by forcing a more reliable
  connection method).

### 5.10 — Provisioning real AWS infrastructure
This is where "a project on a laptop" became "infrastructure in the cloud." Step by step:

1. **Permissions first.** The AWS login we had access to was deliberately locked-down
   (good security practice), so before anything could be created, you had to grant it a
   specific, limited set of permissions (create servers, create storage, manage its own
   roles — nothing more than needed). We hit two speed bumps here: a technical character-
   limit on how big that permission document could be (fixed by creating it as a
   standalone, reusable policy instead of trying to cram it into a smaller slot), and one
   incorrectly-named permission (`sesv2` isn't a real permission name; the real one is
   `ses`) .
2. **Cost-conscious choices, explicitly agreed with you:** smallest available server size,
   the database running *inside* a container on that same server (instead of paying extra
   for AWS's managed database service), and no custom domain yet (using the free `nip.io`
   trick instead) — all to keep the beta effectively free/very cheap.
3. **Created:** the rented server itself, a fixed address for it (Elastic IP), a firewall
   rule (only your home network can administer it over SSH; everyone can reach it over
   the web), private storage for our packaged app ("ECR"), and a secure, keyless way for
   GitHub itself to be trusted to deploy to AWS in the future (so we never have to store a
   permanent AWS password inside GitHub).
4. **Adjusted the app's configuration for this "no real domain yet" reality** — since our
   tenant-detection logic (§4) requires at least 3 parts in a web address (like
   `shop.yourdomain.com`), a bare server IP address alone wouldn't work for shop pages. The
   `nip.io` trick (e.g. `demo-shop.65.1.140.121.nip.io`) solved this with zero code changes.
5. **Real bugs found and fixed during this phase:**
   - The production configuration was missing one internal setting the frontend needs to
     talk to the backend — would have silently broken every page in production.
   - Spring Boot's built-in health-check was trying to test an email server connection
     that doesn't exist in production (since we send email a different way there), which
     made the app incorrectly report itself as "unhealthy" even though it was working fine.
6. **First real deploy + the SES wall.** Everything came up successfully — except sending
   any real email failed, because AWS SES's default "sandbox mode" only allows sending
   to **individually pre-verified** email addresses (a spam-prevention safeguard for new
   accounts). We verified one real address you control, which unblocked testing, but
   **requesting full "production access"** (to email anyone) hit a new wall: AWS's console
   showed a "domain verification needed" warning, which blocked the request entirely since
   no real domain was owned yet at that time. *(This is exactly what later got resolved —
   see §5.12.)* Given that, you chose to **proceed without working email for now** and
   rely on guest checkout (§5.8) instead — a deliberate, informed trade-off, not an
   oversight.

### 5.11 — Shipping the guest-checkout feature to production (and 3 real bugs along the way)
When it came time to actually ship the guest-checkout feature:
1. Discovered the earlier guest-checkout code had never actually been saved to Git —
   committed and pushed it (your explicit decision: do it now, deploy immediately after).
2. **Automated testing failed** — turned out our automated test checklist had never been
   given a working practice database to test against (a pre-existing gap, not caused by
   this change, but it was blocking everything) — fixed by giving the automated tests
   their own temporary throwaway database to run against.
3. **A real, serious bug surfaced**: a database column was named one thing
   (`is_guest`) but the matching application code expected a slightly different name
   (`guest`) — this mismatch would have made the production server **fail to start at
   all** if we'd deployed without noticing. Fixed by correcting the mismatch and verifying
   with a full rebuild before shipping.
4. Automated testing then passed cleanly, but the **automated deployment step itself**
   failed — because we'd intentionally deferred setting up the secret keys GitHub needs to
   deploy to AWS (see §5.9's "keyless trust" setup — the trust was created, but the actual
   secret values were never typed into GitHub yet).
5. Per your decision, we **deployed manually instead** of finishing the automation first:
   packaged the app, discovered and fixed a **processor-type mismatch** (our laptop builds
   a slightly different "flavor" of the packaged app than the rental server needs — like
   building for the wrong phone model — and this silently made every container crash-loop
   until we rebuilt the correct flavor), then shipped it to the live server and verified it
   worked.

### 5.12 — One more real bug: owner signup crashing with "403 Forbidden"
After the above, a brand-new shop owner signing up got rejected with a 403 error. Looking
at it, this had *nothing* to do with security/permissions at all — it was the "send a
welcome email" step **crashing the entire signup** when AWS SES (still sandboxed, §5.10)
rejected the email. We fixed this by deciding, deliberately, that **email is a
"nice-to-have" notification, never a required step** — if sending the welcome email fails
for any reason, we now just quietly log it and let signup succeed anyway. Verified live
against the real production server.

### 5.13 — Mapping your new domain, `theatti.com`, and enabling HTTPS
Once you bought `theatti.com`, we:
1. Clarified an important architecture fact: the frontend was **never actually hosted on
   AWS's S3+CloudFront** service as originally sketched in the early plan — it runs as a
   normal web server inside a container on the same single rented machine as everything
   else. Simpler, and perfectly fine at this stage.
2. Had you grant one more specific AWS permission (DNS management) to the locked-down login.
3. Created an AWS-managed "phone book" entry (Route53 hosted zone) for `theatti.com`.
4. Had you repoint `theatti.com`'s official nameservers at GoDaddy to use AWS's phone book
   instead of GoDaddy's own — this is the one step only you could do, since it requires
   logging into your GoDaddy account.
5. Added the actual address entries: `theatti.com` itself, and a **wildcard** entry
   (`*.theatti.com`) so *every* current and future shop subdomain automatically works with
   zero further DNS changes, ever.
6. Obtained a **free, real, trusted HTTPS certificate** covering both `theatti.com` and
   every shop subdomain at once (a "wildcard certificate"), using a method (DNS-based
   verification) specifically because normal certificate requests can't issue wildcard
   certificates any other way.
7. Updated the traffic-director (nginx) so all plain "http://" visits now automatically
   redirect to secure "https://", and updated the app's own configuration to use the new
   real domain instead of the temporary `nip.io` address.
8. Verified everything live: the padlock/HTTPS works, the certificate is genuine and
   trusted, both the owner dashboard and a test shop load correctly, and the old
   `nip.io` test address still works too (over plain HTTP only) during the transition.

---

## 6. Where things stand right now

✅ **Fully working in production (`https://theatti.com`):**
- Shop owner signup/login, store creation/branding, category & product management with
  photo/video uploads, coupons & discounts.
- Customer storefront browsing (photo-gallery style), cart, and checkout — both as a
  guest (share-to-WhatsApp flow) and (once email works) as a registered account.
- Guaranteed no-overselling on limited stock.
- Manual/offline payment with UPI deep-link and bank-detail fallback.
- Order status tracking (packed → dispatched → in-transit → delivered), visible to both
  shop owner and customer.
- Real HTTPS with a trusted certificate, covering the main domain and every shop
  subdomain automatically.

🟡 **Working, but with a known limitation:**
- Email sending exists and is wired up, but AWS still restricts it to pre-verified
  addresses only (§5.10) — this is why guest checkout (no email required) is currently the
  primary customer path.
- A live payment gateway (Razorpay) is wired into the code but never activated with real
  keys — manual/offline payment is the real-world path today.

⚙️ **Not yet automated (done manually so far, on purpose, per your request to defer it):**
- Code changes are tested automatically (GitHub Actions) on every push, but the actual
  "ship it to the live server" step still requires a person (me) to run it by hand,
  because the secret keys for that final automated step were never entered into GitHub.
- HTTPS certificate renewal (the current certificate is valid for a while, but nothing
  automatically renews it yet before it expires).

📋 **Known open items, not yet started:**
- Activating a real online payment gateway (replacing/supplementing manual payment).
- Moving the database off the shared server onto AWS's dedicated, backed-up database
  service, and setting up real backups in general.
- Finishing the AWS SES "production access" request now that a real domain exists
  (this was specifically blocked on domain ownership before — that blocker is gone now).
- Basic uptime/error monitoring so problems are noticed proactively instead of by users
  reporting them.
- Automated test coverage beyond the minimal built-in check.

---

## 7. Quick issue log (for a fast skim)

| # | Issue | Root cause | Fix |
|---|---|---|---|
| 1 | Backend wouldn't compile with certain Java versions | A newer Java version silently broke a code-generation tool (Lombok) we depend on | Pinned the project to a specific, known-working Java version |
| 2 | Crashes reading product photo lists | Data was read from the database *after* the connection had already closed | Always package related data into the response *before* the connection closes |
| 3 | Page loads took ~5 seconds locally | Missing IPv6 DNS entry caused every request to wait for a timeout first | Added the missing IPv6 entry |
| 4 | Docker ran out of disk space, DB crash-looped | Unrelated old container + build cache had filled the disk | Removed old container, cleared build cache |
| 5 | Razorpay signup blocked | Required a business website we didn't have yet | Built a manual/offline payment flow as a real alternative |
| 6 | AWS SES couldn't send real email | New AWS accounts start in a restricted "sandbox" mode | Verified one address for testing; built guest checkout to not depend on email meanwhile |
| 7 | "Domain verification needed" blocking SES production access | AWS requires a verified domain for full email access, and we didn't own one yet | Resolved once `theatti.com` was purchased and set up (see #12) |
| 8 | Automated tests failing in CI | Tests needed a real database to run against, which CI never provided | Added a temporary database to the automated test pipeline |
| 9 | Production database wouldn't start after guest-checkout update | A database column name didn't match what the code expected | Corrected the mismatch |
| 10 | Automated deployment step failing | The AWS secret keys GitHub needs were never entered (on purpose, deferred) | Deployed manually instead; automation deferred by your choice |
| 11 | Production containers crash-looping after a manual deploy | Packaged app was built for the wrong processor type for the rental server | Rebuilt for the correct processor type |
| 12 | New shop owners got a 403 error on signup | A failed "send welcome email" step was crashing the whole signup, not a real permissions issue | Made email-sending failures non-fatal (log and continue) |
| 13 | Mobile browser said "site can't be reached" | Phone was auto-upgrading to HTTPS, which didn't exist yet at that time | Resolved naturally once real HTTPS was set up (see #14) |
| 14 | No HTTPS / no custom domain | Never set up — beta ran on a temporary free address | Bought `theatti.com`, delegated its DNS to AWS, issued a free trusted certificate, enabled HTTPS site-wide |

---

*End of v1 — please flag anything missing, unclear, or incorrect and I'll refine this.*
