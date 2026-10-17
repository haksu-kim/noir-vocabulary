export function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function getPool(words, days, wrongIds = null) {
  const selected = new Set(days);
  return words.filter(w => w.days.some(day => selected.has(day)) && (!wrongIds || wrongIds.has(w.id)));
}
export function createQuiz(pool, allWords, count, direction = 'en-ko', random = Math.random) {
  return shuffle(pool, random).slice(0, Math.max(0, count)).map(word => {
    const field = direction === 'en-ko' ? 'meaning' : 'word';
    const correct = word[field];
    const candidates = shuffle(allWords.filter(w => w.id !== word.id && w.meaning !== word.meaning), random);
    const distractors = [...new Set(candidates.map(w => w[field]))].filter(x => x !== correct).slice(0, 3);
    return {id: word.id, word: word.word, meaning: word.meaning, days: word.days, prompt: direction === 'en-ko' ? word.word : word.meaning, correct, choices: shuffle([correct, ...distractors], random), answer: null, answered: false};
  });
}
export function quizSummary(questions) {
  const correct = questions.filter(q => q.answered && q.answer === q.correct).length;
  return {total: questions.length, correct, wrong: questions.filter(q => q.answer !== q.correct), score: questions.length ? Math.round(correct / questions.length * 100) : 0};
}
export function answerQuestion(question, answer) {
  if (answer !== null && !question.choices.includes(answer)) return false;
  const cancel = answer !== null && question.answered && question.answer === answer;
  question.answer = cancel ? null : answer;
  question.answered = !cancel;
  return true;
}
