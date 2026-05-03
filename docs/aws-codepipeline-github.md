# GitHub → AWS CodePipeline + CodeBuild

This project ships:

| File | Purpose |
|------|---------|
| [`buildspec.yml`](../buildspec.yml) | CodeBuild install + `yarn build` (supports CMS-at-root **or** `romainRetreatCMS/` monorepo folder). |
| [`aws/codepipeline-github.yaml`](../aws/codepipeline-github.yaml) | CloudFormation: S3 artifact bucket, **CodeStar Connection** (GitHub), CodeBuild project, CodePipeline (**Source → Build**). |

The pipeline **only runs CI** (verify the Next.js app builds). It does **not** deploy to ECS/EC2/Lambda by default — add a **Deploy** stage when you have a target.

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

### “Invalid input: buildspec must be a valid YAML file” with **Artifacts: No artifacts**

If the CodeBuild project primary artifact is **No artifacts**, the buildspec file **must not** contain an **`artifacts:`** section. AWS treats that mismatch as an invalid buildspec (the error message mentions YAML).

Either remove **`artifacts:`** from `buildspec.yml` (current default in this repo for starter-style projects), or change the project to **Artifacts type: Amazon S3** / **CodePipeline** and declare **`artifacts:`** again when the pipeline needs a build output.

### Logs still say `npm run build --if-present`

That means CodeBuild is **not using** the repo’s **`buildspec.yml`** (it’s using the starter “managed” commands).

1. Open **CodeBuild** → your project → **Edit** → **Buildspec**.
2. Choose **Use a buildspec file** (not “Insert build commands”).
3. **Buildspec name:** `buildspec.yml`  
   - Monorepo only: `romainRetreatCMS/buildspec.yml` (must match where the file lives **in Git** relative to repo root).
4. Save, then **release change** on the pipeline.

This repo is **Yarn 1** (`yarn.lock` only — **do not** rely on `package-lock.json`). `package.json` sets `"packageManager": "yarn@1.22.22"` for tooling that respects Corepack.
