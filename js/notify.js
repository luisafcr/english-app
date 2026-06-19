/* notify.js — recordatorio diario (mejor esfuerzo dentro de los límites de una PWA) */
const Notify = (() => {
  const supported = 'Notification' in window;

  async function requestPermission() {
    if (!supported) return 'unsupported';
    if (Notification.permission === 'granted') return 'granted';
    try { return await Notification.requestPermission(); }
    catch { return 'denied'; }
  }

  function show(title, body) {
    if (!supported || Notification.permission !== 'granted') return;
    try {
      if (navigator.serviceWorker && navigator.serviceWorker.ready) {
        navigator.serviceWorker.ready.then(reg => reg.showNotification(title, {
          body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: 'daily-reminder',
        })).catch(() => new Notification(title, { body }));
      } else {
        new Notification(title, { body });
      }
    } catch {}
  }

  let timer = null;

  // Programa el recordatorio para la hora 'HH:MM' mientras la app esté abierta
  function schedule(time) {
    if (timer) { clearTimeout(timer); timer = null; }
    if (!time || !supported || Notification.permission !== 'granted') return;
    const [h, m] = time.split(':').map(Number);
    const now = new Date();
    const next = new Date();
    next.setHours(h, m, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    const ms = next - now;
    timer = setTimeout(() => {
      const done = Store.xpToday() >= (Store.getSettings().xpGoal || 50);
      show('¡Hora de tu inglés! 🎯', done ? '¡Ya cumpliste tu meta de hoy! ¿Un repaso extra?' : 'Practica un poco para mantener tu racha 🔥');
      schedule(time); // reprograma para el día siguiente
    }, Math.min(ms, 2 ** 31 - 1));
  }

  // Aviso suave al abrir si no has practicado y ya pasó tu hora
  function nudgeOnLoad() {
    const t = Store.getSettings().reminderTime;
    if (!t || !supported || Notification.permission !== 'granted') return;
    const [h, m] = t.split(':').map(Number);
    const now = new Date();
    const target = new Date(); target.setHours(h, m, 0, 0);
    if (now >= target && Store.xpToday() < (Store.getSettings().xpGoal || 50)) {
      show('¿Listo para tu inglés? 📚', 'Aún no completas tu meta de hoy. ¡Vamos!');
    }
  }

  return { supported, requestPermission, show, schedule, nudgeOnLoad };
})();
