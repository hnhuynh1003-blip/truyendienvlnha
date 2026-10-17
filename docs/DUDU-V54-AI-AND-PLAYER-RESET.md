# DUDU V54 — Authenticated AI NPC + safe player reset (Spark)

## Deployment boundaries
- **Firebase Spark remains untouched.** No Blaze, no Cloud Functions deployment.
- GitHub Pages receives the frontend AI routing and a personal reset control.
- A *separate manual* Worker deployment is needed to actually turn on Gemini:
  `cloudflare/wrangler.npc-ai-v54.toml` has AI_ENABLED=true while original
  `cloudflare/wrangler.toml` remains false for rollback and staging tests.
- All other server features (market, gifts, comments, collectibles, pilot) remain OFF.
- Firebase JWT verification and Durable Object quotas remain required:
  25 AI calls per UID per UTC day, 200 total per day, 10 seconds between calls.
- The configured model is `gemini-3.5-flash-lite`. Whether that model/API key
  has a free allowance and what charges could apply depend on the actual
  Gemini Developer API account, **not** on Firebase Spark.

## Activate NPC AI manually on Cloudflare (never upload secrets to GitHub)
From an up-to-date checkout of GitHub main:
1. In your local terminal, go to `cloudflare`.
2. Authenticate with the **correct Cloudflare account**:
   `npx wrangler login`
3. Configure the server-side Gemini API key **using an interactive secret prompt**:
   `npx wrangler secret put GEMINI_API_KEY --config wrangler.npc-ai-v54.toml`.
   The secret must never appear in frontend JS, GitHub files, screenshots or chat.
4. Deploy the AI-only configuration:
   `npx wrangler deploy --config wrangler.npc-ai-v54.toml`.
   Wrangler deploys only the selected Worker and uses the remaining OFF flags.
5. Check the public response:
   `https://dudu-ai-staging.dudu-studio-ai.workers.dev/health`
   should report `{"service":"dudu-ai","enabled":true,...}`.
   If service name does not match, STOP; verify Cloudflare account and worker name.
6. Log in to the live DUDU website, unlock one NPC by reading a chapter, and send
   a non-greeting message. The AI must respond, and quota errors must show
   without silently substituting a scripted reply.
7. Emergency rollback:
   `npx wrangler deploy --config wrangler.toml` from the cloudflare directory.
   The base config has AI_ENABLED=false.
8. Prefer strict budget alerts and a low API quota, since free tier is never
   a universal guarantee for Cloudflare Workers / Gemini.

No secret, login session or live Worker deployment is available to this GitHub
code-editing workflow. Committing the config does **not** turn on the live Worker.

## Reset the CURRENT signed-in player; stories are preserved
Settings > **Khởi tạo lại người chơi** > **Sao lưu và đặt lại tiến độ**.
- Must be Firebase-authenticated and the profile must finish loading.
- Browser first reads the LIVE `profiles_v2/{uid}` document from server.
- Downloads a local JSON backup of that UID's server profile and scoped
  browser data. CHECK that the file was downloaded before confirming.
- Requires explicit typed `DAT LAI` to perform the replace.
- Replaces only `profiles_v2/{uid}` with baseline LV1, EXP0, 50 Xu,
  no inventory, fresh quest definitions and empty reading/NPC/gift progress.
- Clears this UID's local chat/memory, DUDU FUN and companion-state keys,
  then reloads the page.
- A Google sign-in and immutable Firebase Admin custom claims are preserved.
- `studio_data/main_library`, `epub_stories_v49`, all chapters, character
  author definitions, portraits and website assets are NEVER written or deleted.
- NPC unlock state is now empty, and both Codex/Contacts continue using
  `getStoryProgress(storyId).collectedCharacters`. Read the appropriate
  story chapters again to re-unlock them.

### Important limitations
- Reset is **not automatic**; the user must confirm on the live website.
- The reset applies to the current Firebase account, NOT every Firestore user.
- Worker-owned legacy collectible records, gifts or other remote Durable
  Object ledgers are NOT reset by this client-only operation.
- Unscoped browser preferences outside known legacy chat keys may survive.
- If the reset fails before Firebase confirms, no local cleanup is attempted.
- Keep the downloaded JSON backup private: it can contain personal data,
  chat transcripts and previous game state.
