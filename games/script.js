/* ===========================================================
   صفحة تحديات وطن وهند
   الطالب يختار القسم أولاً ثم يرى بطاقات ألعاب ذلك القسم
   =========================================================== */
(function () {
  "use strict";

  var COLORS = {
    green:  "card-green",
    blue:   "card-blue",
    purple: "card-purple",
    gold:   "card-gold",
    pink:   "card-pink",
    teal:   "card-teal"
  };

  var STORAGE_KEY = "surda_camp_games"; // مسودّات محلية (معاينة على نفس الجهاز)

  // الألعاب المنشورة تُحمّل من games-data.json (المصدر الدائم للجميع)
  var PUBLISHED = null;

  function loadGames() {
    var url = (window.GAMES_DATA_URL || "games-data.json") + "?cb=" + Date.now();
    return fetch(url, { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.json(); })
      .then(function (data) {
        PUBLISHED = (data && Array.isArray(data.games)) ? data.games : [];
      })
      .catch(function () {
        PUBLISHED = window.FALLBACK_GAMES || [];
      });
  }

  function getDrafts() {
    try { var r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : []; }
    catch (e) { return []; }
  }

  // المنشورة + المسودّات (المنشورة لها الأولوية عند تطابق المعرّف)
  function getAllGames() {
    var pub = PUBLISHED || [];
    var seen = {};
    pub.forEach(function (g) { seen[g.id] = true; });
    var drafts = getDrafts().filter(function (g) { return !seen[g.id]; });
    return pub.concat(drafts);
  }

  function getSections()  { return window.SECTIONS || []; }

  function gamesInSection(id) {
    return getAllGames().filter(function (g) { return (g.section || "") === id; });
  }

  function sectionsWithGames() {
    var all = getAllGames();
    return getSections().filter(function (s) {
      return all.some(function (g) { return (g.section || "") === s.id; });
    });
  }

  function currentSectionId() {
    var m = location.hash.match(/#\/section\/(.+)$/);
    return m ? decodeURIComponent(m[1]) : null;
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ---------- عرض الأقسام ---------- */
  function renderSections(wrap, bar) {
    bar.hidden = true;
    bar.innerHTML = "";

    var secs = sectionsWithGames();
    if (!secs.length) {
      wrap.innerHTML = '<div class="cards-loading">لا توجد ألعاب بعد</div>';
      return;
    }

    wrap.innerHTML = secs.map(function (s) {
      var n = gamesInSection(s.id).length;
      var label = n + " " + (n === 1 ? "لعبة" : (n === 2 ? "لعبتان" : "ألعاب"));
      return (
        '<article class="game-card ' + (COLORS[s.color] || COLORS.green) + '" data-section="' + esc(s.id) + '">' +
          '<div class="card-icon">' + esc(s.icon || "📚") + '</div>' +
          '<h3 class="card-title">' + esc(s.title) + '</h3>' +
          '<p class="card-desc">' + label + '</p>' +
          '<button class="play-btn" type="button">ادخل</button>' +
        '</article>'
      );
    }).join("");

    Array.prototype.forEach.call(wrap.querySelectorAll(".game-card"), function (card) {
      card.addEventListener("click", function () {
        location.hash = "#/section/" + encodeURIComponent(card.getAttribute("data-section"));
      });
    });
  }

  /* ---------- عرض ألعاب قسم ---------- */
  function renderGames(wrap, bar, sectionId) {
    var sec = getSections().filter(function (s) { return s.id === sectionId; })[0];

    bar.hidden = false;
    bar.innerHTML =
      '<button class="back-btn" type="button">⬅ كل الأقسام</button>' +
      '<span class="section-title">' + esc(sec ? (sec.icon + " " + sec.title) : "القسم") + '</span>';
    bar.querySelector(".back-btn").addEventListener("click", function () {
      location.hash = "";
    });

    var games = gamesInSection(sectionId);
    if (!games.length) {
      wrap.innerHTML = '<div class="cards-loading">لا توجد ألعاب في هذا القسم بعد</div>';
      return;
    }

    wrap.innerHTML = games.map(function (g) {
      var hasLink = g.link && g.link !== "#";
      var playBtn;
      if (hasLink) {
        var target = /^https?:/i.test(g.link) ? ' target="_blank" rel="noopener"' : "";
        playBtn = '<a class="play-btn" href="' + esc(g.link) + '"' + target + '>العب الآن</a>';
      } else {
        playBtn = '<span class="play-btn is-soon">قريباً</span>';
      }
      return (
        '<article class="game-card ' + (COLORS[g.color] || COLORS.green) + '">' +
          '<div class="card-icon">' + esc(g.icon || "🎮") + '</div>' +
          '<h3 class="card-title">' + esc(g.title) + '</h3>' +
          (g.desc ? '<p class="card-desc">' + esc(g.desc) + '</p>' : '') +
          (g.teacher ? '<p class="card-teacher">👩‍🏫 ' + esc(g.teacher) + '</p>' : '') +
          playBtn +
        '</article>'
      );
    }).join("");
  }

  /* ---------- التوجيه ---------- */
  function render() {
    var wrap = document.getElementById("cards");
    var bar  = document.getElementById("section-bar");
    if (!wrap || !bar) return;

    var sid = currentSectionId();
    if (sid) renderGames(wrap, bar, sid);
    else     renderSections(wrap, bar);
  }

  function boot() {
    loadGames().then(render);
  }

  document.addEventListener("DOMContentLoaded", boot);
  window.addEventListener("hashchange", function () { if (PUBLISHED) render(); else boot(); });
  window.addEventListener("focus", boot);
})();
