'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const api=require('../js/library-epub-assets-l6p2c2.js');
test('EPUB source path resolution permits only archive-local references',()=>{
 assert.equal(api.local('images/bi%20mat.png','OPS/chapter.xhtml'),'OPS/images/bi mat.png');
 assert.equal(api.local('../images/cover.jpg','OPS/chapter.xhtml'),'images/cover.jpg');
 assert.equal(api.local('nested/../image.png','OPS/chapter.xhtml'),'OPS/image.png');
 for(const path of ['http://evil.test/b.png','//evil.test/b.png','../../escape.png','data:image/png;base64,ABC','\\server\\share','%2fadmin','file:///etc/passwd'])
  assert.equal(api.local(path,'OPS/chapter.xhtml'),null,path);
});
test('EPUB images recognize only raster magic bytes from approved MIME',()=>{
 const png=Uint8Array.from([137,80,78,71,13,10,26,10]);
 assert.equal(api.signature(png,'image/png'),true);
 assert.equal(api.signature(png,'image/jpeg'),false);
 assert.equal(api.signature(Uint8Array.from([255,216,255]),'image/jpeg'),true);
 assert.equal(api.signature(Uint8Array.from([71,73,70,56,57,97]),'image/gif'),true);
 assert.equal(api.signature(Uint8Array.from([0,0,0]),'image/svg+xml'),false);
});
