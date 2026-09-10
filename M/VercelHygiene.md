# Vercel Deployment Hygiene

Use this guide when a GitHub repository connected to Vercel creates excessive deployments, build-cache usage, deployment storage, or unnecessary preview builds.

The goal is:

> Work freely on development, QA, render, temporary, and feature branches without creating Vercel deployments. Deploy to Vercel only when a deliberate production release reaches `main`.

## Desired deployment model

```text
dev / render / QA / feature / tmp branches
        ↓
GitHub commits + GitHub Actions tests
        ↓
0 Vercel deployments

main
        ↓
deliberate release
        ↓
1 Vercel production deployment
```

Do not use Vercel Preview Deployments as the default testing environment when GitHub Actions, local builds, GitHub Pages, or another existing test environment can perform the required QA.

---

# 1. Audit before changing anything

First identify:

- Vercel project
- connected GitHub repository
- production branch
- current `main` SHA
- current development / render / QA branch SHAs
- recent Vercel deployments
- which Git branch caused each deployment
- whether deployments are Production or Preview

Inspect at least the most recent 20–40 deployments.

Look especially for patterns such as:

```text
feature commit
feature commit
small CSS fix
QA fix
test adjustment
temporary branch commit
another small fix
```

where every commit creates another Preview Deployment.

A very high Preview-to-Production ratio is usually a strong sign of unnecessary deployment churn.

Example:

```text
40 recent deployments
38 Preview
2 Production
```

This is usually unnecessary for repositories where branch testing already happens elsewhere.

---

# 2. Inspect build-cache size

Check the Vercel build log of one representative Preview Deployment.

Look near the end for output similar to:

```text
Creating build cache...
Uploading build cache [136.21 MB]
Build cache uploaded
```

This number is important.

Even if the repository itself is small, frequent deployments can repeatedly create or upload a large build cache.

For example:

```text
136 MB × 40 builds ≈ 5.4 GB of build-cache churn
```

Do not assume this multiplication equals exact billable storage.

Use it only as an order-of-magnitude explanation for why a project can show unexpectedly high Vercel usage.

---

# 3. Check repository size

Determine whether the problem is:

## A. Many deployments

Example:

```text
Repo size: 2–5 MB
Build cache: 100+ MB
Hundreds of preview deployments
```

Primary fix:

> Stop unnecessary deployments.

## B. Large deployment snapshots

Example:

```text
Repo size: 180 MB
Large source images: 150+ MB
Hundreds of deployments
```

Primary fixes:

> Stop unnecessary deployments AND exclude source-only files from Vercel.

---

# 4. Allow only `main` to deploy

Preferred `vercel.json` configuration:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "git": {
    "deploymentEnabled": {
      "*": false,
      "main": true
    }
  }
}
```

Meaning:

```text
main            → deploy
dev             → no deploy
render          → no deploy
feature-*       → no deploy
tmp-*           → no deploy
QA branches     → no deploy
future branches → no deploy
```

This is safer than maintaining a growing blacklist such as:

```json
{
  "dev": false,
  "render": false,
  "templateFIX": false
}
```

because every new unspecified branch may otherwise create Preview Deployments.

The preferred rule is therefore:

> deny all branches by default, explicitly allow `main`.

---

# 5. Do not rush the rule onto `main`

If production is currently stable and active development is happening elsewhere, do not create a production deployment purely to install this hygiene change.

Instead:

1. add the hygiene configuration to the active development / release branch;
2. continue normal development;
3. include the configuration in the next legitimate `dev → main` release.

This avoids creating an extra Production Deployment just for deployment cleanup.

---

# 6. Use `.vercelignore` for source-only files

If the repository contains files that Vercel does not need to build or serve the application, add a `.vercelignore`.

Typical candidates:

```text
.github/
e2e/
tests/
large-source-assets/
raw-images/
design-source/
```

Only ignore directories after confirming that production does not need them.

Example:

```text
# Large source images.
# Runtime uses optimized WebP versions elsewhere.
assets/hq/

# GitHub Actions definitions are not application runtime files.
.github/

