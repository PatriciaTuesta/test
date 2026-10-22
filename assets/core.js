/* Motor independiente de la interfaz. Los IDs, nunca el orden visual,
   determinan las respuestas correctas. No requiere dependencias. */

const idPattern = /^[a-z0-9][a-z0-9._-]*$/;
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const isId = value => typeof value === 'string' && idPattern.test(value) && !['constructor','prototype','__proto__'].includes(value);
const isText = value => typeof value === 'string' && value.trim().length > 0;
const has = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

export function validateBank(bank, expectedLevelId) {
  const errors = [];
  const check = (condition, message) => { if (!condition && errors.length < 25) errors.push(message); };
  check(isObject(bank), 'El archivo debe contener un objeto JSON.');
  if (!isObject(bank)) return errors;
  check(bank.schemaVersion === 1, 'schemaVersion debe ser 1.');
  check(isId(bank.bankId), 'bankId debe ser un identificador válido.');
  check(isText(bank.version), 'Falta version del banco.');
  check(isText(bank.title), 'Falta title del banco.');
  check(Array.isArray(bank.sources), 'sources debe ser un arreglo.');
  const sourceIds = new Set();
  for (const [i, source] of (Array.isArray(bank.sources) ? bank.sources : []).entries()) {
    if (!isObject(source)) { check(false, `sources[${i}] debe ser un objeto.`); continue; }
    check(isId(source.id) && !sourceIds.has(source.id), `sources[${i}].id no es válido o está duplicado.`);
    check(isText(source.title) && isText(source.note), `sources[${i}] necesita title y note.`);
    sourceIds.add(source.id);
  }
  const checkSourceRefs = (refs, path) => {
    if (refs === undefined) return;
    check(Array.isArray(refs) && refs.every(id => sourceIds.has(id)), `${path}.sourceIds contiene referencias inválidas.`);
  };
  const config = bank.settings;
  check(isObject(config), 'Falta settings.');
  if (isObject(config)) {
    check(Number.isInteger(config.examLength) && config.examLength >= 1 && config.examLength <= 100, 'settings.examLength debe ser un entero entre 1 y 100.');
    check(Number.isInteger(config.defaultMinutes) && config.defaultMinutes >= 0 && config.defaultMinutes <= 240, 'settings.defaultMinutes debe estar entre 0 y 240.');
    check(Number.isFinite(config.passPercent) && config.passPercent >= 0 && config.passPercent <= 100, 'settings.passPercent debe estar entre 0 y 100.');
    check(typeof config.shuffleOptions === 'boolean', 'settings.shuffleOptions debe ser booleano.');
  }
  const level = bank.level;
  check(isObject(level), 'Falta level.');
  if (!isObject(level)) return errors;
  check(isId(level.id), 'level.id no es válido.');
  if (expectedLevelId) check(level.id === expectedLevelId, `Este archivo debe corresponder al nivel ${expectedLevelId}.`);
  check(isText(level.code) && isText(level.title) && isText(level.description) && isText(level.objective), 'level necesita code, title, description y objective.');
  check(Array.isArray(level.topics) && level.topics.length > 0, 'level.topics debe contener al menos un tema.');
  const topicIds = new Set(), subtopicIds = new Map();
  for (const [i, topic] of (Array.isArray(level.topics) ? level.topics : []).entries()) {
    const path = `level.topics[${i}]`;
    if (!isObject(topic)) { check(false, `${path} debe ser un objeto.`); continue; }
    check(isId(topic.id) && !topicIds.has(topic.id), `${path}.id no es válido o está duplicado.`);
    topicIds.add(topic.id);
    check(isText(topic.title), `${path}.title no puede estar vacío.`);
    checkSourceRefs(topic.sourceIds,path);
    check(Number.isFinite(topic.order), `${path}.order debe ser un número.`);
    check(Array.isArray(topic.subtopics) && topic.subtopics.length > 0, `${path}.subtopics no puede estar vacío.`);
    for (const [j, sub] of (Array.isArray(topic.subtopics) ? topic.subtopics : []).entries()) {
      if (!isObject(sub)) { check(false, `${path}.subtopics[${j}] debe ser un objeto.`); continue; }
      check(isId(sub.id) && !subtopicIds.has(sub.id), `${path}.subtopics[${j}].id no es válido o está duplicado.`);
      check(isText(sub.title), `${path}.subtopics[${j}].title no puede estar vacío.`);
      subtopicIds.set(sub.id, topic.id);
    }
  }
  check(Array.isArray(bank.questions), 'questions debe ser un arreglo.');
  const questionIds = new Set();
  for (const [i, q] of (Array.isArray(bank.questions) ? bank.questions : []).entries()) {
    const path = `questions[${i}]`;
    if (!isObject(q)) { check(false, `${path} debe ser un objeto.`); continue; }
    check(isId(q.id) && !questionIds.has(q.id), `${path}.id no es válido o está duplicado.`);
    questionIds.add(q.id);
    check(q.levelId === level.id, `${path}.levelId no corresponde a este nivel.`);
    check(topicIds.has(q.topicId), `${path}.topicId no existe.`);
    check(subtopicIds.has(q.subtopicId) && subtopicIds.get(q.subtopicId) === q.topicId, `${path}.subtopicId no pertenece a ese tema.`);
    check(['single-choice', 'true-false'].includes(q.type), `${path}.type debe ser single-choice o true-false.`);
    check(isText(q.prompt) && isText(q.explanation), `${path} necesita prompt y explanation.`);
    checkSourceRefs(q.sourceIds,path);
    check(q.context === undefined || isText(q.context), `${path}.context debe ser texto no vacío.`);
    check(q.enabled === undefined || typeof q.enabled === 'boolean', `${path}.enabled debe ser booleano.`);
    const options = Array.isArray(q.options) ? q.options : [];
    check(options.length >= 2 && options.length <= 6, `${path}.options necesita entre 2 y 6 opciones.`);
    const optionIds = new Set(), optionTexts = new Set();
    for (const opt of options) {
      if (!isObject(opt)) { check(false, `${path}: una opción no es un objeto.`); continue; }
      check(isId(opt.id) && !optionIds.has(opt.id), `${path}: ID de opción inválido o duplicado.`);
      check(isText(opt.text) && !optionTexts.has(opt.text.trim()), `${path}: texto de opción vacío o duplicado.`);
      optionIds.add(opt.id);
      if (typeof opt.text === 'string') optionTexts.add(opt.text.trim());
    }
    check(isId(q.answerId) && optionIds.has(q.answerId), `${path}.answerId no coincide con una opción.`);
    if (q.type === 'true-false') check(options.length === 2 && optionIds.has('true') && optionIds.has('false'), `${path}: true-false requiere las opciones true y false.`);
  }
  return errors;
}

