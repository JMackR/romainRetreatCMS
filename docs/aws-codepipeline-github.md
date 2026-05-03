# GitHub → AWS CodePipeline + CodeBuild

This project ships:

| File | Purpose |
|------|---------|
| [`buildspec.yml`](../buildspec.yml) | CodeBuild install + `yarn build` (supports CMS-at-root **or** `romainRetreatCMS/` monorepo folder). |
| [`aws/codepipeline-github.yaml`](../aws/codepipeline-github.yaml) | CloudFormation: S3 artifact bucket, **CodeStar Connection** (GitHub), CodeBuild project, CodePipeline (**Source → Build**). |
| [`Dockerfile`](../Dockerfile) | Production container (`next build` **standalone**) for ECS / App Runner / EC2. |
| [`aws-cms-hosting.md`](./aws-cms-hosting.md) | ALB + Route 53 + ECS outline for **`cms.rrcliving.com`**. |

The pipeline **only runs CI** (verify the Next.js app builds). It does **not** deploy the container by default — add a **Deploy** stage (ECR push + ECS) or run [`aws-cms-hosting.md`](./aws-cms-hosting.md) manually.

## 1. Prerequisites

- AWS CLI configured (`aws configure` or SSO).
- GitHub repo containing either:
  - **This CMS app at the repository root** (`package.json` next to `buildspec.yml`), or
  - A **monorepo** with a `romainRetreatCMS/` directory (same layout as this workspace).

## 2. Deploy the CloudFormation stack

From your machine (replace owner/repo/region as needed):

```bash
cd romainRetreatCMS

aws cloudformation deploy \
  --region us-east-1 \
  --stack-name romain-retreat-cms-pipeline \
  --template-file aws/codepipeline-github.yaml \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides \
    GitHubOwner=YOUR_GITHUB_USER_OR_ORG \
    GitHubRepo=YOUR_REPO_NAME \
    BranchName=main \
    BuildSpecRelativePath=buildspec.yml
```

**Monorepo:** keep `BuildSpecRelativePath=buildspec.yml` only if that file lives at the **GitHub repo root**. If you keep `buildspec.yml` only under `romainRetreatCMS/` in Git, set:

`BuildSpecRelativePath=romainRetreatCMS/buildspec.yml`

Stack outputs print `GitHubConnectionArn` and a console link to the pipeline.

**CloudFormation vs console “No artifacts”:** This template sets CodeBuild artifacts to **CodePipeline** and defines **`BuildOutput`**. The repo root **`buildspec.yml`** defaults to **no `artifacts:`** so it matches starter projects with **No artifacts**. After you deploy this stack, append something like the following after the `build` phase (and push), or validation/build will fail:

```yaml
artifacts:
  files:
    - "**/*"
  exclude-paths:
    - node_modules/**/*
    - romainRetreatCMS/node_modules/**/*
```

## 3. Authorize GitHub (required once)

1. AWS Console → **Developer Tools** → **Settings** → **Connections** (or search **CodeStar connections**).
2. Open the connection created by the stack (name like `romain-retreat-cms-pipeline-github`).
3. Click **Update pending connection** / **Complete connection** and finish the GitHub OAuth/install app flow.
4. Status must become **Available**.

Until this is done, the pipeline **Source** stage will fail.

## 4. Commit files to GitHub

Ensure the branch you configured (`main` by default) contains:

- `buildspec.yml` at the path referenced by `BuildSpecRelativePath`.
- `package.json`, `yarn.lock`, and the rest of the CMS tree.

Push to `main` → CodePipeline starts automatically (or open the pipeline in the console and click **Release change**).

## 5. CodeBuild environment variables (Next.js / Payload)

`next build` often needs the same variables as production for inlined `NEXT_PUBLIC_*` and sometimes for Payload during build. In the console:

**CodeBuild** → project `…-next-build` → **Edit** → **Environment** → **Additional configuration** → **Environment variables**

Mirror the important keys from [`.env.example`](../.env.example) (`DATABASE_URL`, `PAYLOAD_SECRET`, `PREVIEW_SECRET`, `ROMAIN_RETREAT_SERVER_*`, S3, etc.). For secrets, prefer **Secrets Manager** or **Parameter Store** and grant the CodeBuild role `secretsmanager:GetSecretValue` / `ssm:GetParameters`.

To codify variables in Git, extend `aws/codepipeline-github.yaml` `CodeBuildProject` → `Environment` → `EnvironmentVariables` (do **not** commit real secrets; use dynamic refs or SSM).

## 6. Cost notes

- **CodeBuild** bills per build minute (`BUILD_GENERAL1_SMALL` in the template).
- **CodePipeline** has a small per-pipeline monthly charge plus pipeline executions.
- **S3** stores pipeline artifacts (lifecycle rules optional).

This is often cheaper than keeping a **24/7** server only to run builds; it does **not** include hosting the running site — add a deploy stage or use Amplify/ECS/Lightsail separately.

## 7. Optional next steps

- **Deploy stage:** ECR + ECS, AWS App Runner, Elastic Beanstalk, or CodeDeploy to EC2.
- **Tests:** add `yarn lint` / `yarn test` under `buildspec.yml` `phases.build.commands` before `yarn build`.
- **Cache:** switch CodeBuild cache to `S3` for `node_modules` if builds are slow (adjust IAM).

## 8. Troubleshooting

### `@tailwindcss/oxide` — “Cannot find native binding” / `next/font` + Geist fails on CodeBuild

