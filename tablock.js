// Meow Home: one game at a time in this browser (檢查報告 039). Two tabs would each autosave and write over the other's
// progress. A tab opened later takes over and the one before saves and stops ("在這裡玩" reloads it, taking over in its
// turn), and exactly one keeps running even when the browser restores several tabs at the same moment:
//  - Web Locks: each tab takes the one lock, taking it from whoever has it; the tab it's taken from is told (AbortError).
//  - Older browsers without them: a note in localStorage of which tab has the game; the others see that it isn't theirs.
// MeowTabLock(onStop[, env]): env stands in for the browser in the tests (tools/web/tablock_test.js); the page passes none.
(function (root) {
  var LOCK = "meowhome-game", KEY = "meowhome-tab";

  function MeowTabLock(onStop, env) {
    env = env || {};
    var nav = env.navigator || root.navigator;
    var stopped = false, held = false;
    function stop() {
      if (stopped) return;
      stopped = true;
      onStop();
    }

    if (nav && nav.locks && typeof nav.locks.request === "function") {
      nav.locks.request(LOCK, { steal: true }, function () {
        held = true;
        return new Promise(function () {});   // kept while this tab plays; let go when the tab closes
      }).catch(function (e) {
        if (e && e.name === "AbortError") stop();   // another tab took it
        else if (!held) byNote(env, stop);          // the locks wouldn't work here after all
      });
      return;
    }
    byNote(env, stop);
  }

  // The tab whose name is in the note has the game. Every tab writes its own on opening, so the last one to open has it;
  // the rest check whenever the note changes (and every two seconds, should a change go unheard).
  function byNote(env, stop) {
    var store;
    try { store = env.localStorage || root.localStorage; } catch (e) { return; }
    if (!store) return;
    var me = Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
    try { store.setItem(KEY, me); } catch (e) { return; }   // (storage turned off: nothing to go by)
    var timer = null;
    function check() {
      var owner;
      try { owner = store.getItem(KEY); } catch (e) { return; }
      if (owner && owner !== me) {
        if (timer !== null) (env.clearInterval || root.clearInterval)(timer);
        stop();
      }
    }
    var win = env.window || root;
    if (win && win.addEventListener)
      win.addEventListener("storage", function (e) { if (!e || e.key === KEY || e.key === null) check(); });
    timer = (env.setInterval || root.setInterval)(check, 2000);
  }

  root.MeowTabLock = MeowTabLock;
  if (typeof module !== "undefined" && module.exports) module.exports = MeowTabLock;
})(typeof window !== "undefined" ? window : globalThis);
