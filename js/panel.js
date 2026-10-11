export function createPanel({ discovered, topicCount, onPersist }) {
  let active = null;
  const panel = document.getElementById('panel');
  const learnedBtn = document.getElementById('learned');
  const quizTask = document.getElementById('quizTask');

  function learnedLabel(id) {
    return discovered.has(id)
      ? '🌟 Descoberto! Clique para desfazer'
      : '✨ Marcar como descoberto';
  }

  function updateScore() {
    document.getElementById('score').textContent =
      `⭐ Descobertas: ${discovered.size}/${topicCount}`;
  }

  function toggleDiscovered(id) {
    if (discovered.has(id)) discovered.delete(id);
    else discovered.add(id);
    onPersist();
    updateScore();
    if (active?.id === id) learnedBtn.textContent = learnedLabel(id);
  }

  function openTopic(t) {
    active = t;
    panel.classList.remove('hidden');
    document.getElementById('category').textContent = t.cat || 'BNCC';
    document.getElementById('title').textContent = `${t.emoji || ''} ${t.name}`.trim();
    document.getElementById('summary').textContent = t.summary || '';
    const facts = t.facts || [];
    document.getElementById('facts').innerHTML = facts.length
      ? `<ul>${facts.map((f) => `<li>${f}</li>`).join('')}</ul>`
      : '<p style="margin:0;color:#a9bddf">Sem tópicos listados nesta camada.</p>';
    const hasQuiz = t.question && t.answers?.length;
    quizTask.classList.toggle('hidden', !hasQuiz);
    document.getElementById('question').textContent = hasQuiz ? t.question : '';
    document.getElementById('quizResult').textContent = '';
    const ans = document.getElementById('answers');
    ans.innerHTML = '';
    if (hasQuiz) {
      t.answers.forEach((a, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'quiz-answer';
        b.textContent = a;
        b.onclick = () => {
          const ok = i === t.correct;
          document.getElementById('quizResult').textContent = ok
            ? '🎉 Isso mesmo! Descoberta desbloqueada!'
            : 'Quase! Tente novamente e releia as ideias essenciais.';
          if (ok) {
            discovered.add(t.id);
            onPersist();
            updateScore();
            learnedBtn.textContent = learnedLabel(t.id);
          }
        };
        ans.appendChild(b);
      });
    }
    const codes = t.codes || [];
    document.getElementById('codes').innerHTML = codes.length
      ? codes.map((c) => `<span class="chip">${c}</span>`).join('')
      : '<span class="chip">A definir</span>';
    learnedBtn.textContent = learnedLabel(t.id);
  }

  document.getElementById('close').onclick = () => panel.classList.add('hidden');
  learnedBtn.onclick = () => {
    if (!active) return;
    toggleDiscovered(active.id);
  };

  updateScore();

  return { openTopic, updateScore };
}
