import { bnccRoot, collectDiscoverableIds, breadcrumbLabel } from './bncc-tree.js';
import { loadDiscovered, saveDiscovered } from './storage.js';
import { createPanel } from './panel.js';
import { createUniverse } from './universe.js';

const validIds = collectDiscoverableIds();
const discovered = loadDiscovered(validIds);
const persist = () => saveDiscovered(discovered);

const panel = createPanel({
  discovered,
  topicCount: validIds.length,
  onPersist: persist
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

const universe = createUniverse(document.getElementById('space'), bnccRoot, {
  onLeafSelect: (node) => panel.openTopic(node),
  onNavigate: updateCrumb
});

backBtn.onclick = () => universe.goUp();

document.getElementById('begin').onclick = () => {
  document.getElementById('start').style.display = 'none';
  universe.start();
};
