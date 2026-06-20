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
  try {
    const { data: { text } } = await worker.recognize(file);
    return {
      date: extractDate(text),
      amount: extractAmount(text),
      rawText: text,
    };
  } finally {
    await worker.terminate();
  }
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
