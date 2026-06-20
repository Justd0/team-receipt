const TEAM_CODE = 'KLLJS';

(function () {
  if (localStorage.getItem('team_auth') === TEAM_CODE) return;

  function mount() {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:#f8f9fa;display:flex;align-items:center;justify-content:center;z-index:9999';
    overlay.innerHTML = `
      <div style="background:#fff;border-radius:24px;border:1px solid #dadce0;padding:40px;max-width:360px;width:100%;text-align:center;box-sizing:border-box">
        <div style="font-size:36px;margin-bottom:12px">🧾</div>
        <h1 style="font-size:20px;font-weight:500;color:#202124;margin-bottom:6px">Team Receipt</h1>
        <p style="font-size:14px;color:#5f6368;margin-bottom:24px">팀 코드를 입력하세요</p>
        <input id="__codeInput" type="password" placeholder="팀 코드"
          style="width:100%;height:44px;padding:0 12px;border:1px solid #dadce0;border-radius:4px;font-size:16px;outline:none;box-sizing:border-box;font-family:inherit">
        <button id="__codeBtn"
          style="width:100%;height:40px;margin-top:12px;background:#1a73e8;color:#fff;border:none;border-radius:200px;font-size:14px;font-weight:500;cursor:pointer;font-family:inherit">
          확인
        </button>
        <p id="__codeErr" style="font-size:13px;color:#d93025;margin-top:8px;min-height:18px"></p>
      </div>
    `;
    document.body.appendChild(overlay);

    const input = overlay.querySelector('#__codeInput');
    const btn   = overlay.querySelector('#__codeBtn');
    const err   = overlay.querySelector('#__codeErr');

    function tryAuth() {
      if (input.value === TEAM_CODE) {
        localStorage.setItem('team_auth', TEAM_CODE);
        overlay.remove();
      } else {
        err.textContent = '코드가 올바르지 않습니다.';
        input.value = '';
        input.focus();
      }
    }

    btn.addEventListener('click', tryAuth);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') tryAuth(); });
    input.focus();
  }

  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount);
})();
