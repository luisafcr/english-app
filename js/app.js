/* app.js — controlador principal: navegación y vistas */
const $ = (sel, root = document) => root.querySelector(sel);
const main = $('#main');

/* ---------- utilidades UI ---------- */
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 2200);
}
function esc(s) { return (s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
const ACHIEVEMENTS = {
  first_word: { icon: '🌱', name: 'Primer paso', desc: 'Empezaste a estudiar' },
  streak_3: { icon: '🔥', name: 'En racha', desc: '3 días seguidos' },
  streak_7: { icon: '⚡', name: 'Imparable', desc: '7 días seguidos' },
  streak_30: { icon: '🏅', name: 'Constante', desc: '30 días seguidos' },
  xp_100: { icon: '⭐', name: '100 XP', desc: 'Ganaste 100 puntos' },
  xp_500: { icon: '🌟', name: '500 XP', desc: 'Ganaste 500 puntos' },
  xp_2000: { icon: '👑', name: '2000 XP', desc: '¡Una leyenda!' },
  mastered_10: { icon: '🧠', name: '10 dominadas', desc: '10 palabras aprendidas' },
  mastered_50: { icon: '📚', name: '50 dominadas', desc: '50 palabras aprendidas' },
};

function refreshStats() {
  const s = Store.getStats();
  $('#streak-count').textContent = s.streak;
  $('#xp-count').textContent = s.xp;
  const newly = Store.checkAchievements();
  newly.forEach(id => toast(`${ACHIEVEMENTS[id].icon} ¡Logro desbloqueado: ${ACHIEVEMENTS[id].name}!`));
}
function speakerIcon(text) {
  return `<span class="play" onclick="Speech.speak(${JSON.stringify(text).replace(/"/g, '&quot;')})">🔊</span>`;
}

/* ---------- router ---------- */
const Views = {};
let current = 'home';

function go(view, arg) {
  current = view;
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  main.scrollTop = 0;
  window.scrollTo(0, 0);
  removeChatBar();
  main.innerHTML = '';
  (Views[view] || Views.home)(arg);
  refreshStats();
}

document.querySelectorAll('.nav-btn').forEach(b =>
  b.addEventListener('click', () => { window.roleScenario = ''; go(b.dataset.view); })
);

/* ============================================================= HOME */
const DAILY_TASKS = [
  { key: 'review', icon: '🗂️', label: 'Repasar vocabulario', view: 'vocab' },
  { key: 'quiz', icon: '✍️', label: 'Hacer un quiz', view: 'grammar' },
  { key: 'read', icon: '📖', label: 'Leer un texto', view: 'reading' },
  { key: 'chat', icon: '🎙️', label: 'Hablar con Mia', view: 'chat' },
];

Views.home = () => {
  const s = Store.getStats();
  const due = Store.dueCards(999).length;
  const total = Store.allCards().length;
  const mastered = Store.masteredCount();
  const daily = Store.getDaily();
  const doneCount = DAILY_TASKS.filter(t => daily.tasks[t.key]).length;
  const xpGoal = Store.getSettings().xpGoal || 50;
  const todayXp = Store.xpToday();

  main.innerHTML = `
    <div class="fade-in">
      <div class="card" style="background:linear-gradient(135deg,#4f46e5,#22d3ee);border:none;">
        <h2 style="color:#fff">¡Hola! 👋</h2>
        <p style="color:#e0e7ff">Nivel actual: <b>${Store.getSettings().level}</b> · Meta: dominar el inglés hasta C2.</p>
        <div style="display:flex;gap:18px;margin-top:14px;color:#fff;font-weight:600;">
          <div>🔥 ${s.streak} <small style="opacity:.8">días</small></div>
          <div>⭐ ${s.xp} <small style="opacity:.8">XP</small></div>
          <div>🗂️ ${due} <small style="opacity:.8">por repasar</small></div>
        </div>
      </div>

      <div class="card goal-card">
        <div class="goal-top">
          <span>🎯 Meta de hoy</span>
          <b>${Math.min(xpGoal, todayXp)} / ${xpGoal} XP</b>
        </div>
        <div class="progress"><i style="width:${Math.min(100, Math.round(todayXp / xpGoal * 100))}%"></i></div>
        ${todayXp >= xpGoal ? '<p class="muted center" style="margin-top:6px">🎉 ¡Meta cumplida! Sigue sumando.</p>' : ''}
      </div>

      <div class="section-title">📅 Plan de hoy (${doneCount}/${DAILY_TASKS.length})</div>
      <div class="card">
        <div class="progress"><i style="width:${(doneCount / DAILY_TASKS.length) * 100}%"></i></div>
        ${DAILY_TASKS.map(t => `
          <div class="daily-task ${daily.tasks[t.key] ? 'done' : ''}" onclick="go('${t.view}')">
            <span class="check">${daily.tasks[t.key] ? '✅' : '⬜'}</span>
            <span class="ico">${t.icon}</span>
            <span class="lbl">${t.label}</span>
          </div>`).join('')}
        ${doneCount === DAILY_TASKS.length ? '<p class="muted center" style="margin-top:10px">🎉 ¡Completaste tu plan de hoy!</p>' : ''}
      </div>

      <div class="section-title">Practica</div>
      <div class="tiles">
        <button class="tile" onclick="go('vocab')"><div class="emoji">🗂️</div><h3>Vocabulario</h3><small>${due} tarjetas listas</small></button>
        <button class="tile" onclick="go('phrases')"><div class="emoji">💬</div><h3>Frases</h3><small>Expresiones útiles</small></button>
        <button class="tile" onclick="go('grammar')"><div class="emoji">✍️</div><h3>Gramática</h3><small>Quiz rápido</small></button>
        <button class="tile" onclick="go('music')"><div class="emoji">🎵</div><h3>Música</h3><small>Aprende cantando</small></button>
        <button class="tile" onclick="go('chat')"><div class="emoji">🎙️</div><h3>Conversación</h3><small>Habla con la IA</small></button>
        <button class="tile" onclick="go('roleplay')"><div class="emoji">🎭</div><h3>Roleplay</h3><small>Situaciones reales</small></button>
        <button class="tile" onclick="go('writing')"><div class="emoji">📝</div><h3>Escritura</h3><small>Corrige tu texto</small></button>
        <button class="tile" onclick="go('reading')"><div class="emoji">📖</div><h3>Lectura</h3><small>Texto + preguntas</small></button>
        <button class="tile" onclick="go('idioms')"><div class="emoji">📌</div><h3>Expresiones</h3><small>Phrasal verbs e idioms</small></button>
      </div>

      <div class="section-title">Tu progreso</div>
      <div class="card">
        <p>Tienes <b style="color:var(--text)">${total}</b> palabras en estudio.</p>
        <div class="progress"><i style="width:${total ? Math.min(100, Math.round(mastered / total * 100)) : 0}%"></i></div>
        <p class="muted">${mastered} dominadas · ${due} por repasar</p>
      </div>

      <div class="row">
        <button class="btn secondary" onclick="go('achievements')">🏆 Logros</button>
        <button class="btn secondary" onclick="go('stats')">📊 Estadísticas</button>
      </div>
      <div style="height:8px"></div>
      <button class="btn ghost" onclick="go('settings')">⚙️ Ajustes</button>
    </div>`;
};

/* ============================================================= ACHIEVEMENTS */
Views.achievements = () => {
  const unlocked = Store.getAchievements();
  main.innerHTML = `
    <div class="fade-in">
      <div class="section-title">🏆 Logros (${unlocked.length}/${Object.keys(ACHIEVEMENTS).length})</div>
      <div class="ach-grid">
        ${Object.entries(ACHIEVEMENTS).map(([id, a]) => `
          <div class="ach ${unlocked.includes(id) ? 'on' : 'off'}">
            <div class="ach-ico">${unlocked.includes(id) ? a.icon : '🔒'}</div>
            <div class="ach-name">${a.name}</div>
            <div class="ach-desc">${a.desc}</div>
          </div>`).join('')}
      </div>
      <button class="btn ghost" onclick="go('home')">← Volver</button>
    </div>`;
};

/* ============================================================= STATS */
Views.stats = () => {
  const week = Store.last7();
  const max = Math.max(10, ...week.map(d => d.xp));
  const totalWeek = week.reduce((a, d) => a + d.xp, 0);
  const s = Store.getStats();
  const dayNames = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
  main.innerHTML = `
    <div class="fade-in">
      <div class="section-title">📊 Tu semana</div>
      <div class="card">
        <p class="muted">Total: <b style="color:var(--text)">${totalWeek} XP</b> en 7 días</p>
        <div class="bars">
          ${week.map(d => {
            const dt = new Date(d.date + 'T00:00:00');
            return `<div class="bar-col">
              <div class="bar-wrap"><div class="bar" style="height:${Math.round(d.xp / max * 100)}%"></div></div>
              <small>${dayNames[dt.getDay()]}</small>
              <small class="muted">${d.xp}</small>
            </div>`;
          }).join('')}
        </div>
      </div>
      <div class="row">
        <div class="card center"><div class="big-emoji" style="margin:0">🔥</div><h2>${s.streak}</h2><p class="muted">racha</p></div>
        <div class="card center"><div class="big-emoji" style="margin:0">🧠</div><h2>${Store.masteredCount()}</h2><p class="muted">dominadas</p></div>
        <div class="card center"><div class="big-emoji" style="margin:0">⭐</div><h2>${s.xp}</h2><p class="muted">XP total</p></div>
      </div>
      <button class="btn ghost" onclick="go('home')">← Volver</button>
    </div>`;
};

/* ============================================================= IDIOMS / PHRASAL VERBS */
Views.idioms = () => {
  renderExpr('phrasal');
};
function renderExpr(tab) {
  const list = tab === 'phrasal' ? SEED.phrasalVerbs : SEED.idioms;
  main.innerHTML = `
    <div class="fade-in">
      <div class="section-title">📌 Expresiones</div>
      <div class="tabs">
        <button class="tab ${tab === 'phrasal' ? 'active' : ''}" onclick="renderExpr('phrasal')">Phrasal verbs</button>
        <button class="tab ${tab === 'idioms' ? 'active' : ''}" onclick="renderExpr('idioms')">Idioms</button>
      </div>
      ${list.map(p => `
        <div class="card">
          <h2 style="font-size:16px">${esc(p.en)} ${speakerIcon(p.en)}</h2>
          <p style="color:var(--text)">${esc(p.es)}</p>
          <p class="muted" style="margin-top:4px">"${esc(p.ex)}"</p>
        </div>`).join('')}
      <button class="btn secondary" onclick='Store.addCards(${JSON.stringify(list)});toast("✅ Guardadas en Vocabulario")'>💾 Guardar todas en Vocabulario</button>
      <div style="height:8px"></div>
      <button class="btn ghost" onclick="moreExpr('${tab}')">✨ Generar más con IA</button>
    </div>`;
}
window.renderExpr = renderExpr;
window.moreExpr = async (tab) => {
  if (!Gemini.hasKey()) { toast('Agrega tu API key en Ajustes'); go('settings'); return; }
  toast('Generando...');
  try {
    const topic = tab === 'phrasal' ? 'common English phrasal verbs' : 'common English idioms';
    const list = await Gemini.generateVocab(topic);
    const n = Store.addCards(list);
    toast(`✨ +${n} guardadas en Vocabulario`);
  } catch (e) { handleAiError(e); }
};

/* ============================================================= VOCAB */
Views.vocab = (mode) => {
  const hard = mode === 'hard';
  let cards = hard ? Store.hardCards(20) : Store.dueCards(20);
  const hardCount = Store.hardCards(99).length;
  if (cards.length === 0) {
    main.innerHTML = `
      <div class="fade-in center card">
        <div class="big-emoji">🎉</div>
        <h2>${hard ? 'Sin palabras difíciles' : '¡Todo repasado!'}</h2>
        <p class="muted">${hard ? 'No tienes palabras marcadas como difíciles. ¡Bien hecho!' : 'No tienes tarjetas pendientes por ahora.'}</p>
        <div style="height:14px"></div>
        ${hard ? '' : `
          <button class="btn" onclick="addMoreVocab()">✨ Generar palabras nuevas con IA</button>
          <div style="height:8px"></div>
          <button class="btn secondary" onclick="loadSeedVocab()">📦 Cargar set inicial</button>
          <div style="height:8px"></div>`}
        <button class="btn ghost" onclick="go('home')">← Inicio</button>
      </div>`;
    return;
  }

  let idx = 0, flipped = false;
  render();

  function render() {
    const c = cards[idx];
    main.innerHTML = `
      <div class="fade-in">
        <p class="muted center">${hard ? '🔁 Difíciles · ' : ''}Tarjeta ${idx + 1} de ${cards.length}
          ${!hard && hardCount > 0 ? `· <a class="link" onclick="go('vocab','hard')">repasar ${hardCount} difíciles</a>` : ''}
        </p>
        <div class="flash ${flipped ? 'flipped' : ''}" id="flash">
          <div class="flash-inner">
            <div class="flash-face front">
              <div class="flash-word">${esc(c.en)} ${speakerIcon(c.en)}</div>
              <div class="flash-sub">${c.ex ? esc(c.ex) : ''}</div>
              <div class="flash-hint">Toca para ver la traducción</div>
            </div>
            <div class="flash-face back">
              <div class="flash-word">${esc(c.es)}</div>
              <div class="flash-sub">${esc(c.en)}</div>
            </div>
          </div>
        </div>
        ${flipped ? `
          <div class="row">
            <button class="btn bad" onclick="grade(false)">😕 Difícil</button>
            <button class="btn good" onclick="grade(true)">😎 Fácil</button>
          </div>` : `
          <button class="btn" onclick="flip()">Ver respuesta</button>`}
      </div>`;
  }

  window.flip = () => { flipped = true; render(); Speech.speak(cards[idx].en); };
  window.grade = (correct) => {
    Store.gradeCard(cards[idx].id, correct);
    Store.bumpReview();
    Store.markTask('review');
    Store.addXp(correct ? 5 : 2);
    idx++; flipped = false;
    if (idx >= cards.length) { toast('¡Sesión completada! +' + ' XP'); refreshStats(); go('vocab'); }
    else render();
  };
  $('#flash').addEventListener('click', (e) => { if (!flipped && !e.target.classList.contains('play')) window.flip(); });
};

window.loadSeedVocab = () => {
  const n = Store.addCards(SEED.vocab);
  toast(n ? `+${n} palabras añadidas` : 'Ya las tenías todas');
  go('vocab');
};

window.addMoreVocab = async () => {
  if (!Gemini.hasKey()) { toast('Agrega tu API key en Ajustes'); go('settings'); return; }
  main.innerHTML = `<div class="card center"><div class="loader"></div><p class="muted">Generando vocabulario...</p></div>`;
  try {
    const list = await Gemini.generateVocab();
    const n = Store.addCards(list);
    toast(`✨ +${n} palabras nuevas`);
    go('vocab');
  } catch (e) { handleAiError(e); go('vocab'); }
};

/* ============================================================= PHRASES */
Views.phrases = () => {
  main.innerHTML = `
    <div class="fade-in">
      <div class="section-title">Frases útiles</div>
      ${SEED.phrases.map(p => `
        <div class="card">
          <h2 style="font-size:16px">${esc(p.en)} ${speakerIcon(p.en)}</h2>
          <p>${esc(p.es)}</p>
        </div>`).join('')}
      <button class="btn secondary" onclick="practicePhrase()">🎙️ Practicar pronunciación</button>
    </div>`;
};

window.practicePhrase = () => {
  if (!Speech.supportsSTT) { toast('Tu navegador no soporta reconocimiento de voz'); return; }
  const p = SEED.phrases[Math.floor(Math.random() * SEED.phrases.length)];
  main.innerHTML = `
    <div class="fade-in center card">
      <p class="muted">Lee en voz alta:</p>
      <h2>${esc(p.en)} ${speakerIcon(p.en)}</h2>
      <p>${esc(p.es)}</p>
      <div style="height:16px"></div>
      <button class="btn" id="rec-btn">🎙️ Toca y habla</button>
      <p id="rec-out" class="muted" style="margin-top:14px"></p>
    </div>`;
  $('#rec-btn').onclick = () => {
    $('#rec-btn').classList.add('rec'); $('#rec-btn').textContent = '🎙️ Escuchando...';
    Speech.listen({
      onResult: (t) => { $('#rec-out').textContent = '“' + t + '”'; },
      onEnd: (t) => {
        $('#rec-btn').classList.remove('rec'); $('#rec-btn').textContent = '🎙️ Toca y habla';
        const score = similarity(t.toLowerCase(), p.en.toLowerCase());
        if (score > 0.7) { toast('¡Muy bien! 👏'); Store.addXp(5); refreshStats(); }
        else toast('Casi, inténtalo otra vez');
      },
      onError: () => { $('#rec-btn').classList.remove('rec'); $('#rec-btn').textContent = '🎙️ Toca y habla'; toast('No te escuché bien'); },
    });
  };
};

function similarity(a, b) {
  const wa = a.replace(/[^a-z ]/g, '').split(/\s+/).filter(Boolean);
  const wb = b.replace(/[^a-z ]/g, '').split(/\s+/).filter(Boolean);
  if (!wb.length) return 0;
  const setB = new Set(wb);
  const hit = wa.filter(w => setB.has(w)).length;
  return hit / wb.length;
}

/* ============================================================= GRAMMAR */
Views.grammar = () => {
  main.innerHTML = `
    <div class="fade-in center card">
      <div class="big-emoji">✍️</div>
      <h2>Quiz de gramática</h2>
      <p class="muted">Nivel ${Store.getSettings().level}</p>
      <div style="height:16px"></div>
      <button class="btn" onclick="startQuiz(true)">✨ Quiz con IA</button>
      <div style="height:8px"></div>
      <button class="btn secondary" onclick="startQuiz(false)">📦 Quiz rápido (offline)</button>
    </div>`;
};

window.startQuiz = async (useAi) => {
  let questions = SEED.grammar;
  if (useAi) {
    if (!Gemini.hasKey()) { toast('Agrega tu API key en Ajustes'); go('settings'); return; }
    main.innerHTML = `<div class="card center"><div class="loader"></div><p class="muted">Creando quiz...</p></div>`;
    try { questions = await Gemini.generateQuiz(); }
    catch (e) { handleAiError(e); questions = SEED.grammar; }
  } else {
    questions = [...SEED.grammar].sort(() => Math.random() - 0.5).slice(0, 5);
  }

  let idx = 0, score = 0;
  renderQ();

  function renderQ() {
    const q = questions[idx];
    main.innerHTML = `
      <div class="fade-in">
        <p class="muted center">Pregunta ${idx + 1} de ${questions.length}</p>
        <div class="card"><h2 style="font-size:18px">${esc(q.q)}</h2></div>
        <div id="opts">${q.opts.map((o, i) => `<button class="opt" data-i="${i}">${esc(o)}</button>`).join('')}</div>
        <p id="why" class="muted"></p>
      </div>`;
    $('#opts').querySelectorAll('.opt').forEach(btn => {
      btn.onclick = () => {
        const i = +btn.dataset.i;
        $('#opts').querySelectorAll('.opt').forEach(b => b.disabled = true);
        $('#opts').children[q.a].classList.add('correct');
        if (i === q.a) { score++; Store.addXp(5); }
        else btn.classList.add('wrong');
        $('#why').textContent = '💡 ' + q.why;
        const nextLbl = idx + 1 < questions.length ? 'Siguiente →' : 'Ver resultado';
        $('#why').insertAdjacentHTML('afterend', `<button class="btn" id="next" style="margin-top:8px">${nextLbl}</button>`);
        $('#next').onclick = () => { idx++; if (idx < questions.length) renderQ(); else finish(); };
      };
    });
  }
  function finish() {
    Store.bumpReview(); Store.markTask('quiz'); refreshStats();
    main.innerHTML = `
      <div class="fade-in center card">
        <div class="big-emoji">${score >= questions.length * 0.7 ? '🏆' : '💪'}</div>
        <h2>${score} / ${questions.length}</h2>
        <p class="muted">${score >= questions.length * 0.7 ? '¡Excelente trabajo!' : '¡Sigue practicando!'}</p>
        <div style="height:14px"></div>
        <button class="btn" onclick="go('grammar')">Otro quiz</button>
      </div>`;
  }
};

/* ============================================================= CHAT */
function removeChatBar() { const b = $('.chat-input-bar'); if (b) b.remove(); }

Views.chat = () => {
  const history = Store.getChat();
  main.innerHTML = `
    <div class="fade-in">
      <div class="card" style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
        <div class="big-emoji" style="margin:0;font-size:34px">🧑‍🏫</div>
        <div style="flex:1">
          <h2 style="font-size:16px;margin:0">Mia — tu tutora</h2>
          <small class="muted">Habla o escribe en inglés. Te corrijo con cariño.</small>
        </div>
        <button class="btn small secondary" onclick="Store.clearChat();go('chat')">🗑️</button>
      </div>
      <div id="chat-log"></div>
    </div>
    <div class="chat-input-bar">
      <button class="icon-btn" id="mic-btn" title="Hablar">🎙️</button>
      <input id="chat-input" placeholder="Type or speak in English..." autocomplete="off" />
      <button class="icon-btn" id="send-btn" title="Enviar">➤</button>
    </div>`;

  const log = $('#chat-log');
  if (!history.length) {
    addBubble('ai', "Hi! I'm Mia. What did you do today?", '');
  } else {
    history.forEach(m => addBubble(m.role, m.text, m.correction || ''));
  }
  scrollChat();

  $('#send-btn').onclick = sendChat;
  $('#chat-input').addEventListener('keydown', e => { if (e.key === 'Enter') sendChat(); });
  $('#mic-btn').onclick = micChat;
};

function addBubble(role, text, correction) {
  const log = $('#chat-log'); if (!log) return;
  const div = document.createElement('div');
  div.className = 'msg ' + (role === 'me' ? 'me' : 'ai');
  div.innerHTML = esc(text) + (role === 'ai' ? ' ' + speakerIcon(text) : '');
  if (correction) div.innerHTML += `<span class="tip">✏️ ${esc(correction)}</span>`;
  if (role === 'ai') {
    const btn = document.createElement('button');
    btn.className = 'explain-btn';
    btn.textContent = '🇪🇸 Explícame en español';
    btn.onclick = () => explainBubble(btn, text);
    div.appendChild(btn);
  }
  log.appendChild(div);
  scrollChat();
}
function scrollChat() { window.scrollTo(0, document.body.scrollHeight); }

async function explainBubble(btn, text) {
  if (!Gemini.hasKey()) { toast('Agrega tu API key en Ajustes'); return; }
  if (btn.dataset.done) return;
  btn.disabled = true; btn.textContent = '🇪🇸 Explicando...';
  try {
    const exp = await Gemini.explain(text);
    const box = document.createElement('span');
    box.className = 'tip explain';
    box.innerHTML = '🇪🇸 ' + esc(exp);
    btn.replaceWith(box);
  } catch (e) { handleAiError(e); btn.disabled = false; btn.textContent = '🇪🇸 Explícame en español'; }
}

async function sendChat() {
  const input = $('#chat-input');
  const text = input.value.trim();
  if (!text) return;
  if (!Gemini.hasKey()) { toast('Agrega tu API key en Ajustes'); go('settings'); return; }
  input.value = '';
  addBubble('me', text, '');
  Store.pushChat({ role: 'me', text });
  Store.markTask('chat');

  const log = $('#chat-log');
  const loading = document.createElement('div');
  loading.className = 'msg ai'; loading.innerHTML = '<div class="loader" style="margin:2px"></div>';
  log.appendChild(loading); scrollChat();

  try {
    const r = await Gemini.chat(Store.getChat().slice(-12), text, window.roleScenario || '');
    loading.remove();
    addBubble('ai', r.reply, r.correction);
    Store.pushChat({ role: 'ai', text: r.reply, correction: r.correction });
    Store.addXp(3); refreshStats();
    Speech.speak(r.reply);
  } catch (e) { loading.remove(); handleAiError(e); }
}

function micChat() {
  if (!Speech.supportsSTT) { toast('Tu navegador no soporta voz. Escribe el mensaje.'); return; }
  const btn = $('#mic-btn');
  btn.classList.add('rec');
  Speech.listen({
    onResult: (t) => { $('#chat-input').value = t; },
    onEnd: (t) => { btn.classList.remove('rec'); if (t) sendChat(); },
    onError: (e) => { btn.classList.remove('rec'); toast(e === 'no-support' ? 'Voz no soportada' : 'No te escuché'); },
  });
}

/* ============================================================= PLACEMENT (onboarding) */
Views.placement = () => {
  main.innerHTML = `
    <div class="fade-in center card" style="margin-top:20px">
      <div class="big-emoji">🧑‍🏫</div>
      <h2>¡Hola! Soy Mia 👋</h2>
      <p class="muted">Antes de empezar, vamos a averiguar tu nivel de inglés con una prueba rápida de 10 preguntas. Así adapto todo a ti.</p>
      <div style="height:16px"></div>
      <button class="btn" onclick="startPlacement()">🚀 Empezar prueba</button>
      <div style="height:8px"></div>
      <button class="btn ghost" onclick="skipPlacement()">Prefiero elegir mi nivel</button>
    </div>`;
};

window.skipPlacement = () => { Store.setSettings({ onboarded: true }); go('settings'); toast('Elige tu nivel y guarda'); };

window.startPlacement = () => {
  const qs = SEED.placement;
  let idx = 0, score = 0;
  renderP();

  function renderP() {
    const q = qs[idx];
    main.innerHTML = `
      <div class="fade-in">
        <p class="muted center">Prueba de nivel · ${idx + 1} de ${qs.length}</p>
        <div class="progress"><i style="width:${(idx / qs.length) * 100}%"></i></div>
        <div class="card"><h2 style="font-size:18px">${esc(q.q)}</h2></div>
        <div id="popts">${q.opts.map((o, i) => `<button class="opt" data-i="${i}">${esc(o)}</button>`).join('')}</div>
      </div>`;
    $('#popts').querySelectorAll('.opt').forEach(btn => {
      btn.onclick = () => {
        if (+btn.dataset.i === q.a) score++;
        idx++;
        if (idx < qs.length) renderP(); else finishP();
      };
    });
  }

  function finishP() {
    let level = 'A2';
    if (score >= 9) level = 'C2';
    else if (score >= 7) level = 'C1';
    else if (score >= 5) level = 'B2';
    else if (score >= 3) level = 'B1';
    else level = 'A2';
    Store.setSettings({ level, onboarded: true });
    const names = { A2: 'Básico', B1: 'Intermedio', B2: 'Intermedio alto', C1: 'Avanzado', C2: 'Dominio' };
    main.innerHTML = `
      <div class="fade-in center card" style="margin-top:20px">
        <div class="big-emoji">🎯</div>
        <h2>Tu nivel: ${level}</h2>
        <p class="muted">${names[level]} · acertaste ${score} de ${qs.length}</p>
        <p style="margin-top:10px">¡Perfecto! Adapté la app a tu nivel. Puedes cambiarlo cuando quieras en Ajustes.</p>
        <div style="height:16px"></div>
        <button class="btn" onclick="go('home')">Empezar a aprender 🚀</button>
      </div>`;
    refreshStats();
  }
};

/* ============================================================= MUSIC */
Views.music = () => {
  const songs = Store.getSettings().songs || [];
  main.innerHTML = `
    <div class="fade-in">
      <div class="card hero-music">
        <div class="big-emoji" style="margin:0">🎵</div>
        <h2 style="color:#fff;text-align:center">Aprende con tus canciones</h2>
        <p style="color:#fde68a;text-align:center">Escribe una canción en inglés que te guste y aprenderás su vocabulario, expresiones y significado a tu nivel (${Store.getSettings().level}).</p>
      </div>

      <button class="btn" onclick="surpriseSong()">🎲 Sorpréndeme</button>
      <div class="section-title">Elige un género</div>
      <div class="chips">
        ${SEED.songGenres.map(g => `<button class="chip genre-chip" data-g="${g.id}" onclick="pickGenre('${g.id}')">${g.icon} ${g.name}</button>`).join('')}
      </div>
      <div id="genre-songs"></div>

      ${songs.length ? `
        <div class="section-title">Tus canciones recientes</div>
        <div class="chips">
          ${songs.map(s => `<button class="chip" onclick="learnSong(${JSON.stringify(s).replace(/"/g, '&quot;')})">${esc(s)}</button>`).join('')}
        </div>` : ''}

      <div class="section-title">¿Otra canción?</div>
      <div class="field">
        <input id="song-name" placeholder="Escríbela: Ej: Shape of You - Ed Sheeran" />
      </div>
      <button class="btn secondary" onclick="learnSong()">🎧 Aprender con esa canción</button>
      <div style="height:8px"></div>
      <button class="btn ghost" onclick="makeSong()">✨ O deja que la IA te componga una</button>

      <div id="song-out"></div>
    </div>`;
};

window.surpriseSong = () => {
  const all = SEED.songGenres.flatMap(g => g.songs);
  const pick = all[Math.floor(Math.random() * all.length)];
  toast('🎲 ' + pick.n);
  learnSong(pick.n, pick.yt);
};

window.pickGenre = (gid) => {
  const g = SEED.songGenres.find(x => x.id === gid);
  if (!g) return;
  document.querySelectorAll('.genre-chip').forEach(c => c.classList.toggle('active', c.dataset.g === gid));
  $('#genre-songs').innerHTML = `
    <div class="card fade-in" style="margin-top:10px">
      <h2 style="font-size:16px">${g.icon} ${g.name}</h2>
      <div class="song-list">
        ${g.songs.map(s => `
          <button class="song-item" onclick="learnSong(${JSON.stringify(s.n).replace(/"/g, '&quot;')}, '${s.yt}')">
            <span>🎵 ${esc(s.n)}</span><span class="go-arrow">›</span>
          </button>`).join('')}
      </div>
    </div>`;
  $('#genre-songs').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

