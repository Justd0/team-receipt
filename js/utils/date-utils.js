export function getWeekRange(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay(); // 0=일, 1=월 ... 6=토
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  friday.setHours(23, 59, 59, 999);
  return { monday, friday };
}

export function formatDate(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getKoreanWeekday(dateStr) {
  const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  const d = new Date(dateStr + 'T12:00:00'); // 시간대 오프셋 방지
  return days[d.getDay()];
}

export function getWeekLabel(monday, friday) {
  const pad = (n) => String(n).padStart(2, '0');
  const m = monday;
  const f = friday;
  return `${m.getFullYear()}.${pad(m.getMonth() + 1)}.${pad(m.getDate())} ~ ${pad(f.getMonth() + 1)}.${pad(f.getDate())}`;
}
