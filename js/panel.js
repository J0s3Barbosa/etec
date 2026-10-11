import {
  markNodeComplete,
  isCodeComplete,
  etecCodeProgress,
  normalizeCode
} from './progress.js';
import { saveProgress } from './storage.js';

export function createPanel({ progress, onPersist, onProgressChange }) {
  let active = null;
  const panel = document.getElementById('panel');
  const learnedBtn = document.getElementById('learned');
  const quizTask = document.getElementById('quizTask');

  function persistAll() {
    saveProgress(progress.ids, progress.codes);
    onPersist?.();
    onProgressChange?.();
  }

  function learnedLabel(node) {
    const done = node.id && progress.ids.has(node.id);
    const codeDone = node.code && isCodeComplete(progress, node.code);
    if (done || codeDone) return '🌟 Concluído! Clique para desfazer';
    return '✨ Marcar como descoberto';
  }

  function updateScore() {
    document.getElementById('score').textContent =
      `⭐ Missões: ${progress.ids.size} · Códigos: ${progress.codes.size}`;
  }

  function toggleDiscovered(node) {
    const code = node.code && normalizeCode(node.code);
    const wasDone =
      (node.id && progress.ids.has(node.id)) || (code && progress.codes.has(code));
    if (wasDone) {
      if (node.id) progress.ids.delete(node.id);
      if (code) progress.codes.delete(code);
      if (node.codes) node.codes.forEach((c) => progress.codes.delete(normalizeCode(c)));
    } else {
      markNodeComplete(progress, node);
    }
    persistAll();
    updateScore();
    if (active?.id === node.id) learnedBtn.textContent = learnedLabel(node);
  }

  function showBnccProgress(node) {
    const el = document.getElementById('bnccProgress');
    if (!el) return;

    if (node.etecMission && node.code) {
      const link = etecCodeProgress(progress, node.code);
      el.classList.remove('hidden');
      el.querySelector('.bar-fill').style.width = progress.ids.has(node.id) ? '100%' : '0%';
      el.querySelector('.bar-label').textContent = link
        ? `Missão ETEC · ${link.done}/${link.total} questões com este código na planilha`
        : 'Missão ETEC · questão da planilha';
      return;
    }

    if (node.bnccSkill && node.code) {
      const link = etecCodeProgress(progress, node.code);
      el.classList.remove('hidden');
      const done = isCodeComplete(progress, node.code);
      if (link) {
        el.querySelector('.bar-fill').style.width = `${(link.done / link.total) * 100}%`;
        el.querySelector('.bar-label').textContent = `Missão ETEC · ${link.done}/${link.total} questões (${node.code})`;
      } else {
        el.querySelector('.bar-fill').style.width = done ? '100%' : '0%';
        el.querySelector('.bar-label').textContent = done
          ? '✓ Habilidade concluída'
          : 'Sem questão ETEC ligada a este código';
      }
      return;
    }

    el.classList.add('hidden');
  }

  function openTopic(t) {
    active = t;
    panel.classList.remove('hidden');
    document.getElementById('category').textContent = t.cat || 'BNCC';
    const titleExtra = t.questao ? ` · Q${t.questao}` : t.skillCode ? ` · ${t.skillCode}` : '';
    document.getElementById('title').textContent = `${t.emoji || ''} ${t.name}${titleExtra}`.trim();
    let summary = t.tema || t.summary || '';
    if (t.mediaKind === 'video') summary = `${summary}\n\n${t.summary}`;
    if (t.mediaKind === 'imagem') summary = `${summary}\n\n${t.summary}`;
    if (t.mediaKind === 'dicas' && t.anotacao) summary = t.anotacao;
    if (t.explicacao && !t.mediaKind) summary = `${summary}\n\n${t.explicacao}`;
    document.getElementById('summary').textContent = summary;
    const facts = t.facts || [];
    document.getElementById('facts').innerHTML = facts.length
      ? `<ul>${facts.map((f) => `<li>${f}</li>`).join('')}</ul>`
      : '<p style="margin:0;color:#a9bddf">Sem tópicos listados nesta camada.</p>';
    const hasQuiz = (t.question && t.answers?.length) || t.mediaKind === 'quiz';
    quizTask.classList.toggle('hidden', !hasQuiz);
    document.getElementById('question').textContent = hasQuiz ? t.question : '';
    document.getElementById('quizResult').textContent = '';
    const ans = document.getElementById('answers');
    ans.innerHTML = '';
    if (hasQuiz && t.answers?.length) {
      t.answers.forEach((a, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'quiz-answer';
        b.textContent = a;
        b.onclick = () => {
          const ok = i === t.correct;
          document.getElementById('quizResult').textContent = ok
            ? '🎉 Correto! Progresso salvo na BNCC e na Missão ETEC.'
            : 'Quase! Releia o tema e as dicas.';
          if (ok) {
            markNodeComplete(progress, t);
            if (t.skillCode) {
              const parent = progress;
              parent.codes.add(normalizeCode(t.skillCode));
            }
            persistAll();
            updateScore();
            learnedBtn.textContent = learnedLabel(t);
            showBnccProgress(t);
          }
        };
        ans.appendChild(b);
      });
    }
    const codes = t.codes || (t.code ? [t.code] : []);
    document.getElementById('codes').innerHTML = codes.length
      ? codes
          .map((c) => {
            const done = isCodeComplete(progress, c);
            return `<span class="chip${done ? ' chip-done' : ''}">${c}${done ? ' ✓' : ''}</span>`;
          })
          .join('')
      : t.codeRaw
        ? `<span class="chip">${t.codeRaw}</span>`
        : '<span class="chip">A definir</span>';
    learnedBtn.textContent = learnedLabel(t);
    showBnccProgress(t);
  }

  document.getElementById('close').onclick = () => panel.classList.add('hidden');
  learnedBtn.onclick = () => {
    if (!active) return;
    toggleDiscovered(active);
    showBnccProgress(active);
  };

  updateScore();

  return { openTopic, updateScore };
}
