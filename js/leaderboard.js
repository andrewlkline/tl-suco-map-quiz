"use strict";

/* ============================================================
   Leaderboard — thin wrapper around Firestore (compat SDK).
   Gracefully disables itself if window.FIREBASE_CONFIG is unset.
   ============================================================ */
const Leaderboard = (function () {
  let db = null;
  let available = false;

  if (window.FIREBASE_CONFIG) {
    try {
      firebase.initializeApp(window.FIREBASE_CONFIG);
      db = firebase.firestore();
      available = true;
    } catch (err) {
      console.error("Firebase init failed:", err);
    }
  }

  function isAvailable() {
    return available;
  }

  async function submitScore({ name, modeKey, answerMode, accuracy, timeMs, found, total }) {
    if (!available) return { ok: false, error: "unavailable" };
    try {
      await db.collection("scores").add({
        name: String(name).slice(0, 24),
        modeKey,
        answerMode,
        accuracy,
        timeMs,
        found,
        total,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      return { ok: true };
    } catch (err) {
      console.error("submitScore failed:", err);
      return { ok: false, error: err.message };
    }
  }

  async function fetchScores(modeKey, answerMode, limit = 20) {
    if (!available) return [];
    try {
      const snap = await db
        .collection("scores")
        .where("modeKey", "==", modeKey)
        .where("answerMode", "==", answerMode)
        .limit(200)
        .get();
      const rows = snap.docs.map(d => d.data());
      rows.sort((a, b) => b.accuracy - a.accuracy || a.timeMs - b.timeMs);
      return rows.slice(0, limit);
    } catch (err) {
      console.error("fetchScores failed:", err);
      return [];
    }
  }

  return { isAvailable, submitScore, fetchScores };
})();
