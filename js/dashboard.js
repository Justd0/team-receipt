import { supabase } from './supabase.js';
import { deleteReceipt } from './supabase.js';
import { formatDate } from './utils/date-utils.js';
import { calculateDailyCharge, calculateWeeklyChargeTotal } from './utils/calc.js';

async function getDateRangeReceipts(start, end) {
  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .gte('date', start)
    .lte('date', end)
    .order('date');
  if (error) throw error;
  return data ?? [];
}

function buildReceiptMap(receipts) {
  const map = {};
  for (const r of receipts) {
    if (!map[r.date]) map[r.date] = [];
    map[r.date].push(r);
  }
  return map;
}

function renderMonth(year, month, receiptMap) {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);

  const startPad = (firstDay.getDay() + 6) % 7;
  const cells = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    cells.push(new Date(year, month - 1, d));
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dayLabels = ['월', '화', '수', '목', '금', '토', '일'];
  let gridHtml = dayLabels.map((d, i) =>
    `<div class="cal-header${i >= 5 ? ' cal-header--weekend' : ''}">${d}</div>`
  ).join('');

  for (const date of cells) {
    if (!date) { gridHtml += `<div class="cal-cell cal-cell--empty"></div>`; continue; }

    const dateStr = formatDate(date);
    const dow = date.getDay();
    const isWeekend = dow === 0 || dow === 6;
    const isPast = date < today;
    const isToday = date.getTime() === today.getTime();
    const dayReceipts = receiptMap[dateStr];

    let cls = 'cal-cell';
    if (isWeekend) cls += ' cal-cell--weekend';
    else if (dayReceipts) cls += ' cal-cell--has-receipt';
    else if (isPast) cls += ' cal-cell--missing';
    if (isToday) cls += ' cal-cell--today';

    const dateNum = `<span class="cal-cell__date">${date.getDate()}</span>`;
    let info = '';
    if (dayReceipts) {
      const totalAmount = dayReceipts.reduce((s, r) => s + r.amount, 0);
      const totalCharge = dayReceipts.reduce((s, r) => s + calculateDailyCharge(r.participants.length), 0);
      const countLabel = dayReceipts.length > 1
        ? `<span class="cal-cell__count">${dayReceipts.length}건</span>` : '';
      info = `${countLabel}
              <span class="cal-cell__amount">${totalAmount.toLocaleString()}원</span>
              <span class="cal-cell__charge">청구 ${totalCharge.toLocaleString()}원</span>`;
    } else if (!isWeekend && isPast) {
      info = `<span class="cal-cell__missing">미업로드</span>`;
    }

    const dataAttr = dayReceipts ? ` data-date="${dateStr}"` : '';
    gridHtml += `<div class="${cls}"${dataAttr}>${dateNum}${info}</div>`;
  }

  return `<div class="cal-month">
    <h2 class="cal-month__title">${year}년 ${month}월</h2>
    <div class="cal-grid">${gridHtml}</div>
  </div>`;
}

function openModal(dateStr, receiptMap) {
  const modal = document.getElementById('modal');
  document.getElementById('modalTitle').textContent = `📅 ${dateStr}`;
  modal.style.display = 'flex';

  function renderBody() {
    const list = receiptMap[dateStr] || [];
    const body = document.getElementById('modalBody');

    if (list.length === 0) {
      body.innerHTML = '<p class="text-muted">영수증이 없습니다.</p>';
      return;
    }

    body.innerHTML = list.map(r => {
      const charge = calculateDailyCharge(r.participants.length);
      const thumb = r.image_url
        ? `<img class="receipt-item__thumb" src="${r.image_url}" alt="영수증">` : '';
      return `<div class="receipt-item" data-id="${r.id}">
        ${thumb}
        <div class="receipt-item__row">
          <div style="display:flex;flex-direction:column;gap:3px">
            <span style="font-size:15px;font-weight:500">${r.amount.toLocaleString()}원</span>
            <span class="text-muted" style="font-size:13px">${r.participants.join(', ')} (${r.participants.length}명)</span>
            <span style="font-size:13px;color:var(--color-blue)">청구 ${charge.toLocaleString()}원</span>
          </div>
          <button class="btn btn--sm btn--danger" data-id="${r.id}" data-url="${r.image_url || ''}">삭제</button>
        </div>
      </div>`;
    }).join('');

    body.querySelectorAll('.btn--danger').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('이 영수증을 삭제하시겠습니까?')) return;
        btn.disabled = true;
        btn.textContent = '삭제 중...';
        try {
          await deleteReceipt(btn.dataset.id, btn.dataset.url);
          receiptMap[dateStr] = (receiptMap[dateStr] || []).filter(r => r.id !== btn.dataset.id);
          if (receiptMap[dateStr].length === 0) delete receiptMap[dateStr];
          renderBody();
          renderCalendar(receiptMap);
          updateTotals(receiptMap);
          if (!receiptMap[dateStr]) modal.style.display = 'none';
        } catch (e) {
          alert('삭제 실패: ' + e.message);
          btn.disabled = false;
          btn.textContent = '삭제';
        }
      });
    });
  }

  renderBody();
}

function renderCalendar(receiptMap) {
  const container = document.getElementById('calendarContainer');
  container.innerHTML =
    renderMonth(2026, 6, receiptMap) + renderMonth(2026, 7, receiptMap);

  container.querySelectorAll('.cal-cell--has-receipt').forEach(cell => {
    cell.addEventListener('click', () => openModal(cell.dataset.date, receiptMap));
  });
}

function updateTotals(receiptMap) {
  const allReceipts = Object.values(receiptMap).flat();
  const june = allReceipts.filter(r => r.date.startsWith('2026-06'));
  const july = allReceipts.filter(r => r.date.startsWith('2026-07'));
  document.getElementById('juneTotal').textContent =
    calculateWeeklyChargeTotal(june).toLocaleString() + '원';
  document.getElementById('julyTotal').textContent =
    calculateWeeklyChargeTotal(july).toLocaleString() + '원';
}

async function render() {
  const container = document.getElementById('calendarContainer');
  try {
    const receipts = await getDateRangeReceipts('2026-06-01', '2026-07-31');
    const receiptMap = buildReceiptMap(receipts);

    updateTotals(receiptMap);
    renderCalendar(receiptMap);

    const modal = document.getElementById('modal');
    document.getElementById('modalClose').addEventListener('click', () => {
      modal.style.display = 'none';
    });
    modal.addEventListener('click', e => {
      if (e.target === modal) modal.style.display = 'none';
    });
  } catch (e) {
    container.innerHTML = '<div class="card text-muted">데이터를 불러오지 못했습니다.</div>';
  }
}

render();
