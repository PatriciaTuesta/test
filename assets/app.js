import { CATALOG } from './catalog.js';
import { validateBank, buildIndex, createRun, isValidRun, scoreRun, escapeHtml as e, formatDuration } from './core.js';

const $ = selector => document.querySelector(selector);
const main = $('#main'), modal = $('#modal');
const KEYS = {active: 'english-atlas.active.v1', history: 'english-atlas.history.v1'};
const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${{
  arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>', back:'<path d="M19 12H5m6-6-6 6 6 6"/>',
  search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  flag:'<path d="M5 21V3m0 1c5-4 9 4 14 0v10c-5 4-9-4-14 0"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>'
}[name] || ''}</svg>`;

function storageNotice() {
  const notice = $('#storage-notice');
  notice.hidden = false;
  notice.textContent = 'El navegador no permite guardar el progreso. Puedes seguir practicando durante esta visita.';
}
function read(key, fallback) {
  try { const raw = localStorage.getItem(KEYS[key]); return raw ? JSON.parse(raw) : fallback; }
  catch { storageNotice(); return fallback; }
}
function write(key, value) {
  try { value === null ? localStorage.removeItem(KEYS[key]) : localStorage.setItem(KEYS[key], JSON.stringify(value)); }
  catch { storageNotice(); }
}
const candidate = read('active', null);
const storedHistory = read('history', []);
const state = {
  view: 'home', bank: null, index: null, run: null, result: null,
  pending: candidate && CATALOG.some(l => l.id === candidate.levelId) ? candidate : null,
  history: Array.isArray(storedHistory) ? storedHistory.filter(h => h && CATALOG.some(l => l.id === h.levelId) && typeof h.id === 'string' && typeof h.topicTitle === 'string' && Number.isFinite(h.percent) && h.percent >= 0 && h.percent <= 100 && Number.isFinite(h.finishedAt) && Number.isFinite(h.total) && h.total > 0 && Number.isFinite(h.correct)).slice(0,50) : [],
  cache: new Map(), loadToken: 0, search: '', scope: 'ready', setup: null, reviewOpen: false, reviewFilter: 'all'
};
let timer = null, toastTimer = null, confirmAction = null, modalTrigger = null;

function toast(message) {
  const element = $('#toast'); element.textContent = message; element.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { element.hidden = true; }, 4500);
}
function focusHeading(selector = 'h1') {
  const element = main.querySelector(selector);
  if (element) { element.setAttribute('tabindex','-1'); element.focus({preventScroll:true}); }
}
function setView(view, breadcrumb) {
  state.view = view;
  $('#breadcrumb').textContent = breadcrumb;
  document.querySelectorAll('.main-nav .nav-link').forEach(button => {
    const active = button.dataset.action === (view === 'progress' ? 'progress' : 'home');
    button.classList.toggle('is-active', active);
    if (active) button.setAttribute('aria-current','page'); else button.removeAttribute('aria-current');
  });
  window.scrollTo({top:0, behavior:'instant'});
}
function persistRun() { if (state.run) { state.pending = state.run; write('active', state.run); } }
function pauseRun() {
  if (!state.run) return;
  persistRun(); state.run = null; clearInterval(timer); timer = null;
}
function showHome(focus = true) {
  pauseRun(); state.loadToken++; setView('home', 'APRENDE · PRACTICA · AVANZA');
  const saved = state.pending, savedMeta = saved && CATALOG.find(l => l.id === saved.levelId);
  main.innerHTML = `${savedMeta ? `<div class="resume-banner"><div><b>Tienes una sesión por continuar · ${e(savedMeta.code)}</b><p>Retoma tus respuestas donde las dejaste.${saved.deadline ? ' El tiempo del examen sigue corriendo.' : ''}</p></div><button class="button button-primary button-small" data-action="resume">Continuar sesión ${icon('arrow')}</button></div>` : ''}
  <section class="hero" aria-labelledby="home-title"><div class="hero-copy"><div class="eyebrow">EL INGLÉS QUE TE ABRE PUERTAS</div><h1 id="home-title" class="academy-title">Patricia Tuesta<span class="academy-title-course">English Classes</span></h1><p>Un espacio para practicar, ganar confianza y avanzar. Elige tu nivel y convierte cada pregunta en un nuevo paso.</p><div class="hero-actions"><button class="button button-primary" data-action="explore">Explorar los niveles ${icon('arrow')}</button><button class="button button-secondary" data-action="guide">Cómo practicar</button></div><div class="hero-facts"><span><b>7</b> niveles</span><span class="dot-separator"></span><span><b>20</b> preguntas por examen</span><span class="dot-separator"></span><span>A tu ritmo</span></div></div><div class="route-art" aria-hidden="true"><div class="art-label">PRACTICE WITH PURPOSE.</div><div class="art-word">More practice.<br><span>More confidence.</span></div><div class="academy-seal"><svg viewBox="0 0 24 28"><circle cx="10" cy="7" r="4"/><path d="M10 11v13m0-3h5m-5-5h4M10 5v4M8 7h4"/></svg></div><div class="art-route"><span>Pre-A1</span><span>A1</span><span>A2</span><span>B1</span><span>B2</span><span>C1</span><span>C2</span></div><div class="art-bottom"><span>Tu próximo paso empieza aquí.</span><span class="art-arrow">↗</span></div></div></section>
  <section aria-labelledby="levels-title"><div class="section-heading"><h2 id="levels-title"><span class="section-index">01</span>Elige tu nivel</h2><small>Tu punto de partida lo eliges tú</small></div><div class="level-grid">${CATALOG.map((level, i) => {
    const attempts = state.history.filter(h => h.levelId === level.id).length;
    return `<button class="level-card ${i === 0 ? 'is-featured' : ''}" data-action="level" data-level="${e(level.id)}" aria-label="${e(level.code)}: ${e(level.title)}"><div class="level-card-top"><span class="level-code">${e(level.code)}</span><span class="level-number">NIVEL 0${i+1}</span></div><div class="level-card-copy"><h3>${e(level.title)}</h3><p>${e(level.description)}</p></div><div class="level-card-bottom"><span>${level.topicCount} temas${attempts ? ` · ${attempts} ${attempts === 1 ? 'intento' : 'intentos'}` : ' en la ruta'}</span><span class="circle-arrow" aria-hidden="true">↗</span></div></button>`;
  }).join('')}</div><p class="catalogue-note">${icon('info')}<span>Elige un tema con preguntas disponibles o explora el programa completo de cada nivel.</span></p></section>`;
  if (focus) focusHeading();
}

async function loadLevel(id) {
  const meta = CATALOG.find(l => l.id === id);
  if (!meta) throw new Error('No se encuentra ese nivel.');
  if (state.cache.has(id)) {
    const cached = state.cache.get(id); state.cache.delete(id); state.cache.set(id,cached); return cached;
  }
  const response = await fetch(new URL(`../data/${meta.file}`, import.meta.url), {cache:'no-cache'});
  if (!response.ok) throw new Error(`No se pudo cargar ${meta.file} (HTTP ${response.status}). Comprueba que esté en la carpeta data.`);
  let bank;
  try { bank = await response.json(); } catch { throw new Error(`${meta.file} no contiene JSON válido. Revisa comas, comillas y corchetes.`); }
  const errors = validateBank(bank,id);
  if (errors.length) { const error = new Error(`Hay datos por corregir en ${meta.file}.`); error.details = errors; throw error; }
  const result = {bank, index:buildIndex(bank)};
  state.cache.set(id,result);
  // Caché acotada: como máximo dos niveles. No se precargan los otros cinco.
  if (state.cache.size > 2) state.cache.delete(state.cache.keys().next().value);
  return result;
}
function showLoadError(error, id) {
  setView('error', 'UN MOMENTO · REVISEMOS EL ARCHIVO');
  main.innerHTML = `<section class="error-card"><h1>No pudimos preparar este nivel.</h1><p>${e(error.message || 'No se pudo leer el archivo del nivel.')}</p>${error.details ? `<ul>${error.details.map(message => `<li>${e(message)}</li>`).join('')}</ul>` : '<p>Para probarlo en tu PC, abre la carpeta con Live Server o ejecuta un servidor local. En GitHub Pages, conserva las carpetas y sus nombres.</p>'}<div class="result-actions"><button class="button button-primary" data-action="level" data-level="${e(id)}">Reintentar</button><button class="button button-secondary" data-action="home">Volver al inicio</button></div></section>`;
  focusHeading();
}
async function showLevel(id, resume = false) {
  pauseRun(); const token = ++state.loadToken;
  const meta = CATALOG.find(l => l.id === id);
  setView('loading', `PREPARANDO ${meta?.code || 'TU NIVEL'}`);
  main.innerHTML = '<div class="loading-state" role="status"><span class="loader"></span><p>Cargando solo las preguntas de este nivel…</p></div>';
  try {
    const loaded = await loadLevel(id);
    if (token !== state.loadToken) return;
    state.bank = loaded.bank; state.index = loaded.index;
    if (resume && state.pending) {
      if (isValidRun(state.pending, state.bank, state.index)) {
        state.run = state.pending; state.result = null; state.reviewOpen = false;
        setView('run', `${state.bank.level.code} · ${state.run.mode === 'exam' ? 'MODO EXAMEN' : 'MODO PRÁCTICA'}`);
        renderRun(); startTimer(); return;
      }
      state.pending = null; write('active',null);
      toast('La sesión guardada ya no es compatible con este banco. Puedes iniciar una nueva.');
    }
    state.search = ''; state.scope = 'ready'; renderLevel();
  } catch (error) { if (token === state.loadToken) showLoadError(error,id); }
}
function renderLevel() {
  const {bank,index} = state, level = bank.level;
  setView('level', `MI RUTA / ${level.code.toUpperCase()}`);
  const ready = level.topics.filter(t => index.byTopic.get(t.id).length > 0).length;
  const subs = level.topics.reduce((count,t) => count+t.subtopics.length,0);
  main.innerHTML = `<button class="button-link back-link" data-action="home">${icon('back')} Todos los niveles</button><div class="page-heading"><span class="page-badge">${e(level.code)}</span><div><h1>${e(level.title)}</h1><p>${e(level.objective)}</p></div></div><div class="level-stats"><span><b>${level.topics.length}</b> temas</span><span><b>${subs}</b> subtemas</span><span><b>${index.questions.size}</b> preguntas disponibles</span></div><div class="section-heading"><h2><span class="section-index">02</span>Encuentra tu próximo reto</h2></div><div class="info-strip"><p>${ready ? `<b>${ready === 1 ? 'Un tema listo para empezar.' : `${ready} temas listos para empezar.`}</b> Elige un tema o consulta el programa completo.` : '<b>El programa está organizado.</b> Este nivel todavía necesita preguntas para empezar a practicar.'}</p></div><div class="toolbar"><div class="tabs" role="group" aria-label="Filtrar temas"><button class="tab is-active" data-action="scope" data-scope="ready" aria-pressed="true">Con preguntas (${ready})</button><button class="tab" data-action="scope" data-scope="all" aria-pressed="false">Programa completo (${level.topics.length})</button></div><label class="search-box">${icon('search')}<span class="sr-only">Buscar un tema o subtema</span><input id="topic-search" type="search" placeholder="Buscar un tema o subtema…" autocomplete="off"></label></div><div id="topic-list" class="topic-grid"></div><p id="topic-counter" class="catalogue-note" role="status"></p>`;
  renderTopicList(); focusHeading();
}
function renderTopicList() {
  const query = state.search.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es');
  const topics = [...state.bank.level.topics].sort((a,b) => a.order-b.order).filter(t => {
    if (state.scope === 'ready' && !state.index.byTopic.get(t.id).length) return false;
    const text = `${t.title} ${t.subtopics.map(s=>s.title).join(' ')}`.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es');
    return text.includes(query);
  });
  $('#topic-list').innerHTML = topics.length ? topics.map(topic => {
    const count = state.index.byTopic.get(topic.id).length;
    const readyExam = count >= state.bank.settings.examLength;
    return `<button class="topic-card" data-action="topic" data-topic="${e(topic.id)}"><div class="topic-meta"><span>TEMA ${String(topic.order).padStart(2,'0')}</span><span class="chip ${count ? '' : 'chip-neutral'}">${count ? readyExam ? 'Listo para practicar' : 'Práctica disponible' : 'Por ampliar'}</span></div><h3>${e(topic.title)}</h3><div class="topic-subtopics">${topic.subtopics.map(sub => e(sub.title)).join(' · ')}</div><div class="topic-card-bottom"><span>${topic.subtopics.length} subtemas · ${count} preguntas</span><span class="circle-arrow" aria-hidden="true">↗</span></div></button>`;
  }).join('') : '<div class="empty-state"><h2>No hay temas en esta vista.</h2><p>Prueba otra búsqueda o consulta el programa completo.</p></div>';
  $('#topic-counter').textContent = `${topics.length} ${topics.length === 1 ? 'tema en esta vista' : 'temas en esta vista'}. Los temas “Por ampliar” ya tienen subtemas definidos y aún no tienen preguntas.`;
}

function openModal(html) {
  if (!modal.open) modalTrigger = document.activeElement;
  $('#modal-body').innerHTML = html;
  if (!modal.open) modal.showModal();
}
function closeModal() { confirmAction = null; if (modal.open) modal.close(); }
function modalHeader(title, eyebrow = '') {
  return `<div class="modal-header"><div>${eyebrow ? `<span class="notice-heading">${e(eyebrow)}</span>` : ''}<h2 id="modal-title">${e(title)}</h2></div><button class="close-button" data-action="close-modal" aria-label="Cerrar">×</button></div>`;
}
function openConfirm(title, body, label, callback) {
  confirmAction = callback;
  openModal(`<div class="modal-inner">${modalHeader(title)}${body}<div class="modal-actions"><button class="button button-secondary" data-action="close-modal">Volver</button><button class="button button-primary" data-action="confirm">${e(label)}</button></div></div>`);
}
function showSetup(topicId) {
  const topic = state.index.topics.get(topicId);
  if (!topic) return;
  state.setup = {topicId, subtopicId:'', mode:'exam', minutes:state.bank.settings.defaultMinutes};
  const counts = state.index.byTopic.get(topicId).length;
  const durations = [...new Set([0,15,20,30,45,60,state.setup.minutes])].sort((a,b)=>a-b);
  openModal(`<div class="modal-inner">${modalHeader(topic.title, `${state.bank.level.code} · PREPARA TU SESIÓN`)}<p>${counts ? 'Un pequeño reto para descubrir lo que ya sabes y lo que puedes seguir practicando.' : 'Este tema está en el programa y aún no tiene preguntas. Elige otro para comenzar.'}</p><div class="form-field"><label class="field-label" for="setup-subtopic">¿Qué quieres practicar?</label><select id="setup-subtopic"><option value="">Todo el tema (${counts} preguntas)</option>${topic.subtopics.map(sub => `<option value="${e(sub.id)}">${e(sub.title)} (${state.index.bySubtopic.get(sub.id).length})</option>`).join('')}</select></div><div class="form-field"><span class="field-label">Elige tu modo</span><div class="mode-grid" role="group" aria-label="Modo de evaluación"><button class="mode-choice is-active" data-action="mode" data-mode="exam" aria-pressed="true"><b>Modo examen</b><small>${state.bank.settings.examLength} preguntas. Corrección al entregar.</small></button><button class="mode-choice" data-action="mode" data-mode="practice" aria-pressed="false"><b>Modo práctica</b><small>Comprueba y aprende con cada respuesta.</small></button></div></div><div class="form-field"><label class="field-label" for="setup-time">Tiempo del examen</label><select id="setup-time">${durations.map(minutes => `<option value="${minutes}" ${minutes === state.setup.minutes ? 'selected' : ''}>${minutes ? `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}` : 'Sin límite de tiempo'}</option>`).join('')}</select></div><div id="setup-summary" class="setup-summary" role="status"></div><div class="modal-actions"><button class="button button-secondary" data-action="close-modal">Ahora no</button><button id="start-button" class="button button-primary" data-action="start">Empezar ${icon('arrow')}</button></div></div>`);
  updateSetup();
}
function updateSetup() {
  const setup = state.setup;
  const count = (setup.subtopicId ? state.index.bySubtopic.get(setup.subtopicId) : state.index.byTopic.get(setup.topicId)).length;
  const required = state.bank.settings.examLength;
  const tooShort = setup.mode === 'exam' && count < required;
  const summary = $('#setup-summary');
  summary.classList.toggle('is-short',tooShort || count === 0);
  summary.textContent = !count ? 'Todavía no hay preguntas en esta selección. Elige otro tema o subtema con preguntas.' : tooShort ? `Hay ${count} preguntas distintas. El examen necesita ${required}; faltan ${required-count}. Puedes elegir “Modo práctica” para usar las disponibles.` : setup.mode === 'practice' ? `Practicarás ${Math.min(required,count)} preguntas sin repetir, con explicaciones y sin límite de tiempo.` : `Se sortearán ${required} preguntas distintas de ${count} disponibles. Podrás revisar tus respuestas antes de entregar.`;
  $('#start-button').disabled = !count || tooShort;
  $('#setup-time').disabled = setup.mode === 'practice';
  $('#setup-time').value = String(setup.minutes);
  modal.querySelectorAll('[data-action="mode"]').forEach(button => {
    const active = button.dataset.mode === setup.mode;
    button.classList.toggle('is-active',active); button.setAttribute('aria-pressed',String(active));
  });
}
function beginRun() {
  try {
    const {topicId,subtopicId,mode,minutes} = state.setup;
    const run = createRun(state.bank,state.index,topicId,{subtopicId,mode,minutes});
    closeModal(); clearInterval(timer);
    state.run = run; state.result = null; state.reviewOpen = false; state.reviewFilter = 'all';
    persistRun(); setView('run', `${state.bank.level.code} · ${mode === 'exam' ? 'MODO EXAMEN' : 'MODO PRÁCTICA'}`);
    renderRun(); startTimer();
  } catch (error) { toast(error.message); }
}
function requestStart() {
  if (state.pending) openConfirm('¿Empezar una nueva sesión?', '<p>Ya tienes una sesión guardada. Al comenzar, esa sesión será reemplazada por esta nueva.</p>', 'Empezar nueva sesión', beginRun);
  else beginRun();
}

function feedbackHtml(q, answerId) {
  const correct = answerId === q.answerId;
  return `<div class="feedback ${correct ? '' : 'is-wrong'}" role="status"><h3>${correct ? '¡Correcto! Sigue así.' : 'Una oportunidad para aprender.'}</h3>${correct ? '' : `<p class="correct-answer">Respuesta correcta: ${e(q.options.find(o=>o.id===q.answerId).text)}</p>`}<p>${e(q.explanation)}</p></div>`;
}
function renderRun(focus = true) {
  const {run,index,bank} = state;
  if (!run) return;
  const q = index.questions.get(run.questionIds[run.position]);
  const checked = run.mode === 'practice' && run.checked.includes(q.id);
  const selected = run.answers[q.id];
  const last = run.position === run.questionIds.length-1;
  const options = run.optionOrders[q.id].map(id=>q.options.find(o=>o.id===id));
  main.innerHTML = `<div class="exam-topline"><div class="exam-title"><b>${e(bank.level.code)}</b> ${e(index.topics.get(run.topicId).title)}</div><div id="exam-clock" class="exam-clock">${icon('clock')}<span id="clock-text">${run.deadline ? formatDuration(run.deadline-Date.now()) : 'A tu ritmo'}</span></div></div><div class="exam-layout"><section class="question-card" aria-labelledby="question-title"><div class="question-topline"><span class="question-count">PREGUNTA ${String(run.position+1).padStart(2,'0')} / ${run.questionIds.length}</span><button class="flag-button ${run.flags.includes(q.id) ? 'is-flagged' : ''}" data-action="flag" aria-pressed="${run.flags.includes(q.id)}">${icon('flag')} ${run.flags.includes(q.id) ? 'Marcada' : 'Marcar para revisar'}</button></div><div class="question-subtopic">${e(index.subtopics.get(q.subtopicId).title)} · ${q.type === 'true-false' ? 'VERDADERO O FALSO' : 'OPCIÓN MÚLTIPLE'}</div><fieldset ${q.context ? 'aria-describedby="question-context"' : ''}><legend class="question-prompt" id="question-title" tabindex="-1">${e(q.prompt)}</legend>${q.context ? `<p class="question-context" id="question-context">${e(q.context)}</p>` : ''}<div class="answer-options">${options.map(option => {
    const chosen = selected === option.id;
    const correct = checked && option.id === q.answerId;
    const wrong = checked && chosen && !correct;
    return `<label class="answer-option ${chosen ? 'is-selected' : ''} ${checked ? 'is-locked' : ''} ${correct ? 'is-correct' : ''} ${wrong ? 'is-wrong' : ''}"><input type="radio" name="answer" value="${e(option.id)}" ${chosen ? 'checked' : ''} ${checked ? 'disabled' : ''}><span>${e(option.text)}</span>${correct || wrong ? `<span class="option-mark" aria-label="${correct ? 'Respuesta correcta' : 'Respuesta incorrecta'}">${correct ? '✓' : '×'}</span>` : ''}</label>`;
  }).join('')}</div></fieldset>${!checked ? '<button class="button-link" id="clear-answer" data-action="clear-answer" '+(!selected ? 'hidden' : '')+'>Quitar mi respuesta</button>' : ''}${checked ? feedbackHtml(q,selected) : ''}<div class="question-footer"><button class="button button-secondary" data-action="previous" ${run.position === 0 ? 'disabled' : ''}>${icon('back')} Anterior</button>${run.mode === 'practice' && !checked ? `<button class="button-link" data-action="next">${last ? 'Terminar' : 'Saltar por ahora'}</button><button class="button button-primary" id="check-answer" data-action="check" ${!selected ? 'disabled' : ''}>Comprobar</button>` : `<button class="button button-primary" data-action="next">${last ? 'Revisar y entregar' : 'Siguiente'} ${icon('arrow')}</button>`}</div></section><aside class="exam-aside" aria-label="Navegación del cuestionario"><h2>Tu recorrido</h2><p id="answered-count"></p><div class="progress-track" aria-hidden="true"><span id="answered-progress"></span></div><div class="question-nav" aria-label="Ir a una pregunta">${run.questionIds.map((id,i)=>`<button class="question-dot" data-action="jump" data-position="${i}" aria-label="Pregunta ${i+1}">${i+1}</button>`).join('')}</div><div class="question-legend"><span><i class="legend-dot"></i>Respondida</span><span><i class="legend-dot legend-flag"></i>Por revisar</span></div><button class="button button-primary" data-action="submit">Entregar ${run.mode === 'exam' ? 'examen' : 'práctica'}</button><button class="button-link" data-action="save-exit">Guardar y salir</button></aside></div>`;
  updateRunSummary(); if (focus) focusHeading('#question-title');
}
function updateRunSummary() {
  const run = state.run; if (!run) return;
  const answered = Object.keys(run.answers).length;
  $('#answered-count').textContent = `${answered} de ${run.questionIds.length} respondidas`;
  $('#answered-progress').style.width = `${answered/run.questionIds.length*100}%`;
  main.querySelectorAll('.question-dot').forEach((button,i)=> {
    const id = run.questionIds[i], isAnswered = Object.prototype.hasOwnProperty.call(run.answers,id), flagged = run.flags.includes(id);
    const checked = run.mode === 'practice' && run.checked.includes(id);
    const correct = checked && run.answers[id] === state.index.questions.get(id).answerId;
    button.className = `question-dot ${isAnswered ? 'is-answered' : ''} ${i === run.position ? 'is-current' : ''} ${flagged ? 'is-flagged' : ''} ${checked ? correct ? 'is-correct' : 'is-wrong' : ''}`;
    button.setAttribute('aria-label', `Pregunta ${i+1}, ${isAnswered ? 'respondida' : 'sin responder'}${flagged ? ', marcada para revisar' : ''}`);
    if (i === run.position) button.setAttribute('aria-current','step'); else button.removeAttribute('aria-current');
  });
}
function moveQuestion(position) {
  if (!state.run || position < 0 || position >= state.run.questionIds.length) return;
  state.run.position = position; persistRun(); renderRun();
  window.scrollTo({top:0,behavior:'instant'});
}
function requestSubmit() {
  if (!state.run) return;
  const answered = Object.keys(state.run.answers).length, skipped = state.run.questionIds.length-answered;
  openConfirm('¿Listo para entregar?', `<p>Al entregar verás tu resultado y la explicación de cada respuesta.</p><div class="submit-counts"><div class="mini-stat"><b>${answered}</b>Respondidas</div><div class="mini-stat"><b>${skipped}</b>Sin responder</div><div class="mini-stat"><b>${state.run.flags.length}</b>Marcadas</div></div>${skipped ? '<p>Las preguntas sin responder cuentan como omitidas y no suman puntos.</p>' : ''}`, 'Entregar y ver resultado', () => finishRun(false));
}
function startTimer() {
  clearInterval(timer); tick();
  if (state.run?.deadline) timer = setInterval(tick,1000);
}
function tick() {
  if (!state.run || !state.run.deadline) return;
  const remaining = state.run.deadline-Date.now();
  if (remaining <= 0) { finishRun(true); return; }
  const text = $('#clock-text');
  if (text) text.textContent = formatDuration(Math.ceil(remaining/1000)*1000);
  $('#exam-clock')?.classList.toggle('is-warning',remaining < 60000);
}
function finishRun(expired) {
  if (!state.run) return;
  closeModal(); clearInterval(timer); timer = null;
  const run = state.run, score = scoreRun(run,state.index);
  const topic = state.index.topics.get(run.topicId);
  const record = {id:run.id,levelId:run.levelId,topicId:run.topicId,topicTitle:topic.title,mode:run.mode,correct:score.correct,total:score.total,percent:score.percent,elapsed:score.elapsed,finishedAt:Date.now()};
  if (!state.history.some(h=>h.id===record.id)) state.history = [record,...state.history].slice(0,50);
  write('history',state.history); write('active',null); state.pending = null;
  state.result = {run,score,expired}; state.run = null; state.reviewOpen = false; state.reviewFilter = 'all';
  renderResult();
}

function renderResult() {
  const {run,score,expired} = state.result, level = state.bank.level;
  const topic = state.index.topics.get(run.topicId);
  setView('result', `${level.code} / TU RESULTADO`);
  const positive = score.percent >= state.bank.settings.passPercent;
  main.innerHTML = `<button class="button-link back-link" data-action="back-topics">${icon('back')} Volver a los temas</button>${expired ? '<div class="info-strip"><p>Se terminó el tiempo. Entregamos el examen con las respuestas que habías guardado.</p></div>' : ''}<div class="result-hero"><div class="score-ring" style="--score:${score.percent}"><div class="score-ring-inner"><b>${score.percent}%</b><small>${score.correct} de ${score.total} correctas</small></div></div><div><span class="result-eyebrow">${e(level.code)} · ${run.mode === 'exam' ? 'EXAMEN COMPLETADO' : 'PRÁCTICA COMPLETADA'}</span><h1>${positive ? '¡Buen trabajo!' : 'Cada intento cuenta.'}</h1><p>${e(topic.title)}<br>${positive ? 'Un paso más en tu ruta. Revisa tus respuestas y sigue practicando.' : 'Mira las explicaciones, repasa con calma y vuelve a intentarlo.'}</p></div></div><div class="result-stats"><div class="mini-stat"><b>${score.grade.toLocaleString('es-PE')}<small>/ 20</small></b>Nota de este intento</div><div class="mini-stat"><b>${score.correct}</b>Correctas</div><div class="mini-stat"><b>${score.wrong} / ${score.skipped}</b>Incorrectas / omitidas</div><div class="mini-stat"><b>${formatDuration(score.elapsed)}</b>Tiempo utilizado</div></div><div class="result-actions"><button class="button button-primary" data-action="retry">Otra ronda ${icon('arrow')}</button><button class="button button-secondary" data-action="review">${state.reviewOpen ? 'Ocultar' : 'Revisar'} respuestas</button><button class="button button-secondary" data-action="back-topics">Elegir otro tema</button></div><section class="breakdown"><h2>Así te fue por subtema</h2>${score.groups.map(group=>`<div class="breakdown-row"><span>${e(group.title)}</span><div class="progress-track" aria-hidden="true"><span style="width:${group.correct/group.total*100}%"></span></div><span>${group.correct}/${group.total}</span></div>`).join('')}</section><p class="catalogue-note">${icon('info')}<span>El resultado corresponde a este tema y este intento. Los siete niveles organizan tu aprendizaje; esta trivia no certifica tu nivel de inglés.</span></p><section id="review-section" ${state.reviewOpen ? '' : 'hidden'}><div class="review-toolbar"><h2>Aprende de tus respuestas</h2><div class="tabs" role="group" aria-label="Filtrar revisión"><button class="tab ${state.reviewFilter === 'all' ? 'is-active' : ''}" data-action="review-filter" data-filter="all" aria-pressed="${state.reviewFilter === 'all'}">Todas (${score.total})</button><button class="tab ${state.reviewFilter === 'errors' ? 'is-active' : ''}" data-action="review-filter" data-filter="errors" aria-pressed="${state.reviewFilter === 'errors'}">Errores y omitidas (${score.wrong+score.skipped})</button></div></div><div id="review-list" class="review-list"></div></section>`;
  if (state.reviewOpen) renderReview(); focusHeading();
}
function renderReview() {
  const rows = state.result.score.rows;
  const filtered = rows.filter(row => state.reviewFilter === 'all' || row.status !== 'correct');
  $('#review-list').innerHTML = filtered.length ? filtered.map(row => {
    const q = row.question, position = rows.indexOf(row)+1;
    const chosen = q.options.find(option=>option.id===row.answerId);
    const correct = q.options.find(option=>option.id===q.answerId);
    const label = {correct:'Correcta',wrong:'Incorrecta',skipped:'Omitida'}[row.status];
    return `<article class="review-item"><div class="review-topline"><span>PREGUNTA ${String(position).padStart(2,'0')} · ${e(state.index.subtopics.get(q.subtopicId).title)}</span><span class="chip chip-${row.status}">${label}</span></div><h3>${e(q.prompt)}</h3>${q.context ? `<p class="question-context">${e(q.context)}</p>` : ''}<p class="review-answer">Tu respuesta: <b>${chosen ? e(chosen.text) : 'Sin responder'}</b></p>${row.status !== 'correct' ? `<p class="review-answer">Respuesta correcta: <b>${e(correct.text)}</b></p>` : ''}<p class="review-explanation">${e(q.explanation)}</p></article>`;
  }).join('') : '<div class="empty-state"><h2>¡Todas correctas!</h2><p>No hay errores ni preguntas omitidas en este intento.</p></div>';
}
function retryRun() {
  const run = state.result.run;
  state.setup = {topicId:run.topicId,subtopicId:run.subtopicId,mode:run.mode,minutes:run.minutes}; beginRun();
}
function showProgress() {
  pauseRun(); state.loadToken++; setView('progress', 'MI ESPACIO / MI PROGRESO');
  const history = state.history, correct = history.reduce((sum,h)=>sum+h.correct,0), total = history.reduce((sum,h)=>sum+h.total,0);
  const best = history.length ? Math.max(...history.map(h=>h.percent)) : 0;
  main.innerHTML = `<div class="eyebrow">CADA PASO SUMA</div><h1>Tu inglés, en movimiento.</h1><p class="muted">Tus últimos 50 intentos se guardan en este navegador.</p><div class="result-stats"><div class="mini-stat"><b>${history.length}</b>Sesiones completadas</div><div class="mini-stat"><b>${total}</b>Preguntas practicadas</div><div class="mini-stat"><b>${total ? Math.round(correct/total*100) : 0}%</b>Aciertos acumulados</div><div class="mini-stat"><b>${best}%</b>Mejor intento</div></div><div class="section-heading"><h2>Tu actividad reciente</h2>${history.length ? '<button class="button-link" data-action="clear-history">Borrar historial</button>' : ''}</div><div class="history-list">${history.length ? history.map(item=>`<article class="history-item"><div><h3>${e(CATALOG.find(l=>l.id===item.levelId).code)} · ${e(item.topicTitle)}</h3><p>${new Date(item.finishedAt).toLocaleString('es-PE',{dateStyle:'medium',timeStyle:'short'})} · ${item.mode === 'exam' ? 'Examen' : 'Práctica'} · ${item.correct}/${item.total} correctas</p></div><div class="history-score">${item.percent}%<small> de aciertos</small></div></article>`).join('') : '<div class="empty-state"><h2>Tu primer paso está por venir.</h2><p>Completa una práctica y verás aquí tu progreso.</p><button class="button button-primary" data-action="home">Explorar mi ruta</button></div>'}</div><p class="catalogue-note">${icon('info')}<span>Las sesiones parciales se pueden continuar desde Mi ruta. El progreso pertenece a este navegador y no se envía a una cuenta.</span></p>`;
  focusHeading();
}
function showGuide() {
  const sources = state.bank?.sources || [];
  openModal(`<div class="modal-inner">${modalHeader('Pequeños pasos. Inglés real.','ASÍ FUNCIONA TU ESPACIO DE INGLÉS')}<ol class="guide-list"><li><b>Elige un nivel y un tema.</b> El programa está ordenado desde Pre-A1 hasta C2. Los temas “Por ampliar” aún no tienen preguntas.</li><li><b>Examen:</b> se sortean 20 preguntas sin repetir dentro del intento. Puedes cambiar respuestas, marcar dudas y navegar antes de entregar.</li><li><b>Práctica:</b> comprueba una respuesta para ver su explicación. Una respuesta comprobada queda fijada. Los subtemas con menos de 20 preguntas permiten una práctica más corta.</li><li><b>Aprende del resultado.</b> Revisa aciertos, errores, omitidas y explicaciones. Cada ronda vuelve a sortear las preguntas disponibles.</li><li><b>Retoma cuando quieras.</b> La sesión y tus últimos 50 resultados se guardan en este navegador. En un examen con límite, el reloj sigue avanzando aunque cierres la página.</li></ol><p>Este banco de muestra evalúa reconocimiento escrito. La conversación, la producción escrita y la escucha requieren actividades y revisión adicionales de la profesora.</p><details class="source-details"><summary>Sobre la organización del contenido</summary><p>La ruta sigue los 102 módulos de la sección 2 del Plan Maestro. Cada tema tiene tres subtemas propuestos. Los sílabos complementan los contextos; sus números de curso no equivalen automáticamente a niveles MCER.</p>${sources.map(source=>`<p><b>${e(source.title)}</b><br>${e(source.note)}</p>`).join('')}</details><div class="modal-actions"><button class="button button-primary" data-action="close-modal">Entendido ${icon('arrow')}</button></div></div>`);
}

document.addEventListener('click', async event => {
  const button = event.target.closest('[data-action]');
  if (!button || button.disabled) return;
  const action = button.dataset.action;
  if (action === 'home') { closeModal(); showHome(); }
  else if (action === 'explore') {
    const title = $('#levels-title');
    title.setAttribute('tabindex','-1'); title.focus({preventScroll:true});
    title.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
  }
  else if (action === 'level') await showLevel(button.dataset.level);
  else if (action === 'progress') { closeModal(); showProgress(); }
  else if (action === 'guide') showGuide();
  else if (action === 'close-modal') closeModal();
  else if (action === 'confirm') { const callback = confirmAction; closeModal(); callback?.(); }
  else if (action === 'resume' && state.pending) await showLevel(state.pending.levelId,true);
  else if (action === 'scope') {
    state.scope = button.dataset.scope;
    main.querySelectorAll('[data-action="scope"]').forEach(b=> {const active=b.dataset.scope===state.scope;b.classList.toggle('is-active',active);b.setAttribute('aria-pressed',String(active));});
    renderTopicList();
  }
  else if (action === 'topic') showSetup(button.dataset.topic);
  else if (action === 'mode') {state.setup.mode=button.dataset.mode;state.setup.minutes=state.setup.mode==='practice'?0:state.bank.settings.defaultMinutes;updateSetup();}
  else if (action === 'start') requestStart();
  else if (action === 'previous') moveQuestion(state.run.position-1);
  else if (action === 'next') state.run.position === state.run.questionIds.length-1 ? requestSubmit() : moveQuestion(state.run.position+1);
  else if (action === 'jump') moveQuestion(Number(button.dataset.position));
  else if (action === 'flag' && state.run) {
    const id=state.run.questionIds[state.run.position];
    state.run.flags=state.run.flags.includes(id)?state.run.flags.filter(flag=>flag!==id):[...state.run.flags,id];persistRun();renderRun(false);main.querySelector('[data-action="flag"]').focus();
  }
  else if (action === 'clear-answer' && state.run) {delete state.run.answers[state.run.questionIds[state.run.position]];persistRun();renderRun();}
  else if (action === 'check' && state.run) {
    const id=state.run.questionIds[state.run.position];if(!state.run.answers[id])return;
    if(!state.run.checked.includes(id))state.run.checked.push(id);persistRun();renderRun(false);main.querySelector('.feedback')?.scrollIntoView({block:'nearest'});main.querySelector('[data-action="next"]')?.focus({preventScroll:true});
  }
  else if (action === 'submit') requestSubmit();
  else if (action === 'save-exit') {const timed=!!state.run.deadline;showHome();toast(timed?'Sesión guardada. El tiempo del examen sigue corriendo.':'Sesión guardada. Puedes continuarla desde Mi ruta.');}
  else if (action === 'back-topics') {state.search='';state.scope='ready';renderLevel();}
  else if (action === 'retry') retryRun();
  else if (action === 'review') {state.reviewOpen=!state.reviewOpen;renderResult();if(state.reviewOpen)$('#review-section').scrollIntoView({block:'start'});}
  else if (action === 'review-filter') {
    state.reviewFilter=button.dataset.filter;
    main.querySelectorAll('[data-action="review-filter"]').forEach(b=>{const active=b.dataset.filter===state.reviewFilter;b.classList.toggle('is-active',active);b.setAttribute('aria-pressed',String(active));});renderReview();
  }
  else if (action === 'clear-history') openConfirm('¿Borrar tu historial?', '<p>Se eliminarán los resultados guardados en este navegador. Tu sesión pendiente, si existe, seguirá disponible.</p>', 'Borrar historial',()=>{state.history=[];write('history',[]);showProgress();toast('Historial borrado.');});
});
document.addEventListener('change', event => {
  const target = event.target;
  if (target.id === 'setup-subtopic') {state.setup.subtopicId=target.value;updateSetup();}
  else if (target.id === 'setup-time') {state.setup.minutes=Number(target.value);updateSetup();}
  else if (target.name === 'answer' && state.run) {
    const id=state.run.questionIds[state.run.position];
    if(state.run.mode==='practice'&&state.run.checked.includes(id))return;
    state.run.answers[id]=target.value;persistRun();
    main.querySelectorAll('.answer-option').forEach(label=>label.classList.toggle('is-selected',label.querySelector('input').checked));
    if($('#check-answer'))$('#check-answer').disabled=false;
    if($('#clear-answer'))$('#clear-answer').hidden=false;
    updateRunSummary();
  }
});
document.addEventListener('input',event=>{if(event.target.id==='topic-search'){state.search=event.target.value;renderTopicList();}});
modal.addEventListener('close',()=>{confirmAction=null;if(modalTrigger?.isConnected)modalTrigger.focus({preventScroll:true});});
modal.addEventListener('click',event=>{if(event.target===modal){const r=modal.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeModal();}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick();});
window.addEventListener('pagehide',persistRun);
showHome(false);
