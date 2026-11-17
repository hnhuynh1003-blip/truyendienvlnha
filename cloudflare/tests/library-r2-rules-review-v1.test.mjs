import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const content=readFileSync(fileURLToPath(
 new URL('../../security/epub-catalog-r2-v1.rules.review',import.meta.url)),'utf8');
test('catalog Rules remain a review-only fragment, not a live deployment',()=>{
 assert.match(content,/REVIEW FRAGMENT ONLY/);
 assert.match(content,/NEVER AUTO-DEPLOY/);
 assert.match(content,/match \/epub_catalog_r2_v1\/\{bookId\}/);
 assert.match(content,/approvedReader\(\).*status == 'published'/s);
 assert.match(content,/admin\(\).*ownerUid == request.auth.uid/s);
 assert.match(content,/allow list: if false/);
 assert.match(content,/allow create, update, delete: if false/);
 assert.doesNotMatch(content,/allow (?:get|read|write): if true/);
});
test('fragment cannot change Game, legacy Web or old EPUB policy',()=>{
 assert.doesNotMatch(content,/match \/profiles_v2|match \/studio_data|match \/epub_stories_v49/);
});