Tailwind v4 loads a **platform-specific** optional package (on Linux x86_64 CodeBuild: `@tailwindcss/oxide-linux-x64-gnu`). Some **`npm`** installs omit optional dependencies ([npm/cli#4828](https://github.com/npm/cli/issues/4828)).

**Fixes:**

1. Point your CodeBuild project at this repo’s **`buildspec.yml`** (uses **yarn** + an explicit fallback `npm install` of the Linux oxide package if it’s missing).
2. `package.json` declares **`optionalDependencies`** `@tailwindcss/oxide-linux-x64-gnu` so npm/yarn both know to pull it on Linux.
3. If you keep **`npm ci`** (e.g. CodePipeline starter template), run **`npm ci --include=optional`** instead of plain `npm ci`, **or** delete `node_modules` and run **`npm install`** once without `--omit=optional`.

Avoid committing **both** `yarn.lock` and `package-lock.json` out of sync; pick **yarn** (this repo) or npm and align CI.

### AWS starter pipeline (`SimpleNodeJSBuildProject`, etc.)

Those templates often default to **npm** and a minimal install. Either switch **Install commands** to **`yarn install --frozen-lockfile`** (after `corepack enable`) or apply the optional-deps fixes above.

### “Invalid input: buildspec must be a valid YAML file” (artifact type vs `artifacts:`)

AWS validates the **whole** buildspec against your CodeBuild project settings. The console often labels failures as “YAML” even when the real issue is **artifacts**.

| CodeBuild primary artifacts | Pipeline build action output artifact(s) | `buildspec.yml` |
|------------------------------|------------------------------------------|-----------------|
| **No artifacts** | None | **Do not** declare an **`artifacts:`** block. |
| **CodePipeline** or **Amazon S3** | Usually one or more (e.g. `BuildOutput`) | **Must** declare **`artifacts:`** (see repo `buildspec.yml`). |

The repo root [`buildspec.yml`](../buildspec.yml) omits **`artifacts:`** so it matches CodeBuild **No artifacts** (typical for CI-only). If you switch the project to **CodePipeline** or **S3** artifacts (or add a pipeline output artifact), add an **`artifacts:`** block again — see the YAML snippet in [§2](#2-deploy-the-cloudformation-stack).

Also confirm **Buildspec name** matches Git (e.g. `buildspec.yml` vs `romainRetreatCMS/buildspec.yml`) and you are not pasting a fragment into **Buildspec override** in the pipeline action.

### “Invalid YAML” when clicking **Update project** (`SimpleNodeJSBuildProject-…`, CodePipeline Node starter)

The official **CodePipeline → CI Node.js** CloudFormation starter ([`ci-build-nodejs.yaml`](https://github.com/aws/codepipeline-starter-templates/blob/main/templates/cloudformation/ci-build-nodejs.yaml)) defines CodeBuild as:

- **`Source` type: `NO_SOURCE`** (“No source” in the console)
- **`BuildSpec`:** inline YAML (default `npm install` / `npm run build --if-present` / `npm test`), **not** your repo file

With **`NO_SOURCE`**, the project **must** carry a valid **inline** buildspec in AWS. If you switch the editor to **Use a buildspec file** / `buildspec.yml` while the source type is still **No source**, the console often rejects **Update project** with **“buildspec must be a valid YAML file”** — even though `buildspec.yml` in Git is fine. Your GitHub file is **ignored** until the project is wired to use the pipeline artifact + a file buildspec.

**Why “CodePipeline” is not in the Source dropdown:** The console only lists **No source**, **GitHub**, **S3**, **CodeCommit**, etc. **`CODEPIPELINE` is a valid API source type** but it usually **does not appear** when you edit the project from the CodeBuild console alone ([AWS docs](https://docs.aws.amazon.com/codepipeline/latest/userguide/action-reference-CodeBuild.html)). Starter stacks still wire the pipeline to your project correctly; you fix the buildspec separately.

**Fix A — stay on “No source”, use inline YAML (console only)**  

1. **Source** → leave **No source**.  
2. **Buildspec** → open the editor that accepts **full buildspec YAML** (multi-phase `version` / `phases` / …), **not** the single-line “build commands only” helper if your UI offers both.  
3. Paste the **entire** contents of your repo [`buildspec.yml`](../buildspec.yml).  
4. **Update project**.

You maintain the same YAML in the console or in the stack parameter **`CICodeBuildSpec`** — Git-only `buildspec.yml` is ignored until you use Fix B.

**Fix B — keep using the repo file (`buildspec.yml`): use the CLI**

Point the project at the pipeline artifact and the filename checked in to Git (paths are relative to the **unzipped pipeline source artifact**):

```bash
aws codebuild update-project \
  --region us-east-1 \
  --name SimpleNodeJSBuildProject-0affd3e282db \
  --source type=CODEPIPELINE,buildspec=buildspec.yml \
  --artifacts type=CODEPIPELINE
```

AWS requires **both** `source` and `artifacts` type **`CODEPIPELINE`** when switching off the starter’s **NO_SOURCE** / **NO_ARTIFACTS** pair; otherwise `UpdateProject` returns `InvalidInputException`.

Replace **region** and **project name**. Omit `buildspec=` to default to `buildspec.yml`. After this, the repo [`buildspec.yml`](../buildspec.yml) must include an **`artifacts:`** block (included in this repo when using **CODEPIPELINE** artifacts).

Do **not** use **No source** + **Use a buildspec file** in the console only — that combination often triggers **“buildspec must be a valid YAML file”** on **Update project**.

### Logs still say `npm run build --if-present`

The starter **inline** buildspec is still active. Apply **Fix A** or **Fix B** above so the project runs **yarn** from your YAML instead of the default npm commands.

This repo is **Yarn 1** (`yarn.lock` only — **do not** rely on `package-lock.json`). `package.json` sets `"packageManager": "yarn@1.22.22"` for tooling that respects Corepack.