window.learnSong = async (preset, ytId) => {
  if (!Gemini.hasKey()) { toast('Agrega tu API key en Ajustes'); go('settings'); return; }
  const name = preset || ($('#song-name') && $('#song-name').value.trim()) || '';
  if (!name) { toast('Escribe el nombre de una canción'); return; }
  Store.addSong(name);
  const out = $('#song-out');
  out.innerHTML = `<div class="card center"><div class="loader"></div><p class="muted">Preparando tu lección con "${esc(name)}"... 🎧</p></div>`;
  try {
    const l = await Gemini.songLesson(name);
    const vid = ytId || l.youtubeId || '';
    const ytUrl = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(l.title + ' ' + l.artist);
    const player = vid
      ? `<div class="yt-wrap"><iframe src="https://www.youtube.com/embed/${vid}" title="YouTube" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>
         <p class="muted center" style="font-size:12px;margin-top:6px">¿No es la canción correcta? <a class="link" onclick="window.open('${ytUrl}','_blank')">buscar en YouTube</a></p>`
      : `<button class="btn secondary" onclick="window.open('${ytUrl}','_blank')">▶️ Buscar en YouTube</button>`;
    out.innerHTML = `
      <div class="card fade-in song-card">
        <h2 style="text-align:center">🎶 ${esc(l.title)}</h2>
        <p class="muted center">${esc(l.artist)}</p>
        ${player}
        <button class="btn good" onclick='openLyrics(${JSON.stringify(l.title + ' ' + l.artist)}, "${vid}")'>📜 Escuchar y leer la letra</button>
        <p style="margin:10px 0">${esc(l.about)}</p>

        <div class="section-title">Expresiones de la canción</div>
        ${l.expressions.map(e => `
          <div class="lyric">
            <span class="en">${esc(e.en)} ${speakerIcon(e.en)}</span>
            <span class="es">${esc(e.es)}</span>
            <span class="es" style="color:var(--warn)">💡 ${esc(e.note)}</span>
          </div>`).join('')}

        <div style="height:10px"></div>
        <button class="btn" onclick='Store.addCards(${JSON.stringify(l.vocab)});toast("✅ ${l.vocab.length} palabras guardadas")'>💾 Guardar ${l.vocab.length} palabras en Vocabulario</button>
      </div>`;
    Store.addXp(5); refreshStats();
  } catch (e) { handleAiError(e); out.innerHTML = ''; }
};

