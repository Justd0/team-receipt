import { getWeekReceipts } from './supabase.js';
import { getWeekRange, formatDate, getKoreanWeekday, getWeekLabel } from './utils/date-utils.js';
import { calculateDailyCharge, calculateWeeklyReceiptTotal, calculateWeeklyChargeTotal } from './utils/calc.js';

async function render() {
  const { monday, friday } = getWeekRange();
  document.getElementById('weekLabel').textContent = getWeekLabel(monday, friday);

  const receipts = await getWeekReceipts(formatDate(monday), formatDate(friday));

  // 합산
  document.getElementById('totalReceipt').textContent =
    calculateWeeklyReceiptTotal(receipts).toLocaleString() + '원';
  document.getElementById('totalCharge').textContent =
    calculateWeeklyChargeTotal(receipts).toLocaleString() + '원';

  // 요일별 날짜 목록 (월~금)
  const days = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return formatDate(d);
  });

  const grid = document.getElementById('weekGrid');
  grid.innerHTML = days.map(dateStr => {
    const receipt = receipts.find(r => r.date === dateStr);
    const weekday = getKoreanWeekday(dateStr);

    if (!receipt) {
      return `
        <div class="card card--sm">
          <div style="display:flex; justify-content:space-between; align-items:center">
            <strong>${weekday}</strong>
            <span class="badge badge--pending">미업로드</span>
          </div>
          <p class="text-muted mt-8" style="font-size:14px">${dateStr}</p>
        </div>
      `;
    }

    const charge = calculateDailyCharge(receipt.participants.length);
    return `
      <div class="card card--sm">
        ${receipt.image_url ? `<img class="receipt-thumb" src="${receipt.image_url}" alt="영수증">` : ''}
        <div style="display:flex; justify-content:space-between; align-items:center">
          <strong>${weekday}</strong>
          <span class="badge badge--success">업로드 완료</span>
        </div>
        <p class="text-muted mt-8" style="font-size:14px">${dateStr}</p>
        <div class="mt-8" style="font-size:14px; display:flex; flex-direction:column; gap:4px">
          <div>영수증 금액: <strong>${receipt.amount.toLocaleString()}원</strong></div>
          <div>참여: <strong>${receipt.participants.join(', ')}</strong> (${receipt.participants.length}명)</div>
          <div>청구 금액: <strong class="text-blue">${charge.toLocaleString()}원</strong></div>
        </div>
      </div>
    `;
  }).join('');
}

render();
