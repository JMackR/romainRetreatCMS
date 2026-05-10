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

## 4. Wire CodePipeline → ECR → ECS (CD)

You need: an **ECR repository**, an **ECS cluster + Fargate service** already running a first revision of your task definition (container name matches what you put in `imagedefinitions.json`), and an **IAM role for CodeBuild** that can talk to ECR + ECS.

### 4a. One-time AWS setup

1. **ECR** — Create a repository (e.g. `romain-retreat-cms`). Note the URI:  
   `ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com/romain-retreat-cms`.
2. **ECS** — Cluster, Fargate task definition (container **name** e.g. `cms`, port **3000**, image pointing at the ECR URI — initial tag can be `latest` from a manual first push), service attached to your **ALB** target group.
3. **CodeBuild (deploy project)** — Same VPC as ECS if you use VPC endpoints; otherwise public subnets + NAT for ECR/API calls. Under **Environment**:
   - **Privileged** = **true** (required for `docker build` / `docker push` on the Docker executor).
   - **Image** = `aws/codebuild/amazonlinux2-x86_64-standard:5.0` (or another image that has the Docker daemon available when privileged).
4. **IAM (CodeBuild service role)** — Attach inline or managed policy allowing at least:
   - `ecr:GetAuthorizationToken`, `ecr:BatchCheckLayerAvailability`, `ecr:GetDownloadUrlForLayer`, `ecr:BatchGetImage`, `ecr:PutImage`, `ecr:InitiateLayerUpload`, `ecr:UploadLayerPart`, `ecr:CompleteLayerUpload`
   - `ecs:DescribeServices`, `ecs:DescribeTaskDefinition`, `ecs:RegisterTaskDefinition`, `ecs:UpdateService` (and often `iam:PassRole` for the task **execution** role and **task** role ARNs used by the service)

### 4b. CodePipeline layout (recommended)

Keep your existing **Source → Build** stage that runs **`yarn build`** (fast feedback). Add a second stage, e.g. **Deploy**:

| Order | Action type | Purpose |
|------|-------------|---------|
| 1 | **Source** | Unchanged (GitHub zip). |
| 2 | **Build** (existing) | `yarn build` — optional if you trust Docker-only below. |
| 3 | **Build** (new project) | `docker build` → `docker push` → write **`imagedefinitions.json`**. |
| 4 | **Deploy** → **Amazon ECS (Standard)** | Uses the **Build** output artifact; set **Cluster name**, **Service name**, **Input artifacts** = that build output. Default image spec file: **`imagedefinitions.json`** at artifact root. |

The **ECS** deploy action expects a JSON file listing **container name** (must match the task definition) and **imageUri** after push:

```json
[{"name":"cms","imageUri":"123456789012.dkr.ecr.us-east-1.amazonaws.com/romain-retreat-cms:abc123"}]
```

Use a **unique tag per commit** (e.g. `CODEBUILD_RESOLVED_SOURCE_VERSION` or short git SHA) so ECS always pulls new bits.

### 4c. Example `buildspec` for the Docker CodeBuild project

Set **Environment variables** on the project (or SSM): `AWS_ACCOUNT_ID`, `AWS_DEFAULT_REGION`, `IMAGE_REPO_NAME` (ECR repo name). Turn on **Privileged**.

```yaml
version: 0.2
phases:
  pre_build:
    commands:
      - aws ecr get-login-password --region "$AWS_DEFAULT_REGION" | docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_DEFAULT_REGION}.amazonaws.com"
      - export IMAGE_TAG="${CODEBUILD_RESOLVED_SOURCE_VERSION}"
      - export IMAGE_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_DEFAULT_REGION}.amazonaws.com/${IMAGE_REPO_NAME}:${IMAGE_TAG}"
  build:
    commands:
      - docker build --build-arg "NEXT_PUBLIC_SERVER_URL=$NEXT_PUBLIC_SERVER_URL" --build-arg "PAYLOAD_SERVER_URL=$PAYLOAD_SERVER_URL" -t "$IMAGE_URI" .
  post_build:
    commands:
      - docker push "$IMAGE_URI"
      - printf '[{"name":"cms","imageUri":"%s"}]' "$IMAGE_URI" > imagedefinitions.json
      - cat imagedefinitions.json
artifacts:
  files:
    - imagedefinitions.json
```

Replace **`cms`** with your task definition’s **container name**. Add `--build-arg` only if you bake public URLs into the client bundle at image build time; otherwise rely on **ECS task env** at runtime.

