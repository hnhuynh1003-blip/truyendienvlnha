/* DUDU Library L6-P1 — storage adapter contract; NOT loaded by the live reader.
 * Firestore is the only default. R2 requires an explicit gate AND injected
 * test-only provider. No R2 bucket, HTTP endpoint, credentials, or migration.
 * Server-side authorization must be designed and verified before real R2 use.
 */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DuduEpubStorageL6P1 = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';
  const ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{3,120}$/;
  const MAX_CHAPTER_BYTES = 420000;
  const MAX_CHAPTER_CHARS = 220000;
  function validId(id) {
    return typeof id === 'string' && ID_PATTERN.test(id);
  }
  function normalizeChapter(value) {
    const title = value?.title;
    const content = value?.content;
    if (typeof title !== 'string' || !title || title.length > 140 ||
        typeof content !== 'string' || !content || content.length > MAX_CHAPTER_CHARS ||
        /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/u.test(content) ||
        new TextEncoder().encode(content).byteLength > MAX_CHAPTER_BYTES) {
      throw new Error('Phản hồi chương EPUB không hợp lệ; không thay đổi dữ liệu đọc.');
    }
    return Object.freeze({ title, content });
  }
  function create({ firestoreReader, r2Reader, r2Enabled = false } = {}) {
    if (typeof firestoreReader !== 'function') throw new Error('Thiếu nguồn đọc chương Firestore.');
    if (typeof r2Enabled !== 'boolean') throw new Error('Cờ thử nghiệm R2 không hợp lệ.');
    async function readChapter(bookId, chapterId, { backend = 'firestore' } = {}) {
      if (!validId(bookId) || !validId(chapterId))
        throw new Error('Mã sách hoặc chương EPUB không hợp lệ.');
      if (backend === 'firestore')
        return normalizeChapter(await firestoreReader(bookId, chapterId));
      if (backend !== 'r2') throw new Error('Nguồn đọc chương EPUB không được hỗ trợ.');
      if (!r2Enabled || typeof r2Reader !== 'function') {
        // No silent Firestore fallback after an R2 denial.
        throw new Error('Đọc chương EPUB từ R2 chưa được kích hoạt.');
      }
      // Mock only in L6-P1. A future production Worker must independently
      // verify Firebase JWT and R1.2-equivalent access on the SERVER.
      return normalizeChapter(await r2Reader(bookId, chapterId));
    }
    return Object.freeze({ readChapter });
  }
  return Object.freeze({ create, validId, normalizeChapter, MAX_CHAPTER_BYTES });
});
