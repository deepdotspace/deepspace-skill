_Load this reference at the start of building a complete app end to end — a new product, a clone of an existing product, or any multi-feature build. Skip it for single-feature additions and bug fixes._

# Building a whole app: the workflow

**Research and de-risking come before building; verification comes before "done."** The order is load-bearing — phases overlap and you'll loop back, but never skip forward. Login, scaffold, and feature/integration discovery mechanics are SKILL.md §1–3 (scaffold whenever you need a repo to work in; research needs no code); this reference sequences the work around them.

## The workflow — 7 steps, in order

### 1. Research before any code

If the app follows a reference product (a clone, "like X but…", a screenshot), study the real thing first — never build "like X" from memory.

- Reverse-engineer it: full feature surface, the core loop, mechanics, pricing/tiers, data model. Use live observation (capture headlessly — `npx deepspace screenshot <url> <out.png>` or Playwright), the public web, and any materials the user gave you. If key surfaces sit behind a login, ask the user for access or screenshots — don't create accounts on someone else's product without their say-so — and mark what you couldn't see as a black box rather than guessing it.
- **Save a reference corpus** — screenshots of every surface, notes, captures — in a stable folder (`docs/refs/` or similar). Every later phase diffs against this corpus; if you don't have enough screenshots, go take more.
- Write findings into a small `docs/` wiki. Note where each claim came from, and mark inferences as hypotheses, never as facts.
- Check what the platform already gives you (run the SKILL.md §3 catalogs; load the matching references) so you don't hand-build what exists. Nothing outside the catalogs is a blocker — any external API works with the user's own key (`npx deepspace secrets set KEY=…` → `references/secrets.md`). Note which capabilities come from SDK primitives, which from catalog integrations, and which you'll wire yourself — the wire-yourself ones are prime de-risking targets (step 4).

For a from-scratch product, the same step applies to the *domain*: study 2–3 real products in the space before inventing features. **A feature invented from guesswork ("users probably want a live feed") gets thrown away — ground it or cut it.**

### 2. Decide everything before code

Drive the spec until it passes the zero-questions test: a designer and a build agent could execute it with **zero clarifying questions back**. A feature left as a noun ("analytics", "AI assistant") is a hole — resolve its input, source of truth, edit path, and empty/loading/failure states. Spec the **whole product** the research describes — don't quietly plan an MVP slice; staging is the user's call, not a default. The counterweight is the realism gate: for each feature, ask who clicks it and why — cut what only sounds good in theory, and say what you cut.

Surface the genuinely ambiguous product decisions to the user *now*, in one batch with a recommendation on each — not one at a time, and not mid-build. If the user is away, write the batch down, adopt your recommendations, and keep moving. Record decisions in a decisions file; once locked, don't relitigate without new evidence.

### 3. Pin the design source

Every build has exactly one design source of truth, chosen up front. **Which path is the user's call — if they haven't said, ask** (fold it into the step-2 question batch):

- **A design prototype** (from a design-generation tool such as Claude Design, if available) — when handing off to a design tool, give it the *complete* product spec but **no layout prescription of your own**: features and specs in full, no pages/screens/navigation. UI requirements the user stated are the exception — pass those through. Prescribing layout produces rigid, generic design; withholding product info produces wrong design. Never feed it the reference product's own screenshots or brand — that only makes it copy them. Generation tools do well on conventional product and marketing layouts and badly on unusual shells (multi-pane workspaces) — prefer one of the two paths below for those.
- **The reference product's screenshots** — for exact-parity clones. Treat the corpus as the bible; parity means every button, section, and option, not the general vibe. Parity covers structure and features, never identity: don't ship the original's name, logo, brand assets, or copy.
- **Self-design against studied references** — screenshot 2–3 genuinely good real products first (ones the user names, or find your own), and note which section or component pattern you're borrowing from which product. Those screenshots join the reference corpus: design against them and keep diffing against them through the build — studying a reference once and then recreating UI from memory produces the same slop as never studying it. Landing pages → `references/landing-design.md`; app UI and themes → `references/uiux.md`.

A vetted design is **copied, not "improved"** — idle edits are how good designs degrade. Behavior a static frame can't show (live data, motion) is yours to design deliberately.

### 4. De-risk the load-bearing bets

