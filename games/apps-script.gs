/* ===========================================================
   Apps Script لتخزين ألعاب مخيم سردا في Google Sheet
   -----------------------------------------------------------
   طريقة الاستخدام:
   1) افتحي شيت الألعاب على Google Sheets
   2) Extensions ▸ Apps Script
   3) امسحي أي كود موجود والصقي هذا الكود كاملاً
   4) احفظي (💾) ثم: Deploy ▸ New deployment
      - Type: Web app
      - Execute as: Me
      - Who has access: Anyone
   5) انسخي رابط الـ Web App المنتهي بـ /exec وأرسليه للمساعد
   =========================================================== */

var PASSWORD   = "Surda123surda";              // نفس كلمة مرور اللوحة
var SHEET_NAME = "Games";
var HEADERS    = ["id", "title", "section", "teacher", "desc", "icon", "color", "link"];

function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) sh.appendRow(HEADERS);
  return sh;
}

function readGames() {
  var sh = getSheet();
  var values = sh.getDataRange().getValues();
  var games = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    if (!row[0]) continue; // تجاهل الصفوف بلا id
    var g = {};
    for (var j = 0; j < HEADERS.length; j++) g[HEADERS[j]] = row[j];
    games.push(g);
  }
  return games;
}

function findRowById(sh, id) {
  var ids = sh.getRange(1, 1, sh.getLastRow(), 1).getValues();
  for (var i = 1; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 1; // رقم الصف الفعلي
  }
  return -1;
}

function rowFromGame(g) {
  return HEADERS.map(function (h) { return g[h] != null ? g[h] : ""; });
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// قراءة الألعاب
function doGet(e) {
  return json({ ok: true, games: readGames() });
}

// إضافة / تعديل / حذف (محمي بكلمة المرور)
function doPost(e) {
  var body = {};
  try { body = JSON.parse(e.postData.contents); } catch (err) {}

  if (body.password !== PASSWORD) {
    return json({ ok: false, error: "bad-password" });
  }

  var sh = getSheet();
  var action = body.action;
  var game = body.game || {};

  if (action === "save") {
    if (!game.id) game.id = "g" + Date.now();
    sh.appendRow(rowFromGame(game));
    return json({ ok: true, id: game.id });
  }

  if (action === "update") {
    var r = findRowById(sh, game.id);
    if (r === -1) return json({ ok: false, error: "not-found" });
    sh.getRange(r, 1, 1, HEADERS.length).setValues([rowFromGame(game)]);
    return json({ ok: true });
  }

  if (action === "delete") {
    var row = findRowById(sh, body.id);
    if (row === -1) return json({ ok: false, error: "not-found" });
    sh.deleteRow(row);
    return json({ ok: true });
  }

  return json({ ok: false, error: "unknown-action" });
}
