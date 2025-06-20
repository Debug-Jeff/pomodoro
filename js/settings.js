/**
 * Settings functionality for the Pomodoro app
 * Handles user preferences and configuration
 */

const focusDurationSlider = document.getElementById('focus-duration');
const shortBreakDurationSlider = document.getElementById('short-break-duration');
const longBreakDurationSlider = document.getElementById('long-break-duration');
const sessionsBeforeLongBreakSlider = document.getElementById('sessions-before-long-break');
const enableNotificationsToggle = document.getElementById('enable-notifications');
const enableSoundsToggle = document.getElementById('enable-sounds');
const notificationSoundSelect = document.getElementById('notification-sound'); // New
const themePreviewElements = document.querySelectorAll('.theme-preview');
const exportDataBtn = document.getElementById('export-data-btn');
const importDataBtn = document.getElementById('import-data-btn');
const resetAllDataBtn = document.getElementById('reset-settings'); // ID from HTML, maps to resetAllAppData
const importFileInput = document.getElementById('import-file');
const settingsFeedbackElement = document.getElementById('settings-feedback');


function initSettingsModule() {
  if (!document.querySelector('body[data-page="settings"]')) return; // Check if on settings page

  const settings = loadData('settings', SCHEMAS.settings);

  updateSliderUI(focusDurationSlider, 'focus-duration-display', settings.focusDuration, ' min');
  updateSliderUI(shortBreakDurationSlider, 'short-break-duration-display', settings.shortBreakDuration, ' min');
  updateSliderUI(longBreakDurationSlider, 'long-break-duration-display', settings.longBreakDuration, ' min');
  updateSliderUI(sessionsBeforeLongBreakSlider, 'sessions-before-long-break-display', settings.sessionsBeforeLongBreak, ' sessions');

  if (enableNotificationsToggle) enableNotificationsToggle.checked = settings.enableNotifications;
  if (enableSoundsToggle) enableSoundsToggle.checked = settings.enableSounds;
  if (notificationSoundSelect) notificationSoundSelect.value = settings.notificationSound || 'default_alarm';

  setupVolumeGridUI(settings.soundVolume, settings.enableSounds);
  setActiveThemePreviewUI(settings.theme);
  setupSettingsEventListeners();

  // Ensure current theme from localStorage is applied visually if different from default
  const currentTheme = getCurrentTheme();
  if (currentTheme !== settings.theme) { // settings.theme is from loadData which could be default
    setActiveThemePreviewUI(currentTheme);
  }
}

function updateSliderUI(sliderEl, displayId, value, unit) {
  if (sliderEl) sliderEl.value = value;
  const displayEl = document.getElementById(displayId);
  if (displayEl) displayEl.textContent = value + unit;
}

