# Deployment Runbook (Epic 9: Infra & CI/CD)

Target architecture (matches the user's spec):

```
Frontend : Next.js, built as a static/standalone Node server, served behind nginx on the EC2 box.
           Product images/videos load straight from S3 via CloudFront.
Backend  : Spring Boot, Docker, single EC2 t3.small.
Database : RDS PostgreSQL.
Images   : S3 (+ CloudFront in front for caching/CDN delivery).
Registry : AWS ECR.
CI/CD    : GitHub Actions (build -> push to ECR -> SSH deploy to EC2).
```

One EC2 instance hosts three containers (`nginx`, `backend`, `frontend`) plus a `certbot`
sidecar for certificate renewal; nginx terminates TLS for `myshops.com` and every
shop's subdomain (`*.myshops.com`) and forwards the original `Host` header so the
backend's existing `TenantResolutionFilter` keeps doing subdomain-based tenant
resolution exactly as it does today in docker-compose dev.

## 1. One-time AWS setup

1. **ECR**: create two repos, `shopplatform-backend` and `shopplatform-frontend`.
2. **RDS**: PostgreSQL 16, smallest instance (e.g. `db.t4g.micro`), private subnet,
   security group allowing inbound 5432 only from the EC2 instance's security group.
   Create database `shopplatform` + a app user/password (matches `DB_*` env vars).
3. **S3**: **two separate buckets** — one per environment, so dev/local testing can
   never touch production media or vice versa:
   - Dev (already created): `online-shop-platform-dev-<account-id>-ap-south-1`
     — used by local `docker-compose.yml` only.
   - Prod: `online-shop-platform-prod-<account-id>-ap-south-1` — used only by
     `infra/docker-compose.prod.yml` on the EC2 instance.
   Both currently use a public bucket-read policy (`s3:GetObject` to `*`) scoped to
   the bucket's own ARN, with `BlockPublicAcls`/`IgnorePublicAcls` left on (so only
   the bucket policy, never object ACLs, can grant access). Optionally put
   CloudFront in front of the prod bucket (origin access control) instead of the
   public-read policy for CDN caching — update `AWS_S3_PUBLIC_BASE_URL` to the
   CloudFront domain if you do.
4. **CloudFront** *(optional, prod only)*: distribution with the prod S3 bucket as
   origin, OAC enabled, caching optimized for images. Note the distribution domain
   for `AWS_S3_PUBLIC_BASE_URL`.
5. **Route 53**: hosted zone for `myshops.com`; an `A`/ALIAS record for `myshops.com`
   and a wildcard `*.myshops.com` record, both pointing at the EC2 instance's
   Elastic IP. (Every new shop subdomain therefore works immediately with zero
   per-shop DNS changes — required since any shop owner can self-serve subscribe.)
6. **SES (prod only)** — local dev never touches SES; it sends mail via Mailhog
   instead (see docker-compose.yml), so no AWS mail setup is needed to develop
   locally:
   - **Verify a sender identity** for `MAIL_FROM` (e.g. verify the whole
     `myshops.com` domain via SES domain verification + DKIM, or at minimum verify
     `no-reply@myshops.com` as a single email identity). SES refuses to send from
     an unverified "from" address.
   - **Request production access** (move the account out of the SES sandbox) via
     the SES console/support case — sandbox mode only allows sending to addresses
     you've also individually verified, which would block real customers/owners
     from ever receiving email.
   - Pick the AWS region for SES (`AWS_SES_REGION`); SES isn't available in every
     region, so this can legitimately differ from `AWS_REGION` (used for S3).
   - If a separate staging environment is ever added before prod, verify a
     distinct sender identity for it too (e.g. `no-reply@staging.myshops.com`) so
     test sends are never confused with real production mail in SES's sending
     stats/reputation.