let _showEs = true;
window.openLyrics = async (name, vid) => {
  if (!Gemini.hasKey()) { toast('Agrega tu API key en Ajustes'); go('settings'); return; }
  current = 'music';
  main.innerHTML = `<div class="card center"><div class="loader"></div><p class="muted">Buscando la letra de "${esc(name)}"... 📜</p></div>`;
  try {
    const r = await Gemini.songLyrics(name);
    renderLyrics(name, vid, r.lines);
    Store.addXp(5); Store.markTask('read'); refreshStats();
  } catch (e) { handleAiError(e); go('music'); }
};

function renderLyrics(name, vid, lines) {
  const player = vid
    ? `<div class="yt-wrap"><iframe src="https://www.youtube.com/embed/${vid}" title="YouTube" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`
    : '';
  main.innerHTML = `
    <div class="fade-in">
      <div class="lyrics-player">${player}</div>
      <div class="lyrics-bar">
        <button class="btn small ghost" onclick="go('music')">← Volver</button>
        <button class="btn small secondary" onclick="toggleEs()">${_showEs ? '🙈 Ocultar traducción' : '👁️ Ver traducción'}</button>
      </div>
      <div class="full-lyrics ${_showEs ? '' : 'hide-es'}" id="full-lyrics">
        ${lines.map(l => `
          <div class="lline">
            <span class="en">${esc(l.en)} ${speakerIcon(l.en)}</span>
            <span class="es">${esc(l.es)}</span>
          </div>`).join('')}
      </div>
    </div>`;
  window._lyricsData = { name, vid, lines };
}
window.toggleEs = () => { _showEs = !_showEs; const d = window._lyricsData; if (d) renderLyrics(d.name, d.vid, d.lines); };

