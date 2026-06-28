/* ===================================
   مدرسة سردا الأساسية المختلطة
   الملف الرئيسي للـ JavaScript
   
   ⚙️ خطوة مهمة:
   بعد إنشاء Google Apps Script ونشره،
   ضع رابط الـ Web App هنا ↓
=================================== */

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz8ZvymEEpnufhNyDsLYtY4KK4C3jl_u4nv3xnWz4tc3Nxd60amRgiXQENZ7gp1gRRmdg/exec';

// ===================================
// مواعيد الحصص
// ===================================
const SCHEDULE = {
  lower: [ // الصفوف 1-4
    { period: 1, time: '8:30 – 9:00' },
    { period: 2, time: '9:00 – 9:30' },
    { period: 3, time: '9:35 – 10:05' },
    { period: 4, time: '10:10 – 10:40' },
  ],
  upper: [ // الصفوف 5-9
    { period: 1, time: '10:45 – 11:15' },
    { period: 2, time: '11:20 – 11:50' },
    { period: 3, time: '11:55 – 12:25' },
    { period: 4, time: '12:30 – 1:00' },
    { period: 5, time: '1:05 – 1:35' },
  ]
};

// ===================================
// إظهار رسالة Toast
// ===================================
function showToast(msg, type = '') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.className = 'toast ' + type;
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => toast.classList.remove('show'), 3200);
}

// ===================================
// تاريخ اليوم بالعربية
// ===================================
function getArabicDate() {
  const now = new Date();
  const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  return now.toLocaleDateString('ar-SA', opts);
}

// ===================================
// إرسال بيانات إلى Google Sheets
// ===================================
async function saveToSheet(data) {
  if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL.includes('YOUR_')) {
    console.warn('رابط Google Apps Script غير محدد - سيتم الحفظ في LocalStorage فقط');
    return null;
  }
  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save', ...data })
    });
    return true;
  } catch (err) {
    console.error('خطأ في الحفظ:', err);
    return false;
  }
}

// ===================================
// جلب بيانات من Google Sheets
// ===================================
async function fetchFromSheet() {
  if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL.includes('YOUR_')) {
    return null; // استخدام LocalStorage كبديل
  }
  try {
    const res = await fetch(APPS_SCRIPT_URL + '?action=get', { mode: 'cors' });
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('خطأ في الجلب:', err);
    return null;
  }
}

// ===================================
// تحديث سجل في Google Sheets
// ===================================
async function updateInSheet(data) {
  if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL.includes('YOUR_')) return null;
  try {
    await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', ...data })
    });
    return true;
  } catch (err) {
    return false;
  }
}

// ===================================
// حذف سجل من Google Sheets
// ===================================
async function deleteFromSheet(id) {
  if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL.includes('YOUR_')) return null;
  try {
    await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id })
    });
    return true;
  } catch (err) {
    return false;
  }
}

// ===================================
// LocalStorage - احتياطي
// ===================================
function getLocalRecords() {
  try {
    return JSON.parse(localStorage.getItem('surda_records') || '[]');
  } catch { return []; }
}