Official walkthrough (console details vary): [Tutorial: Continuous deployment with CodePipeline](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-cd-pipeline.html) (ECS + CodePipeline + CodeBuild + ECR).

### 4d. Manual deploy (no pipeline change)

From a machine with Docker + AWS CLI + network access:

```bash
export AWS_REGION=us-east-1
export ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export REPO=romain-retreat-cms
export TAG=$(git rev-parse --short HEAD)
aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
docker build -t "${REPO}:${TAG}" .
docker tag "${REPO}:${TAG}" "${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${REPO}:${TAG}"
docker push "${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${REPO}:${TAG}"
aws ecs update-service --cluster YOUR_CLUSTER --service YOUR_SERVICE --force-new-deployment --region "$AWS_REGION"
```

`--force-new-deployment` only helps if the service already points at a tag whose **digest** changed (e.g. you overwrote `:latest`). Prefer **immutable tags** + **register-task-definition** + **`update-service --task-definition`** for predictable releases (same as the CodePipeline ECS action does under the hood).

## 5. Add **Amazon ECS (Standard)** deploy action (`DockerImageDef`)

This wires the **DockerBuild** output (artifact **`DockerImageDef`**, file **`imagedefinitions.json`**) into your **ECS service** so each successful pipeline updates running tasks.

### 5a. Before you click anything

1. **ECS cluster** and **Fargate service** already exist, and the service is stable (even on a placeholder image).
2. **Task definition** has a container whose **name** exactly matches **`EcsContainerName`** / `buildspec.docker.yml` (default **`cms`**). That container is the one whose **image** line the deploy action replaces.
3. **Docker pipeline stage** has run at least once so you know **`DockerImageDef`** is produced (optional but good for debugging).

### 5b. IAM on the **CodePipeline service role** (required)

The pipeline role (Pipeline → **Settings** → **Service role**, or the role in your CloudFormation stack) must be allowed to call **ECS** and **`iam:PassRole`** for the **task execution role** and **task role** ARNs listed on your ECS task definition.

In **IAM** → that role → **Add permissions** → **Create inline policy** → **JSON** — start from this and **replace** `ACCOUNT_ID`, and the **PassRole** ARNs with your real task **execution** and **task** role ARNs (from the task definition JSON in ECS):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "EcsDeploy",
      "Effect": "Allow",
      "Action": [
        "ecs:DescribeServices",
        "ecs:DescribeTaskDefinition",
        "ecs:DescribeTasks",
        "ecs:ListTasks",
        "ecs:RegisterTaskDefinition",
        "ecs:UpdateService"
      ],
      "Resource": "*"
    },
    {
      "Sid": "PassTaskRoles",
      "Effect": "Allow",
      "Action": "iam:PassRole",
      "Resource": [
        "arn:aws:iam::ACCOUNT_ID:role/YOUR_ECS_TASK_EXECUTION_ROLE_NAME",
        "arn:aws:iam::ACCOUNT_ID:role/YOUR_ECS_TASK_ROLE_NAME_IF_ANY"
      ]
    }
  ]
}
```

If your task uses **only** the default execution role, you may have a **single** `PassRole` ARN. Save the policy.

### 5c. Console: add the deploy stage

1. Open **CodePipeline** → select your pipeline → **Edit**.
2. **+ Add stage** at the end (after **DockerBuild**). Name it **`Deploy`** (any name is fine).
3. Inside **Deploy** → **Add action group**.
4. Configure:
   - **Action name:** e.g. `DeployToEcs`
   - **Action provider:** **Amazon ECS (Standard)** (category **Deploy**).
   - **Input artifacts:** **`DockerImageDef`** — must match the **output artifact name** from the Docker CodeBuild action exactly.
   - **Cluster name:** your ECS cluster (dropdown or exact name).
   - **Service name:** your ECS service.
   - **Image definitions file** — leave default **`imagedefinitions.json`** (must match what **`buildspec.docker.yml`** writes at the **root** of `DockerImageDef`).
5. **Save** the pipeline (top right). **Release change** to test.

If the action fails, open the **Deploy** stage details: common issues are **wrong input artifact name**, **`imagedefinitions.json` missing**, **container `name` mismatch**, or **missing `iam:PassRole`**.

### 5d. What the ECS action does

It registers a **new task definition revision** with the **image URI** from `imagedefinitions.json` and calls **`UpdateService`** so ECS rolls out new tasks. **Route 53** does not change; it still points at the **same ALB** in front of this service.

## 6. Domain note

Examples use **`cms.rrcliving.com`**. If your public zone or brand spelling differs, replace the hostname in **`.env.production`**, **ACM**, and **Route 53** consistently.