window.makeSong = async () => {
  if (!Gemini.hasKey()) { toast('Agrega tu API key en Ajustes'); go('settings'); return; }
  const out = $('#song-out');
  out.innerHTML = `<div class="card center"><div class="loader"></div><p class="muted">Componiendo tu canción... 🎼</p></div>`;
  try {
    const song = await Gemini.generateSong('');
    const fullText = song.lines.map(l => l.en).join('. ');
    out.innerHTML = `
      <div class="card fade-in song-card">
        <h2 style="text-align:center">🎶 ${esc(song.title)}</h2>
        <div class="lyrics">
          ${song.lines.map(l => `<div class="lyric"><span class="en">${esc(l.en)}</span><span class="es">${esc(l.es)}</span></div>`).join('')}
        </div>
        <button class="btn" onclick='Speech.speak(${JSON.stringify(fullText)})'>🔊 Reproducir</button>
        <div style="height:8px"></div>
        <button class="btn good" onclick='startKaraoke(${JSON.stringify(song.lines)})'>🎤 Karaoke (completar)</button>
        <div style="height:8px"></div>
        <button class="btn secondary" onclick='Store.addCards(${JSON.stringify(song.vocab)});toast("Palabras guardadas")'>💾 Guardar ${song.vocab.length} palabras</button>
      </div>`;
    Store.addXp(5); refreshStats();
  } catch (e) { handleAiError(e); out.innerHTML = ''; }
};

