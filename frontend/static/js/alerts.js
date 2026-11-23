/**
 * Alertes de fin de minuteur (F-22) : son, vibration et notification.
 *
 * Les navigateurs n'autorisent le son qu'après un geste de l'utilisateur :
 * `unlock()` est appelé au clic sur « Lancer le minuteur ».
 * Sur iPhone, son et notifications sont limités en arrière-plan : voir
 * cahier des charges §7 (point d'attention).
 */
let audioCtx = null;

export function unlock() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audioCtx = audioCtx || new Ctx();
    if (audioCtx.state === "suspended") audioCtx.resume();
  } catch {
    /* pas d'audio disponible */
  }
}

export function beep() {
  if (!audioCtx) return;
  const start = audioCtx.currentTime;
  for (let i = 0; i < 3; i += 1) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    const t = start + i * 0.35;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.4, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.3);
  }
}

export function vibrate() {
  if (navigator.vibrate) navigator.vibrate([300, 150, 300, 150, 600]);
}

export async function askNotificationPermission() {
  if (!("Notification" in window) || Notification.permission !== "default") return;
  try {
    await Notification.requestPermission();
  } catch {
    /* refusé ou non supporté */
  }
}

/** Notification système, seulement si l'onglet n'est pas visible. */
export async function notify(title, body, tag) {
  if (!document.hidden || !("Notification" in window) || Notification.permission !== "granted") return;
  const options = { body, tag, renotify: true, requireInteraction: true, icon: "/static/icons/icon-192.png" };
  try {
    const reg = navigator.serviceWorker && (await navigator.serviceWorker.getRegistration());
    if (reg) return reg.showNotification(title, options); // seul moyen sur Android
    new Notification(title, options);
  } catch {
    /* ignoré */
  }
}

export function alertTimer(timer) {
  beep();
  vibrate();
  notify("Minuteur terminé", timer.label || "Votre minuteur est terminé.", timer.id);
}
