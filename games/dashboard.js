/* ===========================================================
   لوحة تحكم مخيم سردا
   - حماية بكلمة مرور
   - تعرض الألعاب «المنشورة» (من games-data.json يحفظها المساعد للجميع)
   - تتيح إضافة «مسودّات» على هذا الجهاز للمعاينة، ولنشرها للجميع
     يكفي إخبار المساعد ليحفظها في الموقع تلقائياً (بدون أي توكن)
   =========================================================== */
(function () {
  "use strict";

  var PASSWORD    = "Surda123surda";
  var AUTH_KEY    = "surda_camp_auth";
  var STORAGE_KEY = "surda_camp_games"; // المسودّات على هذا الجهاز
  var DATA_URL    = "games-data.json";

  var COLOR_NAMES = {
    green: "أخضر", blue: "أزرق", purple: "بنفسجي",
    gold: "ذهبي", pink: "وردي", teal: "فيروزي"
  };

  var published = [];    // الألعاب المنشورة (من الملف، للقراءة)
  var editingId = null;  // معرّف المسودّة قيد التعديل

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

  function loadDrafts() {
    try { var r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : []; }
    catch (e) { return []; }
  }
  function saveDrafts(list) { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }

  /* ---------- كلمة المرور ---------- */
  function unlock() {
    $("lock-screen").hidden = true;
    $("dash").hidden = false;
    fillSectionSelect();
    loadPublished();
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

  /* ---------- تحميل المنشورة ---------- */
  function loadPublished() {
    fetch(DATA_URL + "?cb=" + Date.now(), { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : { games: [] }; })
      .then(function (d) { published = (d && Array.isArray(d.games)) ? d.games : []; renderList(); })
      .catch(function () { published = []; renderList(); });
  }

  /* ---------- عرض القائمة ---------- */
  function renderList() {
    var wrap = $("game-list");
    var drafts = loadDrafts();
    var html = "";

    published.forEach(function (g) {
      html +=
        '<div class="game-item is-default">' +
          '<span class="gi-icon">' + esc(g.icon || "🎮") + '</span>' +
          '<div class="gi-body"><strong>' + esc(g.title) + '</strong>' +
            '<small>' + esc(sectionTitle(g.section)) + (g.teacher ? ' · 👩‍🏫 ' + esc(g.teacher) : '') + ' · ' + (COLOR_NAMES[g.color] || g.color) +
            (g.link && g.link !== "#" ? ' · ' + esc(g.link) : "") + '</small></div>' +
          '<span class="gi-badge">منشورة</span>' +
        '</div>';
    });

    if (!drafts.length) {
      html += '<p class="dash-empty">لا توجد مسودّات على هذا الجهاز.</p>';
    } else {
      drafts.forEach(function (g) {
        var editing = g.id === editingId ? " is-editing" : "";
        html +=
          '<div class="game-item' + editing + '">' +
            '<span class="gi-icon">' + esc(g.icon || "🎮") + '</span>' +
            '<div class="gi-body"><strong>' + esc(g.title) + '</strong> ' +
              '<span class="gi-badge draft">مسودّة</span>' +
              '<small>' + esc(sectionTitle(g.section)) + (g.teacher ? ' · 👩‍🏫 ' + esc(g.teacher) : '') + ' · ' + (COLOR_NAMES[g.color] || g.color) +
              (g.link && g.link !== "#" ? ' · ' + esc(g.link) : "") + '</small></div>' +
            '<div class="gi-actions">' +
              '<button class="gi-edit" data-id="' + esc(g.id) + '">تعديل</button>' +
              '<button class="gi-del" data-id="' + esc(g.id) + '">حذف</button>' +
            '</div>' +
          '</div>';
      });
    }

    wrap.innerHTML = html;

    Array.prototype.forEach.call(wrap.querySelectorAll(".gi-edit"), function (btn) {
      btn.addEventListener("click", function () { startEdit(btn.getAttribute("data-id")); });
    });
    Array.prototype.forEach.call(wrap.querySelectorAll(".gi-del"), function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-id");
        if (id === editingId) cancelEdit();
        saveDrafts(loadDrafts().filter(function (g) { return g.id !== id; }));
        renderList();
      });
    });
  }

  /* ---------- تعديل ---------- */
  function startEdit(id) {
    var game = loadDrafts().filter(function (g) { return g.id === id; })[0];
    if (!game) return;
    editingId = id;

    $("g-title").value   = game.title || "";
    $("g-section").value = game.section || "";
    $("g-teacher").value = game.teacher || "";
    $("g-desc").value    = game.desc || "";
    $("g-icon").value    = game.icon && game.icon !== "🎮" ? game.icon : "";
    $("g-color").value   = game.color || "green";
    $("g-link").value    = game.link && game.link !== "#" ? game.link : "";

    $("form-heading").textContent = "✏️ تعديل المسودّة";
    $("save-btn").textContent = "تحديث";
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

  /* ---------- إضافة / تحديث مسودّة ---------- */
  function onSubmit(e) {
    e.preventDefault();
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

    var list = loadDrafts();
    if (editingId) {
      list = list.map(function (g) { return g.id === editingId ? Object.assign({}, g, fields) : g; });
      saveDrafts(list);
      cancelEdit();
    } else {
      fields.id = "g" + Date.now();
      list.push(fields);
      saveDrafts(list);
      $("game-form").reset();
      renderList();
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
