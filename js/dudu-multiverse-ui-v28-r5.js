/* V28 R5 NPC photo-pack gallery. Classic script, sandbox+author only.
 * Image files are intentionally distributed in a separate validated asset ZIP.
 */
(function(root){
  'use strict';
  root.renderNpcArtPackV28=function(){
    const panel=document.getElementById('npc-v28-npc-gallery');
    if(!panel||typeof IS_SANDBOX_MODE==='undefined'||!IS_SANDBOX_MODE||
       typeof canEditStories!=='function'||!canEditStories()||
       !root.DuduMultiverseArtV28)return;
    panel.replaceChildren();
    const chosen=document.getElementById('npc-r7-portrait')?.value||'';
    for(const npc of root.DuduMultiverseArtV28.NPC){
      const button=document.createElement('button');
      button.type='button';button.className='dudu-v28-npc-choice';
      button.disabled=true;button.dataset.packNpc=npc.id;
      button.setAttribute('aria-label','Chọn chân dung '+npc.label);
      button.setAttribute('aria-pressed',String(chosen===npc.portraitPath));
      const image=document.createElement('img');
      image.alt='';image.loading='eager';image.decoding='async';
      const caption=document.createElement('span');
      caption.textContent=npc.id+' · '+npc.label;
      button.append(image,caption);panel.append(button);
      image.onload=()=>{if(button.isConnected&&IS_SANDBOX_MODE)button.disabled=false;};
      image.onerror=()=>{button.disabled=true;caption.textContent=npc.id+' · Chưa cài ảnh';};
      image.src='./'+npc.avatarPath;
      button.addEventListener('click',()=>root.npcChooseArtPackV28(npc.id));
    }
  };
  root.npcChooseArtPackV28=function(id){
    if(typeof IS_SANDBOX_MODE==='undefined'||!IS_SANDBOX_MODE||
       typeof canEditStories!=='function'||!canEditStories()||
       !root.DuduMultiverseArtV28)return false;
    const npc=root.DuduMultiverseArtV28.portraitById(id);
    const button=[...document.querySelectorAll('#npc-v28-npc-gallery [data-pack-npc]')]
      .find(x=>x.dataset.packNpc===id);
    if(!npc||!button||button.disabled||
       !DuduNpcAuthorR7.ALLOWED_PORTRAIT.test(npc.portraitPath))return false;
    // Select authored art only. Never change story ID, NPC ID or reading progress.
    npcSelectPortraitPreset('');
    const picker=document.getElementById('npc-r8-gallery-panel');
    if(picker)picker.dataset.uploadRequest='';
    document.getElementById('npc-r8-preset-id').value='';
    document.getElementById('npc-r8-upload-id').value='';
    document.getElementById('npc-v14-anime-id').value='';
    npcClearAnimeVisual();
    document.getElementById('npc-r7-portrait').value=npc.portraitPath;
    const preview=document.getElementById('npc-r8-preview');
    preview.src='./'+npc.portraitPath;preview.style.display='block';
    document.getElementById('npc-r8-selection-label').textContent=
      'Chân dung đa thế giới: '+npc.id+' · '+npc.label;
    document.querySelectorAll('#npc-v28-npc-gallery [data-pack-npc]').forEach(x=>{
      x.setAttribute('aria-pressed',String(x.dataset.packNpc===id));
    });
    return true;
  };
})(typeof window!=='undefined'?window:{});