window.startKaraoke = (lines) => {
  // Elegir una palabra a ocultar por línea (la más larga)
  const items = lines.map(l => {
    const words = l.en.split(/\s+/);
    let wi = 0; for (let i = 0; i < words.length; i++) if (words[i].replace(/[^a-zA-Z]/g, '').length > words[wi].replace(/[^a-zA-Z]/g, '').length) wi = i;
    const answer = words[wi].replace(/[^a-zA-Z']/g, '');
    return { line: l.en, words, wi, answer };
  }).filter(it => it.answer.length > 2);

  const bank = [...new Set(items.map(it => it.answer))].sort(() => Math.random() - 0.5);
  let idx = 0, score = 0;
  renderK();

  function renderK() {
    const it = items[idx];
    const display = it.words.map((w, i) => i === it.wi ? '<b style="color:var(--accent)">_____</b>' : esc(w)).join(' ');
    main.innerHTML = `
      <div class="fade-in">
        <p class="muted center">🎤 Karaoke · ${idx + 1} de ${items.length}</p>
        <div class="card center">
          <p style="font-size:18px;line-height:1.6">${display}</p>
          <button class="btn small secondary" onclick='Speech.speak(${JSON.stringify(it.line)})'>🔊 Escuchar la línea</button>
        </div>
        <p class="muted center">Toca la palabra que falta:</p>
        <div class="chips" style="justify-content:center">
          ${bank.map(w => `<button class="chip" onclick="answerK(this,'${w}')">${esc(w)}</button>`).join('')}
        </div>
      </div>`;
  }
  window.answerK = (btn, w) => {
    const it = items[idx];
    if (w.toLowerCase() === it.answer.toLowerCase()) {
      score++; btn.style.background = 'var(--good)'; Store.addXp(3);
    } else { btn.style.background = 'var(--bad)'; toast('Era: ' + it.answer); }
    setTimeout(() => {
      idx++;
      if (idx < items.length) renderK();
      else {
        refreshStats();
        main.innerHTML = `<div class="fade-in center card" style="margin-top:20px"><div class="big-emoji">🎤</div><h2>${score}/${items.length}</h2><p class="muted">¡Bien cantado!</p><div style="height:14px"></div><button class="btn" onclick="go('music')">Volver a Música</button></div>`;
      }
    }, 600);
  };
};

/* ============================================================= ROLEPLAY */
const SCENARIOS = [
  { icon: '✈️', title: 'En el aeropuerto', es: 'Facturar maleta y buscar tu puerta', sc: 'You are an airport check-in agent helping the traveler check a bag and find their gate.', first: 'Hello! Welcome to the airport. May I see your passport and ticket, please?' },
  { icon: '🍽️', title: 'En un restaurante', es: 'Pedir comida y pagar la cuenta', sc: 'You are a waiter in a restaurant taking the customer\'s order.', first: 'Good evening! Welcome. Here is the menu. Can I get you something to drink first?' },
  { icon: '💼', title: 'Entrevista de trabajo', es: 'Responder preguntas de una entrevista', sc: 'You are a recruiter interviewing the candidate for a job. Ask typical interview questions.', first: 'Hi, thanks for coming in today. So, tell me a little about yourself.' },
  { icon: '🏨', title: 'En el hotel', es: 'Hacer check-in y pedir servicios', sc: 'You are a hotel receptionist helping the guest check in.', first: 'Welcome to our hotel! Do you have a reservation with us?' },
  { icon: '🛍️', title: 'De compras', es: 'Comprar ropa y preguntar precios', sc: 'You are a shop assistant in a clothing store helping the customer.', first: 'Hi there! Are you looking for anything in particular today?' },
  { icon: '👩‍⚕️', title: 'En el médico', es: 'Explicar síntomas al doctor', sc: 'You are a doctor asking the patient about their symptoms.', first: 'Hello, please have a seat. So, what brings you in today?' },
];

Views.roleplay = () => {
  main.innerHTML = `
    <div class="fade-in">
      <div class="card hero-role">
        <div class="big-emoji" style="margin:0">🎭</div>
        <h2 style="color:#fff;text-align:center">Roleplay con Mia</h2>
        <p style="color:#ddd6fe;text-align:center">Practica conversaciones de la vida real. Elige una situación y habla o escribe.</p>
      </div>
      <button class="btn" onclick="startRole(Math.floor(Math.random()*${SCENARIOS.length}))">🎲 Situación al azar</button>
      <div style="height:12px"></div>
      <div class="tiles">
        ${SCENARIOS.map((s, i) => `
          <button class="tile" onclick="startRole(${i})">
            <div class="emoji">${s.icon}</div><h3>${s.title}</h3><small>${s.es}</small>
          </button>`).join('')}
      </div>
    </div>`;
};

window.startRole = (i) => {
  const s = SCENARIOS[i];
  window.roleScenario = s.sc;
  Store.clearChat();
  Store.pushChat({ role: 'ai', text: s.first, correction: '' });
  current = 'chat';
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === 'chat'));
  main.innerHTML = '';
  Views.chat();
  toast('🎭 ' + s.title);
};

