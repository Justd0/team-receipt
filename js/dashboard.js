import { supabase, deleteReceipt, updateReceipt, getTeamMembers } from './supabase.js';
import { formatDate } from './utils/date-utils.js';
import { calculateDailyCharge, calculateWeeklyReceiptTotal, calculateWeeklyChargeTotal } from './utils/calc.js';

let teamMembers = [];

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
          <div style="display:flex;gap:6px">
            <button class="btn btn--sm btn--ghost btn--edit" data-id="${r.id}">수정</button>
            <button class="btn btn--sm btn--danger" data-id="${r.id}" data-url="${r.image_url || ''}">삭제</button>
          </div>
        </div>
      </div>`;
    }).join('');

    body.querySelectorAll('.receipt-item__thumb').forEach(img => {
      img.addEventListener('click', () => {
        const lightbox = document.getElementById('lightbox');
        document.getElementById('lightboxImg').src = img.src;
        lightbox.style.display = 'flex';
      });
    });

    body.querySelectorAll('.btn--edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const r = (receiptMap[dateStr] || []).find(r => r.id === id);
        if (!r) return;
        const item = btn.closest('.receipt-item');
        const memberChips = teamMembers.map(m => {
          const checked = r.participants.includes(m.name) ? 'checkbox-chip--checked' : '';
          return `<label class="checkbox-chip ${checked}" data-name="${m.name}">
            <input type="checkbox" value="${m.name}" ${r.participants.includes(m.name) ? 'checked' : ''}>
            ${m.name}
          </label>`;
        }).join('');

        item.innerHTML = `
          <div class="field">
            <label class="field__label">날짜</label>
            <input type="date" class="field__input edit-date" value="${r.date}">
          </div>
          <div class="field" style="margin-top:12px">
            <label class="field__label">금액 (원)</label>
            <input type="number" class="field__input edit-amount" value="${r.amount}" min="0">
          </div>
          <div class="field" style="margin-top:12px">
            <label class="field__label">참여 팀원</label>
            <div class="checkbox-group edit-members">${memberChips}</div>
          </div>
          <div style="display:flex;gap:8px;margin-top:16px">
            <button class="btn btn--primary btn--save" style="flex:1">저장</button>
            <button class="btn btn--ghost btn--cancel">취소</button>
          </div>
          <div class="edit-status text-muted" style="font-size:13px;margin-top:8px;display:none"></div>`;

        item.querySelectorAll('.checkbox-chip').forEach(chip => {
          chip.querySelector('input').addEventListener('change', e => {
            chip.classList.toggle('checkbox-chip--checked', e.target.checked);
          });
        });

        item.querySelector('.btn--cancel').addEventListener('click', renderBody);

        item.querySelector('.btn--save').addEventListener('click', async () => {
          const date = item.querySelector('.edit-date').value;
          const amount = parseInt(item.querySelector('.edit-amount').value, 10);
          const participants = [...item.querySelectorAll('.edit-members input:checked')].map(cb => cb.value);
          if (!date) return alert('날짜를 입력하세요.');
          if (!amount || amount <= 0) return alert('금액을 입력하세요.');
          if (participants.length === 0) return alert('팀원을 한 명 이상 선택하세요.');

          const saveBtn = item.querySelector('.btn--save');
          const status = item.querySelector('.edit-status');
          saveBtn.disabled = true;
          status.style.display = 'block';
          status.textContent = '저장 중...';

          try {
            await updateReceipt(id, { date, amount, participants });
            const idx = receiptMap[dateStr].findIndex(x => x.id === id);
            if (idx !== -1) receiptMap[dateStr][idx] = { ...receiptMap[dateStr][idx], date, amount, participants };
            renderBody();
            renderCalendar(receiptMap);
            renderMonthlySummary(receiptMap);
          } catch (e) {
            status.textContent = '저장 실패: ' + e.message;
            saveBtn.disabled = false;
          }
        });
      });
    });

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
          renderMonthlySummary(receiptMap);
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

function getMonthWeeks(year, month, { trimCrossMonthEnd = false, fullWeekStart = false } = {}) {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const diffToMonday = firstDay.getDay() === 0 ? -6 : 1 - firstDay.getDay();
  let monday = new Date(firstDay);
  monday.setDate(firstDay.getDate() + diffToMonday);

  const toMD = d => `${d.getMonth() + 1}/${d.getDate()}`;
  const weeks = [];
  let weekNum = 1;
  while (monday <= lastDay) {
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);

    if (trimCrossMonthEnd && friday > lastDay) {
      monday = new Date(monday);
      monday.setDate(monday.getDate() + 7);
      continue;
    }

    const weekStart = (fullWeekStart || monday >= firstDay) ? new Date(monday) : new Date(firstDay);
    weeks.push({
      startStr: formatDate(weekStart),
      endStr: formatDate(friday),
      label: `${weekNum}주차 (${toMD(weekStart)} ~ ${toMD(friday)})`,
    });
    weekNum++;
    monday = new Date(monday);
    monday.setDate(monday.getDate() + 7);
  }
  return weeks;
}

function renderMonthlySummary(receiptMap) {
  const months = [
    { year: 2026, month: 6, label: '6월', weekOpts: { trimCrossMonthEnd: true } },
    { year: 2026, month: 7, label: '7월', weekOpts: { fullWeekStart: true } },
  ];

  const html = months.map(({ year, month, label, weekOpts }) => {
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    const monthReceipts = Object.entries(receiptMap)
      .filter(([d]) => d.startsWith(prefix))
      .flatMap(([, rs]) => rs);
    const monthChargeTotal = calculateWeeklyChargeTotal(monthReceipts);

    const weeks = getMonthWeeks(year, month, weekOpts);
    const weekRows = weeks.map(w => {
      const weekReceipts = Object.entries(receiptMap)
        .filter(([d]) => d >= w.startStr && d <= w.endStr)
        .flatMap(([, rs]) => rs);
      const receiptTotal = calculateWeeklyReceiptTotal(weekReceipts);
      const chargeTotal = calculateWeeklyChargeTotal(weekReceipts);
      const isEmpty = weekReceipts.length === 0;
      return `<div class="week-row">
        <span class="week-row__label">${w.label}</span>
        <span class="week-row__values${isEmpty ? ' week-row__values--empty' : ''}">
          ${isEmpty
            ? '영수증 없음'
            : `영수증 ${receiptTotal.toLocaleString()}원 / 청구 <strong class="text-blue">${chargeTotal.toLocaleString()}원</strong>`}
        </span>
      </div>`;
    }).join('');

    return `<details class="month-accordion">
      <summary class="month-accordion__header">
        <span><span class="accordion-chevron">▶</span> ${label}</span>
        <span class="text-blue" style="font-size:18px;font-weight:500">${monthChargeTotal.toLocaleString()}원</span>
      </summary>
      <div class="month-accordion__body">${weekRows}</div>
    </details>`;
  }).join('');

  document.getElementById('monthlySummary').innerHTML = html;
}

async function render() {
  const container = document.getElementById('calendarContainer');
  try {
    teamMembers = await getTeamMembers();
    const receipts = await getDateRangeReceipts('2026-06-01', '2026-07-31');
    const receiptMap = buildReceiptMap(receipts);

    renderMonthlySummary(receiptMap);
    renderCalendar(receiptMap);

    const modal = document.getElementById('modal');
    document.getElementById('modalClose').addEventListener('click', () => {
      modal.style.display = 'none';
    });
    modal.addEventListener('click', e => {
      if (e.target === modal) modal.style.display = 'none';
    });

    const lightbox = document.getElementById('lightbox');
    document.getElementById('lightboxClose').addEventListener('click', () => {
      lightbox.style.display = 'none';
    });
    lightbox.addEventListener('click', e => {
      if (e.target === lightbox) lightbox.style.display = 'none';
    });
  } catch (e) {
    container.innerHTML = '<div class="card text-muted">데이터를 불러오지 못했습니다.</div>';
  }
}

render();
