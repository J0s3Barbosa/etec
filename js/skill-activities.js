export function buildSkillActivities(skill) {
  const tips = (skill.anotacao || '').trim();
  const tipLines = tips
    ? tips.split(/\n|;/).map((s) => s.trim()).filter(Boolean)
    : ['Preencha a coluna dicas na planilha Missão ETEC.'];

  const videoHint = skill.videoUrl
    ? skill.videoUrl
    : 'Adicione o link na coluna video da planilha Missão ETEC.';
  const imageHint = skill.imagemUrl
    ? skill.imagemUrl
    : 'Adicione o link na coluna imagens da planilha Missão ETEC.';

  const quizAnswers =
    skill.answers?.length && skill.question
      ? skill.answers
      : ['Revisar o tema da questão', 'Pular sem estudar', 'Outro assunto'];
  const quizCorrect = skill.answers?.length && skill.question ? skill.correct ?? 0 : 0;
  const quizQuestion =
    skill.question ||
    `Questão ${skill.questao || '?'}: confirme que revisou o tema «${(skill.tema || skill.summary || '').slice(0, 80)}»`;

  return [
    {
      id: `${skill.id}-video`,
      name: 'Vídeo',
      emoji: '🎬',
      color: 0xe85d9b,
      cat: skill.materia || skill.cat,
      materia: skill.materia || skill.cat,
      mediaKind: 'video',
      summary: videoHint,
      facts: skill.explicacao ? [skill.explicacao] : [skill.summary],
      codes: skill.codes,
      skillCode: skill.code,
      parentMissionId: skill.id
    },
    {
      id: `${skill.id}-imagem`,
      name: 'Imagem',
      emoji: '🖼️',
      color: 0xf2b56b,
      cat: skill.materia || skill.cat,
      materia: skill.materia || skill.cat,
      mediaKind: 'imagem',
      summary: imageHint,
      facts: [skill.summary],
      codes: skill.codes,
      skillCode: skill.code,
      parentMissionId: skill.id
    },
    {
      id: `${skill.id}-quiz`,
      name: 'Quiz',
      emoji: '❓',
      color: 0x9d85ff,
      cat: skill.materia || skill.cat,
      materia: skill.materia || skill.cat,
      mediaKind: 'quiz',
      summary: skill.summary,
      facts: skill.gabarito ? [`Gabarito planilha: ${skill.gabarito}`] : [skill.summary],
      codes: skill.codes,
      skillCode: skill.code,
      question: quizQuestion,
      answers: quizAnswers,
      correct: quizCorrect,
      parentMissionId: skill.id
    },
    {
      id: `${skill.id}-dicas`,
      name: 'Dicas',
      emoji: '💡',
      color: 0x65e6c5,
      cat: skill.materia || skill.cat,
      materia: skill.materia || skill.cat,
      mediaKind: 'dicas',
      summary: tips || 'Sem dicas na planilha.',
      facts: tipLines,
      codes: skill.codes,
      skillCode: skill.code,
      anotacao: tips,
      parentMissionId: skill.id
    }
  ];
}
