# GitHub Actions Workflows

This document explains the CI/CD workflows for PodScope.

## Workflows Overview

### 1. CI Workflow (`ci.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches
- **Skips** if PR is in draft mode

**Jobs (run in parallel where possible):**

```
Setup Dependencies (installs npm packages once, caches for other jobs)
  ↓
├─ Lint (ESLint + Biome)
├─ Type Check (TypeScript)
├─ Build (Next.js build)
└─ E2E Tests (Playwright) - depends on Build
  ↓
CI Success (summary job - all must pass)
```

**Features:**
- ✅ Dependencies installed once, reused by all jobs
- ✅ Jobs run in parallel for speed
- ✅ Automatic cancellation of in-progress runs when new commits pushed
- ✅ Single "CI Success" status check for branch protection
- ✅ Build artifacts uploaded for debugging
- ✅ Playwright reports uploaded on failure

**Time Estimate:** ~5-10 minutes (depending on E2E test duration)

**Required for merge:** Yes - configure branch protection to require "CI Success" check

---

### 2. Release Workflow (`release.yml`)

**Triggers:**
- Git tag push matching `v*.*.*` pattern (e.g., `v0.1.1`)
- Manual workflow dispatch

**Jobs (sequential with dependency):**

```
Docker: Build & Push Docker Image
  ↓ (waits for Docker to complete)
Helm: Publish Helm Chart
  ↓
Release Success (summary job)
```

**Docker Job:**
- Builds multi-platform images (linux/amd64, linux/arm64)
- Pushes to `ghcr.io/kadajett/podscope`
- Tags created:
  - `0.1.1` (from tag v0.1.1)
  - `0.1` (major.minor)
  - `0` (major)
  - `sha-abc123` (git commit)
  - `latest` (if on main branch)
- Generates build attestation for supply chain security
- Uses GitHub Actions cache for faster builds

**Helm Job:**
- Waits for Docker job to complete successfully
- Updates Chart.yaml with version from git tag
- Packages Helm chart
- Pushes to `oci://ghcr.io/kadajett/podscope`

**Time Estimate:** ~10-15 minutes (Docker build is slowest)

**Outputs:**
- Docker image: `ghcr.io/kadajett/podscope:0.1.1`
- Helm chart: `oci://ghcr.io/kadajett/podscope:0.1.1`

---

## Complete Development Flow

### Making a Change

1. **Create a branch:**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make changes and commit:**
   ```bash
   git add .
   git commit -m "Add new feature"
   git push origin feature/my-feature
   ```

3. **Create Pull Request:**
   - Go to GitHub and create PR
   - CI workflow runs automatically
   - All checks must pass (Lint, TypeCheck, Build, E2E)

4. **Review and merge:**
   - Code review
   - CI must be green ✅
   - Merge to main

### Creating a Release

1. **Ensure main is stable:**
   - All CI checks passing on main
   - Ready to release

2. **Update version numbers:**
   ```bash
   # Update package.json
   npm version patch  # or minor, or major

   # Update charts/podscope/Chart.yaml
   # version: 0.1.2
   # appVersion: "0.1.2"

   git add package.json charts/podscope/Chart.yaml
   git commit -m "Bump version to 0.1.2"
   git push origin main
   ```

3. **Create and push tag:**
   ```bash
   git tag v0.1.2
   git push origin v0.1.2
   ```

4. **Release workflow runs:**
   - Docker image builds (~8-10 min)
   - Helm chart publishes (~1-2 min)
   - Check progress: https://github.com/Kadajett/PodScope/actions

5. **Make packages public (first time only):**
   - Go to: https://github.com/users/Kadajett/packages
   - Find `podscope` package
   - Settings → Change visibility to Public

6. **Release is live!**
   ```bash
   helm install podscope oci://ghcr.io/kadajett/podscope --version 0.1.2
   ```

---

## Troubleshooting

### CI Workflow Issues

**"Setup Dependencies" fails:**
- Check `package-lock.json` is committed
- Check npm registry is accessible

**"Lint" fails:**
- Run `npm run lint` locally
- Fix linting errors
- Run `npm run check:ci` for Biome checks

**"Type Check" fails:**
- Run `npm run type-check` locally
- Fix TypeScript errors

**"Build" fails:**
- Check environment variables in workflow
- Run `npm run build` locally

**"E2E Tests" fail:**
- Check Playwright reports artifact
- Run `npm run test:e2e` locally
- View screenshots in test-results artifact

### Release Workflow Issues

**"Docker" job fails:**
- Check Dockerfile syntax
- Verify Next.js build succeeds (check CI workflow)
- Check GitHub Container Registry permissions

**"Helm" job fails:**
- Check Chart.yaml syntax
- Verify version format matches tag
- Check OCI registry permissions

**Attestation fails:**
- Ensure `id-token: write` and `attestations: write` permissions are set
- This is already configured in the workflow

---

## Workflow Configuration

### Branch Protection Rules

Configure in GitHub Settings → Branches → Branch Protection Rules for `main`:

- ✅ Require status checks to pass before merging
- ✅ Require branches to be up to date before merging
- Status checks to require:
  - `CI Success`
- ✅ Require pull request reviews before merging (recommended)
- ✅ Dismiss stale pull request approvals when new commits are pushed

### Secrets and Variables

No secrets required! The workflows use:
- `GITHUB_TOKEN` - automatically provided by GitHub Actions
- Repository is public, so packages can be public

---

## Performance Optimizations

**CI Workflow:**
- Dependencies cached and reused (saves ~2-3 min)
- Jobs run in parallel (saves ~5 min vs sequential)
- Automatic cancellation of outdated runs

**Release Workflow:**
- Docker layer caching (saves ~50% on rebuilds)
- Multi-platform build in single job (efficient)
- Helm waits for Docker (ensures valid image reference)

**Future Optimizations:**
- Add unit tests (fast feedback)
- E2E tests could be optional on draft PRs
- Docker build could use smaller base images
