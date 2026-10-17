import {getPool, createQuiz, quizSummary, answerQuestion} from './engine.js';

const $ = s => document.querySelector(s);
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icons = {
  grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  book:'<path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Zm0 0v15"/>',
  history:'<path d="M3 10a9 9 0 1 1 1 7M3 4v6h6m3-3v5l3 2"/>',
  arrow:'<path d="M4 12h15m-6-6 6 6-6 6"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
  close:'<path d="m6 6 12 12M18 6 6 18"/>',
  spark:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z"/>',
  repeat:'<path d="m17 2 4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4m14-1v2a3 3 0 0 1-3 3H3"/>',
  search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
};
const icon = name => `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${icons[name] || icons.spark}</svg>`;
const DAYS = Array.from({length:6},(_,i)=>`DAY${i+1}`);
const KEY = 'noir-words-v1';
let storageWorks = true;
let saved = {history:[], wrongIds:[], session:null};
try { const value = JSON.parse(localStorage.getItem(KEY)); if(value && Array.isArray(value.history) && Array.isArray(value.wrongIds)) saved = {...saved,...value}; } catch { storageWorks = false; }
let data, words, view = 'home', selectedDays = [...DAYS], count = 20, direction = 'en-ko', onlyWrong = false, session = null, result = null, libraryFilter = 'all', libraryDay = 'DAY1', search = '', modal = null;
function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch { storageWorks = false; }
}
function saveSession() { saved.session = {...session, elapsed:elapsed(), startedAt:Date.now()}; persist(); }
function elapsed() { return session ? session.elapsed + Math.max(0, Math.floor((Date.now() - session.startedAt) / 1000)) : 0; }
function duration(seconds) { return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`; }
function pool() { return getPool(words,selectedDays, onlyWrong ? new Set(saved.wrongIds) : null); }
function average() { return saved.history.length ? Math.round(saved.history.reduce((sum,h)=>sum+h.score,0)/saved.history.length) : null; }

function shell(content) {
  const current = view === 'quiz' || view === 'results' ? 'home' : view;
  return `<div class="app-shell"><aside class="sidebar"><a href="#" class="brand" data-action="nav" data-view="home" aria-label="NOIR WORDS 홈"><span class="brand-symbol">N<span>·</span></span><span>NOIR<span class="brand-words">WORDS</span></span></a><div class="workspace-label">YOUR STUDY SPACE</div><nav aria-label="메인 메뉴">${[['home','grid','단어 시험'],['library','book','나의 단어장'],['history','history','학습 기록']].map(([id,i,label])=>`<button class="nav-item ${current===id?'active':''}" data-action="nav" data-view="${id}" ${current===id?'aria-current="page"':''}>${icon(i)}<span>${label}</span>${id==='home'?'<span class="nav-dot"></span>':''}</button>`).join('')}</nav><div class="sidebar-bottom"><div class="small-quote">“Little by little,<br> a little becomes a lot.”</div><div class="sidebar-rule"></div><div class="profile"><div class="avatar">Y</div><div><strong>나만의 학습 공간</strong><span>ONE WORD AT A TIME</span></div></div></div></aside><div class="main-shell"><header class="topbar"><span class="breadcrumb">MY WORKSPACE <span>/</span> ${current==='home'?'VOCABULARY TEST':current==='library'?'WORD LIBRARY':'LEARNING HISTORY'}</span><div class="save-status"><i class="${storageWorks?'':'unavailable'}"></i>${storageWorks?'이 브라우저에 기록 저장':'기록 저장을 사용할 수 없어요'}</div></header><main id="main">${content}</main><footer><span>NOIR WORDS <i>·</i> 나만의 속도로, 더 선명하게.</span><span>DESIGNED FOR FOCUS</span></footer></div></div>${modalMarkup()}`;
}
function heading(eyebrow,title,subtitle,extra='') { return `<div class="page-heading"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${subtitle}</p></div>${extra}</div>`; }
function renderHome() {
 const available = pool().length;
 const today = new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',weekday:'long'}).format(new Date());
 return `${heading('A LITTLE PROGRESS, EVERY DAY.','오늘의 단어,<br>내일의 <em>가능성.</em>','하나씩 쌓아가는 어휘력. 오늘도 나만의 속도로 시작하세요.',`<div class="today">${icon('spark')}<span>${today}</span></div>`)}
 <div class="stats-row"><div class="stat"><span>나의 단어</span><strong>${words.length}<small>WORDS</small></strong><span class="stat-note">6개의 DAY, 중복 없이</span></div><div class="stat"><span>완료한 시험</span><strong>${saved.history.length}<small>SESSIONS</small></strong><span class="stat-note">꾸준함이 만드는 변화</span></div><div class="stat"><span>평균 정답률</span><strong>${average()===null?'—':average()+'<b>%</b>'}<small>ACCURACY</small></strong><span class="stat-note">${average()===null?'첫 번째 기록을 만들어보세요':'지금까지 차곡차곡 쌓인 실력'}</span></div></div>
 <div class="home-grid"><section class="setup panel"><div class="panel-heading"><div><span class="eyebrow">MAKE IT YOURS</span><h2>오늘의 시험 설정</h2></div><span class="number-label">01 — 06</span></div><fieldset><legend>학습 범위 <span>여러 DAY를 함께 선택할 수 있어요</span></legend><div class="day-grid">${DAYS.map(day=>`<button class="day-button ${selectedDays.includes(day)?'selected':''}" data-action="day" data-day="${day}" aria-pressed="${selectedDays.includes(day)}"><span>${day.replace('DAY','DAY ')}</span><small>${words.filter(w=>w.days.includes(day)).length} 단어</small><span class="day-check">${icon('check')}</span></button>`).join('')}</div><button class="text-button" data-action="all-days">${selectedDays.length===DAYS.length?'선택 해제':'전체 DAY 선택'}</button></fieldset><div class="settings-grid"><fieldset><legend>출제 수</legend><div class="segments">${[10,20,30,'all'].map(n=>`<button data-action="count" data-count="${n}" class="${count===n?'selected':''}" aria-pressed="${count===n}">${n==='all'?'전체':n+'개'}</button>`).join('')}</div></fieldset><fieldset><legend>문제 유형</legend><div class="segments">${[['en-ko','영어 → 뜻'],['ko-en','뜻 → 영어']].map(([v,label])=>`<button data-action="direction" data-direction="${v}" class="${direction===v?'selected':''}" aria-pressed="${direction===v}">${label}</button>`).join('')}</div></fieldset></div><div class="review-setting"><div>${icon('repeat')}<div><strong>오답만 다시 풀기</strong><span>복습이 필요한 ${saved.wrongIds.length}개 단어에 집중해요</span></div></div><button class="switch ${onlyWrong?'on':''}" role="switch" aria-checked="${onlyWrong}" aria-label="오답만 다시 풀기" data-action="only-wrong"><span></span></button></div><div class="start-section"><p><span class="gold-dot"></span>${available?`<strong>${count==='all'?available:Math.min(count,available)}문제</strong>를 무작위로 출제합니다`:(selectedDays.length?'선택 범위에 복습할 오답이 없어요':'DAY를 하나 이상 선택해 주세요')}</p><button class="primary start-button" data-action="start" ${available?'':'disabled'}>시험 시작하기 ${icon('arrow')}</button></div>${saved.session?'<button class="resume-button" data-action="resume">'+icon('clock')+' 진행 중인 시험 이어하기 '+icon('arrow')+'</button>':''}</section><aside class="right-column"><section class="focus-card"><span class="eyebrow">THE DAILY RITUAL</span><div class="orbit" aria-hidden="true"><div class="orbit-one"></div><div class="orbit-two"></div><span class="orbit-star">✦</span><span class="orbit-point"></span></div><p class="serif-quote">Small steps.<br><em>Lasting change.</em></p><p>완벽한 하루보다,<br>어제보다 한 단어 더.</p><div class="focus-bottom"><span class="line"></span>집중을 위한 작은 공간</div></section><section class="tip-card"><span>${icon('spark')}</span><div><h3>A NOTE FOR YOU</h3><p>틀린 단어는 자동으로 모아두고,<br>다시 맞히면 오답장에서 지워드려요.</p></div></section></aside></div>`;
}
function renderQuiz() {
 const q = session.questions[session.index];
 const answered = session.questions.filter(q=>q.answered).length;
 return `<div class="quiz-top"><button class="text-button back-button" data-action="exit">← 시험 나가기</button><span class="eyebrow">STAY PRESENT. KEEP GOING.</span><span class="timer">${icon('clock')}<span id="timer">${duration(elapsed())}</span></span></div><section class="quiz-wrap"><div class="quiz-progress-label"><span>QUESTION <strong>${String(session.index+1).padStart(2,'0')}</strong><span class="muted"> / ${String(session.questions.length).padStart(2,'0')}</span></span><span>${Math.round(answered/session.questions.length*100)}% COMPLETE</span></div><div class="progress-track" role="progressbar" aria-label="시험 진행률" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(answered/session.questions.length*100)}"><span style="width:${answered/session.questions.length*100}%"></span></div><div class="question-card panel"><div class="question-meta"><span class="pill">${q.days.map(d=>d.replace('DAY','DAY ')).join(' · ')}</span><span>${session.direction==='en-ko'?'알맞은 뜻을 선택하세요':'알맞은 영어 표현을 선택하세요'}</span></div><h1 class="question-word ${session.direction==='ko-en'?'korean':''}">${escape(q.prompt)}</h1><div class="question-decoration"><span></span>✦<span></span></div><div class="choices" role="group" aria-label="답 선택">${q.choices.map((choice,i)=>{const selected=q.answered&&choice===q.answer;return `<button class="choice ${selected?'selected':''}" data-action="answer" data-choice="${i}" aria-pressed="${selected}" ${q.answered?'disabled':''}><span class="choice-key">${i+1}</span><span>${escape(choice)}</span>${selected?'<span class="choice-selection">선택</span>':'<span class="choice-end"></span>'}</button>`;}).join('')}</div><div class="feedback-slot" role="status">${q.answered?`<span class="answer-saved">${q.answer===null?'이 문제는 건너뛰었어요.':'답변을 저장했어요.'} 결과는 시험이 끝난 뒤 확인할 수 있어요.</span>`:'<span class="keyboard-tip">숫자 <kbd>1</kbd> – <kbd>4</kbd> 로도 답할 수 있어요</span>'}</div><div class="question-actions"><span>${answered} / ${session.questions.length}개 답변</span>${q.answered?`<button class="primary" data-action="next">${session.index===session.questions.length-1?'결과 확인하기':'다음 문제'} ${icon('arrow')}</button>`:'<button class="secondary" data-action="skip">건너뛰기 →</button>'}</div></div><p class="quiz-footnote">조급해하지 않아도 괜찮아요. 기억은 반복으로 깊어집니다.</p></section>`;
}
function renderResults() {
 const perfect=result.score===100;
 return `${heading('A MOMENT TO REFLECT.','오늘도 한 걸음 <em>앞으로.</em>','점수보다 중요한 건, 다시 기억해낸 단어 하나예요.')}<section class="results-card panel"><div class="score-ring" style="--score:${result.score}%"><div><span>ACCURACY</span><strong>${result.score}<small>%</small></strong><span>${perfect?'PERFECT SESSION':'KEEP GROWING'}</span></div></div><div class="result-summary"><div class="eyebrow">SESSION COMPLETE</div><h2>${perfect?'모든 단어를 기억했어요.':result.score>=70?'차곡차곡, 실력이 쌓이고 있어요.':'다시 만나면 더 오래 기억할 거예요.'}</h2><p>${result.total}개 중 <strong>${result.correct}개 정답</strong> <i>·</i> ${duration(result.elapsed)} 동안의 집중</p><div class="result-buttons">${result.wrong.length?`<button class="primary" data-action="retry-wrong">오답 ${result.wrong.length}개 다시 풀기 ${icon('repeat')}</button>`:`<button class="primary" data-action="start">한 번 더 도전 ${icon('arrow')}</button>`}<button class="secondary" data-action="home">새 시험 설정</button></div></div></section>${result.wrong.length?`<div class="section-heading"><h2>틀린 문제 확인</h2><span>${result.wrong.length} WORDS TO REVISIT</span></div><div class="review-list">${result.wrong.map(q=>`<div class="review-row"><span class="word-dot"></span><strong>${escape(q.word)}</strong><span>${escape(q.meaning)}<span class="review-answer">내 답: ${q.answer===null?'건너뜀':escape(q.answer)} · 정답: ${escape(q.correct)}</span></span><small>${q.answer===null?'건너뜀':'오답'}</small></div>`).join('')}</div>`:'<div class="perfect-note">'+icon('spark')+' 오늘의 단어가 전부 내 것이 되었어요.</div>'}`;
}
function libraryRows() {
 const query=search.trim().toLowerCase();
 const visible=words.filter(w=>(libraryDay==='all'||w.days.includes(libraryDay))&&(libraryFilter==='all'||saved.wrongIds.includes(w.id))&&(!query||w.word.toLowerCase().includes(query)||w.meaning.includes(query)));
 return `<div class="library-count">${libraryDay==='all'?'전체 DAY':libraryDay.replace('DAY','DAY ')} · ${visible.length}개의 단어 <span>영어 단어와 뜻으로 검색할 수 있어요</span></div><div class="word-table"><div class="table-head"><span>WORD</span><span>MEANING</span><span>DAY</span><span>STATUS</span></div>${visible.length?visible.map(w=>`<div class="table-row"><strong>${escape(w.word)}</strong><span>${escape(w.meaning)}</span><small>${w.days.map(d=>d.replace('DAY','')).join(' · ')}</small><span>${saved.wrongIds.includes(w.id)?'<span class="status-pill">복습 필요</span>':'<span class="muted">—</span>'}</span></div>`).join(''):'<div class="empty-state">'+icon('book')+'<h3>해당하는 단어가 없어요</h3><p>검색어를 바꾸거나 다른 범위를 선택해 보세요.</p></div>'}</div>`;
}
function renderLibrary() {
 return `${heading('WORDS WORTH KEEPING.','하나씩, <em>내 것으로.</em>','DAY별로 단어를 살펴보고 복습할 단어를 확인하세요.')}<section class="panel library-panel"><div class="library-days" role="group" aria-label="단어장 DAY 선택">${['all',...DAYS].map(day=>`<button class="library-day ${libraryDay===day?'selected':''}" data-action="library-day" data-day="${day}" aria-pressed="${libraryDay===day}"><span>${day==='all'?'전체':day.replace('DAY','DAY ')}</span><small>${day==='all'?words.length:words.filter(w=>w.days.includes(day)).length}개</small></button>`).join('')}</div><div class="library-toolbar"><div class="segments"><button data-action="library-filter" data-filter="all" class="${libraryFilter==='all'?'selected':''}" aria-pressed="${libraryFilter==='all'}">전체 단어</button><button data-action="library-filter" data-filter="wrong" class="${libraryFilter==='wrong'?'selected':''}" aria-pressed="${libraryFilter==='wrong'}">오답장 <span>${saved.wrongIds.length}</span></button></div><label class="search-box">${icon('search')}<input id="word-search" type="search" placeholder="단어 또는 뜻 검색" aria-label="단어 또는 뜻 검색" value="${escape(search)}"></label></div><div id="library-rows">${libraryRows()}</div></section><p class="data-note">기존 단어장의 204개 항목을 중복 없이 정리했습니다. 명확한 철자 오류와 잘린 뜻은 학습용으로 교정했습니다.</p>`;
}
function renderHistory() {
 return `${heading('YOUR PROGRESS, IN PAGES.','기록이 쌓이면,<br><em>변화가 보여요.</em>','작은 성취를 잊지 않도록. 이 브라우저에서 쌓아온 학습 기록입니다.')}<section class="panel history-panel"><div class="panel-heading"><h2>최근 학습 기록</h2><span class="number-label">${saved.history.length} SESSIONS</span></div>${saved.history.length?`<div class="history-list">${saved.history.map(h=>`<div class="history-row"><div class="history-icon">${icon(h.score===100?'spark':'check')}</div><div><strong>${escape(h.label)}</strong><span>${new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(h.date))} <i>·</i> ${h.correct}/${h.total} 정답 <i>·</i> ${duration(h.elapsed)}</span></div><div class="mini-progress"><span style="width:${h.score}%"></span></div><strong class="history-score">${h.score}<small>%</small></strong></div>`).join('')}</div><p class="data-note">최근 50회까지 저장됩니다. 브라우저 데이터를 지우면 기록도 함께 지워집니다.</p>`:`<div class="empty-state">${icon('history')}<h3>아직 비어 있는 첫 페이지</h3><p>첫 시험을 마치면 오늘의 성취가 이곳에 남아요.</p><button class="primary" data-action="home">첫 기록 만들기 ${icon('arrow')}</button></div>`}</section>`;
}
function modalMarkup() {
 if(!modal)return '';
 const exit=modal==='exit';
 return `<div class="modal-backdrop"><section class="modal panel" role="dialog" aria-modal="true" aria-labelledby="modal-title"><span class="eyebrow">TAKE YOUR TIME</span><h2 id="modal-title">${exit?'잠시 쉬어갈까요?':'새 시험을 시작할까요?'}</h2><p>${exit?'진행 상황을 저장해 둘게요.<br>언제든 이어서 풀 수 있어요.':'진행 중인 시험은 새 시험으로 바뀝니다.<br>완료한 시험 기록은 그대로 남아요.'}</p><div><button class="secondary" data-action="modal-cancel">${exit?'계속 풀기':'취소'}</button><button class="primary" data-action="${exit?'save-exit':'replace-session'}">${exit?'저장하고 나가기':'새 시험 시작'}</button></div></section></div>`;
}
function render() {
 $('#app').innerHTML=shell(view==='home'?renderHome():view==='quiz'?renderQuiz():view==='results'?renderResults():view==='library'?renderLibrary():renderHistory());
 document.title = `${view==='quiz'?`문제 ${session.index+1} · `:view==='results'?'시험 결과 · ':''}NOIR WORDS`;
 if(modal) $('.modal .secondary')?.focus();
}
function navigate(next) {
 if(view==='quiz') { modal='exit'; render(); return; }
 view=next; render(); window.scrollTo({top:0});
}
function startQuiz(explicitPool=null) {
 const source=explicitPool||pool();
 if(!source.length)return;
 session={questions:createQuiz(source,words,explicitPool?source.length:count==='all'?source.length:Math.min(count,source.length),direction),direction,index:0,elapsed:0,startedAt:Date.now(),label:explicitPool?'오답 집중 복습':`${selectedDays.length===6?'전체 DAY':selectedDays.map(d=>d.replace('DAY','DAY ')).join(' · ')} ${onlyWrong?'· 오답 복습':''}`};
 view='quiz'; result=null; modal=null; saveSession();render();window.scrollTo({top:0});
}
function finishQuiz() {
 const summary=quizSummary(session.questions);
 result={...summary,elapsed:elapsed()};
 const wrong=new Set(saved.wrongIds);
 for(const q of session.questions){if(q.answer===q.correct)wrong.delete(q.id);else wrong.add(q.id);}
 saved.wrongIds=[...wrong];
 saved.history.unshift({score:summary.score,correct:summary.correct,total:summary.total,elapsed:result.elapsed,date:new Date().toISOString(),label:session.label});
 saved.history=saved.history.slice(0,50);saved.session=null;persist();view='results';render();window.scrollTo({top:0});
}
function answer(value) {
 const q=session.questions[session.index];
 if(!answerQuestion(q,value))return;
 saveSession();render();$('[data-action="next"]')?.focus({preventScroll:true});
}
$('#app').addEventListener('click', event=>{
 const button=event.target.closest('[data-action]'); if(!button || button.disabled)return;
 event.preventDefault();
 const action=button.dataset.action;
 if(action==='nav')return navigate(button.dataset.view);
 if(action==='home'){view='home';render();window.scrollTo({top:0});return;}
 if(action==='day'){selectedDays=selectedDays.includes(button.dataset.day)?selectedDays.filter(d=>d!==button.dataset.day):[...selectedDays,button.dataset.day];render();}
 else if(action==='all-days'){selectedDays=selectedDays.length===6?[]:[...DAYS];render();}
 else if(action==='count'){count=button.dataset.count==='all'?'all':Number(button.dataset.count);render();}
 else if(action==='direction'){direction=button.dataset.direction;render();}
 else if(action==='only-wrong'){onlyWrong=!onlyWrong;render();}
 else if(action==='start'){if(saved.session){modal='replace';render();}else startQuiz();}
 else if(action==='replace-session')startQuiz();
 else if(action==='resume'){
   const candidate=saved.session;
   if(!candidate||!Array.isArray(candidate.questions)||!candidate.questions.length||!candidate.questions[candidate.index]){saved.session=null;persist();render();return;}
   session=structuredClone(candidate);session.startedAt=Date.now();view='quiz';render();window.scrollTo({top:0});
 }
 else if(action==='answer')answer(session.questions[session.index].choices[Number(button.dataset.choice)]);
 else if(action==='skip')answer(null);
 else if(action==='next'){if(session.index===session.questions.length-1)finishQuiz();else{session.index++;saveSession();render();window.scrollTo({top:0});}}
 else if(action==='retry-wrong'){const ids=new Set(result.wrong.map(q=>q.id));startQuiz(words.filter(w=>ids.has(w.id)));}
 else if(action==='exit'){modal='exit';render();}
 else if(action==='modal-cancel'){modal=null;render();}
 else if(action==='save-exit'){session.elapsed=elapsed();session.startedAt=Date.now();saveSession();modal=null;view='home';render();window.scrollTo({top:0});}
 else if(action==='library-filter'){libraryFilter=button.dataset.filter;render();}
 else if(action==='library-day'){libraryDay=button.dataset.day;render();}
});
$('#app').addEventListener('input',event=>{if(event.target.id==='word-search'){search=event.target.value;$('#library-rows').innerHTML=libraryRows();}});
document.addEventListener('keydown',event=>{
 if(modal){if(event.key==='Escape'){modal=null;render();}if(event.key==='Tab'){const buttons=[...document.querySelectorAll('.modal button')];if(event.shiftKey&&document.activeElement===buttons[0]){event.preventDefault();buttons.at(-1).focus();}else if(!event.shiftKey&&document.activeElement===buttons.at(-1)){event.preventDefault();buttons[0].focus();}}return;}
 if(view!=='quiz'||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)||event.ctrlKey||event.metaKey||event.altKey)return;
 const q=session.questions[session.index];
 if(!q.answered&&/^[1-4]$/.test(event.key)){event.preventDefault();answer(q.choices[Number(event.key)-1]);}
 else if(q.answered&&event.key==='Enter'){event.preventDefault();$('[data-action="next"]')?.click();}
});
window.addEventListener('pagehide',()=>{if(view==='quiz'&&session){session.elapsed=elapsed();session.startedAt=Date.now();saveSession();}});
setInterval(()=>{if(view==='quiz'&&$('#timer'))$('#timer').textContent=duration(elapsed());},1000);
try {
 const response=await fetch('./words.json');if(!response.ok)throw Error('단어장 로딩 실패');data=await response.json();words=data.words;
 const valid=new Set(words.map(w=>w.id));saved.wrongIds=saved.wrongIds.filter(id=>valid.has(id));
 if(saved.session?.questions?.some(q=>!valid.has(q.id)))saved.session=null;
 render();
} catch (error) {console.error('NOIR WORDS initialization failed:', error);$('#app').innerHTML='<div class="loading error-page">단어장을 불러오지 못했어요.<p>페이지를 새로고침해 주세요. 문제가 계속되면 잠시 후 다시 시도해 주세요.</p><button class="primary" onclick="location.reload()">다시 시도</button></div>';}
