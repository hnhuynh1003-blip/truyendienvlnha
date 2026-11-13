'use strict';
// Reproducible offline reader lookup data. No proprietary QT databases copied.
const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'..');
const SOURCES=[
 {id:'hanviet',repo:'ph0ngp/hanviet-pinyin-wordlist',ref:'b9923df92c8b55f013001390e37cddd35e986dc1',file:'hanviet.csv',license:'MIT',sha256:'dd90d59db1265a47317477c9f741baeff7cb4dfed58d9a0c2be5f69b9ed14d66'},
 {id:'cvdict',repo:'ph0ngp/CVDICT',ref:'c379d909e308343a247e51619f7839a2060a271c',file:'CVDICT.u8',license:'CC-BY-SA-4.0',sha256:'4dde4b204193efa9c192d7f7daeab1bb579c8ccd7c41ed90d1b6caee22ba0948'}
];
const normalize=s=>s.normalize('NFC').trim().replace(/\s+/gu,' ');
function csv(line){const fields=[];let value='',quoted=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){if(quoted&&line[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){fields.push(value);value='';}else value+=c;}fields.push(value);return fields;}
async function main(){
 const local=process.argv[2];const provenance=[];const raw={};
 for(const source of SOURCES){
  const url=`https://raw.githubusercontent.com/${source.repo}/${source.ref}/${source.file}`;
  let buffer;if(local)buffer=await fs.readFile(path.join(local,source.file));else{const response=await fetch(url);if(!response.ok)throw Error('Source HTTP '+response.status);buffer=Buffer.from(await response.arrayBuffer());}
  if(crypto.createHash('sha256').update(buffer).digest('hex')!==source.sha256)throw Error('Source hash mismatch: '+source.file);
  raw[source.id]=buffer.toString('utf8');provenance.push({...source,url});
 }
 const pronunciations=new Map();let pronunciationRows=0;
 for(const line of raw.hanviet.split(/\r?\n/u).slice(1)){
  if(!line.trim())continue;const [char,values,pinyin]=csv(line);
  const readings=Array.from(values.matchAll(/'([^']+)'/gu),m=>normalize(m[1]));if(!readings.length)continue;
  if(!pronunciations.has(char))pronunciations.set(char,new Map());pronunciations.get(char).set(pinyin,readings);pronunciationRows++;
 }
 const entries=[];
 for(const line of raw.cvdict.split(/\r?\n/u)){
  if(!line||line.startsWith('#'))continue;
  const m=line.match(/^(\S+) (\S+) \[([^\]]+)\] \/(.*)\/$/u);if(m)entries.push({trad:m[1],simp:m[2],pinyin:m[3].toLowerCase().split(' '),senses:m[4].split('/')});
 }
 const characters=new Map([...pronunciations].map(([c,p])=>[c,[...new Set([...p.values()].flat())]]));
 for(const entry of entries)if([...entry.trad].length===1&&[...entry.simp].length===1&&characters.has(entry.trad))characters.set(entry.simp,[...new Set([...(characters.get(entry.simp)||[]),...characters.get(entry.trad)])]);
 const readings=(char,pinyin)=>{const p=pronunciations.get(char);return p?.get(pinyin)||p?.get('*')||characters.get(char)||[];};
 const rows=[],seen=new Set();
 for(const entry of entries){
  const chars=[...entry.trad];if(chars.length>4||!chars.every(c=>/\p{Script=Han}/u.test(c)))continue;
  let combinations=[''];for(let i=0;i<chars.length;i++){const options=readings(chars[i],entry.pinyin[i]);combinations=combinations.flatMap(prefix=>options.slice(0,3).map(r=>(prefix+' '+r).trim())).slice(0,4);}
  if(!combinations.length)continue;
  const glosses=[...new Set(entry.senses.flatMap(s=>s.replace(/\([^)]*\)|\[[^\]]*\]/gu,'').split(/[,;]| hoặc | hay /u)).map(s=>normalize(s).toLocaleLowerCase('vi')).filter(s=>s&&s.length<=48&&s.split(' ').length<=4&&/^[\p{L}\p{M} -]+$/u.test(s)))];
  if(!glosses.length)continue;
  for(const hv of combinations){const row=[entry.trad,entry.simp,hv,glosses.slice(0,6).join(';')],key=row.join('\t');if(!seen.has(key)){rows.push(row);seen.add(key);}}
 }
 const out=path.join(ROOT,'assets/reader-name-lookup-l55');await fs.mkdir(out,{recursive:true});
 const charData={format:'dudu-hanviet',version:1,license:'CC-BY-SA-4.0',sources:provenance,characters:Object.fromEntries(characters)};
 const reverseData={format:'dudu-vietnamese-meanings',version:1,license:'CC-BY-SA-4.0',source:provenance[1],rows};
 await fs.writeFile(path.join(out,'characters.json'),JSON.stringify(charData)+'\n');
 await fs.writeFile(path.join(out,'meanings.json'),JSON.stringify(reverseData)+'\n');
 const manifest={version:1,build:'l55-1',sources:provenance,counts:{sourceEntries:entries.length,pronunciationRows,characters:characters.size,meaningRows:rows.length},files:{}};
 for(const file of ['characters.json','meanings.json']){const buffer=await fs.readFile(path.join(out,file));manifest.files[file]={bytes:buffer.length,sha256:crypto.createHash('sha256').update(buffer).digest('hex')};}
 await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 console.log(JSON.stringify(manifest.counts));console.log(JSON.stringify(manifest.files));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
