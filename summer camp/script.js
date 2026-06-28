/* ===========================================================
   صفحة تحديات وطن وهند — عرض بطاقات الألعاب
   =========================================================== */
(function () {
  "use strict";

  var STORAGE_KEY = "surda_camp_games";

  // ألوان البطاقات المتاحة
  var COLORS = {
    green:  "card-green",
    blue:   "card-blue",
    purple: "card-purple",
    gold:   "card-gold",
    pink:   "card-pink",
    teal:   "card-teal"
  };

  // قراءة الألعاب المُضافة من لوحة التحكم
  function getCustomGames() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  // دمج الألعاب الافتراضية مع المُضافة
  function getAllGames() {
    var defaults = window.DEFAULT_GAMES || [];
    return defaults.concat(getCustomGames());
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function render() {
    var wrap = document.getElementById("cards");
    if (!wrap) return;

    var games = getAllGames();
    if (!games.length) {
      wrap.innerHTML = '<div class="cards-loading">لا توجد ألعاب بعد</div>';
      return;
    }

    wrap.innerHTML = games.map(function (g) {
      var colorClass = COLORS[g.color] || COLORS.green;
      var link = g.link && g.link !== "#" ? esc(g.link) : "#";
      var target = (link !== "#" && /^https?:/i.test(g.link)) ? ' target="_blank" rel="noopener"' : "";
      return (
        '<article class="game-card ' + colorClass + '">' +
          '<div class="card-icon">' + esc(g.icon || "🎮") + '</div>' +
          '<h3 class="card-title">' + esc(g.title) + '</h3>' +
          (g.desc ? '<p class="card-desc">' + esc(g.desc) + '</p>' : '') +
          '<a class="play-btn" href="' + link + '"' + target + '>العب الآن</a>' +
        '</article>'
      );
    }).join("");
  }

  document.addEventListener("DOMContentLoaded", render);

  // إعادة الرسم عند العودة للصفحة (مثلاً بعد الإضافة من لوحة التحكم)
  window.addEventListener("focus", render);
})();