function setupSettingsEventListeners() {
  const slidersConfig = [
    { el: focusDurationSlider, display: 'focus-duration-display', unit: ' min', settingKey: 'focusDuration' },
    { el: shortBreakDurationSlider, display: 'short-break-duration-display', unit: ' min', settingKey: 'shortBreakDuration' },
    { el: longBreakDurationSlider, display: 'long-break-duration-display', unit: ' min', settingKey: 'longBreakDuration' },
    { el: sessionsBeforeLongBreakSlider, display: 'sessions-before-long-break-display', unit: ' sessions', settingKey: 'sessionsBeforeLongBreak' }
  ];
  slidersConfig.forEach(item => {
    if (item.el) {
      item.el.addEventListener('input', () => {
        updateSliderUI(item.el, item.display, item.el.value, item.unit);
        saveCurrentSettingsToStorage();
      });
    }
  });

  if (enableSoundsToggle) {
    enableSoundsToggle.addEventListener('change', () => {
      const currentSettings = loadData('settings');
      setupVolumeGridUI(currentSettings.soundVolume, enableSoundsToggle.checked);
      saveCurrentSettingsToStorage();
      announceFeedback(`Sound effects ${enableSoundsToggle.checked ? 'enabled' : 'disabled'}.`);
    });
  }

  if (enableNotificationsToggle) {
    enableNotificationsToggle.addEventListener('change', async () => {
      let feedbackMsg = '';
      if (enableNotificationsToggle.checked) {
        const granted = await requestNotificationPermission();
        if (!granted) {
          enableNotificationsToggle.checked = false;
          feedbackMsg = 'Desktop notification permission denied by browser.';
          if (window.showToast) window.showToast(feedbackMsg, 'error');
        } else {
          feedbackMsg = 'Desktop notifications enabled.';
        }
      } else {
        feedbackMsg = 'Desktop notifications disabled.';
      }
      saveCurrentSettingsToStorage();
      announceFeedback(feedbackMsg);
    });
  }

  if (notificationSoundSelect) {
    notificationSoundSelect.addEventListener('change', () => {
      saveCurrentSettingsToStorage();
      announceFeedback(`Notification sound set to ${notificationSoundSelect.options[notificationSoundSelect.selectedIndex].text}.`);
      if (enableSoundsToggle && enableSoundsToggle.checked && window.playSound) {
        window.playSound(notificationSoundSelect.value); // Play selected sound as preview
      }
    });
  }

  themePreviewElements.forEach(element => {
    element.addEventListener('click', () => {
      const theme = element.dataset.theme;
      window.setAndApplyTheme(theme); // This saves to localStorage and applies
      setActiveThemePreviewUI(theme); // Updates UI on this page
      // saveCurrentSettingsToStorage(); // setAndApplyTheme already saves the 'theme' key
      announceFeedback(`Theme set to ${theme.charAt(0).toUpperCase() + theme.slice(1)}.`);
      if (window.gsap && !prefersReducedMotion()) {
        gsap.fromTo(element, { scale: 0.95 }, { scale: 1, duration: 0.2, ease: "power2.out" });
      }
    });
  });

  if (resetAllDataBtn) resetAllDataBtn.addEventListener('click', window.resetAllAppData); // Uses global from storage.js
  if (exportDataBtn) exportDataBtn.addEventListener('click', window.exportAllAppData);
  if (importDataBtn && importFileInput) {
    importDataBtn.addEventListener('click', () => importFileInput.click());
    importFileInput.addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => window.importAllAppData(e.target.result);
      reader.readAsText(file);
      importFileInput.value = ''; // Reset for next import
    });
  }
}

function setActiveThemePreviewUI(activeTheme) {
  themePreviewElements.forEach(el => {
    el.classList.remove('active', 'ring-4', 'ring-[rgb(var(--primary-rgb))]');
    if (el.dataset.theme === activeTheme || (activeTheme === 'auto' && el.dataset.theme === getCurrentThemeEffective())) {
      el.classList.add('active', 'ring-4', 'ring-[rgb(var(--primary-rgb))]');
    }
  });
}
function getCurrentThemeEffective() { // Gets effective theme if 'auto' is selected
  const storedPref = getCurrentTheme();
  if (storedPref === 'auto') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'dim';
  }
  return storedPref;
}


function setupVolumeGridUI(selectedVolume, soundEnabled) {
  const volumeGrid = document.getElementById('volume-grid');
  if (!volumeGrid) return;
  volumeGrid.innerHTML = '';
  const volumeLevels = [0, 20, 40, 60, 80, 100]; // Fewer steps for cleaner UI

  volumeLevels.forEach(level => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'volume-btn px-2 py-1.5 rounded-md font-medium text-xs sm:text-sm transition-all duration-150 ease-in-out border-2';
    btn.textContent = level === 0 ? 'Mute' : `${level}%`;
    btn.setAttribute('aria-label', `Set volume to ${level}%`);
    btn.dataset.value = level;

    if (level === selectedVolume && soundEnabled) {
      btn.classList.add('bg-[rgb(var(--primary-rgb))]', 'text-[rgb(var(--primary-foreground-rgb))]', 'border-[rgb(var(--primary-rgb))]', 'shadow-lg');
    } else {
      btn.classList.add('bg-transparent', 'border-[rgb(var(--muted-foreground-rgb))]', 'text-[rgb(var(--muted-foreground-rgb))]', 'hover:border-[rgb(var(--primary-rgb))]', 'hover:text-[rgb(var(--primary-rgb))]');
    }
    if (!soundEnabled) {
      btn.disabled = true;
      btn.classList.add('opacity-50', 'cursor-not-allowed');
    }
    btn.addEventListener('click', () => {
      if (soundEnabled) {
        saveVolumeSettingToStorage(level);
        if (window.playSound && level > 0) window.playSound(notificationSoundSelect.value || 'default_alarm');
      }
    });
    volumeGrid.appendChild(btn);
  });
  const volumeDisplay = document.getElementById('volume-display');
  if (volumeDisplay) volumeDisplay.textContent = soundEnabled ? `${selectedVolume}%` : 'Muted';
}

