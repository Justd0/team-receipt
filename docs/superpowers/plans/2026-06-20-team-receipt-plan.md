# Team Receipt 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 팀 점심 영수증을 OCR로 자동 스캔하고 주간 청구 금액을 계산해 ZIP으로 내보내는 정적 웹앱 구현

**Architecture:** 순수 HTML/CSS/JS + Supabase(이미지 저장 + DB) + Tesseract.js(브라우저 OCR). 서버 없음. ESM 모듈로 JS 분리, CDN 라이브러리 사용. 로컬 개발 시 `python -m http.server` 사용.

**Tech Stack:** HTML5, CSS Custom Properties, ES Modules, Supabase JS v2 (CDN), Tesseract.js v5 (CDN), heic2any (CDN), JSZip (CDN), Vitest (순수 로직 단위 테스트용)

## Global Constraints

- 인증 없음 — URL 공유 방식
- 지원 이미지 포맷: JPG, JPEG, PNG, WEBP, HEIC, HEIF
- 청구 단가: 1인당 12,000원 고정
- 디자인 시스템: `docs/DESIGN.md` (Google for Education) 전체 적용
- 배경 `#f8f9fa`, 강조 `#1a73e8`, 카드 `#ffffff`, 보더 `#dadce0`
- 버튼 border-radius: 200px (pill), 카드 border-radius: 24px
- 폰트: Inter (Google Sans 대체)
- 반응형: 모바일 우선, PC 2열 그리드

---

## 파일 구조

```
team-receipt/
  ├── index.html              (홈 대시보드)
  ├── upload.html             (영수증 업로드)
  ├── export.html             (주간 내보내기)
  ├── css/
  │   └── style.css           (공통 스타일 + 디자인 토큰)
  ├── js/
  │   ├── config.js           (Supabase URL/Key + 상수)
  │   ├── supabase.js         (DB/Storage 헬퍼)
  │   ├── utils/
  │   │   ├── calc.js         (청구 계산 순수 함수 — 테스트 대상)
  │   │   └── date-utils.js   (주차·요일 유틸 — 테스트 대상)
  │   ├── ocr.js              (Tesseract.js + heic2any)
  │   ├── upload.js           (업로드 화면 로직)
  │   ├── dashboard.js        (홈 대시보드 로직)
  │   └── export.js           (ZIP 생성 + 내보내기 로직)
  ├── tests/
  │   ├── calc.test.js
  │   └── date-utils.test.js
  ├── package.json
  ├── vitest.config.js
  └── docs/
      ├── DESIGN.md
      └── superpowers/
          ├── specs/2026-06-20-team-receipt-design.md
          └── plans/2026-06-20-team-receipt-plan.md
```

---

### Task 1: 프로젝트 초기화

**Files:**
- Create: `package.json`
- Create: `vitest.config.js`
- Create: `js/utils/calc.js` (빈 파일)
- Create: `js/utils/date-utils.js` (빈 파일)
- Create: `tests/calc.test.js` (빈 파일)
- Create: `tests/date-utils.test.js` (빈 파일)

**Interfaces:**
- Produces: Vitest 테스트 실행 환경 (`npm test`)

- [ ] **Step 1: package.json 생성**

```json
{
  "name": "team-receipt",
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 2: vitest.config.js 생성**

```javascript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
});
```

- [ ] **Step 3: 빈 파일 생성**

```bash
mkdir -p js/utils tests
touch js/utils/calc.js js/utils/date-utils.js
touch tests/calc.test.js tests/date-utils.test.js
```

- [ ] **Step 4: 의존성 설치**

```bash
npm install
```

Expected: `node_modules/` 생성, `package-lock.json` 생성

- [ ] **Step 5: 테스트 실행 확인 (빈 파일이므로 0개 통과)**

```bash
npm test
```

Expected: `0 tests passed`

- [ ] **Step 6: 커밋**

```bash
git init
git add package.json package-lock.json vitest.config.js js/utils/calc.js js/utils/date-utils.js tests/
git commit -m "chore: 프로젝트 초기화 + Vitest 테스트 환경 설정"
```

---

### Task 2: 계산 유틸리티 (TDD)

**Files:**
- Modify: `js/utils/calc.js`
- Modify: `tests/calc.test.js`

**Interfaces:**
- Produces:
  - `calculateDailyCharge(participantCount: number): number`
  - `calculateWeeklyReceiptTotal(receipts: Array<{amount: number}>): number`
  - `calculateWeeklyChargeTotal(receipts: Array<{participants: string[]}>): number`

- [ ] **Step 1: 실패하는 테스트 작성 (`tests/calc.test.js`)**

```javascript
import { describe, it, expect } from 'vitest';
import {
  calculateDailyCharge,
  calculateWeeklyReceiptTotal,
  calculateWeeklyChargeTotal,
} from '../js/utils/calc.js';