# Browser tests run in CI, not on Vercel.
e2e/
```

Do NOT blindly ignore file extensions such as:

```text
*.md
*.docx
*.py
```

because some repositories intentionally expose or generate files from them.

Inspect actual runtime dependencies first.

---

# 7. Audit GitHub Actions

Vercel deployment cleanup is incomplete if GitHub Actions repeatedly commits generated files back to `main`.

Check every workflow for:

```text
git commit
git push
contents: write
```

Especially inspect workflows that generate:

- PDFs
- DOCX files
- favicons
- manifests
- screenshots
- generated HTML
- indexes
- compiled assets

Dangerous pattern:

```text
main commit
↓
Vercel Production Deployment #1
↓
GitHub Action generates file
↓
bot commits generated file to main
↓
Vercel Production Deployment #2
```

Preferred pattern:

```text
dev commit
↓
GitHub Action generates file
↓
bot commits generated file back to dev
↓
0 Vercel deployments

later:

dev → main
↓
1 Production Deployment
```

Read-only smoke-test workflows on `main` are fine.

For example:

```yaml
permissions:
  contents: read
```

A workflow that only:

- installs dependencies;
- builds;
- starts the app locally;
- runs Playwright;
- uploads test artifacts;

does not itself cause a second Vercel deployment.

---

# 8. Keep smoke tests separate from Vercel

Preferred QA workflow:

```text
commit to dev/render
↓
GitHub Actions
↓
build locally inside CI
↓
Playwright / unit / regression / PDF smoke
↓
artifact or result
↓
0 Vercel Preview deployments
```

Smoke tests do not require Vercel unless they specifically need to verify the deployed production environment.

This is especially important for repositories with expensive browser/PDF QA.

---

# 9. Audit expensive QA workflows

Look for workflows that run large jobs on every minor commit.

Examples:

- dozens of generated PDFs;
- many Playwright shards;
- screenshot galleries;
- browser matrices;
- multiple full production builds.

These may not cost Vercel storage, but they can consume significant GitHub Actions resources.

For expensive QA, prefer:

```yaml
on:
  workflow_dispatch:
```

or run automatically only at meaningful release checkpoints.

For example, instead of:

```yaml
push:
  branches:
    - qa-visual
```

consider:

```yaml
workflow_dispatch:
```

while keeping an automatic final gate on `main` if desired.

---

# 10. Verify after the change

Record the timestamp or ID of the latest existing Vercel deployment.

Make one or more commits to a protected development / QA branch.

Then query Vercel for deployments created after the recorded deployment.

Expected result:

```text
0 new deployments
```

Do not consider the cleanup complete until this has been verified against the actual Vercel deployment history.

---

# 11. Verify the next production release

When the development branch is genuinely ready:

```text
dev
↓
main
```

After the merge:

1. verify exactly one new Production Deployment exists;
2. verify its Git commit SHA matches the intended `main` release;
3. wait for GitHub Actions to finish;
4. fetch `main` again;
5. confirm no workflow generated another commit;
6. query Vercel again;
7. confirm there was no second unintended Production Deployment.

Ideal result:

```text
development commits: many
Vercel deployments during development: 0

release commits to main: 1
Production deployments: 1
```

---

# 12. Avoid unnecessary cleanup operations

Do not immediately:

- rewrite Git history;
- delete branches;
- delete production deployments;
- remove build caches;
- move assets to another repository;
- disable all Git integration.

First stop the source of new churn.

Historical cleanup can be considered afterward if current storage usage remains problematic.

Stopping future waste is usually the highest-value first step.

---

# Quick diagnosis

## Many Preview Deployments?

Fix:

```json
"deploymentEnabled": {
  "*": false,
  "main": true
}
```

## Large source-only files?

Add:

```text
.vercelignore
```

## Bot commits to main?

Move generation/writeback to `dev`.

## Smoke tests need previews?

Usually no.

Run the application inside GitHub Actions and test there.

## Huge QA workflow on every commit?

Make it manual or checkpoint-based.

---

# Definition of Done

Vercel deployment hygiene is complete when:

- arbitrary development commits create zero Vercel deployments;
- temporary branches create zero Vercel deployments;
- smoke tests can run without Vercel;
- generated-file workflows do not create follow-up commits on `main`;
- source-only heavy files are excluded where appropriate;
- a deliberate production release creates exactly one Vercel deployment;
- production remains functional after the change.

The target workflow is:

```text
WORK MANY TIMES
      ↓
TEST MANY TIMES
      ↓
DEPLOY ONCE
```
