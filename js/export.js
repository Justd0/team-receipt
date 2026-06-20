import { getWeekReceipts } from './supabase.js';
import { getWeekRange, formatDate, getKoreanWeekday, getWeekLabel } from './utils/date-utils.js';
import { calculateDailyCharge, calculateWeeklyReceiptTotal, calculateWeeklyChargeTotal } from './utils/calc.js';

let currentReceipts = [];
let currentMonday = null;

async function loadWeek(offsetWeeks = 0) {
  const base = new Date();
  base.setDate(base.getDate() + offsetWeeks * 7);
  const { monday, friday } = getWeekRange(base);
  currentMonday = monday;

  document.getElementById('weekLabel').textContent = getWeekLabel(monday, friday);
  currentReceipts = await getWeekReceipts(formatDate(monday), formatDate(friday));
  renderSummary();
}

function getDays() {
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(currentMonday);
    d.setDate(currentMonday.getDate() + i);
    return { dateStr: formatDate(d), weekday: getKoreanWeekday(formatDate(d)) };
  });
}

function groupByDate(receipts) {
  const map = {};
  for (const r of receipts) {
    if (!map[r.date]) map[r.date] = [];
    map[r.date].push(r);
  }
  return map;
}

function renderSummary() {
  const byDate = groupByDate(currentReceipts);
  const rows = getDays().map(({ dateStr, weekday }) => {
    const dayReceipts = byDate[dateStr] || [];

    if (dayReceipts.length === 0) {
      return `<div style="padding:10px 0; border-bottom:1px solid var(--color-mist)">
        <span style="font-size:14px; font-weight:600; color:var(--color-graphite)">${weekday}</span>
        <span style="font-size:13px; color:var(--color-slate); margin-left:8px">미업로드</span>
      </div>`;
    }

    const subRows = dayReceipts.map((r, i) => {
      const charge = calculateDailyCharge(r.participants.length);
      const num = dayReceipts.length > 1 ? `<span style="color:var(--color-slate);margin-right:6px">${i + 1}.</span>` : '';
      return `<div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:4px; font-size:13px; padding:3px 0 3px 12px; color:var(--color-graphite)">
        <span>${num}${r.participants.join(', ')} (${r.participants.length}명)</span>
        <span>영수증 ${r.amount.toLocaleString()}원 / 청구 <strong class="text-blue">${charge.toLocaleString()}원</strong></span>
      </div>`;
    }).join('');

    return `<div style="padding:10px 0; border-bottom:1px solid var(--color-mist)">
      <div style="font-size:14px; font-weight:600; color:var(--color-graphite); margin-bottom:4px">${weekday}</div>
      ${subRows}
    </div>`;
  });

  document.getElementById('dayRows').innerHTML = rows.join('');
  document.getElementById('totalReceipt').textContent =
    calculateWeeklyReceiptTotal(currentReceipts).toLocaleString() + '원';
  document.getElementById('totalCharge').textContent =
    calculateWeeklyChargeTotal(currentReceipts).toLocaleString() + '원';
}

async function downloadZip() {
  const status = document.getElementById('actionStatus');
  status.style.display = 'block';
  status.textContent = 'ZIP 생성 중...';

  const { default: JSZip } = await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm');
  const zip = new JSZip();
  const weekFolderName = `${formatDate(currentMonday)}_week`;
  const weekFolder = zip.folder(weekFolderName);
  const byDate = groupByDate(currentReceipts);

  for (const { dateStr, weekday } of getDays()) {
    const dayReceipts = byDate[dateStr] || [];
    if (dayReceipts.length === 0) continue;

    const dayFolder = weekFolder.folder(weekday);

    for (let i = 0; i < dayReceipts.length; i++) {
      const r = dayReceipts[i];
      if (!r.image_url) continue;
      try {
        const res = await fetch(r.image_url);
        const blob = await res.blob();
        const ext = r.image_url.split('.').pop().split('?')[0] || 'jpg';
        const participants = r.participants.join('_');
        const suffix = dayReceipts.length > 1 ? `_${i + 1}` : '';
        const filename = `${participants}_${weekday}${suffix}.${ext}`;
        dayFolder.file(filename, blob);
      } catch {
        // 이미지 다운로드 실패 시 건너뜀
      }
    }
  }

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${weekFolderName}.zip`;
  a.click();
  URL.revokeObjectURL(url);
  status.textContent = '✅ ZIP 다운로드 완료';
}

function copyText() {
  const label = document.getElementById('weekLabel').textContent;
  const totalR = document.getElementById('totalReceipt').textContent;
  const totalC = document.getElementById('totalCharge').textContent;
  const text = `[식대 청구 — ${label}]\n영수증 총액: ${totalR}\n청구 총액: ${totalC}`;
  const status = document.getElementById('actionStatus');
  navigator.clipboard.writeText(text)
    .then(() => { status.style.display = 'block'; status.textContent = '✅ 클립보드에 복사됐습니다.'; })
    .catch(() => { status.style.display = 'block'; status.textContent = '❌ 클립보드 복사 실패.'; });
}

document.getElementById('thisWeekBtn').addEventListener('click', () => loadWeek(0));
document.getElementById('lastWeekBtn').addEventListener('click', () => loadWeek(-1));
document.getElementById('downloadBtn').addEventListener('click', downloadZip);
document.getElementById('copyBtn').addEventListener('click', copyText);

loadWeek(0);
