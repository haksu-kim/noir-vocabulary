import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const source=app.slice(app.indexOf('const speechSupported ='),app.indexOf('function libraryRows()'));
const button=()=>({classList:{add(){},remove(){}},setAttribute(){}});
function setup(voices=[]) {
 const status={textContent:''},spoken=[];
 let cancels=0;
 const window={SpeechSynthesisUtterance:class {constructor(text){this.text=text;}},speechSynthesis:{getVoices:()=>voices,speak:u=>spoken.push(u),cancel:()=>cancels++}};
 const api=runInNewContext(source+'\n({pronounce,stopPronunciation})',{window,$:()=>status});
 return {...api,status,spoken,cancels:()=>cancels};
}
test('pronunciation reads only the English word and prefers an English voice',()=>{
 const voice={lang:'en-US',localService:true};
 const p=setup([{lang:'ko-KR'},voice]);
 p.pronounce('For instance',button());
 assert.equal(p.spoken[0].text,'For instance');assert.equal(p.spoken[0].voice,voice);
 assert.equal(p.spoken[0].lang,'en-US');assert.equal(p.spoken[0].rate,.85);
});
test('same button stops speech and another word replaces it without stale errors',()=>{
 const p=setup(),a=button(),b=button();
 p.pronounce('efficient',a);p.pronounce('efficient',a);
 assert.equal(p.spoken.length,1);assert.equal(p.cancels(),1);
 p.pronounce('efficient',a);p.pronounce('additional',b);
 assert.equal(p.cancels(),2);assert.equal(p.spoken.at(-1).text,'additional');
 p.spoken[1].onerror({error:'interrupted'});assert.equal(p.status.textContent,'');
 p.spoken.at(-1).onerror({error:'voice-unavailable'});assert.match(p.status.textContent,/재생하지 못/);
});
test('missing voices use English language and unsupported browsers get an explanation',()=>{
 const p=setup();p.pronounce('word',button());assert.equal(p.spoken[0].lang,'en-US');
 const status={textContent:''};
 const api=runInNewContext(source+'\n({pronounce})',{window:{},$:()=>status});
 api.pronounce('word',button());assert.match(status.textContent,/이 브라우저/);
});
