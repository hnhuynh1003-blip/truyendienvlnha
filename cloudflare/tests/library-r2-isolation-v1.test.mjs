import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const file=(path)=>readFileSync(fileURLToPath(new URL(path,import.meta.url)),'utf8');
test('preview R2 bucket stays PRIVATE, feature flag OFF and Worker isolated',()=>{
 const preview=file('../wrangler.library-r2-preview.toml');
 assert.match(preview,/name\s*=\s*"dudu-library-r2-preview"/);
 assert.match(preview,/LIBRARY_R2_ENABLED\s*=\s*"false"/);
 assert.match(preview,/workers_dev\s*=\s*false/);
 assert.match(preview,/bucket_name\s*=\s*"dudu-library-epub-private"/);
 assert.match(preview,/binding\s*=\s*"DUDU_LIBRARY_EPUB_BUCKET"/);
 assert.doesNotMatch(preview,/CLOUDFLARE_API_TOKEN|secret\s*=|account_id\s*=/i);
});
test('Game/NPC production Worker is not modified or routed through Library preview',()=>{
 const game=file('../src/index.mjs'),wrangler=file('../wrangler.toml');
 assert.doesNotMatch(game,/library-r2-private-v1|library-r2-preview-entry-v1|LIBRARY_R2_ENABLED|\/v1\/library\/r2\//);
 assert.doesNotMatch(wrangler,/DUDU_LIBRARY_EPUB_BUCKET|LIBRARY_R2_ENABLED|dudu-library-epub-private/);
});
test('preview entry verifies real Firebase signatures and cannot have anonymous public R2 GET',()=>{
 const entry=file('../src/library-r2-preview-entry-v1.mjs'),src=file('../src/library-r2-private-v1.mjs');
 assert.match(entry,/verifyFirebaseIdToken/);
 assert.match(entry,/handleLibraryR2Private/);
 assert.match(src,/env\?\.LIBRARY_R2_ENABLED!=='true'/);
 assert.match(src,/if\(!tokenPresent\(req\)\)/);
 assert.doesNotMatch(src,/\.delete\(/);
 assert.doesNotMatch(src,/publicUrl|r2\.dev|AWS_SECRET_ACCESS_KEY/);
});
