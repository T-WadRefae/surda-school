/* ===========================================================
   لوحة تحكم مخيم سردا — حماية بكلمة مرور وإدارة الألعاب
   =========================================================== */
(function () {
  "use strict";

  var PASSWORD   = "Surda123surda";
  var STORAGE_KEY = "surda_camp_games";
  var AUTH_KEY    = "surda_camp_auth";

  var COLOR_NAMES = {
    green: "أخضر", blue: "أزرق", purple: "بنفسجي",
    gold: "ذهبي", pink: "وردي", teal: "فيروزي"
  };

  // معرّف اللعبة قيد التعديل (null = وضع الإضافة)
  var editingId = null;

  /* ---------- كلمة المرور ---------- */
  function unlock() {
    document.getElementById("lock-screen").hidden = true;
    document.getElementById("dash").hidden = false;
    renderList();
  }

  function checkPass() {
    var val = document.getElementById("pass-input").value;
    if (val === PASSWORD) {
      try { sessionStorage.setItem(AUTH_KEY, "1"); } catch (e) {}
      unlock();
    } else {
      var err = document.getElementById("lock-error");
      err.textContent = "كلمة المرور غير صحيحة";
      document.getElementById("pass-input").value = "";
    }
  }

  /* ---------- تخزين الألعاب ---------- */
  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }

  function save(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ---------- عرض القائمة ---------- */
  function renderList() {
    var wrap = document.getElementById("game-list");
    var custom = load();

    var html = "";

    // الألعاب الأساسية (للقراءة فقط)
    (window.DEFAULT_GAMES || []).forEach(function (g) {
      html +=
        '<div class="game-item is-default">' +
          '<span class="gi-icon">' + esc(g.icon || "🎮") + '</span>' +
          '<div class="gi-body"><strong>' + esc(g.title) + '</strong>' +
            '<small>' + esc(g.desc || "") + ' · ' + (COLOR_NAMES[g.color] || g.color) + '</small></div>' +
          '<span class="gi-badge">أساسية</span>' +
        '</div>';
    });

    // الألعاب المُضافة
    if (!custom.length) {
      html += '<p class="dash-empty">لم تُضف ألعاباً بعد.</p>';
    } else {
      custom.forEach(function (g) {
        var editing = g.id === editingId ? ' is-editing' : '';
        html +=
          '<div class="game-item' + editing + '">' +
            '<span class="gi-icon">' + esc(g.icon || "🎮") + '</span>' +
            '<div class="gi-body"><strong>' + esc(g.title) + '</strong>' +
              '<small>' + esc(g.desc || "") + ' · ' + (COLOR_NAMES[g.color] || g.color) +
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
      btn.addEventListener("click", function () {
        startEdit(btn.getAttribute("data-id"));
      });
    });

    Array.prototype.forEach.call(wrap.querySelectorAll(".gi-del"), function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-id");
        if (id === editingId) cancelEdit();
        save(load().filter(function (g) { return g.id !== id; }));
        renderList();
      });
    });
  }

  /* ---------- وضع التعديل ---------- */
  function startEdit(id) {
    var game = load().filter(function (g) { return g.id === id; })[0];
    if (!game) return;
    editingId = id;

    document.getElementById("g-title").value = game.title || "";
    document.getElementById("g-desc").value  = game.desc || "";
    document.getElementById("g-icon").value  = game.icon && game.icon !== "🎮" ? game.icon : "";
    document.getElementById("g-color").value = game.color || "green";
    document.getElementById("g-link").value  = game.link && game.link !== "#" ? game.link : "";

    document.getElementById("form-heading").textContent = "✏️ تعديل اللعبة";
    document.getElementById("save-btn").textContent = "تحديث اللعبة";
    document.getElementById("cancel-btn").hidden = false;

    renderList();
    document.getElementById("game-form").scrollIntoView({ behavior: "smooth", block: "center" });
    document.getElementById("g-title").focus();
  }

  function cancelEdit() {
    editingId = null;
    document.getElementById("game-form").reset();
    document.getElementById("form-heading").textContent = "➕ إضافة لعبة جديدة";
    document.getElementById("save-btn").textContent = "حفظ اللعبة";
    document.getElementById("cancel-btn").hidden = true;
    renderList();
  }

  /* ---------- إضافة / تحديث لعبة ---------- */
  function onSubmit(e) {
    e.preventDefault();
    var title = document.getElementById("g-title").value.trim();
    if (!title) return;

    var fields = {
      title: title,
      desc: document.getElementById("g-desc").value.trim(),
      icon: document.getElementById("g-icon").value.trim() || "🎮",
      color: document.getElementById("g-color").value,
      link: document.getElementById("g-link").value.trim() || "#"
    };

    var list = load();

    if (editingId) {
      // تحديث اللعبة الموجودة مع الحفاظ على معرّفها وترتيبها
      list = list.map(function (g) {
        return g.id === editingId ? Object.assign({}, g, fields) : g;
      });
      save(list);
      cancelEdit();
    } else {
      fields.id = "g" + Date.now();
      list.push(fields);
      save(list);
      document.getElementById("game-form").reset();
      renderList();
    }
  }

  /* ---------- تشغيل ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    var authed = false;
    try { authed = sessionStorage.getItem(AUTH_KEY) === "1"; } catch (e) {}
    if (authed) unlock();

    document.getElementById("pass-btn").addEventListener("click", checkPass);
    document.getElementById("pass-input").addEventListener("keydown", function (e) {
      if (e.key === "Enter") checkPass();
    });
    document.getElementById("game-form").addEventListener("submit", onSubmit);
    document.getElementById("cancel-btn").addEventListener("click", cancelEdit);
  });
})();
