/* Campaign-in-a-Box app — keeping the candidate's work safe without accounts.
 * - Asks the browser to keep this site's data (persistent storage).
 * - Offers to install the app (an installed app on iPhone isn't cleared by Safari's 7-day rule).
 * - Spots places where saving won't last (in-app browsers, private windows) and says so.
 * - Works out when to suggest a backup file.
 * Nothing here sends data anywhere. MIT License. */
(function (root) {
  "use strict";
  const CIB = root.CIB;
  const KP = (CIB.keep = {});
  const ua = (root.navigator && navigator.userAgent) || "";

  KP.isIOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && root.navigator && navigator.maxTouchPoints > 1);
  KP.isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS|Android/.test(ua);
  KP.installed = () => !!((root.matchMedia && matchMedia("(display-mode: standalone)").matches) || (root.navigator && navigator.standalone));

  // In-app browsers often clear saved data when closed. Names shown to the person.
  const IN_APP = [[/FBAN|FBAV|FB_IAB/, "Facebook"], [/Instagram/, "Instagram"], [/Line\//, "LINE"], [/Snapchat/, "Snapchat"], [/LinkedInApp/, "LinkedIn"],
    [/Twitter|TwitterAndroid/, "X (Twitter)"], [/TikTok|BytedanceWebview|musical_ly/, "TikTok"], [/Pinterest/, "Pinterest"], [/GSA\//, "the Google app"],
    [/; wv\)/, "an app's built-in browser"]];
  KP.inAppBrowser = () => { for (const [re, name] of IN_APP) if (re.test(ua)) return name; return ""; };

  // Private windows: a small storage quota is the usual sign. Best effort only.
  KP.maybePrivate = async () => {
    try {
      if (navigator.storage && navigator.storage.estimate) {
        const { quota } = await navigator.storage.estimate();
        if (quota && quota < 140 * 1024 * 1024 && !KP.isSafari) return true;
      }
    } catch (e) { /* unknown */ }
    return false;
  };

  KP.persisted = null;
  KP.requestPersist = async () => {
    try {
      if (!navigator.storage || !navigator.storage.persist) return (KP.persisted = null);
      if (await navigator.storage.persisted()) return (KP.persisted = true);
      return (KP.persisted = await navigator.storage.persist());
    } catch (e) { return (KP.persisted = null); }
  };

  // Install prompt (Chrome, Edge, Android). iPhone/iPad use Share → Add to Home Screen.
  KP.installEvent = null;
  KP.onChange = () => {};
  root.addEventListener && root.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); KP.installEvent = e; KP.onChange(); });
  root.addEventListener && root.addEventListener("appinstalled", () => { KP.installEvent = null; KP.onChange(); });
  KP.canInstall = () => !KP.installed() && (!!KP.installEvent || (KP.isIOS && KP.isSafari));
  KP.install = async () => {
    if (!KP.installEvent) return "ios";
    KP.installEvent.prompt();
    const r = await KP.installEvent.userChoice.catch(() => ({}));
    KP.installEvent = null; KP.onChange();
    return r && r.outcome === "accepted" ? "installed" : "dismissed";
  };

  // Offline copy of the app, so an installed app opens without a connection.
  KP.registerWorker = () => {
    if (!("serviceWorker" in navigator) || !/^https:|^http:\/\/localhost/.test(location.href)) return;
    navigator.serviceWorker.register("sw.js").catch(() => { /* the app still works online */ });
  };

  // Should we suggest a backup? Returns a reason, or "" when not needed.
  const MILESTONES = { plan: "Your plan is done", message: "Your message is done", materials: "Your materials are ready" };
  KP.backupReason = (st, progress) => {
    const m = st.meta || {};
    if (m.example || !st.cfg.candidate.first_name) return "";
    const changed = m.updated && (!m.lastBackup || m.updated > m.lastBackup);
    if (!changed) return "";
    if (m.nudgeSnoozed && Date.now() < m.nudgeSnoozed) return "";
    const done = [progress.planDone && "plan", progress.msgDone && "message", progress.total && progress.ready === progress.total && "materials"].filter(Boolean);
    const fresh = done.find((k) => !(m.backedUpAt || []).includes(k));
    if (fresh) return MILESTONES[fresh];
    const days = m.lastBackup ? (Date.now() - Date.parse(m.lastBackup)) / 864e5 : (Date.now() - Date.parse(m.created || Date.now())) / 864e5;
    if (days >= 7) return m.lastBackup ? `It's been ${Math.floor(days)} days since your last backup` : "You haven't saved a backup yet";
    return "";
  };
  KP.markBackedUp = (st, progress) => {
    st.meta.lastBackup = new Date().toISOString();
    st.meta.backedUpAt = [progress.planDone && "plan", progress.msgDone && "message", progress.total && progress.ready === progress.total && "materials"].filter(Boolean);
  };
})(typeof window !== "undefined" ? window : globalThis);
