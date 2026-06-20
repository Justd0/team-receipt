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
    const cb = chip.querySelector('input');
    cb.addEventListener('change', () => {
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
  dateInput.value = '';
  amountInput.value = '';
  memberGroup.querySelectorAll('input').forEach(cb => {
    cb.checked = false;
    cb.closest('.checkbox-chip').classList.remove('checkbox-chip--checked');
  });
  chargePreview.style.display = 'none';

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
    amountInput.value = '';
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