export function buildIndex(bank) {
  const topics = new Map(), subtopics = new Map(), questions = new Map();
  const byTopic = new Map(), bySubtopic = new Map();
  for (const topic of bank.level.topics) {
    topics.set(topic.id, topic);
    byTopic.set(topic.id, []);
    for (const sub of topic.subtopics) { subtopics.set(sub.id, sub); bySubtopic.set(sub.id, []); }
  }
  for (const q of bank.questions) {
    if (q.enabled === false) continue;
    questions.set(q.id, q);
    byTopic.get(q.topicId).push(q);
    bySubtopic.get(q.subtopicId).push(q);
  }
  return {topics, subtopics, questions, byTopic, bySubtopic};
}

function random() {
  if (globalThis.crypto?.getRandomValues) return crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
  return Math.random();
}

export function shuffled(values, rng = random) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function createRun(bank, index, topicId, options = {}, rng = random) {
  const {subtopicId = '', mode = 'exam', minutes = bank.settings.defaultMinutes} = options;
  if (!['exam','practice'].includes(mode)) throw new Error('Modo de evaluación no válido.');
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > 240) throw new Error('Duración no válida.');
  if (!index.topics.has(topicId)) throw new Error('No se encuentra el tema.');
  if (subtopicId && !index.topics.get(topicId).subtopics.some(s => s.id === subtopicId)) throw new Error('El subtema no pertenece al tema.');
  const pool = subtopicId ? index.bySubtopic.get(subtopicId) : index.byTopic.get(topicId);
  const count = Math.min(bank.settings.examLength, pool.length);
  if (!count) throw new Error('Este tema todavía no tiene preguntas.');
  if (mode === 'exam' && count < bank.settings.examLength) throw new Error(`Este examen necesita ${bank.settings.examLength} preguntas distintas. Hay ${count}.`);
  const chosen = shuffled(pool, rng).slice(0, count);
  const startedAt = Date.now();
  return {
    schemaVersion: 1, id: globalThis.crypto?.randomUUID?.() || `${startedAt}-${Math.random().toString(36).slice(2)}`,
    bankId: bank.bankId, bankVersion: bank.version, levelId: bank.level.id, topicId, subtopicId, mode, minutes,
    startedAt, deadline: minutes ? startedAt + minutes * 60000 : null,
    questionIds: chosen.map(q => q.id),
    optionOrders: Object.fromEntries(chosen.map(q => [q.id, (bank.settings.shuffleOptions && q.type !== 'true-false' ? shuffled(q.options, rng) : q.options).map(o => o.id)])),
    position: 0, answers: {}, flags: [], checked: []
  };
}