describe('calculateDailyCharge', () => {
  it('4명이면 48,000원', () => {
    expect(calculateDailyCharge(4)).toBe(48000);
  });
  it('5명이면 60,000원', () => {
    expect(calculateDailyCharge(5)).toBe(60000);
  });
  it('0명이면 0원', () => {
    expect(calculateDailyCharge(0)).toBe(0);
  });
});

describe('calculateWeeklyReceiptTotal', () => {
  it('영수증 실금액 합산', () => {
    const receipts = [
      { amount: 45000 },
      { amount: 52000 },
      { amount: 61000 },
    ];
    expect(calculateWeeklyReceiptTotal(receipts)).toBe(158000);
  });
  it('빈 배열이면 0', () => {
    expect(calculateWeeklyReceiptTotal([])).toBe(0);
  });
});

describe('calculateWeeklyChargeTotal', () => {
  it('요일별 참여 인원 기준 청구 합산', () => {
    const receipts = [
      { participants: ['A', 'B', 'C', 'D'] },      // 4명 × 12,000 = 48,000
      { participants: ['A', 'B', 'C', 'D', 'E'] }, // 5명 × 12,000 = 60,000
    ];
    expect(calculateWeeklyChargeTotal(receipts)).toBe(108000);
  });
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

```bash
npm test
```

Expected: FAIL — `calculateDailyCharge is not a function`

- [ ] **Step 3: 구현 (`js/utils/calc.js`)**

```javascript
const CHARGE_PER_PERSON = 12000;

export function calculateDailyCharge(participantCount) {
  return participantCount * CHARGE_PER_PERSON;
}

export function calculateWeeklyReceiptTotal(receipts) {
  return receipts.reduce((sum, r) => sum + r.amount, 0);
}

export function calculateWeeklyChargeTotal(receipts) {
  return receipts.reduce((sum, r) => sum + calculateDailyCharge(r.participants.length), 0);
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npm test
```

Expected: `6 tests passed`

- [ ] **Step 5: 커밋**

```bash
git add js/utils/calc.js tests/calc.test.js
git commit -m "feat: 일별/주간 청구 계산 유틸리티"
```

---

### Task 3: 날짜 유틸리티 (TDD)

**Files:**
- Modify: `js/utils/date-utils.js`
- Modify: `tests/date-utils.test.js`

**Interfaces:**
- Produces:
  - `getWeekRange(date?: Date): { monday: Date, friday: Date }`
  - `formatDate(date: Date): string` → `"YYYY-MM-DD"`
  - `getKoreanWeekday(dateStr: string): string` → `"월요일"` 등
  - `getWeekLabel(monday: Date, friday: Date): string` → `"2026.06.15 ~ 06.19"`

- [ ] **Step 1: 실패하는 테스트 작성 (`tests/date-utils.test.js`)**

```javascript
import { describe, it, expect } from 'vitest';
import {
  getWeekRange,
  formatDate,
  getKoreanWeekday,
  getWeekLabel,
} from '../js/utils/date-utils.js';

describe('getWeekRange', () => {
  it('수요일 기준으로 해당 주 월~금 반환', () => {
    const wed = new Date('2026-06-17'); // 수요일
    const { monday, friday } = getWeekRange(wed);
    expect(formatDate(monday)).toBe('2026-06-15');
    expect(formatDate(friday)).toBe('2026-06-19');
  });
  it('월요일 기준 동일 주 반환', () => {
    const mon = new Date('2026-06-15');
    const { monday } = getWeekRange(mon);
    expect(formatDate(monday)).toBe('2026-06-15');
  });
  it('일요일은 다음 주가 아닌 이번 주 월요일 기준', () => {
    const sun = new Date('2026-06-14'); // 일요일
    const { monday } = getWeekRange(sun);
    expect(formatDate(monday)).toBe('2026-06-08');
  });
});

describe('getKoreanWeekday', () => {
  it('2026-06-15 → 월요일', () => {
    expect(getKoreanWeekday('2026-06-15')).toBe('월요일');
  });
  it('2026-06-19 → 금요일', () => {
    expect(getKoreanWeekday('2026-06-19')).toBe('금요일');
  });
});

describe('getWeekLabel', () => {
  it('레이블 형식 반환', () => {
    const monday = new Date('2026-06-15');
    const friday = new Date('2026-06-19');
    expect(getWeekLabel(monday, friday)).toBe('2026.06.15 ~ 06.19');
  });
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

```bash
npm test
```

Expected: FAIL

- [ ] **Step 3: 구현 (`js/utils/date-utils.js`)**

```javascript
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
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npm test
```

Expected: `모든 테스트 통과`

- [ ] **Step 5: 커밋**

```bash
git add js/utils/date-utils.js tests/date-utils.test.js
git commit -m "feat: 날짜/주차 유틸리티"
```

---

### Task 4: Supabase 설정 + DB 스키마

**Files:**
- Create: `js/config.js`
- Create: `js/supabase.js`

**Interfaces:**
- Consumes: Supabase 프로젝트 URL + anon key
- Produces:
  - `supabase` (Supabase client 인스턴스)
  - `getWeekReceipts(mondayStr: string, fridayStr: string): Promise<Receipt[]>`
  - `getTeamMembers(): Promise<TeamMember[]>`
  - `uploadReceiptImage(file: File, filename: string): Promise<string>` → public URL
  - `saveReceipt({ date, amount, imageUrl, participants }): Promise<void>`

> **사전 작업 (Supabase 대시보드에서 직접 실행):**
>
> 1. https://supabase.com 에서 새 프로젝트 생성
> 2. SQL Editor에서 아래 SQL 실행:

```sql
-- 팀원 테이블
create table team_members (
  id uuid default gen_random_uuid() primary key,
  name text not null
);

-- 초기 팀원 데이터 (팀원 이름으로 교체)
insert into team_members (name) values
  ('팀원1'),
  ('팀원2'),
  ('팀원3'),
  ('팀원4');

-- 영수증 테이블
create table receipts (
  id uuid default gen_random_uuid() primary key,
  date date not null,
  amount integer not null default 0,
  image_url text,
  participants text[] not null default '{}',
  created_at timestamptz default now()
);

-- Storage 버킷 생성 (Public)
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', true);

-- RLS 비활성화 (팀 내부 도구, 인증 없음)
alter table team_members disable row level security;
alter table receipts disable row level security;

-- Storage 공개 접근 허용
create policy "Public read" on storage.objects
  for select using (bucket_id = 'receipts');

create policy "Public upload" on storage.objects
  for insert with check (bucket_id = 'receipts');
```
>
> 3. Project Settings → API 에서 `Project URL`과 `anon public` 키 복사

- [ ] **Step 1: `js/config.js` 생성**

```javascript
// Supabase 프로젝트 설정값으로 교체
export const SUPABASE_URL = 'https://xxxxxxxxxxx.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

export const CHARGE_PER_PERSON = 12000;
```

- [ ] **Step 2: `js/supabase.js` 생성**

```javascript
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function getWeekReceipts(mondayStr, fridayStr) {
  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .gte('date', mondayStr)
    .lte('date', fridayStr)
    .order('date');
  if (error) throw error;
  return data ?? [];
}

export async function getTeamMembers() {
  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .order('name');
  if (error) throw error;
  return data ?? [];
}

export async function uploadReceiptImage(file, filename) {
  const { error } = await supabase.storage
    .from('receipts')
    .upload(filename, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage
    .from('receipts')
    .getPublicUrl(filename);
  return data.publicUrl;
}

export async function saveReceipt({ date, amount, imageUrl, participants }) {
  const { error } = await supabase
    .from('receipts')
    .insert({ date, amount, image_url: imageUrl, participants });
  if (error) throw error;
}
```

- [ ] **Step 3: 브라우저에서 연결 확인**

로컬 서버 실행:
```bash
python3 -m http.server 8080
```

브라우저 콘솔에서:
```javascript
import { getTeamMembers } from '/js/supabase.js';
const members = await getTeamMembers();
console.log(members); // 팀원 목록 출력 확인
```

Expected: 팀원 배열 출력

- [ ] **Step 4: 커밋**

```bash
git add js/config.js js/supabase.js
git commit -m "feat: Supabase 클라이언트 + DB 헬퍼"
```

---

### Task 5: 공통 CSS

**Files:**
- Create: `css/style.css`

**Interfaces:**
- Produces: 모든 HTML 파일에서 공유하는 디자인 토큰 + 공통 컴포넌트 클래스

- [ ] **Step 1: `css/style.css` 생성**

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700&display=swap');

:root {
  --color-canvas: #f8f9fa;
  --color-card: #ffffff;
  --color-charcoal: #202124;
  --color-graphite: #3c4043;
  --color-slate: #5f6368;
  --color-mist: #dadce0;
  --color-blue: #1a73e8;
  --color-blue-deep: #1967d2;
  --color-success: #188038;
  --color-danger: #d93025;

  --font: 'Inter', ui-sans-serif, system-ui, sans-serif;

  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 24px;
  --radius-pill: 200px;

  --shadow-none: none;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: var(--font);
  background: var(--color-canvas);
  color: var(--color-charcoal);
  font-size: 16px;
  line-height: 1.56;
  letter-spacing: 0.017em;
  min-height: 100vh;
}

/* 레이아웃 */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

/* 네비게이션 */
.nav {
  height: 64px;
  background: var(--color-card);
  border-bottom: 1px solid var(--color-mist);
  display: flex;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 100;
}
.nav__inner {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.nav__logo {
  font-size: 18px;
  font-weight: 500;
  color: var(--color-charcoal);
  text-decoration: none;
}
.nav__links {
  display: flex;
  gap: 8px;
}
.nav__link {
  font-size: 14px;
  color: var(--color-slate);
  text-decoration: none;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  transition: background 0.15s;
}
.nav__link:hover { background: var(--color-canvas); color: var(--color-charcoal); }
.nav__link--active { color: var(--color-charcoal); font-weight: 500; }

/* 카드 */
.card {
  background: var(--color-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-mist);
  padding: 32px;
}
.card--sm { padding: 20px 24px; border-radius: 16px; }

/* 버튼 */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 40px;
  padding: 0 24px;
  border-radius: var(--radius-pill);
  font-family: var(--font);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: background 0.15s;
  text-decoration: none;
}
.btn--primary {
  background: var(--color-blue);
  color: #fff;
}
.btn--primary:hover { background: var(--color-blue-deep); }
.btn--ghost {
  background: transparent;
  border: 1px solid var(--color-mist);
  color: var(--color-blue);
}
.btn--ghost:hover { background: var(--color-canvas); border-color: var(--color-blue); }
.btn--full { width: 100%; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* 입력 */
.field { display: flex; flex-direction: column; gap: 6px; }
.field__label { font-size: 14px; font-weight: 500; color: var(--color-graphite); }
.field__input {
  height: 44px;
  padding: 0 12px;
  border: 1px solid var(--color-mist);
  border-radius: var(--radius-sm);
  font-family: var(--font);
  font-size: 16px;
  color: var(--color-charcoal);
  background: var(--color-card);
  outline: none;
  transition: border-color 0.15s;
}
.field__input:focus { border-color: var(--color-blue); box-shadow: 0 0 0 3px rgba(26,115,232,0.12); }
.field__hint { font-size: 12px; color: var(--color-slate); letter-spacing: 0.043em; }

/* 체크박스 그룹 */
.checkbox-group { display: flex; flex-wrap: wrap; gap: 8px; }
.checkbox-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: 1px solid var(--color-mist);
  border-radius: 9999px;
  font-size: 14px;
  color: var(--color-graphite);
  cursor: pointer;
  transition: all 0.15s;
  user-select: none;
}
.checkbox-chip input { display: none; }
.checkbox-chip--checked {
  background: var(--color-blue);
  border-color: var(--color-blue);
  color: #fff;
}

/* 배지 */
.badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.043em;
}
.badge--success { background: #e6f4ea; color: var(--color-success); }
.badge--pending { background: #fef7e0; color: #b06000; }

/* 요일 카드 그리드 */
.week-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  margin-top: 24px;
}
@media (min-width: 768px) {
  .week-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (min-width: 1100px) {
  .week-grid { grid-template-columns: repeat(3, 1fr); }
}

/* 합산 패널 */
.summary-panel {
  background: var(--color-card);
  border: 1px solid var(--color-mist);
  border-radius: var(--radius-lg);
  padding: 24px 32px;
  display: flex;
  gap: 32px;
  flex-wrap: wrap;
  margin-top: 24px;
}
.summary-item { display: flex; flex-direction: column; gap: 4px; }
.summary-item__label { font-size: 12px; color: var(--color-slate); letter-spacing: 0.043em; }
.summary-item__value { font-size: 22px; font-weight: 500; color: var(--color-charcoal); }

/* 이미지 업로드 영역 */
.upload-zone {
  border: 2px dashed var(--color-mist);
  border-radius: var(--radius-lg);
  padding: 48px 24px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.upload-zone:hover, .upload-zone--dragover {
  border-color: var(--color-blue);
  background: rgba(26,115,232,0.04);
}
.upload-zone__icon { font-size: 48px; margin-bottom: 12px; }
.upload-zone__text { font-size: 16px; color: var(--color-graphite); }
.upload-zone__hint { font-size: 12px; color: var(--color-slate); margin-top: 4px; }

/* 로딩 스피너 */
.spinner {
  width: 20px; height: 20px;
  border: 2px solid var(--color-mist);
  border-top-color: var(--color-blue);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  display: inline-block;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* 썸네일 */
.receipt-thumb {
  width: 100%;
  height: 120px;
  object-fit: cover;
  border-radius: 12px;
  border: 1px solid var(--color-mist);
  margin-bottom: 12px;
}

/* 유틸 */
.text-muted { color: var(--color-slate); font-size: 14px; }
.text-blue { color: var(--color-blue); }
.mt-8 { margin-top: 8px; }
.mt-16 { margin-top: 16px; }
.mt-24 { margin-top: 24px; }
.mt-32 { margin-top: 32px; }
.page-title {
  font-size: 28px;
  font-weight: 500;
  color: var(--color-charcoal);
  letter-spacing: -0.017em;
  line-height: 1.2;
}
.section-gap { padding: 40px 0; }
```

- [ ] **Step 2: 브라우저에서 확인**

`python3 -m http.server 8080` 실행 후 `http://localhost:8080`에서 빈 화면 배경색이 `#f8f9fa`인지 확인 (임시 index.html 없으면 디렉토리 목록으로 확인)

- [ ] **Step 3: 커밋**

```bash
git add css/style.css
git commit -m "feat: 공통 CSS (Google for Education 디자인 시스템)"
```

---

### Task 6: OCR 모듈

**Files:**
- Create: `js/ocr.js`

**Interfaces:**
- Produces:
  - `prepareImage(file: File): Promise<File>` → HEIC 변환 후 File 반환
  - `extractReceiptData(file: File): Promise<{ date: string, amount: number, rawText: string }>`

- [ ] **Step 1: `js/ocr.js` 생성**

```javascript
export async function prepareImage(file) {
  const name = file.name.toLowerCase();
  if (!name.endsWith('.heic') && !name.endsWith('.heif')) return file;

  const { default: heic2any } = await import(
    'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js'
  );
  const blob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 });
  const converted = Array.isArray(blob) ? blob[0] : blob;
  return new File([converted], name.replace(/\.(heic|heif)$/, '.jpg'), { type: 'image/jpeg' });
}

export async function extractReceiptData(file) {
  const { createWorker } = await import(
    'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.esm.min.js'
  );
  const worker = await createWorker('kor+eng');
  const { data: { text } } = await worker.recognize(file);
  await worker.terminate();

  return {
    date: extractDate(text),
    amount: extractAmount(text),
    rawText: text,
  };
}

function extractDate(text) {
  const patterns = [
    /(\d{4})[.\-\/](\d{1,2})[.\-\/](\d{1,2})/,
    /(\d{2})[.\-\/](\d{1,2})[.\-\/](\d{1,2})/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const year = match[1].length === 2 ? '20' + match[1] : match[1];
      return `${year}-${String(match[2]).padStart(2, '0')}-${String(match[3]).padStart(2, '0')}`;
    }
  }
  return '';
}

function extractAmount(text) {
  const totalPatterns = [
    /(?:합\s*계|총\s*액|총\s*계|TOTAL|total)[^\d]*(\d[\d,]+)/i,
    /(\d{1,3}(?:,\d{3})+)\s*원/,
    /(\d{4,})\s*원/,
  ];
  for (const pattern of totalPatterns) {
    const match = text.match(pattern);
    if (match) {
      return parseInt(match[1].replace(/,/g, ''), 10);
    }
  }
  return 0;
}
```

- [ ] **Step 2: 브라우저 콘솔에서 수동 테스트**

```javascript
import { prepareImage, extractReceiptData } from '/js/ocr.js';

// 파일 입력 요소로 이미지 선택 후
const file = document.querySelector('input[type=file]').files[0];
const prepared = await prepareImage(file);
const result = await extractReceiptData(prepared);
console.log(result); // { date: '2026-06-17', amount: 52000, rawText: '...' }
```

Expected: 날짜·금액이 추출되거나 빈값(수동 수정 가능)

- [ ] **Step 3: 커밋**

```bash
git add js/ocr.js
git commit -m "feat: OCR 모듈 (Tesseract.js + HEIC 변환)"
```

---

### Task 7: 업로드 화면

**Files:**
- Create: `upload.html`
- Create: `js/upload.js`

**Interfaces:**
- Consumes:
  - `prepareImage(file)`, `extractReceiptData(file)` from `js/ocr.js`
  - `uploadReceiptImage(file, filename)`, `saveReceipt({...})`, `getTeamMembers()` from `js/supabase.js`
  - `formatDate(date)` from `js/utils/date-utils.js`

- [ ] **Step 1: `upload.html` 생성**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>영수증 업로드 — Team Receipt</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <nav class="nav">
    <div class="nav__inner">
      <a href="index.html" class="nav__logo">🧾 Team Receipt</a>
      <div class="nav__links">
        <a href="index.html" class="nav__link">홈</a>
        <a href="upload.html" class="nav__link nav__link--active">업로드</a>
        <a href="export.html" class="nav__link">내보내기</a>
      </div>
    </div>
  </nav>

  <div class="container section-gap">
    <h1 class="page-title">영수증 업로드</h1>

    <div class="card mt-24">
      <!-- 이미지 업로드 영역 -->
      <div class="upload-zone" id="uploadZone">
        <div class="upload-zone__icon">📷</div>
        <div class="upload-zone__text">영수증을 촬영하거나 파일을 선택하세요</div>
        <div class="upload-zone__hint">JPG, PNG, WEBP, HEIC 지원</div>
        <input type="file" id="fileInput" accept="image/*,.heic,.heif" style="display:none" capture="environment">
      </div>

      <!-- 미리보기 -->
      <div id="previewSection" style="display:none" class="mt-24">
        <img id="previewImg" class="receipt-thumb" src="" alt="영수증 미리보기">

        <!-- OCR 상태 -->
        <div id="ocrStatus" class="text-muted mt-8">
          <span class="spinner"></span> OCR 분석 중...
        </div>

        <!-- 날짜 입력 -->
        <div class="field mt-16">
          <label class="field__label" for="dateInput">날짜</label>
          <input type="date" class="field__input" id="dateInput">
          <span class="field__hint">OCR이 잘못 읽었다면 직접 수정하세요</span>
        </div>

        <!-- 금액 입력 -->
        <div class="field mt-16">
          <label class="field__label" for="amountInput">영수증 금액 (원)</label>
          <input type="number" class="field__input" id="amountInput" placeholder="0">
          <span class="field__hint">OCR이 잘못 읽었다면 직접 수정하세요</span>
        </div>

        <!-- 참여 팀원 -->
        <div class="field mt-16">
          <label class="field__label">참여 팀원</label>
          <div class="checkbox-group" id="memberGroup"></div>
        </div>

        <!-- 청구 금액 미리보기 -->
        <div class="card card--sm mt-16" id="chargePreview" style="display:none">
          <span class="text-muted">청구 금액 (선택 인원 × 12,000원): </span>
          <strong id="chargeAmount" class="text-blue">0원</strong>
        </div>

        <!-- 저장 버튼 -->
        <button class="btn btn--primary btn--full mt-24" id="saveBtn">저장</button>
        <div id="saveStatus" class="text-muted mt-8" style="display:none"></div>
      </div>
    </div>
  </div>

  <script type="module" src="js/upload.js"></script>
</body>
</html>
```

- [ ] **Step 2: `js/upload.js` 생성**

```javascript
import { prepareImage, extractReceiptData } from './ocr.js';
import { uploadReceiptImage, saveReceipt, getTeamMembers } from './supabase.js';
import { formatDate } from './utils/date-utils.js';
import { calculateDailyCharge } from './utils/calc.js';

const uploadZone = document.getElementById('uploadZone');
const fileInput = document.getElementById('fileInput');
const previewSection = document.getElementById('previewSection');
const previewImg = document.getElementById('previewImg');
const ocrStatus = document.getElementById('ocrStatus');
const dateInput = document.getElementById('dateInput');
const amountInput = document.getElementById('amountInput');
const memberGroup = document.getElementById('memberGroup');
const chargePreview = document.getElementById('chargePreview');
const chargeAmount = document.getElementById('chargeAmount');
const saveBtn = document.getElementById('saveBtn');
const saveStatus = document.getElementById('saveStatus');

let currentFile = null;

// 팀원 체크박스 렌더링
async function renderMembers() {
  const members = await getTeamMembers();
  memberGroup.innerHTML = members.map(m => `
    <label class="checkbox-chip" data-name="${m.name}">
      <input type="checkbox" value="${m.name}">
      ${m.name}
    </label>
  `).join('');

  memberGroup.querySelectorAll('.checkbox-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const cb = chip.querySelector('input');
      cb.checked = !cb.checked;
      chip.classList.toggle('checkbox-chip--checked', cb.checked);
      updateChargePreview();
    });
  });
}

