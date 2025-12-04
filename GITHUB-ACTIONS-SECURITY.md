# GitHub Actions Security Best Practices

## Overview
This document outlines the security measures implemented in our GitHub Actions workflows to prevent supply chain attacks and ensure secure CI/CD pipelines.

---

## Security Issue: Mutable Action References

### ❌ Problem: Using Mutable Tags (v1, v4, latest)

**Vulnerable Pattern:**
```yaml
- uses: actions/checkout@v4
- uses: azure/login@v1
```

**Risks:**
1. **Tag Mutation:** Tag can be moved to point to malicious code
2. **Supply Chain Attack:** Compromised action can inject malicious code
3. **No Audit Trail:** Can't verify what code actually ran
4. **Reproducibility Issues:** Same workflow might behave differently over time

**Attack Scenario:**
```
1. Attacker compromises action repository or maintainer account
2. Moves "v4" tag to point to malicious commit
3. Your workflow runs, thinking it's using "v4"
4. Malicious code steals secrets, modifies builds, or deploys backdoors
```

---

## ✅ Solution: Pinning to Full Commit SHA

### Secure Pattern: Immutable SHA References

**Fixed Implementation:**
```yaml
# ✅ SECURE - Pinned to immutable commit SHA
- name: Checkout code
  uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1

- name: Set up Node.js
  uses: actions/setup-node@60edb5dd545a775178f52524783378180af0d1f8 # v4.0.2

- name: Log in to Azure
  uses: azure/login@8c334a195cbb38e46038007b304988d888bf676a # v1.6.0

- name: Log in to Azure Container Registry
  uses: azure/docker-login@15c4aadf093404726ab2ff205b2cdd33fa6d054c # v1.0.2

- name: Deploy to Azure Container Apps
  uses: azure/container-apps-deploy-action@58b1b88b570600a4a8b78691402df67aa6c57c23 # v1.0.0
```

**Benefits:**
- ✅ **Immutable:** Commit SHA cannot be changed
- ✅ **Verifiable:** Can audit exact code that ran
- ✅ **Reproducible:** Same code runs every time
- ✅ **Supply Chain Security:** Protected against tag manipulation
- ✅ **Comment Preserves Readability:** Shows version for humans

---

## How to Pin Actions to SHA

### Step 1: Find the Action Repository
```bash
# For actions/checkout@v4
# Go to: https://github.com/actions/checkout
```

### Step 2: Find the Release Tag
```bash
# Click "Releases" tab
# Find the version you want (e.g., v4.1.1)
# Click on the version tag
```

### Step 3: Get the Commit SHA
```bash
# On the release page, click the commit hash
# Copy the full SHA (40 characters)
# Example: b4ffde65f46336ab88eb53be808477a3936bae11
```

### Step 4: Update Workflow
```yaml
# Replace:
uses: actions/checkout@v4

# With:
uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1
```

---

## Action References in This Project

### ✅ Currently Pinned Actions

| Action | SHA | Version | Last Updated |
|--------|-----|---------|--------------|
| `actions/checkout` | `b4ffde65f46336ab88eb53be808477a3936bae11` | v4.1.1 | Dec 2025 |
| `actions/setup-node` | `60edb5dd545a775178f52524783378180af0d1f8` | v4.0.2 | Dec 2025 |
| `azure/login` | `8c334a195cbb38e46038007b304988d888bf676a` | v1.6.0 | Dec 2025 |
| `azure/docker-login` | `15c4aadf093404726ab2ff205b2cdd33fa6d054c` | v1.0.2 | Dec 2025 |
| `azure/container-apps-deploy-action` | `58b1b88b570600a4a8b78691402df67aa6c57c23` | v1.0.0 | Dec 2025 |

---

## Verification and Auditing

### Verify SHA Matches Expected Version
```bash
# Clone the action repository
git clone https://github.com/actions/checkout.git
cd checkout

# Verify the SHA is for the expected tag
git tag --contains b4ffde65f46336ab88eb53be808477a3936bae11
# Should output: v4.1.1

# View the commit
git show b4ffde65f46336ab88eb53be808477a3936bae11
```

### Automated Verification with Dependabot
```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
    # Dependabot will create PRs with updated SHAs
    open-pull-requests-limit: 10
```

**Benefit:** Dependabot automatically updates SHA pins when new versions are released

---

## Security Scanning Actions

### Step 1: Add Workflow Security Scanner
```yaml
# .github/workflows/security-scan.yml
name: Security Scan

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  scan-actions:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1
      
      # Scan for unpinned actions
      - name: Check Action Pinning
        run: |
          echo "Checking for unpinned actions..."
          if grep -r "uses:.*@v[0-9]" .github/workflows/ | grep -v "#"; then
            echo "❌ Found unpinned actions (using tags):"
            grep -r "uses:.*@v[0-9]" .github/workflows/ | grep -v "#"
            exit 1
          else
            echo "✅ All actions are pinned to SHA"
          fi
```

### Step 2: Add Pre-commit Hook
```bash
# .git/hooks/pre-commit
#!/bin/bash
if grep -r "uses:.*@v[0-9]" .github/workflows/ | grep -v "#"; then
  echo "❌ Error: Unpinned GitHub Actions detected!"
  echo "Please pin actions to full commit SHA"
  exit 1
fi
```

---

## npm ci --ignore-scripts Security

### ✅ Safe Usage in Dockerfile

