// Only serve the four public demo assets, never the repository/private files.
const http=require('http'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),files={
 '/':'tests/fixtures/reader-paragraph-r1.html',
 '/tests/fixtures/reader-paragraph-r1.html':'tests/fixtures/reader-paragraph-r1.html',
 '/js/reader-paragraph-model-r1.js':'js/reader-paragraph-model-r1.js',
 '/js/reader-paragraph-ui-r1.js':'js/reader-paragraph-ui-r1.js',
 '/css/reader-paragraph-r1.css':'css/reader-paragraph-r1.css'
};
http.createServer((req,res)=>{const file=files[new URL(req.url,'http://localhost').pathname];if(!file){res.writeHead(404).end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html; charset=utf-8');res.end(fs.readFileSync(path.join(root,file)));}).listen(8766,'127.0.0.1',()=>console.log('Preview http://127.0.0.1:8766/tests/fixtures/reader-paragraph-r1.html'));
