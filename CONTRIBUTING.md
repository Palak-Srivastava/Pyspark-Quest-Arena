# Contributing to Spark Quest Arena

Thank you for your interest in making Spark Quest Arena better! This document explains how to contribute code, questions, documentation, and bug reports.

---

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Project Structure](#project-structure)
4. [Ways to Contribute](#ways-to-contribute)
5. [Adding New PySpark Questions](#adding-new-pyspark-questions)
6. [Development Workflow](#development-workflow)
7. [Coding Guidelines](#coding-guidelines)
8. [Environment Variables](#environment-variables)
9. [Testing](#testing)
10. [Pull Request Process](#pull-request-process)
11. [Reporting Bugs](#reporting-bugs)
12. [Feature Requests](#feature-requests)

---

## Code of Conduct

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before contributing. We are committed to a welcoming, inclusive environment for everyone.

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- A Supabase project (PostgreSQL)
- Upstash Redis account (for rate limiting)

### Local Setup

1. **Fork and clone** the repository:
   ```bash
   git clone https://github.com/<your-username>/Pyspark-Quest-Arena.git
   cd Pyspark-Quest-Arena
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Copy the environment template and fill in your values:**
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your Supabase pooler URL, AUTH_SECRET, Redis tokens, etc.
   ```

4. **Apply the database schema** in your Supabase SQL Editor:
   ```
   supabase/schema.sql
   ```

5. **Start the dev server:**
   ```bash
   npm run dev
   ```

6. **Open** [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
src/
  app/              # Next.js App Router pages and API routes
    api/            # REST API handlers
    admin/          # Admin dashboard (owner-only)
  components/       # Reusable React components
  data/             # Static data — question bank, mock data
  lib/              # Core logic — db, auth, evaluation engine
supabase/
  schema.sql        # Full database schema
docker/
  spark-runner/     # Optional real-execution PySpark sandbox
```

---

## Ways to Contribute

| Area | Examples |
|---|---|
| 🐛 Bug fixes | Scoring bugs, rendering glitches, API errors |
| ✨ New features | UI improvements, better evaluator, new question types |
| 📚 New questions | PySpark problems with full metadata |
| 📝 Documentation | README, editorials, hints |
| ♿ Accessibility | ARIA labels, keyboard nav, color contrast |
| ⚡ Performance | Query optimisation, caching, code splitting |

---

## Adding New PySpark Questions

Questions live in [`src/data/question-bank.ts`](src/data/question-bank.ts). Each question follows the `DbQuestion` type.

### Required fields

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Unique, kebab-case, e.g. `"q-groupby-sales-001"` |
| `title` | `string` | Short, clear title |
| `description` | `string` | 1-2 sentence summary |
| `problemStatement` | `string` | Full Markdown problem statement |
| `category` | `string` | e.g. `"GroupBy & Aggregations"` |
| `difficulty` | `"Beginner" \| "Intermediate" \| "Advanced" \| "Interview"` | |
| `zoneId` | `string` | One of the 5 arena zone IDs |
| `challengeSlug` | `string` | Slug matching a challenge |
| `acceptance` | `number` | Estimated acceptance rate (0-100) |
| `bestRuntimeMs` | `number` | Reference solution runtime |
| `solvedCount` | `number` | Seed value (0 is fine) |
| `companyTags` | `string[]` | e.g. `["Amazon", "Meta"]` |
| `testCases` | `TestCase[]` | At least 2 test cases |
| `hints` | `string[]` | 1-3 progressive hints |
| `editorial` | `string` | Markdown explanation of the solution |

### Zone IDs

| Zone ID | Level |
|---|---|
| `bootcamp-barracks` | Beginner |
| `junction-docks` | Intermediate |
| `window-ridge` | Advanced (Window Functions) |
| `optimizer-wasteland` | Advanced (Performance) |
| `interview-bunker` | Interview Prep |

### Minimal question template

```typescript
{
  id: "q-your-id-here",
  title: "Your Question Title",
  description: "One sentence description of what the question tests.",
  problemStatement: `## Problem\n\nDescribe the problem in full...\n\n## Expected Output\n\nDescribe expected results.`,
  category: "GroupBy & Aggregations",
  difficulty: "Beginner",
  zoneId: "bootcamp-barracks",
  challengeSlug: "bootcamp-basics",
  acceptance: 72,
  bestRuntimeMs: 280,
  solvedCount: 0,
  companyTags: ["Amazon"],
  testCases: [
    {
      input: "Sample input description",
      expectedOutput: "Expected output description",
      explanation: "Why this output is expected",
    },
  ],
  hints: [
    "Think about which PySpark function groups rows.",
    "Use `.agg()` to compute the aggregate.",
  ],
  editorial: "## Solution\n\nUse `groupBy` followed by `.agg(sum('amount'))` ...",
},
```

---

## Development Workflow

We follow **GitHub Flow**:

1. **Create a branch** from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   # or
   git checkout -b fix/bug-short-description
   ```

2. **Make focused commits** — one logical change per commit.

3. **Run checks before pushing:**
   ```bash
   npm run build     # must pass with 0 errors
   npm run lint      # must pass
   ```

4. **Push and open a Pull Request** against `main`.

### Branch naming

| Type | Pattern |
|---|---|
| Feature | `feat/<short-description>` |
| Bug fix | `fix/<short-description>` |
| New question | `question/<question-id>` |
| Documentation | `docs/<short-description>` |
| Refactor | `refactor/<short-description>` |

---

## Coding Guidelines

- **TypeScript** — strict mode is enabled; avoid `any`.
- **Tailwind CSS** — use existing utility classes; avoid arbitrary inline styles.
- **Server vs Client** — keep data fetching in Server Components or API routes; use `"use client"` only when needed.
- **API routes** — always validate auth where required; use `resolveAuthContext(request)` from `@/lib/session`.
- **Database** — use the `sql` tagged template from `@/lib/postgres`; never build raw SQL strings with user input.
- **Keep PRs small** — aim for <400 lines changed; split large changes into multiple PRs.
- **No unrelated refactors** — stay focused on the PR scope.
- **Preserve existing APIs** — unless a breaking change is intentional and documented.

---

## Environment Variables

Never commit secrets. `.env.local` is git-ignored. Required variables are documented in `.env.local` (with placeholder values). For Vercel deployment, set these in the Vercel project settings:

| Variable | Purpose |
|---|---|
| `SUPABASE_DB_URL` | Pooler URL (port 6543) for Vercel compatibility |
| `AUTH_SECRET` | JWT signing secret (min 32 chars) |
| `ADMIN_EMAIL` | Your email — grants access to `/admin` |
| `UPSTASH_REDIS_REST_URL` | Rate limiting Redis URL |
| `UPSTASH_REDIS_REST_TOKEN` | Rate limiting Redis token |

---

## Testing

Currently the project uses manual testing. Before submitting a PR:

1. Test the affected pages locally (`npm run dev`).
2. Verify `npm run build` passes cleanly.
3. If you changed scoring logic, verify score is 0 on failure and correct on pass.
4. If you added questions, verify they appear in the correct Arena Zone.

---

## Pull Request Process

1. **Fill in the PR template** (problem → solution → screenshots).
2. **Link any related issues** using `Closes #<issue-number>`.
3. **Ensure CI passes** — the build must succeed with no TypeScript errors.
4. **Request a review** from a maintainer.
5. PRs are squash-merged into `main`.

### PR checklist

- [ ] `npm run build` passes with 0 errors
- [ ] No hardcoded secrets or credentials
- [ ] Auth is enforced on any new admin/protected endpoints
- [ ] New questions include at least 2 test cases, hints, and an editorial
- [ ] CONTRIBUTING.md updated if new patterns are introduced

---

## Reporting Bugs

Use the **Bug Report** issue template on GitHub. Include:

- Steps to reproduce
- Expected vs actual behaviour
- Browser / environment info
- Screenshots or console logs if applicable

---

## Feature Requests

Use the **Feature Request** issue template on GitHub. Describe:

- The problem you're solving
- Your proposed solution
- Alternatives you considered

---

Thank you for contributing! 🚀