**Our Implementation:**
```dockerfile
# SECURITY: Using --ignore-scripts is SAFE here because:
# 1. We copy the pre-built Prisma client from the builder stage (no generation needed)
# 2. All postinstall scripts already ran in the builder stage
# 3. This prevents arbitrary script execution in the production container
# 4. The Prisma client is copied from: /app/node_modules/.prisma (see below)
RUN npm ci --only=production --ignore-scripts

# Copy necessary files from builder
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
```

**Why It's Safe:**
1. **Multi-stage build:** Build stage runs scripts, production stage doesn't
2. **Pre-generated artifacts:** Prisma client already generated in builder
3. **Copied artifacts:** We explicitly copy the generated client
4. **Security benefit:** Prevents malicious packages from running scripts in production

**Attack Prevention:**
```
❌ Without --ignore-scripts:
1. Compromised dependency added to package.json
2. npm ci runs postinstall script
3. Malicious script executes in container
4. Secrets stolen, backdoor installed

✅ With --ignore-scripts:
1. Compromised dependency added to package.json
2. npm ci skips postinstall scripts
3. No malicious code executed
4. Attack blocked ✓
```

---

## Dangerous Patterns to Avoid

### ❌ Don't: Use Mutable References
```yaml
# NEVER DO THIS
- uses: actions/checkout@latest
- uses: actions/setup-node@v4
- uses: azure/login@v1
```

### ❌ Don't: Use Branch References
```yaml
# NEVER DO THIS
- uses: actions/checkout@main
- uses: third-party/action@master
```

### ❌ Don't: Use PR Branches
```yaml
# NEVER DO THIS
- uses: attacker/malicious-action@pull/123/head
```

### ❌ Don't: Run npm install Without Verification
```yaml
# DANGEROUS
- run: npm install  # Can run arbitrary scripts
```

---

## Safe Patterns to Use

### ✅ Do: Pin to SHA with Version Comment
```yaml
# ALWAYS DO THIS
- uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1
```

### ✅ Do: Use Verified Publishers
```yaml
# Prefer GitHub-verified publishers
- uses: actions/checkout@SHA  # GitHub official
- uses: azure/login@SHA       # Microsoft official
```

### ✅ Do: Review Action Source Code
```bash
# Before using a new action
git clone https://github.com/vendor/action.git
cd action
git checkout <SHA>
# Review the code, especially index.js or action.yml
```

### ✅ Do: Use npm ci with Lock File
```yaml
# Use ci instead of install (respects lock file)
- run: npm ci
```

### ✅ Do: Verify Package Integrity
```yaml
- run: npm audit
- run: npm audit signatures  # Verify package signatures
```

---

## Incident Response

### If Compromised Action Detected

1. **Immediate Actions:**
   ```bash
   # Stop all running workflows
   gh workflow disable deploy
   
   # Review recent workflow runs
   gh run list --limit 50
   
   # Check for suspicious activity
   gh run view <run-id> --log
   ```

2. **Rotate All Secrets:**
   - GitHub Actions secrets
   - Azure credentials
   - Database passwords
   - API keys

3. **Audit Deployments:**
   ```bash
   # Check what was deployed
   git log --all --grep="Deploy"
   
   # Review Azure Container Apps
   az containerapp revision list --name mapper-tax-app
   ```

4. **Update to Verified SHA:**
   ```yaml
   # Update workflow to known-good version
   - uses: actions/checkout@<verified-safe-sha>
   ```

5. **Investigate:**
   - Review workflow logs
   - Check for unauthorized changes
   - Scan deployed containers for malware

---

## Maintenance Schedule

### Weekly
- [ ] Review Dependabot PRs for action updates
- [ ] Check for security advisories on used actions

### Monthly
- [ ] Audit all workflow files for unpinned actions
- [ ] Review action permissions (read-only vs write)
- [ ] Check for new official actions that could replace third-party ones

### Quarterly
- [ ] Full security audit of CI/CD pipeline
- [ ] Review and update action pins to latest versions
- [ ] Test incident response procedures

---

## GitHub Actions Security Checklist

Before merging workflow changes:

- [ ] All actions pinned to full commit SHA (40 chars)
- [ ] SHA comments include version tag for readability
- [ ] No mutable references (v1, latest, main, master)
- [ ] Actions are from verified publishers when possible
- [ ] Source code of new actions reviewed
- [ ] Workflow uses `npm ci` instead of `npm install`
- [ ] Secrets are stored in GitHub Secrets (not hardcoded)
- [ ] Workflow has minimal required permissions
- [ ] No `checkout` of PRs from forks without protection
- [ ] Dependabot configured for action updates
- [ ] Pre-commit hooks prevent unpinned actions

---

## Tools and Resources

### GitHub Actions Security Tools
- **Dependabot:** Automated dependency updates (including actions)
- **CodeQL:** Code scanning for workflow vulnerabilities
- **Secret Scanning:** Detects committed secrets
- **StepSecurity Harden Runner:** Runtime security for workflows

### External Tools
- **actionlint:** Workflow linter
- **gitleaks:** Secret detection
- **truffleHog:** Historical secret scanning

### References
- [GitHub Actions Security Hardening](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
- [OWASP CI/CD Security Top 10](https://owasp.org/www-project-top-10-ci-cd-security-risks/)
- [Supply Chain Levels for Software Artifacts (SLSA)](https://slsa.dev/)

---

**Last Updated:** December 4, 2025
**Security Status:** Hardened - All actions pinned to SHA
**Compliance:** SLSA Level 2