function saveLocalRecords(records) {
  localStorage.setItem('surda_records', JSON.stringify(records));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// ===================================
// بناء جدول العرض (index.html)
// ===================================
function buildViewTable(records) {
  const tbody = document.getElementById('schedule-tbody');
  if (!tbody) return;

  if (!records || records.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty-state">
            <span class="empty-icon">📋</span>
            لا توجد حصص مسجلة اليوم حتى الآن
          </div>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = records.map(r => `
    <tr>
      <td><span class="badge-class">الصف ${r.grade}</span></td>
      <td><span class="badge-period">الحصة ${r.period}</span></td>
      <td>
        ${r.link
          ? `<a href="${escHtml(r.link)}" target="_blank" rel="noopener">${escHtml(r.subject)}</a>`
          : escHtml(r.subject)}
      </td>
      <td style="direction:ltr;text-align:right;">${escHtml(r.time || getTimeForRecord(r))}</td>
      <td><span class="badge-attendance">${escHtml(r.attendance || '—')}</span></td>
      <td style="font-size:0.8rem;color:#94a3b8;">${r.savedAt ? formatTime(r.savedAt) : '—'}</td>
    </tr>
  `).join('');
}

function getTimeForRecord(r) {
  const grade = parseInt(r.grade);
  const period = parseInt(r.period) - 1;
  const list = grade <= 4 ? SCHEDULE.lower : SCHEDULE.upper;
  return list[period] ? list[period].time : '—';
}

function formatTime(ts) {
  try {
    return new Date(ts).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ===================================
// تحميل الصفحة الرئيسية
// ===================================
async function initIndexPage() {
  // تاريخ اليوم
  const dateEl = document.getElementById('today-date');
  if (dateEl) dateEl.textContent = getArabicDate();

  // جلب البيانات
  const loadingEl = document.getElementById('loading-row');
  const tbody = document.getElementById('schedule-tbody');

  let records = null;

  // محاولة جلب من الشيت أولاً
  records = await fetchFromSheet();

  // إذا فشل، استخدم LocalStorage
  if (!records) {
    records = getLocalRecords();
    const statusEl = document.getElementById('data-source');
    if (statusEl) {
      statusEl.textContent = 'البيانات من الذاكرة المحلية (LocalStorage)';
      statusEl.style.color = '#d97706';
    }
  } else {
    const statusEl = document.getElementById('data-source');
    if (statusEl) statusEl.textContent = 'البيانات متزامنة مع Google Sheets ✓';
  }

  buildViewTable(records);

  // زر تحديث
  const refreshBtn = document.getElementById('refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      refreshBtn.disabled = true;
      refreshBtn.textContent = '⏳ جارٍ التحديث...';
      records = await fetchFromSheet() || getLocalRecords();
      buildViewTable(records);
      refreshBtn.disabled = false;
      refreshBtn.textContent = '🔄 تحديث';
      showToast('تم تحديث البيانات', 'success');
    });
  }

  // جدول المواعيد
  buildScheduleTable();
}

// ===================================
// بناء جدول مواعيد الحصص
// ===================================
function buildScheduleTable() {
  const lowerList = document.getElementById('lower-schedule');
  const upperList = document.getElementById('upper-schedule');

  if (lowerList) {
    lowerList.innerHTML = SCHEDULE.lower.map(s =>
      `<li>
        <span class="period-num">${s.period}</span>
        <span>الحصة ${s.period}</span>
        <span class="period-time">${s.time}</span>
      </li>`
    ).join('');
  }

  if (upperList) {
    upperList.innerHTML = SCHEDULE.upper.map(s =>
      `<li>
        <span class="period-num">${s.period}</span>
        <span>الحصة ${s.period}</span>
        <span class="period-time">${s.time}</span>
      </li>`
    ).join('');
  }
}

// ===================================
// صفحة المعلم - التحقق من كلمة المرور
// ===================================
function initTeacherPage() {
  const PASSWORD = 'Surda123surda';

  const passwordScreen = document.getElementById('password-screen');
  const teacherPanel = document.getElementById('teacher-panel');
  const passwordInput = document.getElementById('password-input');
  const loginBtn = document.getElementById('login-btn');
  const errorMsg = document.getElementById('error-msg');

  // التحقق من الجلسة
  if (sessionStorage.getItem('surda_auth') === '1') {
    showTeacherPanel();
    return;
  }

  loginBtn.addEventListener('click', checkPassword);
  passwordInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') checkPassword();
  });

  function checkPassword() {
    if (passwordInput.value === PASSWORD) {
      sessionStorage.setItem('surda_auth', '1');
      errorMsg.classList.remove('show');
      showTeacherPanel();
    } else {
      errorMsg.classList.add('show');
      passwordInput.value = '';
      passwordInput.focus();
    }
  }

  function showTeacherPanel() {
    passwordScreen.style.display = 'none';
    teacherPanel.classList.add('show');
    initForm();
    renderRecords();
  }
}

// ===================================
// نموذج إدخال الحصة
// ===================================
function initForm() {
  const form = document.getElementById('lesson-form');
  const gradeSelect = document.getElementById('f-grade');

  // ملء قوائم الصفوف
  if (gradeSelect) {
    for (let i = 1; i <= 9; i++) {
      gradeSelect.innerHTML += `<option value="${i}">الصف ${i}</option>`;
    }
  }

  // تحديث قائمة الحصص بناءً على الصف
  gradeSelect?.addEventListener('change', updatePeriods);
  updatePeriods();

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleSave();
  });
}

function updatePeriods() {
  const grade = parseInt(document.getElementById('f-grade')?.value || 1);
  const periodSelect = document.getElementById('f-period');
  if (!periodSelect) return;

  const list = grade <= 4 ? SCHEDULE.lower : SCHEDULE.upper;
  periodSelect.innerHTML = list.map(s =>
    `<option value="${s.period}">الحصة ${s.period} (${s.time})</option>`
  ).join('');
}

// ===================================
// حفظ حصة جديدة
// ===================================
async function handleSave() {
  const grade    = document.getElementById('f-grade')?.value;
  const period   = document.getElementById('f-period')?.value;
  const subject  = document.getElementById('f-subject')?.value;
  const link     = document.getElementById('f-link')?.value.trim();
  const attend   = document.getElementById('f-attendance')?.value.trim();

  if (!grade || !period || !subject) {
    showToast('يرجى ملء جميع الحقول المطلوبة', 'error');
    return;
  }

  const gradeNum  = parseInt(grade);
  const schedList = gradeNum <= 4 ? SCHEDULE.lower : SCHEDULE.upper;
  const schedItem = schedList.find(s => s.period == period);

  const record = {
    id: generateId(),
    grade,
    period,
    subject,
    link,
    attendance: attend,
    time: schedItem ? schedItem.time : '',
    savedAt: new Date().toISOString()
  };

  // حفظ في LocalStorage
  const records = getLocalRecords();
  records.push(record);
  saveLocalRecords(records);

  // محاولة حفظ في الشيت
  const saved = await saveToSheet(record);

  showToast(saved ? '✅ تم حفظ الحصة في Google Sheets' : '✅ تم الحفظ محلياً', 'success');

  // تفريغ النموذج
  document.getElementById('f-link').value = '';
  document.getElementById('f-attendance').value = '';

  renderRecords();
}

