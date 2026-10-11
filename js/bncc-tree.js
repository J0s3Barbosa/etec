import { topics } from './topics.js';
import { eiS1B1Skills, genericBimestreSkills } from './mindmap-samples.js';

function bimestreNode(parentId, n, prefix, color, skills) {
  const id = `${parentId}-b${n}`;
  return {
    id,
    name: `${n}º bimestre`,
    emoji: '📅',
    color,
    cat: 'Período letivo',
    summary: `${prefix} · ${n}º bimestre — escolha uma habilidade.`,
    facts: ['Cada habilidade abre um mapa de bolinhas conectadas.'],
    codes: [],
    question: null,
    children: skills
  };
}

function bimestreNodes(parentId, prefix, color, skillFactory) {
  return [1, 2, 3, 4].map((n) => {
    const id = `${parentId}-b${n}`;
    return bimestreNode(parentId, n, prefix, color, skillFactory(id, n));
  });
}

function seriesWithBimestres(id, label, emoji, color, segment, skillFactory) {
  return {
    id,
    name: label,
    emoji,
    color,
    cat: segment,
    children: bimestreNodes(id, `${segment} · ${label}`, color, (bid, bn) =>
      skillFactory ? skillFactory(bid, bn, color) : genericBimestreSkills(bid, color, [`${segment}${bn}`])
    )
  };
}

function anosWithBimestres(segmentId, segmentName, emoji, color, count, labelFn, codesForYear) {
  const children = [];
  for (let y = 1; y <= count; y++) {
    const id = `${segmentId}-ano-${y}`;
    const name = labelFn(y);
    const codes = codesForYear?.(y) ?? [`EF${String(y).padStart(2, '0')}CI01`, `EF${String(y).padStart(2, '0')}CI02`];
    children.push({
      id,
      name,
      emoji: '📘',
      color,
      cat: segmentName,
      children: bimestreNodes(id, `${segmentName} · ${name}`, color, (bid) =>
        genericBimestreSkills(bid, color, codes)
      )
    });
  }
  return children;
}

function eiBranch() {
  const color = 0xffc96e;
  return {
    id: 'ei',
    name: 'Educação Infantil',
    emoji: '🧸',
    color,
    cat: 'BNCC · EI',
    summary: 'Campos de experiência e séries da educação infantil.',
    children: [
      seriesWithBimestres('ei-s1', '1ª série', '🌱', color, 'EI', (bid, bn, c) =>
        bn === 1 ? eiS1B1Skills(c) : genericBimestreSkills(bid, c, ['EI03EO01', 'EI03TS01'])
      ),
      seriesWithBimestres('ei-s2', '2ª série', '🌿', color, 'EI'),
      {
        id: 'ei-creche',
        name: 'Berçário',
        emoji: '👶',
        color,
        cat: 'EI',
        summary: 'Sem bimestres — habilidades diretas.',
        facts: ['Escolha uma habilidade para explorar o mapa.'],
        codes: [],
        question: null,
        children: genericBimestreSkills('ei-creche', color, ['EI02EO01', 'EI02CG05'])
      }
    ]
  };
}

function efBranch() {
  const color = 0x6ee7a8;
  return {
    id: 'ef',
    name: 'Ensino Fundamental',
    emoji: '📗',
    color,
    cat: 'BNCC · EF',
    children: anosWithBimestres('ef', 'Ensino Fundamental', '📗', color, 9, (y) => `${y}º ano`, (y) => {
      const p = String(y + 5).padStart(2, '0');
      return [`EF${p}CI01`, `EF${p}CI02`, `EF${p}CI03`];
    })
  };
}

function emBranch() {
  const color = 0x7eb6ff;
  return {
    id: 'em',
    name: 'Ensino Médio',
    emoji: '🎓',
    color,
    cat: 'BNCC · EM',
    children: anosWithBimestres('em', 'Ensino Médio', '🎓', color, 3, (y) => `${y}º ano`, (y) => {
      const p = String(y + 5).padStart(2, '0');
      return [`EM13CNT101`, `EM13CNT201`, `EM13CNT301`];
    })
  };
}

function preparatorioBranch() {
  const color = 0x47e0c4;
  return {
    id: 'prep',
    name: 'Preparatório',
    emoji: '🚀',
    color,
    cat: 'ETEC',
    children: [
      {
        id: 'prep-etec',
        name: 'Missão ETEC',
        emoji: '🎯',
        color: 0x81f1df,
        cat: 'Preparatório',
        children: topics.map((t) => ({ ...t, cat: t.cat || 'Missão ETEC' }))
      }
    ]
  };
}

export const bnccRoot = {
  id: 'root',
  name: 'BNCC',
  emoji: '🧬',
  color: 0x4de0cd,
  cat: 'Universo',
  children: [eiBranch(), efBranch(), emBranch(), preparatorioBranch()]
};

function walkNodes(node, visit) {
  visit(node);
  node.children?.forEach((c) => walkNodes(c, visit));
  node.mindMap?.forEach((c) => walkNodes(c, visit));
}

export function collectDiscoverableIds(node = bnccRoot, out = []) {
  walkNodes(node, (n) => {
    if (!n.children?.length && !n.mindMap?.length && n.id && n.summary) out.push(n.id);
  });
  return out;
}

export function breadcrumbLabel(stack, viewMode) {
  const base = stack.map((n) => n.name).join(' › ');
  return viewMode === 'mindmap' ? `${base} · mapa` : base;
}
