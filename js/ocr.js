const OCR_API_KEY = 'helloworld';
const OCR_API_URL = 'https://api.ocr.space/parse/image';

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
  const formData = new FormData();
  formData.append('file', file);
  formData.append('apikey', OCR_API_KEY);
  formData.append('language', 'kor');
  formData.append('isOverlayRequired', 'false');
  formData.append('OCREngine', '2');
  formData.append('scale', 'true');

  const res = await fetch(OCR_API_URL, { method: 'POST', body: formData });
  const json = await res.json();
  console.log('[OCR API 전체 응답]', JSON.stringify(json));

  if (!json.ParsedResults || json.ParsedResults.length === 0) {
    throw new Error(json.ErrorMessage?.[0] || json.OCRExitCode || 'OCR 결과 없음');
  }

  const text = json.ParsedResults[0].ParsedText || '';
  console.log('[OCR 원본 텍스트]', text);

  const date = extractDate(text);
  const amount = extractAmount(text);
  console.log('[OCR 추출 결과]', { date, amount });

  return { date, amount, rawText: text };
}

function extractDate(text) {
  const patterns = [
    /(\d{4})[.\-\/](\d{1,2})[.\-\/](\d{1,2})/,
    /(\d{2})[.\-\/](\d{1,2})[.\-\/](\d{1,2})/,
    /(\d{4})(\d{2})(\d{2})(?!\d)/,
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
  const normalized = text.replace(/(\d)\s*,\s*(\d)/g, '$1,$2');

  const totalPatterns = [
    /(?:합\s*계|총\s*액|총\s*계|결제\s*금액|청구\s*금액|받을\s*금액|TOTAL|total)[^\d]*(\d[\d,]+)/i,
    /(\d{1,3}(?:,\d{3})+)\s*원/,
    /(\d{4,})\s*원/,
  ];
  for (const pattern of totalPatterns) {
    const match = normalized.match(pattern);
    if (match) {
      return parseInt(match[1].replace(/,/g, ''), 10);
    }
  }

  // 원·합계 키워드 없는 영수증: 가장 큰 금액 형식 숫자 사용
  const priceMatches = [...normalized.matchAll(/\b(\d{1,3}(?:,\d{3})+)\b/g)];
  if (priceMatches.length > 0) {
    return Math.max(...priceMatches.map(m => parseInt(m[1].replace(/,/g, ''), 10)));
  }

  return 0;
}
