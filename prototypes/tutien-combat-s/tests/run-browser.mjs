// Uses an already-installed browser. No package install, CDN or external URL.
import { spawn } from 'node:child_process';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createServer } from '../serve.mjs';
const binary=process.argv[2];if(!binary)throw Error('Pass the path of an installed Chromium browser');
let finish;const reportPromise=new Promise(resolve=>{finish=resolve;});
const server=createServer({onTestReport:finish});await new Promise((r,j)=>{server.once('error',j);server.listen(0,'127.0.0.1',r);});
const profile=await mkdtemp(path.join(os.tmpdir(),'tutien-s-browser-'));
const url=`http://127.0.0.1:${server.address().port}/tests/browser.html`;
const args=['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-component-update','--disable-sync','--disable-extensions','--disable-popup-blocking','--metrics-recording-only',`--user-data-dir=${profile}`,url];
let stdout='',stderr='';
const child=spawn(binary,args,{windowsHide:true});child.stdout.on('data',b=>stdout+=b);child.stderr.on('data',b=>stderr+=b);
let timer;
try{
 const result=await Promise.race([reportPromise,new Promise((_,reject)=>{child.once('error',reject);child.once('exit',code=>reject(Error(`Browser exited ${code}`)));timer=setTimeout(()=>reject(Error('Browser report timed out')),55000);})]);
 console.log(JSON.stringify(result,null,2));if(result.fail)process.exitCode=1;
}catch(e){console.error(e.message+'\n'+stdout.slice(-1000)+'\n'+stderr.slice(-1800));process.exitCode=1;}
finally{clearTimeout(timer);child.kill();server.closeAllConnections();server.close();}
