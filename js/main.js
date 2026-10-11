import { buildBnccTreeFromCsv, collectDiscoverableIds, breadcrumbLabel } from './bncc-tree.js';
import { loadProgress, saveProgress, registerEtecMissions } from './storage.js';
import { createPanel } from './panel.js';
import { createQuizModal } from './quiz-modal.js';
import { markNodeComplete, normalizeCode } from './progress.js';
import { createUniverse } from './universe.js';
import { parseMissaoEtecCsv } from './missao-etec.js';
import { setEtecProvaBank, applyProvaToNode } from './etec-prova-bank.js';
import { buildSkillActivities } from './skill-activities.js';

const statusEl = document.getElementById('status');
let panel;
let universe;

let progressDebounce;

async function boot() {
  try {
    statusEl.textContent = 'Carregando planilhas…';
    const [csv, etecCsv, provaBank, provaCurated] = await Promise.all([
      fetch('./data/bncc.csv').then((r) => {
        if (!r.ok) throw new Error(`BNCC CSV ${r.status}`);
        return r.text();
      }),
      fetch('./data/missao-etec.csv').then((r) => {
        if (!r.ok) throw new Error(`Missão ETEC CSV ${r.status}`);
        return r.text();
      }),
      fetch('./data/etec-provas.json')
        .then((r) => (r.ok ? r.json() : {}))
        .catch(() => ({})),
      fetch('./data/etec-provas-curated.json')
        .then((r) => (r.ok ? r.json() : {}))
        .catch(() => ({}))
    ]);

    setEtecProvaBank(provaBank, provaCurated);
    statusEl.textContent = 'Montando Missão ETEC…';
    const etecData = parseMissaoEtecCsv(etecCsv);
    registerEtecMissions(etecData.allMissions);

    statusEl.textContent = 'Montando árvore BNCC…';
    await new Promise((r) => requestAnimationFrame(r));
    const bnccRoot = buildBnccTreeFromCsv(csv, etecData.branch);
    const validIds = collectDiscoverableIds(bnccRoot);
    const progress = loadProgress(validIds);

    const onProgressChange = () => {
      clearTimeout(progressDebounce);
      progressDebounce = setTimeout(() => universe?.rebuildCurrentLayer(), 100);
    };

    const quizModal = createQuizModal({
      onAnswered: (node, ok) => {
        if (!ok) return;
        markNodeComplete(progress, node);
        if (node.skillCode) progress.codes.add(normalizeCode(node.skillCode));
        if (node.parentMissionId) progress.ids.add(node.parentMissionId);
        saveProgress(progress.ids, progress.codes);
        onProgressChange();
        panel?.updateScore();
      }
    });

    function openProvaQuizFromMission(mission) {
      applyProvaToNode(mission);
      const activities = buildSkillActivities(mission);
      const quiz = activities.find((a) => a.mediaKind === 'quiz');
      if (quiz) quizModal.openQuiz(quiz);
    }

    panel = createPanel({
      progress,
      onPersist: () => saveProgress(progress.ids, progress.codes),
      onProgressChange,
      openQuiz: (node) => quizModal.openQuiz(node),
      openProvaQuiz: openProvaQuizFromMission
    });

    const crumb = document.getElementById('crumb');
    const backBtn = document.getElementById('navBack');

    function updateCrumb({ stack, rootLayersOpen, viewMode }) {
      if (!rootLayersOpen && stack.length === 1 && stack[0].id === bnccRoot.id) {
        crumb.textContent = 'Toque no núcleo · BNCC';
        backBtn.classList.add('hidden');
        return;
      }
      crumb.textContent = breadcrumbLabel(stack, viewMode);
      backBtn.classList.remove('hidden');
    }

    universe = createUniverse(document.getElementById('space'), bnccRoot, {
      onLeafSelect: (node) => panel.openTopic(node),
      onNavigate: updateCrumb,
      progress
    });

    backBtn.onclick = () => universe.goUp();
    const skipped = bnccRoot.meta?.skippedCodes ?? 0;
    const saved = progress.ids.size + progress.codes.size;
    const provaKeys = Object.keys(provaBank || {}).length;
    statusEl.textContent = `Pronto · ${etecData.allMissions.length} missões ETEC · ${provaKeys} prova(s) no banco · progresso: ${saved}.`;
  } catch (e) {
    statusEl.textContent = 'Erro ao carregar CSVs — use servidor HTTP local.';
    console.error(e);
  }
}

const beginBtn = document.getElementById('begin');
beginBtn.disabled = true;
boot().finally(() => {
  if (universe) beginBtn.disabled = false;
});

beginBtn.onclick = () => {
  if (!universe) {
    statusEl.textContent = 'Ainda carregando… aguarde ou use http://127.0.0.1:8765';
    return;
  }
  document.getElementById('start').style.display = 'none';
  universe.start();
};