function updateChargePreview() {
  const checked = memberGroup.querySelectorAll('input:checked').length;
  if (checked > 0) {
    chargePreview.style.display = 'block';
    chargeAmount.textContent = calculateDailyCharge(checked).toLocaleString() + '원';
  } else {
    chargePreview.style.display = 'none';
  }
}

async function handleFile(file) {
  currentFile = file;

  // 미리보기
  previewImg.src = URL.createObjectURL(file);
  previewSection.style.display = 'block';
  ocrStatus.style.display = 'block';
  ocrStatus.innerHTML = '<span class="spinner"></span> HEIC 변환 및 OCR 분석 중...';
  saveBtn.disabled = true;

  try {
    const prepared = await prepareImage(file);
    currentFile = prepared;
    previewImg.src = URL.createObjectURL(prepared);

    const { date, amount } = await extractReceiptData(prepared);
    dateInput.value = date || formatDate(new Date());
    amountInput.value = amount || '';
    ocrStatus.innerHTML = '✅ OCR 완료. 내용을 확인하고 수정하세요.';
  } catch (e) {
    ocrStatus.innerHTML = '⚠️ OCR 실패. 날짜와 금액을 직접 입력하세요.';
    dateInput.value = formatDate(new Date());
  } finally {
    saveBtn.disabled = false;
  }
}

