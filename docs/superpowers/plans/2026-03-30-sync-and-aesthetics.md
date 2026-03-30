# Upstream Sync + Mesh Gradient Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add upstream prompt-file sync to the CI pipeline and add a subtle animated mesh gradient background to the React frontend.

**Architecture:** Two independent changes — (1) a single new YAML step inserted before the pipeline script, (2) a fixed CSS overlay layer injected in `main.jsx` plus `index.css` additions. The mesh overlay is fully decoupled from App component logic; removing `bg-bg` from App root divs lets the fixed blobs show through without z-index collisions.

**Tech Stack:** GitHub Actions YAML, React 18 + Vite, Tailwind CSS v4, vanilla CSS animations (`@keyframes` + `transform`)

---

## File Map

| File | Change |
|------|--------|
| `.github/workflows/update.yml` | Insert sync step after `actions/checkout` in `pipeline` job |
| `frontend/src/index.css` | Add top-glow to `body`; add `.mesh-overlay`, `.mesh-blob`, `.mesh-blob-1/2/3` classes + `@keyframes` |
| `frontend/src/main.jsx` | Inject `.mesh-overlay` div with three blob children before `<App />` |
| `frontend/src/App.jsx` | Remove `bg-bg` from all three root divs; add `relative z-[1]` to main content div |

---

## Task 1: Add upstream sync step to workflow

**Files:**
- Modify: `.github/workflows/update.yml`

- [ ] **Step 1: Open the workflow and locate the insertion point**

  Read `.github/workflows/update.yml`. The `pipeline` job starts at line 12. The first step is `actions/checkout@v3` (lines 15–18). The new step goes immediately after it, before `actions/setup-python`.

- [ ] **Step 2: Insert the sync step**

  In `.github/workflows/update.yml`, after the `actions/checkout` step block and before `uses: actions/setup-python@v4`, add:

  ```yaml
      - name: Sync prompt files from upstream
        run: |
          git remote add upstream https://github.com/asgeirtj/system_prompts_leaks.git || true
          git fetch upstream main || echo "WARNING: Could not reach upstream, running with existing files"
          git checkout upstream/main -- Anthropic/ OpenAI/ Google/ xAI/ || echo "WARNING: Upstream checkout failed, using existing files"
  ```

  The full `pipeline` job steps in order must be:
  1. `actions/checkout@v3` (fetch-depth: 0)
  2. **Sync prompt files from upstream** ← new
  3. `actions/setup-python@v4`
  4. Install Python deps
  5. Debug
  6. Run pipeline
  7. Commit updated timeline

- [ ] **Step 3: Validate YAML syntax**

  Run:
  ```bash
  python -c "import yaml; yaml.safe_load(open('.github/workflows/update.yml')); print('YAML OK')"
  ```
  Expected output: `YAML OK`

- [ ] **Step 4: Commit**

  ```bash
  git add .github/workflows/update.yml
  git commit -m "ci: sync prompt folders from upstream before pipeline runs"
  ```

---

## Task 2: Add top-glow and blob styles to index.css

**Files:**
- Modify: `frontend/src/index.css`

- [ ] **Step 1: Add top-glow to body**

  The current `body` block in `index.css` is:
  ```css
  body {
    background-color: #0d1117;
    color: #e6edf3;
    font-family: system-ui, -apple-system, sans-serif;
    min-height: 100vh;
    margin: 0;
  }
  ```

  Replace it with:
  ```css
  body {
    background:
      radial-gradient(ellipse at 50% 0%, rgba(88, 166, 255, 0.05) 0%, transparent 60%),
      #0d1117;
    color: #e6edf3;
    font-family: system-ui, -apple-system, sans-serif;
    min-height: 100vh;
    margin: 0;
  }
  ```

- [ ] **Step 2: Add mesh overlay and blob styles**

  Append to the end of `frontend/src/index.css`:

  ```css
  /* ── Mesh gradient background ── */

  .mesh-overlay {
    position: fixed;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    overflow: hidden;
  }

  .mesh-blob {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
  }

  /* Blob 1 — top-left, blue */
  .mesh-blob-1 {
    width: 55vw;
    height: 45vh;
    top: -5%;
    left: -5%;
    background: rgba(88, 166, 255, 0.11);
    animation: blobDrift1 31s ease-in-out infinite alternate;
  }

  /* Blob 2 — top-right, purple */
  .mesh-blob-2 {
    width: 50vw;
    height: 42vh;
    top: 5%;
    right: -5%;
    background: rgba(163, 113, 247, 0.10);
    animation: blobDrift2 43s ease-in-out infinite alternate;
  }

  /* Blob 3 — bottom-center, purple */
  .mesh-blob-3 {
    width: 55vw;
    height: 50vh;
    bottom: -10%;
    left: 25%;
    background: rgba(163, 113, 247, 0.10);
    animation: blobDrift3 57s ease-in-out infinite alternate;
  }

  @keyframes blobDrift1 {
    from { transform: translate(0, 0); }
    to   { transform: translate(8vw, 6vh); }
  }

  @keyframes blobDrift2 {
    from { transform: translate(0, 0); }
    to   { transform: translate(-6vw, 8vh); }
  }

  @keyframes blobDrift3 {
    from { transform: translate(0, 0); }
    to   { transform: translate(5vw, -7vh); }
  }
  ```