/* ============================================================= WRITING */
Views.writing = () => {
  main.innerHTML = `
    <div class="fade-in">
      <div class="card hero-write">
        <div class="big-emoji" style="margin:0">📝</div>
        <h2 style="color:#fff;text-align:center">Escribe en inglés</h2>
        <p style="color:#d1fae5;text-align:center">Escribe lo que quieras (un correo, tu día, una opinión) y la IA te corrige y explica en español.</p>
      </div>
      <div class="field">
        <textarea id="write-text" rows="6" placeholder="Write here in English..."></textarea>
      </div>
      <button class="btn" onclick="checkWriting()">✅ Corregir mi texto</button>
      <div id="write-out"></div>
    </div>`;
};

window.checkWriting = async () => {
  if (!Gemini.hasKey()) { toast('Agrega tu API key en Ajustes'); go('settings'); return; }
  const text = $('#write-text').value.trim();
  if (text.length < 5) { toast('Escribe un poco más'); return; }
  const out = $('#write-out');
  out.innerHTML = `<div class="card center"><div class="loader"></div><p class="muted">Revisando tu texto...</p></div>`;
  try {
    const r = await Gemini.writingFeedback(text);
    out.innerHTML = `
      <div class="card fade-in">
        <div class="center"><span class="score-badge ${r.score >= 70 ? 'good' : 'mid'}">${r.score}/100</span></div>
        <div class="section-title">✅ Versión corregida</div>
        <p style="font-size:16px">${esc(r.corrected)} ${speakerIcon(r.corrected)}</p>
        <div class="section-title">💡 Explicación</div>
        <p>${esc(r.feedback)}</p>
      </div>`;
    Store.markTask('write'); Store.addXp(8); refreshStats();
  } catch (e) { handleAiError(e); out.innerHTML = ''; }
};