// 드래그앤드롭
uploadZone.addEventListener('click', () => fileInput.click());
uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('upload-zone--dragover'); });
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('upload-zone--dragover'));
uploadZone.addEventListener('drop', e => {
  e.preventDefault();
  uploadZone.classList.remove('upload-zone--dragover');
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});
fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) handleFile(fileInput.files[0]);
});

// 저장
saveBtn.addEventListener('click', async () => {
  const date = dateInput.value;
  const amount = parseInt(amountInput.value, 10);
  const participants = [...memberGroup.querySelectorAll('input:checked')].map(cb => cb.value);

  if (!date) return alert('날짜를 입력하세요.');
  if (!amount || amount <= 0) return alert('금액을 입력하세요.');
  if (participants.length === 0) return alert('참여 팀원을 한 명 이상 선택하세요.');
  if (!currentFile) return alert('이미지를 선택하세요.');

  saveBtn.disabled = true;
  saveStatus.style.display = 'block';
  saveStatus.textContent = '저장 중...';

  try {
    const filename = `${date}_${Date.now()}.jpg`;
    const imageUrl = await uploadReceiptImage(currentFile, filename);
    await saveReceipt({ date, amount, imageUrl, participants });
    saveStatus.textContent = '✅ 저장 완료!';
    setTimeout(() => { window.location.href = 'index.html'; }, 1000);
  } catch (e) {
    saveStatus.textContent = '❌ 저장 실패: ' + e.message;
    saveBtn.disabled = false;
  }
});