- [ ] **Step 3: Verify CSS is valid (build check)**

  ```bash
  cd frontend && npm run build 2>&1 | tail -5
  ```
  Expected: no errors, ends with something like `✓ built in Xs`

---

## Task 3: Inject mesh overlay in main.jsx and fix App.jsx z-layering

**Files:**
- Modify: `frontend/src/main.jsx`
- Modify: `frontend/src/App.jsx`

**Why these changes together:** The blob overlay is fixed at `z-index: 0`. The App root divs currently have `bg-bg` (solid `#0d1117` background), which would paint over the blobs. Removing `bg-bg` makes the divs transparent so the blobs are visible. The main content div needs `relative z-[1]` so it stacks above blobs.

- [ ] **Step 1: Inject overlay in main.jsx**

  Replace the `render(...)` call in `frontend/src/main.jsx`:

  ```jsx
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <div className="mesh-overlay">
        <div className="mesh-blob mesh-blob-1" />
        <div className="mesh-blob mesh-blob-2" />
        <div className="mesh-blob mesh-blob-3" />
      </div>
      <App />
    </StrictMode>,
  )
  ```

- [ ] **Step 2: Remove bg-bg from error state in App.jsx**

  Change line 29:
  ```jsx
  // Before
  <div className="min-h-screen bg-bg flex items-center justify-center">
  // After
  <div className="min-h-screen flex items-center justify-center">
  ```

- [ ] **Step 3: Remove bg-bg from loading state in App.jsx**

  Change line 34:
  ```jsx
  // Before
  <div className="min-h-screen bg-bg flex items-center justify-center">
  // After
  <div className="min-h-screen flex items-center justify-center">
  ```

- [ ] **Step 4: Remove bg-bg and add z-layering to main content div in App.jsx**

  Change line 40:
  ```jsx
  // Before
  <div className="min-h-screen bg-bg text-primary">
  // After
  <div className="relative z-[1] min-h-screen text-primary">
  ```

- [ ] **Step 5: Build to verify no errors**

  ```bash
  cd frontend && npm run build 2>&1 | tail -5
  ```
  Expected: clean build, no errors.

- [ ] **Step 6: Visual verify with dev server**

  ```bash
  cd frontend && npm run dev
  ```
  Open in browser. Confirm:
  - Background is dark `#0d1117` with a subtle cool blue glow along the top edge (static top-glow)
  - Soft blue blob at top-left, soft purple blob at top-right, purple blob at bottom-center — all barely perceptible
  - All text, charts, cards are fully readable
  - No visible background color on error/loading states (body background shows through)

- [ ] **Step 7: Commit**

  ```bash
  git add frontend/src/index.css frontend/src/main.jsx frontend/src/App.jsx
  git commit -m "feat: animated mesh gradient background"
  ```

---

## Task 4: Update CHANGELOG and open PR

**Files:**
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Append changelog entry**

  Append to `CHANGELOG.md`:
  ```markdown
  ## [unreleased]
  - ci: sync Anthropic/, OpenAI/, Google/, xAI/ from upstream before pipeline runs (tolerant — continues if upstream unreachable)
  - feat: animated mesh gradient background — three independently-drifting blobs (31s/43s/57s) + static top-glow
  ```

- [ ] **Step 2: Commit changelog**

  ```bash
  git add CHANGELOG.md
  git commit -m "docs: changelog for sync-and-aesthetics"
  ```

- [ ] **Step 3: Push branch and open PR**

  ```bash
  git push -u origin cc/sync-and-aesthetics
  gh pr create \
    --title "upstream sync + mesh gradient background" \
    --body "$(cat <<'EOF'
  ## Summary
  - **CI:** Adds upstream sync step at the start of the pipeline job — fetches `Anthropic/`, `OpenAI/`, `Google/`, `xAI/` from `asgeirtj/system_prompts_leaks` before running `extract_and_analyze.py`. Tolerant: continues with existing files if upstream is unreachable.
  - **Frontend:** Animated mesh gradient background — three independently-drifting radial-gradient blobs (31s/43s/57s, non-harmonious so they never re-sync) at top-left/top-right/bottom-center + a static 5% blue top-glow on `body`. CSS only, no libraries.

  ## Test plan
  - [ ] Trigger workflow manually via `workflow_dispatch` — confirm sync step logs appear without errors
  - [ ] Confirm pipeline still produces a valid `enriched_timeline.json` after sync
  - [ ] Open deployed frontend — confirm mesh gradient is visible but subtle (depth, not decoration)
  - [ ] Confirm text, charts, and cards remain fully readable

  🤖 Generated with [Claude Code](https://claude.com/claude-code)
  EOF
  )"
  ```
