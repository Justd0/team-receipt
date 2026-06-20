# Team Receipt

팀 영수증 공유 및 청구 관리 애플리케이션. 영수증 이미지를 업로드하고 OCR로 날짜·금액을 자동 추출한 후, 참여 팀원을 선택하여 요일별 대시보드와 주간 ZIP 내보내기를 지원합니다.

## 주요 기능

- 영수증 이미지 업로드 (JPG, PNG, HEIC 지원)
- OCR 기반 날짜·금액 자동 추출 및 수동 수정
- 참여 팀원 선택 및 청구 금액 자동 계산
- 요일별 + 주간 합산 대시보드
- 주간 ZIP 내보내기 (요일별 폴더 구조)
- 청구 내역 클립보드 복사
- 모바일/PC 반응형 디자인

---

## 설정 가이드

### 1. Supabase 프로젝트 생성

1. [Supabase](https://supabase.com)에 접속 후 로그인
2. **New Project** 클릭
3. 프로젝트명: `team-receipt` (또는 원하는 이름)
4. 리전 선택 후 **Create new project** 클릭
5. 프로젝트 생성 완료 후 **SQL Editor**로 이동

### 2. 데이터베이스 및 스토리지 초기화

SQL Editor에서 아래 코드를 실행하여 테이블, 스토리지 버킷, RLS 정책을 생성합니다:

```sql
create table team_members (
  id uuid default gen_random_uuid() primary key,
  name text not null
);

insert into team_members (name) values
  ('팀원1'),
  ('팀원2'),
  ('팀원3'),
  ('팀원4');

create table receipts (
  id uuid default gen_random_uuid() primary key,
  date date not null,
  amount integer not null default 0,
  image_url text,
  participants text[] not null default '{}',
  created_at timestamptz default now()
);

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', true);

alter table team_members disable row level security;
alter table receipts disable row level security;

create policy "Public read" on storage.objects
  for select using (bucket_id = 'receipts');

create policy "Public upload" on storage.objects
  for insert with check (bucket_id = 'receipts');
```

**주의:** `팀원1`, `팀원2`, `팀원3`, `팀원4`를 실제 팀원 이름으로 변경하세요.

### 3. Supabase 인증키 복사

1. Supabase 대시보드 → **Project Settings** → **API**
2. 다음 정보를 복사:
   - **Project URL** (SUPABASE_URL)
   - **anon public key** (SUPABASE_ANON_KEY)

### 4. 로컬 환경변수 설정

프로젝트 루트의 `js/config.js` 파일을 열고 아래 값을 붙여넣기:

```javascript
export const SUPABASE_URL = 'https://xxxxx.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

### 5. 로컬 개발 서버 실행

```bash
cd /path/to/team-receipt
python3 -m http.server 8080
```

브라우저에서 `http://localhost:8080`으로 접속하여 기능을 테스트합니다.

---

## GitHub Pages 배포

### Step 1: GitHub 저장소 생성 및 푸시

1. [GitHub](https://github.com)에서 새 저장소 `team-receipt` 생성
2. 터미널에서 다음 명령어 실행:

```bash
cd /path/to/team-receipt
git remote add origin https://github.com/<your-username>/team-receipt.git
git branch -M main
git push -u origin main
```

### Step 2: GitHub Pages 활성화

1. GitHub 저장소 → **Settings** → **Pages**
2. **Source** → `Deploy from a branch` 선택
3. **Branch** → `main` / `/ (root)` 선택
4. **Save** 클릭

약 1분 후 `https://<your-username>.github.io/team-receipt/` URL이 생성됩니다.

### Step 3: Supabase 허용 URL 추가

1. Supabase 대시보드 → **Authentication** → **URL Configuration**
2. **Redirect URLs**에 다음 URL 추가:
   ```
   https://<your-username>.github.io
   ```
3. **Save** 클릭

### Step 4: 배포 URL에서 기능 테스트

배포된 URL에서 다음을 테스트합니다:

1. 영수증 업로드 (모바일에서도 테스트)
2. 홈 대시보드 표시 확인
3. ZIP 내보내기 기능 확인

### Step 5: 팀원에게 URL 공유

배포 완료 후 팀원들에게 다음 URL을 공유합니다:

```
https://<your-username>.github.io/team-receipt/
```

---

## 기술 스택

- **Frontend:** HTML5, CSS3, JavaScript (ES6+)
- **Backend:** Supabase (PostgreSQL)
- **Storage:** Supabase Storage
- **OCR:** Tesseract.js
- **Image Processing:** heic2any (HEIC 변환)
- **Deployment:** GitHub Pages

---

## 폴더 구조

```
team-receipt/
├── index.html           # 대시보드 페이지
├── upload.html          # 영수증 업로드 페이지
├── export.html          # 데이터 내보내기 페이지
├── css/
│   └── style.css        # 스타일시트
├── js/
│   ├── config.js        # Supabase 설정
│   ├── db.js            # 데이터베이스 모듈
│   ├── ocr.js           # OCR 모듈
│   ├── export.js        # 내보내기 모듈
│   └── ...
├── tests/               # 테스트 파일
└── README.md            # 이 파일
```

---

## 문제 해결

### 영수증이 업로드되지 않음

1. `js/config.js`의 `SUPABASE_URL`, `SUPABASE_ANON_KEY` 확인
2. Supabase Storage 버킷 `receipts`가 생성되었는지 확인
3. 브라우저 콘솔(F12)에서 에러 메시지 확인

### OCR이 작동하지 않음

1. 이미지 해상도가 충분한지 확인 (최소 100x100px)
2. 글자가 명확한 이미지인지 확인
3. 수동으로 날짜·금액 입력 가능

### GitHub Pages 배포 안 됨

1. Settings → Pages에서 배포 상태 확인
2. 브랜치가 `main`으로 설정되었는지 확인
3. 저장소가 public인지 확인
4. 10분 후 다시 시도

---

## 라이선스

MIT
