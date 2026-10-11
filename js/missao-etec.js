import { normalizeBnccCode } from './bncc-csv.js';

const SECTION_COLORS = {
  'língua portuguesa': 0x6eabff,
  matemática: 0xffb65c,
  biologia: 0x74e36f,
  física: 0xf27ec4,
  química: 0xc9a0ff,
  geografia: 0x65c8ff,
  história: 0xe8a87c,
  cidadania: 0xffc96e,
  ambientais: 0x8dffb0,
  default: 0x81f1df
};

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function slug(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

function sectionColor(name) {
  const n = (name || '').toLowerCase();
  for (const [key, color] of Object.entries(SECTION_COLORS)) {
    if (key !== 'default' && n.includes(key)) return color;
  }
  return SECTION_COLORS.default;
}

function parseSectionRow(row) {
  let sectionName = '';
  let prova = '';
  row.forEach((cell) => {
    const t = (cell || '').trim();
    const m = /^(\d+)\.\s*(.+)$/.exec(t);
    if (m) sectionName = m[2].trim();
    if (/prova\s+\d+/i.test(t)) prova = t;
  });
  if (!sectionName) return null;
  return { sectionName, prova };
}

function isBnccSkillCode(code) {
  return /^(EI|EF|EM)/i.test(code);
}

function missionNode({ prova, section, codeRaw, tema, questao, extras }) {
  const code = isBnccSkillCode(codeRaw) ? normalizeBnccCode(codeRaw) : '';
  const id = `etec-${slug(prova)}-${slug(section)}-q${questao}-${slug(code || codeRaw)}`;
  const color = sectionColor(section);
  const gabarito = (extras.gabarito || '').trim();
  const hasQuiz = Boolean(gabarito && extras.resposta !== undefined);

  return {
    id,
    name: code ? `${code}` : codeRaw.slice(0, 24),
    emoji: '🎯',
    color,
    cat: `Missão ETEC · ${section}`,
    materia: section,
    code: code || null,
    codeRaw,
    questao: String(questao || '').trim(),
    prova,
    tema,
    summary: tema,
    facts: [
      tema,
      `Questão ${questao} · ${prova}`,
      code ? `Habilidade BNCC: ${code}` : `Referência: ${codeRaw}`
    ],
    codes: code ? [code] : [],
    anotacao: (extras.dicas || '').trim(),
    videoUrl: (extras.video || '').trim(),
    imagemUrl: (extras.imagens || '').trim(),
    explicacao: (extras.explicacao || '').trim(),
    gabarito,
    respostaAluno: (extras.resposta || '').trim(),
    etecMission: true,
    bnccSkill: Boolean(code),
    question: hasQuiz ? `Gabarito ETEC (questão ${questao}): qual alternativa está correta?` : null,
    answers: hasQuiz ? [gabarito, 'Alternativa B', 'Alternativa C'] : [],
    correct: hasQuiz ? 0 : undefined
  };
}

export function parseMissaoEtecCsv(csvText) {
  const rows = parseCsv(csvText);
  const byProva = new Map();
  let currentProva = 'prova 2026 1 sem';
  let currentSection = 'Geral';

  rows.forEach((row) => {
    const section = parseSectionRow(row);
    if (section) {
      if (section.prova) currentProva = section.prova;
      currentSection = section.sectionName;
      return;
    }

    const codeCell = (row[0] || '').trim();
    if (!codeCell || codeCell === 'Código BNCC relacionado' || codeCell.startsWith('-')) return;

    const tema = (row[1] || '').trim();
    const questao = (row[2] || '').trim();
    const prova = (row[3] || '').trim() || currentProva;
    if (/prova\s+\d+/i.test(prova)) currentProva = prova;

    if (!tema && !questao) return;

    const node = missionNode({
      prova: currentProva,
      section: currentSection,
      codeRaw: codeCell,
      tema,
      questao,
      extras: {
        resposta: row[4],
        gabarito: row[5],
        explicacao: row[6],
        video: row[7],
        dicas: row[8],
        imagens: row[9]
      }
    });

    if (!byProva.has(currentProva)) byProva.set(currentProva, new Map());
    const bySection = byProva.get(currentProva);
    if (!bySection.has(currentSection)) bySection.set(currentSection, []);
    bySection.get(currentSection).push(node);
  });

  const allMissions = [];
  const provaBranches = [...byProva.entries()].map(([provaName, sections]) => {
    const sectionBranches = [...sections.entries()].map(([sectionName, missions]) => {
      missions.sort((a, b) => Number(a.questao) - Number(b.questao));
      allMissions.push(...missions);
      return {
        id: `etec-sec-${slug(provaName)}-${slug(sectionName)}`,
        name: sectionName,
        emoji: '📚',
        color: sectionColor(sectionName),
        cat: 'Missão ETEC',
        children: missions
      };
    });
    return {
      id: `etec-prova-${slug(provaName)}`,
      name: provaName.replace(/^prova\s+/i, 'Prova '),
      emoji: '📝',
      color: 0x81f1df,
      cat: 'Missão ETEC',
      children: sectionBranches
    };
  });

  return {
    allMissions,
    branch: {
      id: 'prep-etec',
      name: 'Missão ETEC',
      emoji: '🎯',
      color: 0x81f1df,
      cat: 'Preparatório',
      children: provaBranches
    }
  };
}
