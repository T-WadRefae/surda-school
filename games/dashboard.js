/* ===========================================================
   لوحة تحكم مخيم سردا
   - حماية بكلمة مرور
   - حفظ الألعاب بشكل دائم في ملف games-data.json داخل المستودع
     عبر GitHub API (برمز وصول يُدخله المشرف، يُحفظ في هذا المتصفح فقط)
   =========================================================== */
(function () {
  "use strict";

  var PASSWORD  = "Surda123surda";
  var AUTH_KEY  = "surda_camp_auth";
  var TOKEN_KEY = "surda_camp_gh_token";

  // إعدادات المستودع وملف البيانات
  var GH = {
    owner:  "T-WadRefae",
    repo:   "surda-school",
    path:   "games/games-data.json",
    branch: "main"
  };
  var DATA_URL = "games-data.json"; // قراءة العرض من نفس المجلد

  var COLOR_NAMES = {
    green: "أخضر", blue: "أزرق", purple: "بنفسجي",
    gold: "ذهبي", pink: "وردي", teal: "فيروزي"
  };

  var games = [];        // القائمة الحالية
  var editingId = null;  // معرّف اللعبة قيد التعديل
  var busy = false;      // جارٍ الحفظ في GitHub

  /* ---------- أدوات ---------- */
  function $(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function b64encode(str) { return btoa(unescape(encodeURIComponent(str))); }

  function getToken() {
    try { return sessionStorage.getItem(TOKEN_KEY) || ""; } catch (e) { return ""; }
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

  /* ---------- كلمة المرور ---------- */
  function unlock() {
    $("lock-screen").hidden = true;
    $("dash").hidden = false;
    fillSectionSelect();
    refreshTokenStatus();
    loadData();
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

  /* ---------- حالة الرمز ---------- */
  function refreshTokenStatus() {
    var el = $("gh-status");
    if (getToken()) {
      el.textContent = "✓ مُتصل — الحفظ الدائم مُفعّل.";
      el.className = "gh-status ok";
    } else {
      el.textContent = "غير مُتصل — أدخل الرمز للحفظ الدائم.";
      el.className = "gh-status";
    }
  }

  function saveToken() {
    var val = $("gh-token").value.trim();
    try {
      if (val) sessionStorage.setItem(TOKEN_KEY, val);
      else sessionStorage.removeItem(TOKEN_KEY);
    } catch (e) {}
    $("gh-token").value = "";
    refreshTokenStatus();
  }

  /* ---------- قراءة بيانات العرض ---------- */
  function loadData() {
    fetch(DATA_URL + "?cb=" + Date.now(), { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : { games: [] }; })
      .then(function (data) {
        games = (data && Array.isArray(data.games)) ? data.games : [];
        renderList();
      })
      .catch(function () { games = []; renderList(); });
  }

  /* ---------- الحفظ الدائم في GitHub ---------- */
  function ghHeaders(token) {
    return {
      "Authorization": "Bearer " + token,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    };
  }

  function commit(message) {
    var token = getToken();
    if (!token) {
      setStatus("أدخل رمز GitHub أولاً ليتم الحفظ الدائم.", "err");
      return Promise.reject(new Error("no-token"));
    }
    busy = true;
    setStatus("جارٍ الحفظ في GitHub…", "");
    var apiBase = "https://api.github.com/repos/" + GH.owner + "/" + GH.repo + "/contents/" + GH.path;
    var body = JSON.stringify({ games: games }, null, 2) + "\n";

    // 1) جلب sha الحالي (إن وُجد الملف)
    return fetch(apiBase + "?ref=" + GH.branch, { headers: ghHeaders(token), cache: "no-store" })
      .then(function (r) {
        if (r.status === 404) return null;
        if (!r.ok) throw new Error("read " + r.status);
        return r.json().then(function (j) { return j.sha; });
      })
      .then(function (sha) {
        var payload = {
          message: message || "Update games via dashboard",
          content: b64encode(body),
          branch: GH.branch
        };
        if (sha) payload.sha = sha;
        return fetch(apiBase, {
          method: "PUT",
          headers: ghHeaders(token),
          body: JSON.stringify(payload)
        });
      })
      .then(function (r) {
        if (!r.ok) {
          return r.json().catch(function () { return {}; }).then(function (j) {
            throw new Error(j.message || ("write " + r.status));
          });
        }
        busy = false;
        setStatus("✓ تم الحفظ. سيظهر للطلاب خلال دقيقة تقريباً.", "ok");
      })
      .catch(function (e) {
        busy = false;
        if (e.message !== "no-token") {
          setStatus("تعذّر الحفظ: " + e.message, "err");
        }
        throw e;
      });
  }

  function setStatus(msg, kind) {
    var el = $("gh-status");
    el.textContent = msg;
    el.className = "gh-status" + (kind ? " " + kind : "");
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
            '<small>' + esc(sectionTitle(g.section)) + ' · ' + (COLOR_NAMES[g.color] || g.color) +
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

  /* ---------- وضع التعديل ---------- */
  function startEdit(id) {
    var game = games.filter(function (g) { return g.id === id; })[0];
    if (!game) return;
    editingId = id;

    $("g-title").value   = game.title || "";
    $("g-section").value = game.section || "";
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
      desc: $("g-desc").value.trim(),
      icon: $("g-icon").value.trim() || "🎮",
      color: $("g-color").value,
      link: $("g-link").value.trim() || "#"
    };

    var snapshot = games.slice();   // للاسترجاع عند الفشل
    var msg;

    if (editingId) {
      games = games.map(function (g) {
        return g.id === editingId ? Object.assign({}, g, fields) : g;
      });
      msg = "Edit game: " + title;
    } else {
      fields.id = "g" + Date.now();
      games = games.concat([fields]);
      msg = "Add game: " + title;
    }

    renderList();
    commit(msg).then(function () {
      cancelEdit();
    }).catch(function () {
      games = snapshot;   // تراجع عند فشل الحفظ
      renderList();
    });
  }

  /* ---------- حذف ---------- */
  function removeGame(id) {
    if (busy) return;
    var game = games.filter(function (g) { return g.id === id; })[0];
    if (!game) return;
    if (!confirm('حذف اللعبة "' + game.title + '"؟')) return;

    var snapshot = games.slice();
    if (id === editingId) cancelEdit();
    games = games.filter(function (g) { return g.id !== id; });
    renderList();
    commit("Delete game: " + game.title).catch(function () {
      games = snapshot;
      renderList();
    });
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
    $("gh-save").addEventListener("click", saveToken);
    $("game-form").addEventListener("submit", onSubmit);
    $("cancel-btn").addEventListener("click", cancelEdit);
  });
})();
