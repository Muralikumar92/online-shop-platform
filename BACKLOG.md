# Backlog — Online Shop Platform

Running list of known gaps, improvements, and future features. Not in priority
order unless stated. Update this file (add/check off/re-prioritize) as we
decide what to work on next.

Status legend: `[ ]` not started · `[~]` in progress · `[x]` done

---

## Production hardening (fix core issues first)

- [ ] **Live Razorpay keys** — currently running in test/manual mode; needs
      real merchant account + live API keys wired in.
- [ ] **TLS certificate auto-renewal** — wildcard Let's Encrypt cert for
      `theatti.com`/`*.theatti.com` is issued but renewal is manual only
      (cert valid until 2027-01-04, but no cron/systemd timer running
      `certbot renew` yet).
- [ ] **GitHub Actions auto-deploy** — CI pipeline exists but auto-deploy to
      EC2 is blocked on unconfigured repo secrets (deploy key, host, etc.);
      deploys are manual (`scp` + `docker compose up -d`) for now.
- [~] **AWS SES production access** — `theatti.com` is now a verified SES
      domain identity (DKIM+SPF in Route53), sender switched to
      `no-reply@theatti.com`, and a production-access request was submitted
      via API (`PENDING` AWS review, usually resolved within 24h). Until
      approved, SES can still only deliver to verified recipient addresses
      (sandbox limit) - real customers/owners won't receive OTP emails yet.
- [ ] **RDS migration** — Postgres currently runs as a container on the same
      EC2 instance as the app; no managed backups/failover. Move to RDS.
- [ ] **Database backup strategy** — no automated backups configured yet
      (depends on / easier after RDS migration).
- [ ] **`www` redirect** — `www.theatti.com` is not currently handled
      (only apex + wildcard subdomains).
- [ ] **Stock race-condition load testing** — atomic-stock-decrement logic
      is implemented and informally verified, but not load-tested under
      concurrent order bursts.
- [ ] **Monitoring & alerting** — no uptime/error-rate/resource alerting set
      up (e.g. CloudWatch alarms, simple healthcheck pings).

## Cost/performance (deferred until core issues above are fixed)

- [ ] **CloudFront in front of S3 (media)** — cache product images/videos at
      the edge instead of hitting S3 on every request; also lets us lock
      the S3 bucket to private (Origin Access Control) instead of
      public-read. No backend code changes needed — `S3Service` already
      reads the public base URL from `AWS_S3_PUBLIC_BASE_URL`, just swap it
      to the CloudFront domain + migrate existing image URLs in the DB.
      Expected to be free at current traffic (~1,000 users/day is well
      within CloudFront's permanent 1TB/10M-requests free tier).
- [ ] **CloudFront in front of EC2 (frontend)** — edge-cache static Next.js
      assets (`_next/static/*`, images, fonts) while leaving SSR
      HTML/`/api/*` uncached, for faster global loads + reduced EC2
      bandwidth. (Full static S3+CloudFront hosting of the frontend is
      *not* feasible — the app does real per-request SSR with live
      subdomain-based tenant resolution, so it needs a running server,
      not static files.)

## Notes

- See `PROJECT_JOURNEY_REPORT.md` for full history/context on what's been
  built and why.
- Add new items here as they come up in conversation instead of leaving
  them only in chat history.
