/* gemini.js — llamadas a la API gratuita de Google Gemini */
const Gemini = (() => {
  const DEFAULT_MODEL = 'gemini-2.5-flash';
  const model = () => Store.getSettings().model || DEFAULT_MODEL;
  const ENDPOINT = (key) =>
    `https://generativelanguage.googleapis.com/v1beta/models/${model()}:generateContent?key=${key}`;

  function hasKey() { return !!Store.getSettings().apiKey; }

  async function raw(contents, systemInstruction, jsonSchema) {
    const key = Store.getSettings().apiKey;
    if (!key) throw new Error('NO_KEY');

    const body = { contents };
    if (systemInstruction) body.systemInstruction = { parts: [{ text: systemInstruction }] };
    body.generationConfig = { temperature: 0.7 };
    if (jsonSchema) {
      body.generationConfig.responseMimeType = 'application/json';
      body.generationConfig.responseSchema = jsonSchema;
    }

    const res = await fetch(ENDPOINT(key), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const t = await res.text();
      let detail = '';
      try { detail = JSON.parse(t)?.error?.message || ''; } catch { detail = t.slice(0, 120); }
      if (res.status === 400 && /API key/i.test(t)) throw new Error('BAD_KEY');
      const err = new Error('API_' + res.status);
      err.detail = detail;
      throw err;
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
    return text;
  }

  function level() { return Store.getSettings().level || 'A2'; }

  /* ---- Conversación: respuesta natural + corrección suave ---- */
  async function chat(history, userText, scenario) {
    const sys = `You are "Mia", a friendly English tutor for a Spanish-speaking learner at CEFR level ${level()}.
Goals: have a natural, encouraging conversation in ENGLISH to help them improve.
${scenario ? 'ROLEPLAY: Stay in character for this situation -> ' + scenario : ''}
Rules:
- Keep your reply short (1-3 sentences), use simple ${level()} vocabulary, and ALWAYS end with a follow-up question.
- If the learner's message has a grammar or vocabulary mistake, gently correct it.
- Respond ONLY as JSON: { "reply": "<your English reply>", "correction": "<short correction in Spanish, or empty string if no mistakes>" }`;

    const contents = history.map(m => ({
      role: m.role === 'me' ? 'user' : 'model',
      parts: [{ text: m.text }],
    }));
    contents.push({ role: 'user', parts: [{ text: userText }] });

    const schema = {
      type: 'object',
      properties: { reply: { type: 'string' }, correction: { type: 'string' } },
      required: ['reply', 'correction'],
    };
    const txt = await raw(contents, sys, schema);
    try { return JSON.parse(txt); }
    catch { return { reply: txt || "Sorry, can you say that again?", correction: '' }; }
  }

  /* ---- Generar vocabulario nuevo ---- */
  async function generateVocab(topic) {
    const sys = `Generate ${level()} English vocabulary for a Spanish speaker.`;
    const prompt = `Give me 8 useful English words or expressions${topic ? ' about: ' + topic : ''} for CEFR ${level()}.
Return JSON array. Each item: { "en": "word", "es": "traducción", "ex": "short example sentence in English" }.`;
    const schema = {
      type: 'array',
      items: {
        type: 'object',
        properties: { en: { type: 'string' }, es: { type: 'string' }, ex: { type: 'string' } },
        required: ['en', 'es', 'ex'],
      },
    };
    const txt = await raw([{ role: 'user', parts: [{ text: prompt }] }], sys, schema);
    return JSON.parse(txt);
  }

  /* ---- Generar quiz de gramática ---- */
  async function generateQuiz(topic) {
    const prompt = `Create 5 multiple-choice English grammar questions for CEFR ${level()}${topic ? ' about ' + topic : ''}.
Return JSON array. Each: { "q": "sentence with ___ blank", "opts": ["a","b","c","d"], "a": <index of correct answer 0-3>, "why": "short explanation in Spanish" }.`;
    const schema = {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          q: { type: 'string' },
          opts: { type: 'array', items: { type: 'string' } },
          a: { type: 'integer' },
          why: { type: 'string' },
        },
        required: ['q', 'opts', 'a', 'why'],
      },
    };
    const txt = await raw([{ role: 'user', parts: [{ text: prompt }] }], null, schema);
    return JSON.parse(txt);
  }

  /* ---- Generar canción / rima para aprender ---- */
  async function generateSong(topic) {
    const sys = `You write short, catchy, rhyming songs to teach English to Spanish speakers at CEFR ${level()}. Keep it simple, fun and easy to sing.`;
    const prompt = `Write a short original song (a 4-line verse + a 2-line chorus) in English for CEFR ${level()}${topic ? ' about: ' + topic : ''}.
Make it rhyme and be easy to remember. Then pick 4 key words from it.
Return JSON: {
  "title": "song title",
  "lines": [ { "en": "english line", "es": "traducción" } ],   // verse then chorus, in order
  "vocab": [ { "en": "word", "es": "traducción", "ex": "example sentence" } ]
}`;
    const schema = {
      type: 'object',
      properties: {
        title: { type: 'string' },
        lines: { type: 'array', items: { type: 'object', properties: { en: { type: 'string' }, es: { type: 'string' } }, required: ['en', 'es'] } },
        vocab: { type: 'array', items: { type: 'object', properties: { en: { type: 'string' }, es: { type: 'string' }, ex: { type: 'string' } }, required: ['en', 'es', 'ex'] } },
      },
      required: ['title', 'lines', 'vocab'],
    };
    const txt = await raw([{ role: 'user', parts: [{ text: prompt }] }], sys, schema);
    return JSON.parse(txt);
  }

  /* ---- Lección a partir de una canción real que le gusta ---- */
  async function songLesson(songName) {
    const sys = `You are an English teacher who uses popular songs to teach Spanish speakers at CEFR ${level()}. Do NOT reproduce full copyrighted lyrics; only teach vocabulary, expressions and meaning.`;
    const prompt = `The learner likes the song: "${songName}".
Create a short learning lesson for CEFR ${level()}. Return JSON:
{
  "title": "song title",
  "artist": "artist name",
  "youtubeId": "the 11-character YouTube video ID of the official music video/audio, or empty string if unsure",
  "about": "2-3 sentences in Spanish about what the song is about and its overall meaning",
  "expressions": [ { "en": "phrase or expression FROM the song", "es": "traducción", "note": "short tip in Spanish about when/how to use it" } ],
  "vocab": [ { "en": "word from the song", "es": "traducción", "ex": "short example sentence in English" } ]
}
Give 4 expressions and 5 vocab words. Keep it ${level()} appropriate.`;
    const schema = {
      type: 'object',
      properties: {
        title: { type: 'string' },
        artist: { type: 'string' },
        youtubeId: { type: 'string' },
        about: { type: 'string' },
        expressions: { type: 'array', items: { type: 'object', properties: { en: { type: 'string' }, es: { type: 'string' }, note: { type: 'string' } }, required: ['en', 'es', 'note'] } },
        vocab: { type: 'array', items: { type: 'object', properties: { en: { type: 'string' }, es: { type: 'string' }, ex: { type: 'string' } }, required: ['en', 'es', 'ex'] } },
      },
      required: ['title', 'artist', 'about', 'expressions', 'vocab'],
    };
    const txt = await raw([{ role: 'user', parts: [{ text: prompt }] }], sys, schema);
    return JSON.parse(txt);
  }

  /* ---- Corregir un texto escrito por el usuario ---- */
  async function writingFeedback(text) {
    const sys = `You are an English writing tutor for a Spanish speaker at CEFR ${level()}.`;
    const prompt = `Correct this English text. Return JSON:
{
  "corrected": "the corrected version in English",
  "feedback": "friendly explanation in Spanish of the main mistakes and how to improve",
  "score": <number 0-100 reflecting quality for ${level()} level>
}
Text: "${text}"`;
    const schema = { type: 'object', properties: { corrected: { type: 'string' }, feedback: { type: 'string' }, score: { type: 'integer' } }, required: ['corrected', 'feedback', 'score'] };
    return JSON.parse(await raw([{ role: 'user', parts: [{ text: prompt }] }], sys, schema));
  }

  /* ---- Lectura corta + preguntas de comprensión ---- */
  async function generateReading(topic) {
    const prompt = `Write a short, interesting English reading passage (about 90-120 words) for CEFR ${level()}${topic ? ' about ' + topic : ''}.
Then create 3 comprehension multiple-choice questions. Return JSON:
{
  "title": "title",
  "text": "the passage in English",
  "questions": [ { "q": "question in English", "opts": ["a","b","c"], "a": <correct index 0-2> } ]
}`;
    const schema = {
      type: 'object',
      properties: {
        title: { type: 'string' },
        text: { type: 'string' },
        questions: { type: 'array', items: { type: 'object', properties: { q: { type: 'string' }, opts: { type: 'array', items: { type: 'string' } }, a: { type: 'integer' } }, required: ['q', 'opts', 'a'] } },
      },
      required: ['title', 'text', 'questions'],
    };
    return JSON.parse(await raw([{ role: 'user', parts: [{ text: prompt }] }], null, schema));
  }

  /* ---- Explicar en español un mensaje en inglés ---- */
  async function explain(text) {
    const prompt = `Explain this English sentence to a Spanish speaker (CEFR ${level()}). Give: 1) the full translation in Spanish, 2) the meaning of any difficult words or expressions. Be short, clear and friendly. Answer in Spanish.\n\nSentence: "${text}"`;
    return await raw([{ role: 'user', parts: [{ text: prompt }] }], null);
  }

  /* ---- Estimar nivel a partir de respuestas de conversación (opcional) ---- */
  async function assessLevel(answers) {
    const prompt = `A Spanish speaker answered these English questions. Estimate their CEFR level (A2, B1, B2, C1 or C2) based on grammar, vocabulary and fluency.
Answers:\n${answers.map((a, i) => (i + 1) + '. ' + a).join('\n')}
Return JSON: { "level": "B1", "feedback": "1-2 sentences of encouraging feedback in Spanish" }`;
    const schema = { type: 'object', properties: { level: { type: 'string' }, feedback: { type: 'string' } }, required: ['level', 'feedback'] };
    const txt = await raw([{ role: 'user', parts: [{ text: prompt }] }], null, schema);
    return JSON.parse(txt);
  }

  return { hasKey, chat, generateVocab, generateQuiz, generateSong, songLesson, assessLevel, explain, writingFeedback, generateReading };
})();
