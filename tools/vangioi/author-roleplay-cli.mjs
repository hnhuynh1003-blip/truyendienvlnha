#!/usr/bin/env node
// Manual interactive OFFLINE test only. No browser, network, account, reward,
// real item, publish, source download, storage write or backend auth.
import {createInterface} from 'node:readline/promises';
import {stdin,stdout} from 'node:process';
import {randomUUID} from 'node:crypto';
import {prepareAuthorRoleplayOffline}
 from '../../cloudflare/src/vangioi-author-roleplay-offline.mjs';
import {lighthouseWorld,lighthouseEngineManifest,lighthousePlaytestScript}
 from '../../cloudflare/tests/fixtures/vangioi-author-playtest-world.mjs';

const world=lighthouseWorld();
const play=await prepareAuthorRoleplayOffline(world,
 await lighthouseEngineManifest(world),await lighthousePlaytestScript(world));
if(!play.ok){process.stderr.write(`Demo unavailable: ${play.code}\n`);process.exitCode=1;}
else{
 const ui=createInterface({input:stdin,output:stdout});
 try{
  const lines=ui[Symbol.asyncIterator]();
  const ask=async prompt=>{stdout.write(prompt);const line=await lines.next();
   return line.done?null:line.value.trim();};
  stdout.write('\nDUDU Studio — thử nhập vai tác giả (Node offline, không phát hành)\n');
  stdout.write('Không có EXP, Xu, vật phẩm thật, quyền nhiệm vụ hoặc lưu server.\n\n');
  play.entryProfiles.forEach((x,i)=>stdout.write(`${i+1}. ${x.label} (${x.mode})\n`));
  const selected=await ask('Chọn thân phận: '),choice=Number(selected);
  if(selected===null||!Number.isInteger(choice)||choice<1||choice>play.entryProfiles.length)
   stdout.write('Lựa chọn thân phận không hợp lệ.\n');
  else{
   const started=await play.start(play.entryProfiles[choice-1].entryId);
   if(!started.ok)stdout.write(`Không thể bắt đầu: ${started.code}\n`);
   else{
    let session=started.session;
    for(let step=0;step<40;step++){
     const view=await play.view(session);
     if(!view.ok){stdout.write(`Phiên thử bị chặn: ${view.code}\n`);break;}
     stdout.write(`\n--- ${world.title} | Cảnh ${session.revision+1} ---\n`);
     stdout.write(`${view.narration}\n${view.dialogue}\n`);
     if(view.roleReaction)stdout.write(`${view.roleReaction}\n`);
     if(view.narrativeEndingId){
      stdout.write(`\nKết thúc kịch bản: ${view.narrativeEndingId} (chỉ kể chuyện, không nghiệm thu).\n`);
      break;
     }
     view.choices.forEach((x,i)=>stdout.write(`${i+1}. ${x.label}\n`));
     const line=await ask('Chọn hành động (0 để thoát): '),answer=Number(line);
     if(line===null){stdout.write('\nKết thúc đầu vào, đóng phiên thử.\n');break;}
     if(answer===0){stdout.write('Đã dừng bản thử.\n');break;}
     if(!Number.isInteger(answer)||answer<1||answer>view.choices.length){
      stdout.write('Lựa chọn không hợp lệ.\n');continue;
     }
     const applied=await play.choose(session,{choiceId:view.choices[answer-1].choiceId,
      eventId:randomUUID(),expectedRevision:session.revision});
     if(!applied.ok){stdout.write(`Hành động bị chặn: ${applied.code}\n`);break;}
     session=applied.session;
    }
   }
  }
 }finally{ui.close();}
}