/* ============================================================= READING */
Views.reading = () => {
  main.innerHTML = `
    <div class="fade-in center card" style="margin-top:10px">
      <div class="big-emoji">📖</div>
      <h2>Lectura</h2>
      <p class="muted">Un texto corto a tu nivel (${Store.getSettings().level}) con preguntas de comprensión.</p>
      <div class="field" style="margin-top:14px;text-align:left">
        <label>Tema (opcional)</label>
        <input id="read-topic" placeholder="Ej: tecnología, viajes, animales..." />
      </div>
      <button class="btn" onclick="startReading()">📖 Generar lectura</button>
    </div>`;
};

window.startReading = async () => {
  if (!Gemini.hasKey()) { toast('Agrega tu API key en Ajustes'); go('settings'); return; }
  const topic = ($('#read-topic') && $('#read-topic').value.trim()) || '';
  main.innerHTML = `<div class="card center"><div class="loader"></div><p class="muted">Creando tu lectura...</p></div>`;
  try {
    const r = await Gemini.generateReading(topic);
    let answered = 0, score = 0;
    main.innerHTML = `
      <div class="fade-in">
        <div class="card">
          <h2>${esc(r.title)} ${speakerIcon(r.text)}</h2>
          <p style="font-size:16px;line-height:1.6;margin-top:8px">${esc(r.text)}</p>
        </div>
        <div class="section-title">Preguntas</div>
        <div id="read-qs"></div>
      </div>`;
    const cont = $('#read-qs');
    r.questions.forEach((q, qi) => {
      const block = document.createElement('div');
      block.className = 'card';
      block.innerHTML = `<p style="font-weight:600">${qi + 1}. ${esc(q.q)}</p>` +
        q.opts.map((o, i) => `<button class="opt" data-q="${qi}" data-i="${i}">${esc(o)}</button>`).join('');
      cont.appendChild(block);
      block.querySelectorAll('.opt').forEach(btn => {
        btn.onclick = () => {
          block.querySelectorAll('.opt').forEach(b => b.disabled = true);
          block.querySelectorAll('.opt')[q.a].classList.add('correct');
          if (+btn.dataset.i === q.a) score++; else btn.classList.add('wrong');
          answered++;
          if (answered === r.questions.length) {
            Store.markTask('read'); Store.addXp(8); refreshStats();
            toast(`📖 ${score}/${r.questions.length} correctas · +XP`);
          }
        };
      });
    });
  } catch (e) { handleAiError(e); go('reading'); }
};