renderMembers();
```

- [ ] **Step 3: 브라우저에서 수동 테스트**

`http://localhost:8080/upload.html` 접속 후:
1. 이미지 선택 → OCR 실행되는지 확인
2. 날짜·금액 자동 입력되는지 확인 (오인식 시 수동 수정)
3. 팀원 체크 → 청구 금액 계산 표시 확인
4. 저장 버튼 → Supabase에 데이터 저장되는지 확인

- [ ] **Step 4: 커밋**

```bash
git add upload.html js/upload.js
git commit -m "feat: 영수증 업로드 화면"
```

---

### Task 8: 홈 대시보드

**Files:**
- Create: `index.html`
- Create: `js/dashboard.js`

**Interfaces:**
- Consumes:
  - `getWeekReceipts(mondayStr, fridayStr)` from `js/supabase.js`
  - `getTeamMembers()` from `js/supabase.js`
  - `getWeekRange(date)`, `formatDate(date)`, `getKoreanWeekday(str)`, `getWeekLabel(m, f)` from `js/utils/date-utils.js`
  - `calculateDailyCharge(n)`, `calculateWeeklyReceiptTotal(arr)`, `calculateWeeklyChargeTotal(arr)` from `js/utils/calc.js`

- [ ] **Step 1: `index.html` 생성**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Team Receipt</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <nav class="nav">
    <div class="nav__inner">
      <a href="index.html" class="nav__logo">🧾 Team Receipt</a>
      <div class="nav__links">
        <a href="index.html" class="nav__link nav__link--active">홈</a>
        <a href="upload.html" class="nav__link">업로드</a>
        <a href="export.html" class="nav__link">내보내기</a>
      </div>
    </div>
  </nav>

  <div class="container section-gap">
    <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:16px">
      <div>
        <h1 class="page-title">이번 주 현황</h1>
        <p class="text-muted mt-8" id="weekLabel"></p>
      </div>
      <a href="upload.html" class="btn btn--primary">+ 영수증 업로드</a>
    </div>

    <!-- 합산 패널 -->
    <div class="summary-panel">
      <div class="summary-item">
        <span class="summary-item__label">영수증 총액</span>
        <span class="summary-item__value" id="totalReceipt">-</span>
      </div>
      <div class="summary-item">
        <span class="summary-item__label">청구 총액</span>
        <span class="summary-item__value text-blue" id="totalCharge">-</span>
      </div>
    </div>

    <!-- 요일별 카드 -->
    <div class="week-grid" id="weekGrid">
      <div class="card text-muted">불러오는 중...</div>
    </div>
  </div>

  <script type="module" src="js/dashboard.js"></script>
