# DUDU Multiverse — main preview (2026-10-16)

This branch is the **public preview snapshot**, not an audited production backend release.

- Previous main (Bỏ Phố Về Quê v87.6.1) is backed up at `backup/main-before-dudu-release-2026-10-16`. The old game files were intentionally replaced only on `main`. The `fixapp` default branch was left untouched.
- New PWA icon is generated from the user-approved open-book galaxy illustration. Favicon is a compact photo-derived WebP; scalable SVG is used as a second PWA icon.
- For safe functional tests, open `index.html?sandbox=1`. PWA installs also start in Sandbox.
- **16 original WebP files for six NPC + four world wallpapers are NOT uploaded** in this release; they remain available in the separately delivered V28 asset ZIP/Web install kit. NPC art buttons are disabled when images are missing, wallpapers use CSS fallback. Manual installation is required before claiming artwork complete.
- Firebase Auth/Rules, Cloudflare binding, author/admin privileges and verified reward endpoints are not production-ready. Sandbox data is local. Do not rely on production rewards, remote account storage or author updates here.
- GitHub Pages may be configured to publish a branch other than `main`; pushing `main` does not itself change the Pages source. Verify repo Settings → Pages and deployed URL.
- Rollback: use a normal revert commit or restore the backed-up branch after testing. Do not delete the backup branch.
