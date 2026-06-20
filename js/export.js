import { getWeekReceipts } from './supabase.js';
import { getWeekRange, formatDate, getKoreanWeekday, getWeekLabel } from './utils/date-utils.js';
import { calculateDailyCharge, calculateWeeklyReceiptTotal, calculateWeeklyChargeTotal } from './utils/calc.js';

const WEEKDAYS_KO = ['월요일', '화요일', '수요일', '목요일', '금요일'];

let currentReceipts = [];
let currentMonday = null;
let currentFriday = null;

async function loadWeek(offsetWeeks = 0) {
  const base = new Date();
  base.setDate(base.getDate() + offsetWeeks * 7);
  const { monday, friday } = getWeekRange(base);
  currentMonday = monday;
  currentFriday = friday;

  document.getElementById('weekLabel').textContent = getWeekLabel(monday, friday);

  currentReceipts = await getWeekReceipts(formatDate(monday), formatDate(friday));

  renderSummary();
}

function renderSummary() {
  const days = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(currentMonday);
    d.setDate(currentMonday.getDate() + i);
    return formatDate(d);
  });

  const rows = days.map(dateStr => {
    const r = currentReceipts.find(x => x.date === dateStr);
    const weekday = getKoreanWeekday(dateStr);
    if (!r) {
      return `<div style="padding:8px 0; border-bottom:1px solid var(--color-mist); color:var(--color-slate); font-size:14px">${weekday} — 미업로드</div>`;
    }
    const charge = calculateDailyCharge(r.participants.length);
    return `
      <div style="padding:8px 0; border-bottom:1px solid var(--color-mist); font-size:14px; display:flex; justify-content:space-between; flex-wrap:wrap; gap:4px">
        <span><strong>${weekday}</strong> ${r.participants.join(', ')} (${r.participants.length}명)</span>
        <span>영수증 ${r.amount.toLocaleString()}원 / 청구 <strong class="text-blue">${charge.toLocaleString()}원</strong></span>
      </div>
    `;
  });

  document.getElementById('dayRows').innerHTML = rows.join('');
  document.getElementById('totalReceipt').textContent = calculateWeeklyReceiptTotal(currentReceipts).toLocaleString() + '원';
  document.getElementById('totalCharge').textContent = calculateWeeklyChargeTotal(currentReceipts).toLocaleString() + '원';
}

async function downloadZip() {
  const status = document.getElementById('actionStatus');
  status.style.display = 'block';
  status.textContent = 'ZIP 생성 중...';

  const { default: JSZip } = await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm');

  const zip = new JSZip();
  const weekFolderName = `${formatDate(currentMonday)}_week`;
  const weekFolder = zip.folder(weekFolderName);

  const days = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(currentMonday);
    d.setDate(currentMonday.getDate() + i);
    return { dateStr: formatDate(d), weekday: WEEKDAYS_KO[i] };
  });

  for (const { dateStr, weekday } of days) {
    const receipt = currentReceipts.find(r => r.date === dateStr);
    const dayFolder = weekFolder.folder(weekday);
    if (receipt?.image_url) {
      try {
        const res = await fetch(receipt.image_url);
        const blob = await res.blob();
        const ext = receipt.image_url.split('.').pop().split('?')[0] || 'jpg';
        dayFolder.file(`receipt_${dateStr.replace(/-/g, '')}.${ext}`, blob);
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
    .then(() => {
      status.style.display = 'block';
      status.textContent = '✅ 클립보드에 복사됐습니다.';
    })
    .catch(() => {
      status.style.display = 'block';
      status.textContent = '❌ 클립보드 복사에 실패했습니다. 직접 선택해서 복사해주세요.';
    });
}

document.getElementById('thisWeekBtn').addEventListener('click', () => loadWeek(0));
document.getElementById('lastWeekBtn').addEventListener('click', () => loadWeek(-1));
document.getElementById('downloadBtn').addEventListener('click', downloadZip);
document.getElementById('copyBtn').addEventListener('click', copyText);

loadWeek(0);
