/* ===========================================================
   لوحة تحكم مخيم سردا
   - حماية بكلمة مرور
   - إذا ضُبط GAMES_API_URL (شيت Google): الإضافة/التعديل/الحذف
     تُحفظ مباشرة في الشيت وتظهر لكل الطلاب بشكل دائم.
   - إذا لم يُضبط: وضع مسودّات محلية للمعاينة (بديل مؤقت).
   =========================================================== */
(function () {
  "use strict";

  var PASSWORD    = "Surda123surda";
  var AUTH_KEY    = "surda_camp_auth";
  var STORAGE_KEY = "surda_camp_games"; // مسودّات محلية (وضع البديل فقط)
  var DATA_URL    = "games-data.json";
  var API         = window.GAMES_API_URL || "";

  var COLOR_NAMES = {
    green: "أخضر", blue: "أزرق", purple: "بنفسجي",
    gold: "ذهبي", pink: "وردي", teal: "فيروزي"
  };

  var games = [];        // القائمة الحالية
  var editingId = null;
  var busy = false;

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function getSections() { return window.SECTIONS || []; }
  function sectionTitle(id) {
    var s = getSections().filter(function (x) { return x.id === id; })[0];
    return s ? s.title : (id || "—");
  }
  function fillSectionSelect() {
    var sel = $("g-section");
    if (!sel) return;
    sel.innerHTML = getSections().map(function (s) {
      return '<option value="' + esc(s.id) + '">' + esc(s.icon + " " + s.title) + '</option>';
    }).join("");
  }

  function status(msg, kind) {
    var el = $("save-status");
    if (!el) return;
    el.textContent = msg || "";
    el.className = "save-status" + (kind ? " " + kind : "");
  }

  /* ---------- كلمة المرور ---------- */
  function unlock() {
    $("lock-screen").hidden = true;
    $("dash").hidden = false;
    fillSectionSelect();
    if (!API) {
      $("list-note").textContent =
        "⚠️ لم يُربط شيت Google بعد — الإضافات هنا مسودّات محلية على هذا الجهاز فقط. أرسلي رابط الـ Web App للمساعد لتفعيل الحفظ الدائم.";
    }
    loadGames();
  }
  function checkPass() {
    if ($("pass-input").value === PASSWORD) {
      try { sessionStorage.setItem(AUTH_KEY, "1"); } catch (e) {}
      unlock();
    } else {
      $("lock-error").textContent = "كلمة المرور غير صحيحة";
      $("pass-input").value = "";
    }
  }

  /* ---------- تخزين: شيت Google أو مسودّات محلية ---------- */
  function loadGames() {
    status("جارٍ التحميل…", "");
    if (API) {
      var url = API + (API.indexOf("?") > -1 ? "&" : "?") + "action=get&cb=" + Date.now();
      fetch(url, { cache: "no-store" })
        .then(function (r) { return r.json(); })
        .then(function (d) { games = (d && Array.isArray(d.games)) ? d.games : []; status(""); renderList(); })
        .catch(function () { status("تعذّر الاتصال بالشيت.", "err"); games = []; renderList(); });
    } else {
      fetch(DATA_URL + "?cb=" + Date.now(), { cache: "no-store" })
        .then(function (r) { return r.ok ? r.json() : { games: [] }; })
        .then(function (d) { games = (d && Array.isArray(d.games)) ? d.games : loadDrafts(); status(""); renderList(); })
        .catch(function () { games = loadDrafts(); status(""); renderList(); });
    }
  }

  function loadDrafts() {
    try { var r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : []; }
    catch (e) { return []; }
  }
  function saveDrafts(list) { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }

  // POST إلى الشيت (no-cors: لا نقرأ الرد، ثم نعيد التحميل للتأكيد)
  function apiPost(payload) {
    return fetch(API, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.assign({ password: PASSWORD }, payload))
    });
  }

  /* ---------- عرض القائمة ---------- */
  function renderList() {
    var wrap = $("game-list");
    if (!games.length) {
      wrap.innerHTML = '<p class="dash-empty">لا توجد ألعاب بعد. أضِف لعبة من الأعلى.</p>';
      return;
    }
    wrap.innerHTML = games.map(function (g) {
      var editing = g.id === editingId ? " is-editing" : "";
      return (
        '<div class="game-item' + editing + '">' +
          '<span class="gi-icon">' + esc(g.icon || "🎮") + '</span>' +
          '<div class="gi-body"><strong>' + esc(g.title) + '</strong>' +
            '<small>' + esc(sectionTitle(g.section)) + (g.teacher ? ' · 👩‍🏫 ' + esc(g.teacher) : '') +
            ' · ' + (COLOR_NAMES[g.color] || g.color) +
            (g.link && g.link !== "#" ? ' · ' + esc(g.link) : "") + '</small></div>' +
          '<div class="gi-actions">' +
            '<button class="gi-edit" data-id="' + esc(g.id) + '">تعديل</button>' +
            '<button class="gi-del" data-id="' + esc(g.id) + '">حذف</button>' +
          '</div>' +
        '</div>'
      );
    }).join("");

    Array.prototype.forEach.call(wrap.querySelectorAll(".gi-edit"), function (btn) {
      btn.addEventListener("click", function () { startEdit(btn.getAttribute("data-id")); });
    });
    Array.prototype.forEach.call(wrap.querySelectorAll(".gi-del"), function (btn) {
      btn.addEventListener("click", function () { removeGame(btn.getAttribute("data-id")); });
    });
  }

  /* ---------- تعديل ---------- */
  function startEdit(id) {
    var game = games.filter(function (g) { return String(g.id) === String(id); })[0];
    if (!game) return;
    editingId = id;

    $("g-title").value   = game.title || "";
    $("g-section").value = game.section || "";
    $("g-teacher").value = game.teacher || "";
    $("g-desc").value    = game.desc || "";
    $("g-icon").value    = game.icon && game.icon !== "🎮" ? game.icon : "";
    $("g-color").value   = game.color || "green";
    $("g-link").value    = game.link && game.link !== "#" ? game.link : "";

    $("form-heading").textContent = "✏️ تعديل اللعبة";
    $("save-btn").textContent = "تحديث اللعبة";
    $("cancel-btn").hidden = false;

    renderList();
    $("game-form").scrollIntoView({ behavior: "smooth", block: "center" });
    $("g-title").focus();
  }
  function cancelEdit() {
    editingId = null;
    $("game-form").reset();
    $("form-heading").textContent = "➕ إضافة لعبة جديدة";
    $("save-btn").textContent = "حفظ اللعبة";
    $("cancel-btn").hidden = true;
    renderList();
  }

  /* ---------- إضافة / تحديث ---------- */
  function onSubmit(e) {
    e.preventDefault();
    if (busy) return;
    var title = $("g-title").value.trim();
    if (!title) return;

    var fields = {
      title: title,
      section: $("g-section").value,
      teacher: $("g-teacher").value.trim(),
      desc: $("g-desc").value.trim(),
      icon: $("g-icon").value.trim() || "🎮",
      color: $("g-color").value,
      link: $("g-link").value.trim() || "#"
    };

    if (API) {
      busy = true;
      status("جارٍ الحفظ في الشيت…", "");
      var payload;
      if (editingId) { fields.id = editingId; payload = { action: "update", game: fields }; }
      else           { payload = { action: "save", game: fields }; }
      apiPost(payload)
        .then(function () {
          busy = false;
          cancelEdit();
          status("✓ تم الحفظ في الشيت.", "ok");
          setTimeout(loadGames, 600);
        })
        .catch(function () { busy = false; status("تعذّر الحفظ. حاولي مرة أخرى.", "err"); });
    } else {
      // وضع المسودّات المحلية
      var list = loadDrafts();
      if (editingId) {
        list = list.map(function (g) { return g.id === editingId ? Object.assign({}, g, fields) : g; });
        saveDrafts(list); cancelEdit();
      } else {
        fields.id = "g" + Date.now();
        list.push(fields); saveDrafts(list);
        $("game-form").reset();
      }
      games = list; renderList();
    }
  }

  /* ---------- حذف ---------- */
  function removeGame(id) {
    if (busy) return;
    var game = games.filter(function (g) { return String(g.id) === String(id); })[0];
    if (!game) return;
    if (!confirm('حذف اللعبة "' + game.title + '"؟')) return;

    if (API) {
      busy = true;
      status("جارٍ الحذف…", "");
      if (id === editingId) cancelEdit();
      apiPost({ action: "delete", id: id })
        .then(function () {
          busy = false;
          status("✓ تم الحذف.", "ok");
          setTimeout(loadGames, 600);
        })
        .catch(function () { busy = false; status("تعذّر الحذف.", "err"); });
    } else {
      if (id === editingId) cancelEdit();
      var list = loadDrafts().filter(function (g) { return g.id !== id; });
      saveDrafts(list); games = list; renderList();
    }
  }

  /* ---------- تشغيل ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    var authed = false;
    try { authed = sessionStorage.getItem(AUTH_KEY) === "1"; } catch (e) {}
    if (authed) unlock();

    $("pass-btn").addEventListener("click", checkPass);
    $("pass-input").addEventListener("keydown", function (e) {
      if (e.key === "Enter") checkPass();
    });
    $("game-form").addEventListener("submit", onSubmit);
    $("cancel-btn").addEventListener("click", cancelEdit);
  });
})();
