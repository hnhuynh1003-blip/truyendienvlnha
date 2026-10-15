# DUDU Studio AI Gateway — Cloudflare Workers Free

**Code status (15/10/2026):** staged/test-only on feature branch. The operator already deployed `dudu-ai-staging.dudu-studio-ai.workers.dev` and stored `GEMINI_API_KEY` as a Cloudflare Secret. **AI remains OFF**; `COLLECTIBLES_ENABLED` is also **OFF** in the new source. Current deployed Worker is not automatically updated by GitHub commits. Gemini 3.5 Flash Lite in GitHub does not automatically replace the deployed model. Firebase remains Spark, GitHub Pages production is unchanged. **Do not redeploy or merge into `fixapp` until the owner approves a controlled staging test.**

## Security design

- Fixed Firebase project: `truyendienvl`. JWT **signature (Google JWKS RS256)**, issuer, audience, auth time, expiration and UID checked by Cloudflare; no client-submitted UID trusted.
- Strict CORS permits the DUDU GitHub Pages origin and local development `localhost`. CORS is **not** the security boundary; Firebase JWT verification is.
- Google Gemini API key stays in **Cloudflare Secrets**, never `index.html`, localStorage or GitHub.
- AI Disabled switch `AI_ENABLED = "false"` by default. No Gemini calls can run while disabled.
- One SQLite-backed Durable Object serializes rate limits atomically: 25 successful admission attempts/UID/day, 200 total/day UTC, 10 s cooldown, one in-flight per UID. Same object used by all accounts to prevent race-condition overrun.
- Selected model `gemini-3.5-flash-lite` is controlled by Worker (staging code only; deployed Worker is not updated automatically). Input 12k characters max, 12 messages max; output max 320 tokens chat or 850 tokens author assist. `assist` requires a verified Firebase custom claim `admin:true`.
- A "use" counts when request is admitted, even if Gemini fails. Quotas apply to this Worker; provider limits and Cloudflare daily limits are separate. The Worker does **not** validate NPC unlock state server-side yet; do not assume gameplay/economy are secure.
- This beta has JWT + quotas + origin checks; Cloudflare Turnstile and abuse reporting may be added later. Free Cloudflare Workers and free Gemini quotas are independent.

## Lịch sử Bước 1 — Worker đã triển khai, AI vẫn TẮT

1. From GitHub, download the ZIP of branch `feat/identity-npc-editor-v2` or `git clone` it. Do **not** use the older ZIP previously extracted.
2. Extract and open **Command Prompt** in the `cloudflare` directory (the one containing `wrangler.toml`).
3. Node.js is required (previously installed for localhost). Run:
   ```bat
   node -v
   npm install
   npm test
   npm run build
   npx wrangler login
   npx wrangler deploy
   ```
4. On first login, a browser opens to grant Wrangler access to YOUR Cloudflare account. Confirm the displayed Cloudflare account; do not share any access token with anyone.
5. The first `wrangler deploy` creates the **dudu-ai-staging** Worker and one SQLite-backed Durable Object. The Worker is a public endpoint but cannot call Gemini while disabled.
6. Wrangler prints an HTTPS `workers.dev` URL. Check `https://<your-workers-dev-url>/health` in browser. The live Worker may report the **older deployed model** until the operator redeploys new code. `enabled:false` must remain true while testing. Do not use this as a signal to turn AI on.
7. Only share the **public Worker URL** (no account email, no token, no API key) back in chat so the frontend may be connected in the NEXT step.

**The above is the complete safe first deployment. STOP here.** It neither asks for Gemini API key nor enables paid calls. Do not edit `AI_ENABLED` yourself yet.

## Bước 2 — Sau khi xác nhận Worker (chưa làm)

- Google AI Studio: verify API access, project/model quota and free tier eligibility. Rotate any exposed old key.
- From the same `cloudflare` folder, enter `npx wrangler secret put GEMINI_API_KEY`; Wrangler prompts for the value privately. NEVER paste the value into chat/GitHub, terminal command arguments, screenshots or `wrangler.toml`.
- Set a limited test window, choose a trusted Firebase test account, review Cloudflare logs, optional Turnstile, quotas and Cloudflare billing settings.
- Public `WORKER_URL` has been updated to `https://dudu-ai-staging.dudu-studio-ai.workers.dev` after the operator confirmed its `/health` endpoint returned `enabled:false`. Do not change to another URL without verifying ownership.
- ONLY after a controlled dry run, change Worker `AI_ENABLED` to `true` and redeploy **with explicit approval**. Stop/rollback by returning it to `false`.
- Test real Firebase Auth token validity, access permissions, Firebase account switching, failures, rate limiting and Gemini token usage. Staging website should use separate copy of frontend, not production.
- Finally review draft PR before any merge.

## Cảnh báo vận hành

- Do NOT deploy `functions/` or `firebase.json` onto Firebase Spark. Cloudflare Worker is the replacement for the old Firebase Blaze design, not an additional live provider.
- GitHub Actions uses `wrangler deploy --dry-run` to **bundle** code only; it does not control your Cloudflare account.
- GitHub Pages source contains only public Firebase web configuration, not the secret Gemini API key.
- If Cloudflare displays an upgrade/billing prompt, **do not add card/upgrade** in this step. Report the exact text for review.
- The Worker stores quota accounting in Durable Object; it does not store private chat content. The Gemini prompt is forwarded to Google when AI is enabled.


## Đợt 4A — Sổ sở hữu kỷ vật (chưa kích hoạt)

- Xem `docs/COLLECTIBLES-SERVER-PHASE4A.md` về quyền sở hữu server-side, thư viện public và những phần **chưa an toàn để bật thưởng thật**.
- `COLLECTIBLES_ENABLED="false"` là công tắc **độc lập** với `AI_ENABLED="false"`; cả hai đều tắt.
- Worker source chứa DO mới `DUDU_COLLECTIBLES` và migration SQL `v2-collectibles-sqlite`. Workflow GitHub chỉ `wrangler deploy --dry-run`, không sửa tài khoản Cloudflare.
- Chưa có xác thực đọc hoàn thành và chưa có bảo mật dữ liệu vật phẩm spoiler; **không bật công tắc nhận kỷ vật**.
