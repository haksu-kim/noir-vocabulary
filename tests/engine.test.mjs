import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {shuffle,getPool,createQuiz,quizSummary,answerQuestion} from '../dist/engine.js';
const {words}=JSON.parse(fs.readFileSync(new URL('../dist/words.json',import.meta.url)));
test('source coverage and deduplication preserve every DAY',()=>{
 assert.equal(words.length,183);
 assert.equal(new Set(words.map(w=>w.id)).size,183);
 assert.equal(words.reduce((s,w)=>s+w.originals.length,0),204);
 for(let day=1;day<=6;day++)assert.equal(getPool(words,[`DAY${day}`]).length,day<5?49:4);
 assert.equal(getPool(words,[]).length,0);
 assert.equal(getPool(words,['DAY1','DAY5','DAY6']).length,49);
});
test('every pool and both directions produce valid unique choices',()=>{
 for(const direction of ['en-ko','ko-en'])for(let day=1;day<=6;day++){
  const pool=getPool(words,[`DAY${day}`]);
  const quiz=createQuiz(pool,words,999,direction);
  assert.equal(quiz.length,pool.length);
  assert.equal(new Set(quiz.map(q=>q.id)).size,pool.length);
  for(const q of quiz){assert.equal(q.choices.length,4);assert.equal(new Set(q.choices).size,4);assert.equal(q.choices.filter(c=>c===q.correct).length,1);assert.equal(q.answered,false);}
 }
});
test('questions sample without repeats and cap to available pool',()=>{
 const pool=getPool(words,['DAY5']);
 assert.equal(createQuiz(pool,words,20).length,4);
 assert.equal(createQuiz(words,words,10).length,10);
 assert.equal(createQuiz([],words,20).length,0);
 const before=JSON.stringify(words);shuffle(words);assert.equal(JSON.stringify(words),before);
 const orders=new Set(Array.from({length:10},()=>createQuiz(words,words,20).map(q=>q.id).join('|')));assert.ok(orders.size>1);
});
test('correct answers, wrong answers, skips and duplicate answers score correctly',()=>{
 const quiz=createQuiz(words,words,4);
 assert.equal(answerQuestion(quiz[0],quiz[0].correct),true);
 assert.equal(answerQuestion(quiz[0],null),false);
 assert.equal(answerQuestion(quiz[1],'invalid-answer'),false);
 answerQuestion(quiz[1],quiz[1].choices.find(c=>c!==quiz[1].correct));
 answerQuestion(quiz[2],null);answerQuestion(quiz[3],quiz[3].correct);
 const result=quizSummary(quiz);assert.equal(result.score,50);assert.equal(result.correct,2);assert.equal(result.wrong.length,2);
 assert.deepEqual(quizSummary([]),{total:0,correct:0,wrong:[],score:0});
});
test('wrong-only review filters out words outside selected DAY',()=>{
 const wrong=new Set([words[0].id,words[60].id]);
 assert.equal(getPool(words,['DAY1'],wrong).length,1);
 assert.equal(getPool(words,['DAY6'],new Set()).length,0);
});
test('known source typos are repaired while originals remain available',()=>{
 assert.ok(words.find(w=>w.word==='Nevertheless'&&w.originals[0].word==='Neverthelss'));
 assert.ok(words.find(w=>w.word==='For instance'));
 assert.ok(words.find(w=>w.id==='allocate'&&w.meaning==='할당하다'));
});