For anything the app stands on that you haven't proven — a risky integration, the core generation/data pipeline, a cost assumption, a quality bar — run a small, timeboxed spike **before building the feature on top of it**. Prove the recipe with real calls and real output:

```bash
npx deepspace invoke <provider>/<endpoint> --body '{...}'   # real call, real output, real cost
```

Let the result decide the design (`list`/`info` discovery is free; `invoke` is billed — stay inside any budget the user granted → `references/integrations.md`). Experiments are cheap; rebuilding a wrong foundation is not. If a load-bearing bet fails and there's no alternative, that's a stop-and-ask moment — never silently descope the core feature or ship a degraded stand-in.

### 5. Plan top-down, then build in phases

Design the whole system first — architecture, module boundaries, data model (collections + RBAC), the SDK surfaces each subsystem uses, folder structure, conventions (naming, where logic lives, error handling) — then recurse into each part until nothing load-bearing is vague. The depth test: **a fresh agent could implement each part from its doc alone, with zero questions back.** The plan docs are the build contract. Scale planning to the build: recursion stops when ambiguity is gone, not at a page count — never let the plan grow heavier than the code it guides.

Build order: shared foundation first (schemas, RBAC, worker routes, theme tokens) through **one writer** — two hands making different implicit decisions in the foundation silently corrupt everything built on it — then features on top. Building on a single thread is the default; parallelize across sub-agents only when the work splits cleanly, and then: exclusive file ownership per stream (no two agents ever touch the same file — or the same decision), the conventions inlined in every brief (never just "see the plan"), the absolute working directory pinned in every brief, cross-stream changes routed through you (never agent-to-agent edits), and **spike any shared recipe on one target before fanning it out** — a broken shared instruction multiplies across every parallel worker. Reading work — research, experiments, reviews — parallelizes freely; it's parallel *writing* that needs these rules.

### 6. Verify like a user — green gates are a false green

`tsc` clean and passing tests say nothing about whether the app works or looks right — the classic failure is every automated gate green and the live app broken on the first click. Before calling anything done:

1. **Type-check + tests** (`npx deepspace test`) — necessary, never sufficient.
2. **Screenshot every screen** headlessly (`npx deepspace screenshot <url> <out.png>`) in the app's real themes and viewports — and *look at them*: overlap, misalignment, scaffold residue, empty states.
3. **Diff against the design source** — side-by-side with the reference corpus or prototype, surface by surface.
4. **Live-smoke the core loop on the deployed app** — drive it headlessly against the deploy, signed in as a fresh test account, and do the thing the app exists for, as a user would.
5. **Multi-user features get multiple real sessions** (`npx deepspace test-accounts list`, a 2-user spec → `references/testing.md`) — never verify collaboration with a single tab.
6. **Exercise the failure states** — denied, expired, empty, offline. A raw exception reaching a user is a defect.

Report with evidence — the screenshot, the output, the live URL — and keep a hard line between **built-and-verified**, **built-but-unverified**, and **not built**. Never blur them. Assume the first pass is wrong and budget for verify-fix cycles; close the loop on a check that produces a real pass/fail, not on "looks done."

**Checks must measure intent, not a proxy.** A metric an agent can satisfy without satisfying the user (a motion score, a parity percentage you graded yourself) will get gamed. When the bar is taste, produce a side-by-side comparison and let the user judge.

### 7. Review as you build, walk the spec, ship