// ===================================
// عرض السجلات في صفحة المعلم
// ===================================
function renderRecords() {
  const container = document.getElementById('records-list');
  if (!container) return;

  const records = getLocalRecords();

  if (records.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:30px;color:#94a3b8;">
        <span style="font-size:2rem;display:block;margin-bottom:8px;">📂</span>
        لا توجد سجلات بعد
      </div>`;
    return;
  }

  container.innerHTML = records.map((r, i) => `
    <div class="record-item" id="record-${r.id}">
      <div class="record-number">${i + 1}</div>
      <div class="record-info">
        <strong>الصف ${escHtml(r.grade)} — الحصة ${escHtml(r.period)} — ${escHtml(r.subject)}</strong>
        <span>
          ${r.time ? '⏰ ' + r.time + ' | ' : ''}
          ${r.attendance ? '👥 ' + escHtml(r.attendance) + ' | ' : ''}
          ${r.link ? `<a href="${escHtml(r.link)}" target="_blank" style="color:#2563c7;">🔗 رابط الحصة</a> | ` : ''}
          🕐 ${formatTime(r.savedAt)}
        </span>
      </div>
      <div class="record-actions">
        <button class="btn btn-edit btn-sm" onclick="openEditModal('${r.id}')">✏️ تعديل</button>
        <button class="btn btn-danger btn-sm" onclick="deleteRecord('${r.id}')">🗑️ حذف</button>
      </div>
    </div>
  `).join('');
}

// ===================================
// حذف سجل
// ===================================
async function deleteRecord(id) {
  if (!confirm('هل أنت متأكد من حذف هذا السجل؟')) return;

  let records = getLocalRecords();
  records = records.filter(r => r.id !== id);
  saveLocalRecords(records);

  await deleteFromSheet(id);

  showToast('🗑️ تم الحذف', 'error');
  renderRecords();
}

// ===================================
// نافذة التعديل
// ===================================
let editingId = null;

function openEditModal(id) {
  const records = getLocalRecords();
  const record = records.find(r => r.id === id);
  if (!record) return;

  editingId = id;

  // ملء النموذج
  document.getElementById('e-grade').value = record.grade;
  updateEditPeriods(record.grade);
  setTimeout(() => {
    document.getElementById('e-period').value = record.period;
  }, 50);
  document.getElementById('e-subject').value = record.subject;
  document.getElementById('e-link').value = record.link || '';
  document.getElementById('e-attendance').value = record.attendance || '';

  document.getElementById('edit-modal').classList.add('show');
}

function updateEditPeriods(grade) {
  const gradeNum = parseInt(grade || 1);
  const periodSelect = document.getElementById('e-period');
  if (!periodSelect) return;
  const list = gradeNum <= 4 ? SCHEDULE.lower : SCHEDULE.upper;
  periodSelect.innerHTML = list.map(s =>
    `<option value="${s.period}">الحصة ${s.period} (${s.time})</option>`
  ).join('');
}

function closeEditModal() {
  document.getElementById('edit-modal').classList.remove('show');
  editingId = null;
}

async function saveEdit() {
  if (!editingId) return;

  const grade    = document.getElementById('e-grade')?.value;
  const period   = document.getElementById('e-period')?.value;
  const subject  = document.getElementById('e-subject')?.value;
  const link     = document.getElementById('e-link')?.value.trim();
  const attend   = document.getElementById('e-attendance')?.value.trim();

  if (!grade || !period || !subject) {
    showToast('يرجى ملء جميع الحقول', 'error');
    return;
  }

  const gradeNum  = parseInt(grade);
  const schedList = gradeNum <= 4 ? SCHEDULE.lower : SCHEDULE.upper;
  const schedItem = schedList.find(s => s.period == period);

  let records = getLocalRecords();
  const idx = records.findIndex(r => r.id === editingId);

  if (idx !== -1) {
    records[idx] = {
      ...records[idx],
      grade, period, subject, link,
      attendance: attend,
      time: schedItem ? schedItem.time : records[idx].time,
    };
    saveLocalRecords(records);
    await updateInSheet(records[idx]);
  }

  closeEditModal();
  showToast('✅ تم التعديل بنجاح', 'success');
  renderRecords();
}

// ===================================
// تشغيل عند تحميل الصفحة
// ===================================
document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;

  if (page === 'index') {
    initIndexPage();
  } else if (page === 'teacher') {
    initTeacherPage();
  }
});