/* ============================================================= SETTINGS */
Views.settings = () => {
  const s = Store.getSettings();
  main.innerHTML = `
    <div class="fade-in">
      <div class="section-title">Ajustes</div>

      <div class="card">
        <div class="field">
          <label>Tu nivel</label>
          <select id="set-level">
            ${[
              ['A2', 'A2 — Básico'],
              ['B1', 'B1 — Intermedio'],
              ['B2', 'B2 — Intermedio alto'],
              ['C1', 'C1 — Avanzado'],
              ['C2', 'C2 — Dominio'],
            ].map(([v, n]) => `<option value="${v}" ${s.level === v ? 'selected' : ''}>${n}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>Velocidad de la voz (${s.voiceRate})</label>
          <input id="set-rate" type="range" min="0.6" max="1.1" step="0.05" value="${s.voiceRate}" />
        </div>
        <div class="field">
          <label>Tema</label>
          <select id="set-theme">
            <option value="dark" ${s.theme === 'dark' ? 'selected' : ''}>🌙 Oscuro</option>
            <option value="light" ${s.theme === 'light' ? 'selected' : ''}>☀️ Claro</option>
          </select>
        </div>
      </div>

      <div class="card">
        <div class="field">
          <label>Meta diaria de XP</label>
          <select id="set-goal">
            ${[20, 30, 50, 80, 120].map(v => `<option value="${v}" ${s.xpGoal === v ? 'selected' : ''}>${v} XP</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>Recordatorio diario</label>
          <input id="set-reminder" type="time" value="${esc(s.reminderTime)}" />
        </div>
        <p class="muted">Recibe un aviso para no romper tu racha. ${Notify.supported ? '' : '(Tu navegador no soporta notificaciones)'}</p>
        <div style="height:8px"></div>
        <button class="btn small secondary" onclick="enableReminder()">🔔 Activar notificaciones</button>
      </div>

      <div class="card">
        <div class="field">
          <label>API Key de Google Gemini (gratis)</label>
          <input id="set-key" type="password" placeholder="Pega tu API key aquí" value="${esc(s.apiKey)}" />
        </div>
        <p class="muted">Consíguela gratis en <a class="link" href="https://aistudio.google.com/app/apikey" target="_blank">aistudio.google.com/app/apikey</a>. Se guarda solo en tu celular.</p>
        <div class="field" style="margin-top:14px">
          <label>Modelo de IA (si uno no tiene cuota, prueba otro)</label>
          <select id="set-model">
            ${[
              ['gemini-2.5-flash', 'Gemini 2.5 Flash (recomendado)'],
              ['gemini-2.5-flash-lite', 'Gemini 2.5 Flash Lite (más cuota)'],
              ['gemini-2.0-flash', 'Gemini 2.0 Flash'],
              ['gemini-flash-latest', 'Gemini Flash (último)'],
            ].map(([v, n]) => `<option value="${v}" ${s.model === v ? 'selected' : ''}>${n}</option>`).join('')}
          </select>
        </div>
        <button class="btn small secondary" onclick="testKey()">Probar conexión</button>
      </div>

      <button class="btn" onclick="saveSettings()">💾 Guardar</button>
      <div style="height:10px"></div>
      <button class="btn ghost" onclick="if(confirm('¿Borrar todo el progreso?')){Store.reset();toast('Reiniciado');go('home');}">Borrar datos</button>

      <p class="muted center" style="margin-top:18px">English A2→C2 · v2.0</p>
    </div>`;

  $('#set-rate').addEventListener('input', e => {
    e.target.previousElementSibling.textContent = 'Velocidad de la voz (' + e.target.value + ')';
  });
  $('#set-theme').addEventListener('change', e => applyTheme(e.target.value));
};

window.enableReminder = async () => {
  const p = await Notify.requestPermission();
  if (p === 'granted') { toast('🔔 Notificaciones activadas'); Notify.show('¡Listo! 🎯', 'Te avisaré para practicar inglés.'); }
  else if (p === 'unsupported') toast('Tu navegador no soporta notificaciones');
  else toast('Permiso denegado. Actívalo en los ajustes del navegador.');
};

window.saveSettings = () => {
  Store.setSettings({
    level: $('#set-level').value,
    voiceRate: parseFloat($('#set-rate').value),
    apiKey: $('#set-key').value.trim(),
    model: $('#set-model').value,
    theme: $('#set-theme').value,
    xpGoal: parseInt($('#set-goal').value, 10),
    reminderTime: $('#set-reminder').value,
  });
  applyTheme($('#set-theme').value);
  Notify.schedule($('#set-reminder').value);
  toast('✅ Guardado');
  go('home');
};

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : 'dark');
}

window.testKey = async () => {
  Store.setSettings({ apiKey: $('#set-key').value.trim(), model: $('#set-model').value });
  if (!Gemini.hasKey()) { toast('Pega una API key primero'); return; }
  toast('Probando...');
  try { await Gemini.generateVocab('test'); toast('✅ ¡Conexión correcta!'); }
  catch (e) { handleAiError(e); }
};

/* ---------- manejo de errores IA ---------- */
function handleAiError(e) {
  const m = (e && e.message) || '';
  const d = e && e.detail ? ' — ' + e.detail : '';
  if (m === 'NO_KEY') toast('Agrega tu API key en Ajustes');
  else if (m === 'BAD_KEY') toast('❌ API key inválida' + d);
  else if (m.startsWith('API_429')) toast('Cuota agotada/limitada' + d);
  else if (m.startsWith('API_')) toast('Error ' + m + d);
  else toast('Sin conexión o error de red');
  if (e) console.error('AI error:', m, e.detail || '');
}

/* ---------- arranque ---------- */
// Aplicar tema guardado
applyTheme(Store.getSettings().theme);

// Cargar set inicial la primera vez (antes de pintar)
if (Store.allCards().length === 0) Store.addCards(SEED.vocab);

// Recordatorio diario (mejor esfuerzo)
const _rt = Store.getSettings().reminderTime;
if (_rt) { Notify.schedule(_rt); Notify.nudgeOnLoad(); }

if (!Store.getSettings().onboarded) {
  current = 'placement';
  Views.placement();
} else {
  go('home');
}
refreshStats();

// Registrar service worker (PWA / offline)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  });
}
