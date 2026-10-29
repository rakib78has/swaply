/**
 * QASwitch Split-Screen Dual Role Runner Controller
 */

(function () {
  const params = new URLSearchParams(window.location.search);
  const leftProfileId = params.get('left') || '';
  const rightProfileId = params.get('right') || '';
  let currentUrl = params.get('url') || 'https://example.com';
  let isStacked = params.get('orientation') === 'stacked';
  let isScrollSync = params.get('syncScroll') === 'true';

  const commonUrlInput = document.getElementById('commonUrl');
  const btnNavigate = document.getElementById('btnNavigate');
  const btnReload = document.getElementById('btnReload');
  const btnToggleOrientation = document.getElementById('btnToggleOrientation');
  const btnToggleSync = document.getElementById('btnToggleSync');
  const splitContainer = document.getElementById('splitContainer');
  const frameLeft = document.getElementById('frameLeft');
  const frameRight = document.getElementById('frameRight');
  const badgeLeft = document.getElementById('badgeLeft');
  const badgeRight = document.getElementById('badgeRight');
  const btnReloadLeft = document.getElementById('btnReloadLeft');
  const btnReloadRight = document.getElementById('btnReloadRight');

  // Initial UI state
  commonUrlInput.value = currentUrl;
  updateOrientationUI();
  updateSyncUI();

  // Load profiles from storage to display names
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['qaswitch_profiles'], (res) => {
      const profiles = res.qaswitch_profiles || [];
      const leftProf = profiles.find((p) => p.id === leftProfileId);
      const rightProf = profiles.find((p) => p.id === rightProfileId);

      if (leftProf) {
        badgeLeft.textContent = `Role A: ${leftProf.name}`;
      } else {
        badgeLeft.textContent = `Role A: (${leftProfileId || 'Profile 1'})`;
      }

      if (rightProf) {
        badgeRight.textContent = `Role B: ${rightProf.name}`;
      } else {
        badgeRight.textContent = `Role B: (${rightProfileId || 'Profile 2'})`;
      }
    });
  }

  // Navigate frames
  function navigateFrames(url) {
    if (!url) return;
    let target = url.trim();
    if (!/^https?:\/\//i.test(target)) {
      target = 'https://' + target;
    }
    currentUrl = target;
    commonUrlInput.value = target;
    frameLeft.src = target;
    frameRight.src = target;
  }

  // Orientation toggle
  function updateOrientationUI() {
    if (isStacked) {
      splitContainer.style.flexDirection = 'column';
      btnToggleOrientation.textContent = '↕️ Stacked';
    } else {
      splitContainer.style.flexDirection = 'row';
      btnToggleOrientation.textContent = '↔️ Side-by-Side';
    }
  }

  // Scroll Sync toggle
  function updateSyncUI() {
    if (isScrollSync) {
      btnToggleSync.classList.add('active');
      btnToggleSync.textContent = '🔗 Scroll Sync: ON';
    } else {
      btnToggleSync.classList.remove('active');
      btnToggleSync.textContent = '🔗 Scroll Sync: OFF';
    }
  }

  // Event Listeners
  btnNavigate.addEventListener('click', () => {
    navigateFrames(commonUrlInput.value);
  });

  commonUrlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      navigateFrames(commonUrlInput.value);
    }
  });

  btnReload.addEventListener('click', () => {
    try {
      frameLeft.contentWindow?.location.reload();
      frameRight.contentWindow?.location.reload();
    } catch {
      frameLeft.src = currentUrl;
      frameRight.src = currentUrl;
    }
  });

  btnReloadLeft.addEventListener('click', () => {
    try {
      frameLeft.contentWindow?.location.reload();
    } catch {
      frameLeft.src = currentUrl;
    }
  });

  btnReloadRight.addEventListener('click', () => {
    try {
      frameRight.contentWindow?.location.reload();
    } catch {
      frameRight.src = currentUrl;
    }
  });

  btnToggleOrientation.addEventListener('click', () => {
    isStacked = !isStacked;
    updateOrientationUI();
  });

  btnToggleSync.addEventListener('click', () => {
    isScrollSync = !isScrollSync;
    updateSyncUI();
  });

  // Initial load
  navigateFrames(currentUrl);
})();