</body>
</html>
```

- [ ] **Step 2: `js/dashboard.js` 생성**

```javascript
import { getWeekReceipts } from './supabase.js';
import { getWeekRange, formatDate, getKoreanWeekday, getWeekLabel } from './utils/date-utils.js';
import { calculateDailyCharge, calculateWeeklyReceiptTotal, calculateWeeklyChargeTotal } from './utils/calc.js';

const WEEKDAYS = ['월요일', '화요일', '수요일', '목요일', '금요일'];

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
```

- [ ] **Step 3: 브라우저에서 수동 테스트**

`http://localhost:8080` 접속 후:
1. 이번 주 레이블 표시 확인
2. 업로드된 영수증이 해당 요일 카드에 표시되는지 확인
3. 영수증 총액 / 청구 총액 합산 정확한지 확인

- [ ] **Step 4: 커밋**

```bash
git add index.html js/dashboard.js
git commit -m "feat: 홈 대시보드 (요일별 현황 + 주간 합산)"
```

---

### Task 9: 주간 내보내기

**Files:**
- Create: `export.html`
- Create: `js/export.js`

**Interfaces:**
- Consumes:
  - `getWeekReceipts(mondayStr, fridayStr)` from `js/supabase.js`
  - `getWeekRange(date)`, `formatDate(date)`, `getKoreanWeekday(str)`, `getWeekLabel(m, f)` from `js/utils/date-utils.js`
  - `calculateDailyCharge(n)`, `calculateWeeklyReceiptTotal(arr)`, `calculateWeeklyChargeTotal(arr)` from `js/utils/calc.js`

