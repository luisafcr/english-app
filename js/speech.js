/* speech.js — Web Speech API: texto->voz (TTS) y voz->texto (STT), gratis */
const Speech = (() => {
  let voices = [];

  function loadVoices() {
    voices = window.speechSynthesis ? speechSynthesis.getVoices() : [];
  }
  if (window.speechSynthesis) {
    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;
  }

  function pickEnVoice() {
    if (!voices.length) loadVoices();
    // Prefiere voces en inglés naturales
    return voices.find(v => /en[-_]US/i.test(v.lang) && /natural|google|samantha|aria/i.test(v.name))
        || voices.find(v => /en[-_]US/i.test(v.lang))
        || voices.find(v => /^en/i.test(v.lang))
        || null;
  }

  // Hablar texto en inglés
  function speak(text, opts = {}) {
    if (!window.speechSynthesis) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    const v = pickEnVoice();
    if (v) u.voice = v;
    u.rate = opts.rate ?? (Store.getSettings().voiceRate || 0.9);
    u.pitch = 1;
    speechSynthesis.speak(u);
  }

  function stop() { if (window.speechSynthesis) speechSynthesis.cancel(); }

  const supportsSTT = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  // Escuchar al usuario hablar en inglés -> devuelve texto
  function listen({ onResult, onEnd, onError } = {}) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { onError && onError('no-support'); return null; }
    const rec = new SR();
    rec.lang = 'en-US';
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    let finalText = '';
    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      onResult && onResult(finalText || interim, !!finalText);
    };
    rec.onerror = (e) => onError && onError(e.error);
    rec.onend = () => onEnd && onEnd(finalText.trim());
    rec.start();
    return rec;
  }

  return { speak, stop, listen, supportsSTT, supportsTTS: !!window.speechSynthesis };
})();
