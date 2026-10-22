import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const source=app.slice(app.indexOf('let pronunciation ='),app.indexOf('function libraryRows()'));
function setup({reject=false}={}) {
 const status={textContent:''},panel={hidden:true},label={textContent:''};
 let plays=0,pauses=0;
 const audio={pause(){pauses++;},play(){plays++;return reject?Promise.reject(Error('NotAllowedError')):Promise.resolve();}};
 const button=()=>({classList:{add(){},remove(){}},setAttribute(){}});
 const elements={'#pronunciation-player':audio,'#speech-status':status,'#pronunciation-controls':panel,'#pronunciation-label':label};
 const words=[{word:'efficient',audio:'audio/efficient-123.mp3'},{word:'additional',audio:'audio/additional-456.mp3'}];
 const api=runInNewContext(source+'\n({pronounce,stopPronunciation})',{words,document:{baseURI:'https://example.com/noir-vocabulary/?v=test'},URL,$:s=>elements[s]});
 return {...api,audio,status,panel,label,button,plays:()=>plays,pauses:()=>pauses};
}
test('play starts synchronously from the click using the same-site MP3 and exposes native controls',()=>{
 const p=setup();p.pronounce('efficient',p.button());
 assert.equal(p.plays(),1);assert.equal(p.audio.src,'https://example.com/noir-vocabulary/audio/efficient-123.mp3');
 assert.equal(p.panel.hidden,false);assert.equal(p.audio.muted,false);assert.equal(p.audio.volume,1);
 assert.match(p.status.textContent,/불러오는/);
 p.audio.onplaying();assert.match(p.status.textContent,/재생 중/);
 p.audio.onended();assert.equal(p.status.textContent,'');
});
test('same button stops; another word replaces the audio; navigation stops native playback',()=>{
 const p=setup(),a=p.button(),b=p.button();
 p.pronounce('efficient',a);p.audio.onplaying();p.pronounce('efficient',a);
 assert.equal(p.plays(),1);assert.match(p.status.textContent,/멈췄/);
 p.pronounce('efficient',a);p.pronounce('additional',b);
 assert.equal(p.plays(),3);assert.match(p.audio.src,/additional/);
 p.audio.onended();const before=p.pauses();p.stopPronunciation();assert.equal(p.pauses(),before+1);
});
test('blocked playback shows a usable native player and stale failures cannot overwrite a later choice',async()=>{
 const p=setup({reject:true});p.pronounce('efficient',p.button());await Promise.resolve();
 assert.match(p.status.textContent,/아래 재생 버튼/);assert.equal(p.panel.hidden,false);
 p.pronounce('efficient',p.button());p.stopPronunciation();p.status.textContent='new state';await Promise.resolve();
 assert.equal(p.status.textContent,'new state');
});
test('every vocabulary entry has a committed MP3',()=>{
 const {words}=JSON.parse(readFileSync(new URL('../dist/words.json',import.meta.url)));
 for(const word of words){
  assert.match(word.audio,/^audio\/[a-z0-9-]+-[a-f0-9]{12}\.mp3$/);
  const path=new URL('../dist/'+word.audio,import.meta.url);
  assert.ok(existsSync(path),word.word);assert.ok(readFileSync(path).length>1000,word.word);
 }
});
