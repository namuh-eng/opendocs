# OpenDocs production deployment

Target: `https://opendocs.namuh.co`  
Runtime: ECS Fargate + ALB + ECR + RDS Postgres + S3 + ACM  
Region: `us-east-1`  
AWS account: `699486076867`

## Current deployed resources

- ECS cluster: `opendocs`
- ECS service: `opendocs`
- Task definition family: `opendocs`
- ECR repository: `699486076867.dkr.ecr.us-east-1.amazonaws.com/opendocs`
- Current image tag: `c4c9167`
- ALB: `opendocs-alb`
- ALB DNS: `opendocs-alb-1587657213.us-east-1.elb.amazonaws.com`
- Target group: `opendocs-tg`
- Health path: `/api/health`
- RDS instance: `opendocs-db`
- S3 bucket: `opendocs-assets-699486076867`
- Secrets Manager names:
  - `opendocs/db-password`
  - `opendocs/database-url`
  - `opendocs/better-auth-secret`

Secret values must never be committed, printed, or pasted into chat.

## Deployment status as of 2026-04-29

The ECS service is running and the ALB target is healthy over HTTP.

Verified health response through the ALB:

```json
{
  "status": "ok",
  "version": "c4c9167",
  "checks": {
    "database": "connected",
    "storage": "available"
  }
}
```

Public `https://opendocs.namuh.co` is not live yet because DNS/ACM validation must be created in the authoritative Cloudflare zone for `namuh.co`.

## DNS / certificate blocker

`namuh.co` is Cloudflare-authoritative:

- `aryanna.ns.cloudflare.com`
- `chip.ns.cloudflare.com`

The AWS account has an ACM certificate request for `opendocs.namuh.co`, currently pending DNS validation.

Create this Cloudflare DNS validation record:

```txt
Type: CNAME
Name: _9412e417c17dee449d9560a7f4c53fbe.opendocs
Target: _5f8079670a7e3350cdfb2c5777c8c063.jkddzztszm.acm-validations.aws
Proxy: DNS only
```

Then create the production app DNS record:

```txt
Type: CNAME
Name: opendocs
Target: opendocs-alb-1587657213.us-east-1.elb.amazonaws.com
Proxy: DNS only initially
```

After ACM validates, add an HTTPS listener on the ALB with the issued certificate and optionally redirect HTTP to HTTPS.

## Reusable deployment notes

- Use a temporary Docker config for ECR login on macOS to avoid Keychain credential-helper failures:

```bash
export DOCKER_CONFIG=$(mktemp -d)
aws ecr get-login-password --region us-east-1 \
  | docker --config "$DOCKER_CONFIG" login \
      --username AWS \
      --password-stdin 699486076867.dkr.ecr.us-east-1.amazonaws.com
```

- This repo does not currently have generated Drizzle migration files in `./drizzle`; `npm run db:migrate` failed without useful detail. For the initial production database, `npm run db:push -- --force` applied the schema successfully. Future work should add proper migration artifacts before relying on `db:migrate` in production.
- The app can boot without Google OAuth credentials, but Better Auth logs a warning and Google login will not work until `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` are provided.
- Keep repo changes on agent branches with PRs into `staging`; deployment resource mutations are external operations and should be documented here without secrets.