7. **IAM role for the EC2 instance**: permissions for `ecr:GetDownloadUrlForLayer`,
   `ecr:BatchGetImage`, `ecr:GetAuthorizationToken`, `route53:ChangeResourceRecordSets`
   /`route53:ListHostedZones` scoped to the `myshops.com` zone (needed for the
   Let's Encrypt wildcard cert's DNS-01 challenge - a wildcard cert cannot use the
   simpler HTTP-01 challenge), plus `ses:SendEmail`/`ses:SendRawEmail` scoped to the
   verified identity from step 6 (the backend calls SES directly via the AWS SDK,
   not SMTP, so no separate SES SMTP credentials need to be generated/rotated).
8. **EC2**: t3.small, Amazon Linux 2023, security group allowing inbound 80/443 from
   the internet and 22 from your admin IP only. Attach the IAM role from step 7.
   Allocate and associate an Elastic IP.

## 2. First-time instance setup

```bash
ssh ec2-user@<elastic-ip>
curl -O https://raw.githubusercontent.com/<org>/<repo>/main/infra/ec2-bootstrap.sh
chmod +x ec2-bootstrap.sh && ./ec2-bootstrap.sh
```

Then create `/opt/shopplatform/.env` (never commit this file) with:

```
ECR_REGISTRY=<account-id>.dkr.ecr.<region>.amazonaws.com
IMAGE_TAG=latest
DB_HOST=<rds-endpoint>
DB_USER=shopplatform
DB_PASSWORD=<rds-password>
APP_ROOT_DOMAIN=myshops.com
JWT_SECRET=<32+ byte random secret>
# Mail is sent via AWS SES (SDK, not SMTP) - MAIL_FROM must be a verified SES
# identity; the EC2 instance role must have ses:SendEmail for it.
MAIL_FROM=no-reply@myshops.com
AWS_SES_REGION=ap-south-1
FRONTEND_BASE_URL=https://myshops.com
AWS_S3_BUCKET=online-shop-platform-prod-<account-id>-ap-south-1
AWS_S3_PUBLIC_BASE_URL=https://<cloudfront-domain-or-bucket-regional-endpoint>
AWS_REGION=ap-south-1
RAZORPAY_KEY_ID=<live key>
RAZORPAY_KEY_SECRET=<live secret>
NEXT_PUBLIC_API_BASE_URL=https://myshops.com
```

Obtain the wildcard TLS cert (one-time, then auto-renewed by the `certbot` service):

```bash
cd /opt/shopplatform
docker compose -f docker-compose.prod.yml run --rm certbot \
  certbot certonly --dns-route53 -d myshops.com -d '*.myshops.com' \
  -m admin@myshops.com --agree-tos --non-interactive
docker compose -f docker-compose.prod.yml --env-file .env up -d
```

## 3. GitHub repo configuration (for `deploy.yml`)

Add these **repository secrets**:

| Secret | Purpose |
|---|---|
| `AWS_REGION` | e.g. `ap-south-1` |
| `ECR_REGISTRY` | `<account-id>.dkr.ecr.<region>.amazonaws.com` |
| `AWS_DEPLOY_ROLE_ARN` | IAM role GitHub Actions assumes via OIDC to push to ECR |
| `EC2_HOST` | Elastic IP / DNS name of the EC2 instance |
| `EC2_SSH_USER` | `ec2-user` |
| `EC2_SSH_PRIVATE_KEY` | private half of a deploy-only SSH key, public half in `~/.ssh/authorized_keys` on the instance |

Every push to `main` then: runs CI (backend `mvnw verify`, frontend lint+build) ->
builds & pushes both images to ECR tagged with the short commit SHA and `latest` ->
copies the latest `docker-compose.prod.yml`/`nginx.conf` to the instance -> pulls the
new images and does a `docker compose up -d` (brief rolling restart; no downtime
window is configured for this is a single-instance MVP setup, acceptable until
traffic justifies ALB + multiple instances/ASG).

## 4. Scaling beyond the MVP (not built now, noted for later)

- Move Postgres connection pooling/read replicas if a shop's traffic grows.
- Swap the single EC2 + nginx for an ALB + ECS/EC2 Auto Scaling Group once more
  than one instance is needed; the Docker images and `TenantResolutionFilter`
  subdomain design need no changes to support that.
- CloudFront can also front the Next.js frontend itself (not just S3 media) for
  faster global static asset delivery.
