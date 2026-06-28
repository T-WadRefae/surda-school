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
      custom.forEach(function (g, i) {
        html +=
          '<div class="game-item">' +
            '<span class="gi-icon">' + esc(g.icon || "🎮") + '</span>' +
            '<div class="gi-body"><strong>' + esc(g.title) + '</strong>' +
              '<small>' + esc(g.desc || "") + ' · ' + (COLOR_NAMES[g.color] || g.color) +
              (g.link && g.link !== "#" ? ' · ' + esc(g.link) : "") + '</small></div>' +
            '<button class="gi-del" data-i="' + i + '">حذف</button>' +
          '</div>';
      });
    }

    wrap.innerHTML = html;

    Array.prototype.forEach.call(wrap.querySelectorAll(".gi-del"), function (btn) {
      btn.addEventListener("click", function () {
        var idx = parseInt(btn.getAttribute("data-i"), 10);
        var list = load();
        list.splice(idx, 1);
        save(list);
        renderList();
      });
    });
  }

  /* ---------- إضافة لعبة ---------- */
  function onSubmit(e) {
    e.preventDefault();
    var title = document.getElementById("g-title").value.trim();
    if (!title) return;

    var game = {
      id: "g" + Date.now(),
      title: title,
      desc: document.getElementById("g-desc").value.trim(),
      icon: document.getElementById("g-icon").value.trim() || "🎮",
      color: document.getElementById("g-color").value,
      link: document.getElementById("g-link").value.trim() || "#"
    };

    var list = load();
    list.push(game);
    save(list);

    document.getElementById("game-form").reset();
    renderList();
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
  });
})();
