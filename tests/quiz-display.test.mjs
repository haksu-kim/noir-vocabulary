import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const app = readFileSync(new URL('../dist/app.js', import.meta.url), 'utf8');
const quizRenderer = app.slice(app.indexOf('function renderQuiz() {'), app.indexOf('function renderResults() {'));
function render({correct = 'A', answer = 'A'} = {}) {
  return runInNewContext(quizRenderer + '\nrenderQuiz()', {
    session: {index: 0, direction: 'en-ko', questions: [{days: ['DAY1'], prompt: 'word', choices: ['A', 'B', 'C', 'D'], answered: true, answer, correct}]},
    icon: () => '', escape: value => String(value), elapsed: () => 0, duration: () => '00:00',
  });
}

test('answer display cannot reveal whether the selected answer is correct', () => {
  const right = render({correct: 'A'}), wrong = render({correct: 'B'});
  assert.equal(right, wrong);
  assert.equal((right.match(/aria-pressed="true"/g) || []).length, 1);
  assert.ok(right.includes('선택한 답을 다시 누르면 취소돼요.'));
  assert.ok(!right.includes('disabled'));
  assert.ok(!right.includes('data-action="cancel"'));
  assert.ok(!/class="choice [^"]*(?:correct|incorrect|dimmed)/.test(right));
  assert.ok(!right.includes('개 정답'));
  assert.ok(!right.includes('정답은'));
});

test('skipping a question remains neutral until the final results', () => {
  const html = render({answer: null});
  assert.equal(html, render({answer: null, correct: 'D'}));
  assert.ok(html.includes('이 문제는 건너뛰었어요.'));
  assert.ok(!html.includes('aria-pressed="true"'));
  assert.ok(!html.includes('오답'));
});