- [ ] **Step 1: `export.html` 생성**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>주간 내보내기 — Team Receipt</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <nav class="nav">
    <div class="nav__inner">
      <a href="index.html" class="nav__logo">🧾 Team Receipt</a>
      <div class="nav__links">
        <a href="index.html" class="nav__link">홈</a>
        <a href="upload.html" class="nav__link">업로드</a>
        <a href="export.html" class="nav__link nav__link--active">내보내기</a>
      </div>
    </div>
  </nav>

  <div class="container section-gap">
    <h1 class="page-title">주간 내보내기</h1>

    <!-- 주차 선택 -->
    <div style="display:flex; gap:8px; margin-top:24px">
      <button class="btn btn--primary" id="thisWeekBtn">이번 주</button>
      <button class="btn btn--ghost" id="lastWeekBtn">지난 주</button>
    </div>

    <!-- 청구 요약 -->
    <div class="card mt-24" id="summaryCard">
      <div style="display:flex; justify-content:space-between; align-items:center">
        <h2 style="font-size:18px; font-weight:500" id="weekLabel">-</h2>
      </div>
      <div id="dayRows" class="mt-16"></div>
      <div class="summary-panel" style="margin-top:16px">
        <div class="summary-item">
          <span class="summary-item__label">영수증 총액</span>
          <span class="summary-item__value" id="totalReceipt">-</span>
        </div>
        <div class="summary-item">
          <span class="summary-item__label">청구 총액</span>
          <span class="summary-item__value text-blue" id="totalCharge">-</span>
        </div>
      </div>
    </div>

    <!-- 액션 버튼 -->
    <div style="display:flex; gap:12px; flex-wrap:wrap; margin-top:24px">
      <button class="btn btn--primary" id="downloadBtn">📦 ZIP 다운로드</button>
      <button class="btn btn--ghost" id="copyBtn">📋 청구 내역 복사</button>
    </div>
    <div id="actionStatus" class="text-muted mt-8" style="display:none"></div>
  </div>

  <script type="module" src="js/export.js"></script>
