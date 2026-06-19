/* storage.js — guarda progreso, racha, ajustes y tarjetas SRS en localStorage */
const Store = (() => {
  const KEY = 'english_app_v1';

  const defaults = {
    settings: {
      apiKey: '',
      model: 'gemini-2.5-flash',
      level: 'A2',          // A2 | B1 | B2 | C1 | C2
      voiceRate: 0.9,
      nativeLang: 'español',
      onboarded: false,
      songs: [],            // canciones favoritas recientes
      xpGoal: 50,           // meta diaria de XP
      reminderTime: '',     // 'HH:MM' o vacío
      theme: 'dark',        // dark | light
    },
    stats: {
      xp: 0,
      streak: 0,
      lastActiveDate: null,  // 'YYYY-MM-DD'
      reviewsToday: 0,
      reviewsDate: null,
      xpToday: 0,
      xpDate: null,
      history: {},           // 'YYYY-MM-DD' -> xp del día
    },
    cards: {},   // id -> { id, en, es, ex, box, due, seen }
    chat: [],    // historial conversación
    daily: { date: null, tasks: {} },  // plan del día
    achievements: [],  // ids de logros desbloqueados
  };

  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return structuredClone(defaults);
      const parsed = JSON.parse(raw);
      // merge defaults
      return {
        settings: { ...defaults.settings, ...(parsed.settings || {}) },
        stats: { ...defaults.stats, ...(parsed.stats || {}) },
        cards: parsed.cards || {},
        chat: parsed.chat || [],
        daily: parsed.daily || { date: null, tasks: {} },
        achievements: parsed.achievements || [],
      };
    } catch {
      return structuredClone(defaults);
    }
  }

  function save() {
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  /* ---- Ajustes ---- */
  function getSettings() { return state.settings; }
  function setSettings(patch) { state.settings = { ...state.settings, ...patch }; save(); }

  function addSong(name) {
    const n = (name || '').trim();
    if (!n) return;
    const list = state.settings.songs.filter(s => s.toLowerCase() !== n.toLowerCase());
    list.unshift(n);
    state.settings.songs = list.slice(0, 8);
    save();
  }

  /* ---- Stats / racha / XP ---- */
  function getStats() {
    const t = today();
    if (state.stats.xpDate !== t) { state.stats.xpToday = 0; }
    return state.stats;
  }

  function touchStreak() {
    const t = today();
    const s = state.stats;
    if (s.lastActiveDate === t) return;
    const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    if (s.lastActiveDate === yesterday) s.streak += 1;
    else s.streak = 1;
    s.lastActiveDate = t;
    save();
  }

  function addXp(n) {
    const t = today();
    const s = state.stats;
    s.xp += n;
    if (s.xpDate !== t) { s.xpDate = t; s.xpToday = 0; }
    s.xpToday += n;
    s.history[t] = (s.history[t] || 0) + n;
    // mantener solo ~60 días
    const keys = Object.keys(s.history).sort();
    while (keys.length > 60) delete s.history[keys.shift()];
    touchStreak();
    save();
  }

  function xpToday() {
    const t = today();
    if (state.stats.xpDate !== t) return 0;
    return state.stats.xpToday;
  }

  function last7() {
    const out = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
      out.push({ date: d, xp: state.stats.history[d] || 0 });
    }
    return out;
  }

  function bumpReview() {
    const t = today();
    if (state.stats.reviewsDate !== t) {
      state.stats.reviewsDate = t;
      state.stats.reviewsToday = 0;
    }
    state.stats.reviewsToday += 1;
    save();
  }

  /* ---- SRS (Leitner) ---- */
  // box 0..5, intervalos en días
  const INTERVALS = [0, 1, 2, 4, 8, 16];

  function addCards(list) {
    let added = 0;
    for (const c of list) {
      const id = (c.en || '').toLowerCase().trim();
      if (!id || state.cards[id]) continue;
      state.cards[id] = {
        id, en: c.en, es: c.es, ex: c.ex || '',
        box: 0, due: today(), seen: 0,
      };
      added++;
    }
    save();
    return added;
  }

  function dueCards(limit = 20) {
    const t = today();
    const arr = Object.values(state.cards)
      .filter(c => c.due <= t)
      .sort((a, b) => (a.due < b.due ? -1 : 1));
    return arr.slice(0, limit);
  }

  function allCards() { return Object.values(state.cards); }

  function hardCards(limit = 20) {
    return Object.values(state.cards)
      .filter(c => (c.fails || 0) > 0 && c.box < 4)
      .sort((a, b) => (b.fails || 0) - (a.fails || 0))
      .slice(0, limit);
  }

  function gradeCard(id, correct) {
    const c = state.cards[id];
    if (!c) return;
    c.seen += 1;
    if (correct) c.box = Math.min(5, c.box + 1);
    else { c.box = Math.max(0, c.box - 1); c.fails = (c.fails || 0) + 1; }
    const days = INTERVALS[c.box];
    c.due = new Date(Date.now() + days * 864e5).toISOString().slice(0, 10);
    save();
  }

  /* ---- Plan diario ---- */
  function getDaily() {
    const t = today();
    if (state.daily.date !== t) { state.daily = { date: t, tasks: {} }; save(); }
    return state.daily;
  }
  function markTask(key) {
    getDaily();
    if (!state.daily.tasks[key]) { state.daily.tasks[key] = true; save(); }
  }

  /* ---- Logros ---- */
  function masteredCount() { return Object.values(state.cards).filter(c => c.box >= 5).length; }

  function checkAchievements() {
    const s = state.stats;
    const defs = {
      first_word: () => Object.keys(state.cards).length > 0,
      streak_3: () => s.streak >= 3,
      streak_7: () => s.streak >= 7,
      streak_30: () => s.streak >= 30,
      xp_100: () => s.xp >= 100,
      xp_500: () => s.xp >= 500,
      xp_2000: () => s.xp >= 2000,
      mastered_10: () => masteredCount() >= 10,
      mastered_50: () => masteredCount() >= 50,
    };
    const newly = [];
    for (const [id, fn] of Object.entries(defs)) {
      if (fn() && !state.achievements.includes(id)) { state.achievements.push(id); newly.push(id); }
    }
    if (newly.length) save();
    return newly;
  }
  function getAchievements() { return state.achievements; }

  /* ---- Chat ---- */
  function getChat() { return state.chat; }
  function pushChat(msg) { state.chat.push(msg); if (state.chat.length > 60) state.chat.shift(); save(); }
  function clearChat() { state.chat = []; save(); }

  function reset() { state = structuredClone(defaults); save(); }

  return {
    getSettings, setSettings, addSong,
    getStats, addXp, touchStreak, bumpReview, xpToday, last7,
    addCards, dueCards, allCards, gradeCard, masteredCount, hardCards,
    getDaily, markTask, checkAchievements, getAchievements,
    getChat, pushChat, clearChat,
    today, reset,
  };
})();
