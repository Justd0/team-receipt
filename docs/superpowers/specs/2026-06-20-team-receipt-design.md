# Team Receipt — 설계 문서

**작성일:** 2026-06-20  
**상태:** 승인 완료

---

## 개요

팀 점심 영수증 정산 자동화 웹앱. 팀원이 매일 영수증 이미지를 업로드하면 OCR로 날짜·금액을 추출하고, 매주 금요일에 요일별 폴더로 정리된 ZIP과 청구 금액 합산을 자동 제공한다.

---

## 아키텍처

| 항목 | 결정 |
|------|------|
| 구성 | 정적 HTML/CSS/JS (서버 없음) |
| 저장소 | Supabase Storage (이미지) + Supabase DB (메타데이터) |
| OCR | Tesseract.js (브라우저 내 실행) |
| ZIP 생성 | JSZip (브라우저 내 실행) |
| HEIC 변환 | heic2any (업로드 전 JPEG 변환) |
| 배포 | GitHub Pages 또는 Vercel 정적 호스팅 |
| 인증 | 없음 (URL 공유 방식) |
| 디자인 시스템 | Google for Education (docs/DESIGN.md) |

**의존 라이브러리 (CDN):**
- `@supabase/supabase-js`
- `tesseract.js`
- `jszip`
- `heic2any`

---

## 화면 구성

### 1. 홈 (`index.html`)

이번 주 대시보드. 요일별 영수증 현황과 주간 합산 금액을 표시한다.

**표시 항목:**
- 주차 표시 (예: 2026.06.15 ~ 06.19)
- 요일별 카드 (월~금):
  - 영수증 금액 (OCR 추출 실금액)
  - 참여 인원 수 + 이름
  - 청구 금액 (참여 인원 × 12,000원)
  - 영수증 이미지 썸네일
  - 미업로드 시 "미업로드" 상태 표시
- 하단 주간 합산:
  - 영수증 총액 합계
  - 청구 총액 합계

**레이아웃:** 모바일 1열 / PC 2열 카드 그리드

---

### 2. 업로드 (`upload.html`)

영수증 이미지 업로드 및 메타데이터 입력 화면.

**흐름:**
1. 이미지 선택 (카메라 촬영 or 파일 선택)
2. HEIC인 경우 → heic2any로 JPEG 변환
3. Tesseract.js OCR 실행 → 날짜·금액 자동 추출
4. 추출 결과 표시 + 수동 수정 가능한 입력 필드
5. 참여 팀원 체크박스 선택
6. 저장 → Supabase에 이미지 + 메타데이터 저장

**지원 포맷:** JPG, JPEG, PNG, WEBP, HEIC, HEIF

**OCR 추출 대상:** 날짜, 합계 금액 (오인식 시 수동 수정)

---

### 3. 주간 내보내기 (`export.html`)

주간 ZIP 다운로드 및 청구 금액 확인 화면.

**기능:**
- 주차 선택 (이번 주 / 이전 주)
- 청구 요약 표시:
  - 요일별 영수증 금액 / 참여 인원 / 청구 금액
  - 영수증 총액 합계
  - 청구 총액 합계
- ZIP 다운로드 버튼:
  - 구조: `YYYY-MM-DD_week/월요일/`, `화요일/` … `금요일/`
  - 각 폴더에 해당 날짜 영수증 이미지 포함
- 청구 요약 텍스트 복사 버튼 (사이트 기입용)

**ZIP 내부 구조 예시:**
```
2026-06-15_week/
  ├── 월요일/  receipt_20260615.jpg
  ├── 화요일/  receipt_20260616.jpg
  ├── 수요일/  receipt_20260617.jpg
  ├── 목요일/  receipt_20260618.jpg
  └── 금요일/  receipt_20260619.jpg
```

---

## 데이터 모델

### `receipts` 테이블

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| date | date | 영수증 날짜 (OCR 추출 or 수동 입력) |
| amount | integer | 영수증 실금액 (원) |
| image_url | text | Supabase Storage 이미지 경로 |
| participants | text[] | 참여 팀원 이름 배열 |
| created_at | timestamp | 생성 시각 |

### `team_members` 테이블

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| name | text | 팀원 이름 |

> **초기 설정:** 팀원 목록은 Supabase 대시보드에서 직접 추가한다. 별도 관리 UI 없음.

---

## 계산 로직

```
일별 청구 금액 = participants.length × 12,000
주간 영수증 총액 = SUM(receipts.amount) for 해당 주
주간 청구 총액 = SUM(일별 청구 금액) for 해당 주
```

---

## 시각 디자인

`docs/DESIGN.md` (Google for Education 스타일 시스템) 전체 적용.

**핵심 토큰:**
- 배경: `#f8f9fa`
- 카드: `#ffffff`
- 강조(파랑): `#1a73e8`
- 텍스트 primary: `#202124`
- 텍스트 muted: `#5f6368`
- 보더: `#dadce0`
- 버튼: pill shape (border-radius 200px)
- 카드: border-radius 24px, 그림자 없음

**반응형:** 모바일 우선, PC에서 2열 그리드

---

## 파일 구조

```
team-receipt/
  ├── index.html          (홈 대시보드)
  ├── upload.html         (영수증 업로드)
  ├── export.html         (주간 내보내기)
  ├── css/
  │   └── style.css       (공통 스타일 + 디자인 토큰)
  ├── js/
  │   ├── supabase.js     (Supabase 클라이언트 초기화)
  │   ├── ocr.js          (Tesseract.js + heic2any 처리)
  │   ├── upload.js       (업로드 화면 로직)
  │   ├── dashboard.js    (홈 대시보드 로직)
  │   └── export.js       (ZIP 생성 + 내보내기 로직)
  └── docs/
      ├── DESIGN.md
      └── superpowers/specs/
          └── 2026-06-20-team-receipt-design.md
```

---

## 미결 사항

없음.
