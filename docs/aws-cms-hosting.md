# Host the CMS on AWS (`rrcliving.com`)

CodeBuild only **builds** the app. To serve `https://cms.rrcliving.com` (or another hostname under your public zone **`rrcliving.com`**), run the **container** this repo ships and point **Route 53** at the load balancer in front of it.

## 1. Image

- This app uses Next **`output: 'standalone'`** (see `next.config.ts`).
- Build a production image locally or in CI:

```bash
cd romainRetreatCMS
docker build -t romain-retreat-cms:latest .
```

Push the tag to **ECR** (or the registry your ECS/App Runner service uses).

## 2. Runtime (typical: ECS Fargate + ALB)

1. **VPC** — private subnets for tasks; public subnets for an **Internet-facing ALB** (or internal ALB + CloudFront, if you prefer).
2. **Target group** — type **IP**, protocol **HTTP**, port **3000**, health check path **`/`** or **`/api/graphql`** (adjust if your health check needs a dedicated route).
3. **ECS service** — task definition with the image above, **port mapping 3000**, CPU/memory sized for Next + Payload (start e.g. 1 vCPU / 2 GiB and tune).
4. **ALB listener** — **HTTPS :443** with an **ACM certificate** for `cms.rrcliving.com` (must be in **us-east-1** if this ALB is in that region). Forward to the target group. Optionally redirect HTTP → HTTPS on :80.
5. **Secrets / env** — inject at least `DATABASE_URL`, `PAYLOAD_SECRET`, `PREVIEW_SECRET`, `NEXT_PUBLIC_SERVER_URL`, `PAYLOAD_SERVER_URL`, `ROMAIN_RETREAT_SERVER_URL`, `ROMAIN_RETREAT_SERVER_GRAPHQL_PATH`, and S3 variables (or use a task **execution role** + **task role** for S3 instead of static keys). Match names in [`.env.example`](../.env.example).

## 3. Route 53

In hosted zone **`rrcliving.com`**:

- **Record name:** `cms`
- **Type:** **A** (or AAAA)
- **Alias:** **on** → **Application Load Balancer** → region **`us-east-1`** → select the **ALB that fronts the CMS** (not the federated GraphQL router ALB unless you intentionally share one ALB with host-based rules).

## 4. CI vs CD

- Today’s **CodePipeline / CodeBuild** job validates **`yarn build`**. Shipping to ECS is a separate step: **CodePipeline deploy action**, **EventBridge → ECS deployment**, **GitHub Actions → ECR push → ECS**, or **manual** `docker push` + service update.

## 5. Domain note

Examples use **`cms.rrcliving.com`**. If your public zone or brand spelling differs, replace the hostname in **`.env.production`**, **ACM**, and **Route 53** consistently.