- **Review periodically, not only at the end** — after each major feature or big chunk of work: review the new code, and step back to the system level (is a mess accumulating? is a refactor or simplification due?). Catching drift mid-build is cheap; untangling it at the end is not.
- **Independent review** by a fresh context that didn't write the code — mandatory for money, auth/permissions, anything that fans out to users, anything hard to reverse. Brief reviewers to flag only what genuinely affects correctness or the stated requirements — a reviewer sent to "find problems" invents them. No way to spawn a fresh context? Degrade honestly: re-review against the spec with deliberately fresh eyes, and say the review wasn't independent.
- **Adjudicate findings yourself.** Review agents exaggerate: verify each finding against the actual source, discard what you can't ground, and reject over-engineered fixes (keep the real issue, apply the simplest correct change). Loop review → fix → re-review until a pass finds nothing of value.
- **Money paths get the hardest review** and their invariants pinned with a test: amounts resolved server-side, never client-trusted; entitlements checked on every gated request; failures fail closed. **Never hand-roll Stripe.** → `references/payments.md`
- **Walk the spec feature-by-feature** against the research/decisions docs and confirm each is built and verified — this completeness walk, not your own sense of progress, decides "done." A self-graded "mostly there" is not a completeness check.
- **When everything looks 100% done, run a whole-system design review** — a high-level pass over the finished codebase: refactor where it simplifies, remove dead code, split what grew too big, make it leaner and more robust. This is what keeps the codebase maintainable. Then re-run the step-6 gates — a refactor isn't done until verification confirms nothing broke.
- **Every cut or deferral is communicated with a reason** — never a stubbed "coming soon", a silently skipped hard part, or a substituted reference. If a named resource is missing, ask; never quietly swap.
- Deploy (pre-launch, no users: deploy autonomously on green gates + a live smoke; rehearse risky changes with `deploy --env staging`). Clear the first-deploy checklist (SKILL.md §4). Then hand the user the live URL with a short what-to-test-first list — **the user driving the live product is the final gate** (taste doesn't automate); park any taste calls you couldn't settle for that moment.

## Long builds: state lives on disk, not in context

Context gets compacted; anything not written down gets forgotten or relitigated. **On resume — after compaction, a session limit, or a long gap — re-read this reference and the files below before continuing**; standing rules decay silently otherwise. Keep, from day one:

- **A task list** — the running to-do; while it's non-empty there is always a next action. This is what prevents stopping halfway.
- **A state/decisions file** — current phase, exact next step, locked decisions. First thing to re-read on resume.
- **A lessons file** — append every gotcha or wrong assumption the moment you learn it, and carry it into the next task or sub-agent brief so no mistake repeats within the build.
- **Checkpoint commits** before risky passes (reviews, refactors, redesigns) so there's something to go back to. Commit code; keep planning/coordination docs out of the repo (gitignore the docs folder) and out of any published repo.

## Decide vs ask

Solo-project default: **decide and keep moving.** Make the small calls (copy, naming, layout details, component choices) and log them. Ask only for what's irreversible or outward-facing: spending real money beyond an explicit budget, logins/OAuth only the user can complete, buying a domain, publishing or announcing to real users, brand/positioning stakes, or a load-bearing bet that failed de-risking. Don't pause a build to check in — a working product is the floor. And know when to stop: a fix that has failed several times in a row means come back with what you tried and observed, not another lap of the same loop.

When you report, lead with the result — point-wise, plain terms, zero assumed context — and be dead honest about what's verified vs not.

## Where builds go wrong

Recurring failure modes and the rule that prevents each. (Review and deferral reflexes live in step 7.)

| Failure | Rule |
|---|---|
| Declaring done on green gates while the live app is broken | Done = the core loop driven on the deploy, as a fresh user, with evidence |
| Stopping with features unbuilt, or after one dead end | Task-list file; keep going until the walk-the-spec check passes; route around blockers |
| Grading your own parity ("mostly matches") | Diff item-by-item against the pinned reference corpus, never memory |
| Ignoring or losing an explicit instruction (especially across compaction) | Pin user-stated requirements in the spec/decisions file; re-verify against them before done |
| Inventing features or facts by guesswork | Ground load-bearing choices in real calls (`invoke`), real docs, real data — or ask |
| Fake/synthetic data anywhere (UI stats, demos, fixtures) | Real data or clearly-labeled placeholder; demos generated by the real pipeline |
| Patching symptoms; deleting a feature to kill its bug | Root-cause first; fix at the layer that generates the bad data |
| Fixing only the reported instance | Treat each report as a class; sweep the whole surface for its siblings |
| Shipping scaffold chrome / template-shaped UI | The scaffold is a placeholder — design against studied real references → `references/uiux.md` |
| Test data leaking into the live app | Clean up seeded data in `finally`; audit for orphans before handoff |
| "Improving" a proven design or pipeline while replicating it | Replicate exactly; diverge only where the user granted latitude |
| Wrong/stale working directory (sibling checkouts exist) | Pin the absolute cwd everywhere; verify the folder is the canonical, synced one |