function saveVolumeSettingToStorage(value) {
  const settings = loadData('settings', SCHEMAS.settings);
  settings.soundVolume = value;
  settings.enableSounds = enableSoundsToggle ? enableSoundsToggle.checked : settings.enableSounds;
  saveData('settings', settings); // This will trigger 'appStorageChange'

  if (window.setMasterVolume) window.setMasterVolume(value / 100);
  setupVolumeGridUI(value, settings.enableSounds);
  announceFeedback(`Volume set to ${value}%.`);
}

function saveCurrentSettingsToStorage() {
  const activeThemeElement = Array.from(themePreviewElements).find(el => el.classList.contains('active'));
  const currentTheme = activeThemeElement ? activeThemeElement.dataset.theme : getCurrentTheme();

  const settings = {
    focusDuration: focusDurationSlider ? parseInt(focusDurationSlider.value) : DEFAULT_SETTINGS.focusDuration,
    shortBreakDuration: shortBreakDurationSlider ? parseInt(shortBreakDurationSlider.value) : DEFAULT_SETTINGS.shortBreakDuration,
    longBreakDuration: longBreakDurationSlider ? parseInt(longBreakDurationSlider.value) : DEFAULT_SETTINGS.longBreakDuration,
    sessionsBeforeLongBreak: sessionsBeforeLongBreakSlider ? parseInt(sessionsBeforeLongBreakSlider.value) : DEFAULT_SETTINGS.sessionsBeforeLongBreak,
    enableNotifications: enableNotificationsToggle ? enableNotificationsToggle.checked : DEFAULT_SETTINGS.enableNotifications,
    enableSounds: enableSoundsToggle ? enableSoundsToggle.checked : DEFAULT_SETTINGS.enableSounds,
    soundVolume: parseInt(document.querySelector('#volume-grid button.bg-\\\\[rgb\\\\(var\\\\(--primary-rgb\\\\)\\\\)\\\\]')?.dataset.value || loadData('settings').soundVolume || DEFAULT_SETTINGS.soundVolume),
    notificationSound: notificationSoundSelect ? notificationSoundSelect.value : DEFAULT_SETTINGS.notificationSound,
    theme: currentTheme,
    enableBackgroundSync: loadData('settings').enableBackgroundSync, // Preserve existing
    enablePushNotifications: loadData('settings').enablePushNotifications // Preserve existing
  };
  saveData('settings', settings);
}

function announceFeedback(message) {
  if (settingsFeedbackElement) {
    settingsFeedbackElement.textContent = message;
  }
}

// Push notification VAPID key (replace with your actual key)
// const PUBLIC_VAPID_KEY = 'YOUR_PUBLIC_VAPID_KEY_HERE';
// function requestPushPermission() { ... } // As before, if implementing

document.addEventListener('DOMContentLoaded', () => {
  if (document.querySelector('body[data-page="settings"]')) { // Example check
    initSettingsModule();
  }
  if (window.globalUpdatePopOutTimerDisplayStatus) {
    globalUpdatePopOutTimerDisplayStatus();
  }
});

window.addEventListener('themeChanged', (event) => {
  if (document.querySelector('body[data-page="settings"]')) {
    setActiveThemePreviewUI(event.detail.theme); // Update previews if theme changed elsewhere
  }
});