export function isValidRun(run, bank, index) {
  if (!isObject(run) || run.schemaVersion !== 1 || typeof run.id !== 'string' || !run.id) return false;
  if (run.bankId !== bank.bankId || run.bankVersion !== bank.version || run.levelId !== bank.level.id) return false;
  if (!index.topics.has(run.topicId) || !['exam','practice'].includes(run.mode)) return false;
  if (run.subtopicId && !index.topics.get(run.topicId).subtopics.some(s => s.id === run.subtopicId)) return false;
  if (!Array.isArray(run.questionIds) || !run.questionIds.length || run.questionIds.length > bank.settings.examLength || new Set(run.questionIds).size !== run.questionIds.length) return false;
  if (run.mode === 'exam' && run.questionIds.length !== bank.settings.examLength) return false;
  if (!Number.isInteger(run.position) || run.position < 0 || run.position >= run.questionIds.length) return false;
  if (!Number.isFinite(run.startedAt) || !Number.isInteger(run.minutes) || run.minutes < 0 || run.minutes > 240) return false;
  if (run.minutes === 0 ? run.deadline !== null : run.deadline !== run.startedAt + run.minutes * 60000) return false;
  if (!isObject(run.answers) || !isObject(run.optionOrders) || !Array.isArray(run.flags) || !Array.isArray(run.checked)) return false;
  const selected = new Set(run.questionIds);
  if ([...Object.keys(run.answers), ...run.flags, ...run.checked].some(id => !selected.has(id))) return false;
  for (const id of run.questionIds) {
    const q = index.questions.get(id);
    if (!q || q.topicId !== run.topicId || (run.subtopicId && q.subtopicId !== run.subtopicId)) return false;
    const order = run.optionOrders[id];
    if (!Array.isArray(order) || order.length !== q.options.length || new Set(order).size !== order.length || order.some(oid => !q.options.some(o => o.id === oid))) return false;
    if (has(run.answers, id) && !q.options.some(o => o.id === run.answers[id])) return false;
    if (run.checked.includes(id) && !has(run.answers, id)) return false;
  }
  return true;
}

export function scoreRun(run, index, now = Date.now()) {
  let correct = 0, wrong = 0, skipped = 0;
  const groups = new Map();
  const rows = run.questionIds.map(id => {
    const question = index.questions.get(id);
    const answerId = has(run.answers, id) ? run.answers[id] : null;
    const status = answerId === null ? 'skipped' : answerId === question.answerId ? 'correct' : 'wrong';
    if (status === 'correct') correct++; else if (status === 'wrong') wrong++; else skipped++;
    if (!groups.has(question.subtopicId)) groups.set(question.subtopicId, {id: question.subtopicId, title: index.subtopics.get(question.subtopicId).title, total: 0, correct: 0});
    const group = groups.get(question.subtopicId);
    group.total++; if (status === 'correct') group.correct++;
    return {question, answerId, status};
  });
  const total = rows.length;
  const end = run.deadline ? Math.min(now, run.deadline) : now;
  return {total, correct, wrong, skipped, percent: Math.round(correct / total * 100), grade: Math.round(correct / total * 200) / 10, elapsed: Math.max(0, end - run.startedAt), groups: [...groups.values()], rows};
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

export function formatDuration(ms) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 60).toString().padStart(2,'0')}:${(seconds % 60).toString().padStart(2,'0')}`;
}