</body>
</html>
```

- [ ] **Step 2: `js/export.js` 생성**

```javascript
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
  navigator.clipboard.writeText(text).then(() => {
    const status = document.getElementById('actionStatus');
    status.style.display = 'block';
    status.textContent = '✅ 클립보드에 복사됐습니다.';
  });
}

document.getElementById('thisWeekBtn').addEventListener('click', () => loadWeek(0));
document.getElementById('lastWeekBtn').addEventListener('click', () => loadWeek(-1));
document.getElementById('downloadBtn').addEventListener('click', downloadZip);
document.getElementById('copyBtn').addEventListener('click', copyText);

loadWeek(0);
```

- [ ] **Step 3: 브라우저에서 수동 테스트**

`http://localhost:8080/export.html` 접속 후:
1. 이번 주 / 지난 주 전환 확인
2. 청구 요약 금액 정확한지 확인
3. ZIP 다운로드 → 폴더 구조 `요일별 폴더/영수증이미지` 확인
4. 복사 버튼 → 클립보드 내용 확인

- [ ] **Step 4: 커밋**

```bash
git add export.html js/export.js
git commit -m "feat: 주간 내보내기 (ZIP 다운로드 + 청구 내역 복사)"
```

---

### Task 10: GitHub Pages 배포

**Files:**
- Create: `README.md` (설정 가이드)

- [ ] **Step 1: GitHub 저장소 생성 및 푸시**

```bash
# GitHub에서 새 저장소 team-receipt 생성 후
git remote add origin https://github.com/<your-username>/team-receipt.git
git branch -M main
git push -u origin main
```

- [ ] **Step 2: GitHub Pages 활성화**

GitHub 저장소 → Settings → Pages → Source: `Deploy from a branch` → Branch: `main` / `/ (root)` → Save

Expected: `https://<username>.github.io/team-receipt/` URL 생성 (약 1분 소요)

- [ ] **Step 3: `js/config.js` Supabase 설정 확인**

Supabase 대시보드 → Authentication → URL Configuration에서 아래 URL 추가:
```
https://<username>.github.io
```

- [ ] **Step 4: 배포 URL로 전체 기능 테스트**

배포된 URL로 접속 후:
1. 영수증 업로드 (모바일에서도 테스트)
2. 홈 대시보드 표시 확인
3. ZIP 내보내기 확인

- [ ] **Step 5: 팀원에게 URL 공유**

```
https://<username>.github.io/team-receipt/
```

---

## 셀프 리뷰

**스펙 커버리지 점검:**
- ✅ 영수증 이미지 업로드 (Task 7)
- ✅ OCR 날짜·금액 자동 추출 + 수동 수정 (Task 6, 7)
- ✅ HEIC 포맷 지원 (Task 6)
- ✅ 참여 팀원 선택 (Task 7)
- ✅ 요일별 + 주간 합산 대시보드 (Task 8)
- ✅ 청구 금액 계산 (1인 × 12,000원) (Task 2, 8)
- ✅ 주간 ZIP 내보내기 (요일별 폴더) (Task 9)
- ✅ 청구 내역 복사 (Task 9)
- ✅ 모바일/PC 반응형 (Task 5)
- ✅ Google for Education 디자인 시스템 (Task 5)
- ✅ Supabase 무료 플랜 (Task 4)
- ✅ 인증 없음 (Task 전체)

**타입 일관성:**
- `calculateDailyCharge(participantCount: number)` — Task 2 정의, Task 7·8·9 사용 ✅
- `getWeekReceipts(mondayStr, fridayStr)` — Task 4 정의, Task 8·9 사용 ✅
- `formatDate(date: Date): string` — Task 3 정의, Task 7·8·9 사용 ✅
