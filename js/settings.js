/**
 * Settings functionality for the Pomodoro app
 * Handles user preferences and configuration
 */

// DOM elements (ensure these IDs exist in settings.html)
const focusDurationSlider = document.getElementById('focus-duration');
const shortBreakDurationSlider = document.getElementById('short-break-duration');
const longBreakDurationSlider = document.getElementById('long-break-duration');
const sessionsBeforeLongBreakSlider = document.getElementById('sessions-before-long-break');
const enableNotificationsToggle = document.getElementById('enable-notifications');
const enableSoundsToggle = document.getElementById('enable-sounds');
const themePreviewElements = document.querySelectorAll('.theme-preview'); // In settings.html
const exportDataBtn = document.getElementById('export-data-btn'); // Changed ID for clarity
const importDataBtn = document.getElementById('import-data-btn'); // Changed ID
const resetSettingsBtn = document.getElementById('reset-settings'); // This resets ALL app data now
const importFileInput = document.getElementById('import-file'); // For triggering file dialog
const settingsFeedback = document.getElementById('settings-feedback'); // For aria-live updates

// Initialize settings UI
function initSettings() {
  const settings = loadData('settings', SCHEMAS.settings); // Uses global loadData

  if (focusDurationSlider) {
    focusDurationSlider.value = settings.focusDuration;
    updateSliderDisplay(focusDurationSlider, 'focus-duration-display', ' min');
  }
  if (shortBreakDurationSlider) {
    shortBreakDurationSlider.value = settings.shortBreakDuration;
    updateSliderDisplay(shortBreakDurationSlider, 'short-break-duration-display', ' min');
  }
  if (longBreakDurationSlider) {
    longBreakDurationSlider.value = settings.longBreakDuration;
    updateSliderDisplay(longBreakDurationSlider, 'long-break-duration-display', ' min');
  }
  if (sessionsBeforeLongBreakSlider) {
    sessionsBeforeLongBreakSlider.value = settings.sessionsBeforeLongBreak;
    updateSliderDisplay(sessionsBeforeLongBreakSlider, 'sessions-before-long-break-display', ' sessions');
  }
  if (enableNotificationsToggle) {
    enableNotificationsToggle.checked = settings.enableNotifications;
  }
  if (enableSoundsToggle) {
    enableSoundsToggle.checked = settings.enableSounds;
  }

  setupVolumeGrid(settings.soundVolume, settings.enableSounds);
  setActiveThemePreview(settings.theme); // Update theme preview UI

  setupEventListeners();
}

// Helper to update slider value display
function updateSliderDisplay(sliderElement, displayId, unitSuffix) {
  const displayElement = document.getElementById(displayId);
  if (sliderElement && displayElement) {
    displayElement.textContent = sliderElement.value + unitSuffix;
  }
}

// Set up event listeners for settings controls
function setupEventListeners() {
  const sliders = [
    { el: focusDurationSlider, display: 'focus-duration-display', unit: ' min' },
    { el: shortBreakDurationSlider, display: 'short-break-duration-display', unit: ' min' },
    { el: longBreakDurationSlider, display: 'long-break-duration-display', unit: ' min' },
    { el: sessionsBeforeLongBreakSlider, display: 'sessions-before-long-break-display', unit: ' sessions' }
  ];

  sliders.forEach(item => {
    if (item.el) {
      item.el.addEventListener('input', () => {
        updateSliderDisplay(item.el, item.display, item.unit);
        saveCurrentSettings();
      });
    }
  });

  if (enableSoundsToggle) {
    enableSoundsToggle.addEventListener('change', () => {
      const currentSettings = loadData('settings', SCHEMAS.settings);
      setupVolumeGrid(currentSettings.soundVolume, enableSoundsToggle.checked);
      saveCurrentSettings();
      if (settingsFeedback) settingsFeedback.textContent = `Sound effects ${enableSoundsToggle.checked ? 'enabled' : 'disabled'}.`;
    });
  }

  if (enableNotificationsToggle) {
    enableNotificationsToggle.addEventListener('change', async () => {
      if (enableNotificationsToggle.checked) {
        const granted = await requestNotificationPermission(); // Global function
        if (!granted) {
          enableNotificationsToggle.checked = false; // Revert if permission denied
          if (settingsFeedback) settingsFeedback.textContent = 'Desktop notification permission denied.';
           showToast('Notification permission denied. Please enable it in your browser settings.', 'error');
        } else {
          if (settingsFeedback) settingsFeedback.textContent = 'Desktop notifications enabled.';
        }
      } else {
        if (settingsFeedback) settingsFeedback.textContent = 'Desktop notifications disabled.';
      }
      saveCurrentSettings(); // Save regardless of permission outcome (to store user's choice)
    });
  }

  themePreviewElements.forEach(element => {
    element.addEventListener('click', () => {
      const theme = element.dataset.theme; // Use data-theme attribute
      window.setAndApplyTheme(theme); // Use global theme function
      setActiveThemePreview(theme);
      saveCurrentSettings(); // Save settings as theme is part of it
      if (settingsFeedback) settingsFeedback.textContent = `Theme set to ${theme.charAt(0).toUpperCase() + theme.slice(1)}.`;
      if (window.gsap && !prefersReducedMotion()) {
        gsap.fromTo(element, { scale: 1 }, { scale: 1.05, duration: 0.15, yoyo: true, repeat: 1, ease: "power2.out" });
      }
    });
  });

  if (resetSettingsBtn) { // Renamed to reset ALL data
    resetSettingsBtn.addEventListener('click', handleResetAllData);
  }

  if (exportDataBtn) {
      exportDataBtn.addEventListener('click', window.exportAllAppData); // Use global export
  }

  if (importDataBtn && importFileInput) {
      importDataBtn.addEventListener('click', () => importFileInput.click());
      importFileInput.addEventListener('change', handleImportData);
  }
}

function setActiveThemePreview(activeTheme) {
  themePreviewElements.forEach(el => {
    el.classList.remove('active', 'ring-4', 'ring-indigo-400'); // Assuming these classes for active state
    if (el.dataset.theme === activeTheme) {
      el.classList.add('active', 'ring-4', 'ring-indigo-400');
    }
  });
}

function setupVolumeGrid(selectedVolume, soundEnabled) {
  const volumeGrid = document.getElementById('volume-grid');
  if (!volumeGrid) return;

  volumeGrid.innerHTML = ''; // Clear previous buttons
  const volumeLevels = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

  volumeLevels.forEach(level => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'volume-btn px-2 py-1.5 rounded-md font-semibold text-sm transition-all duration-150 ease-in-out';
    btn.textContent = level === 0 ? 'Mute' : `${level}%`;
    btn.setAttribute('aria-label', `Set volume to ${level}%`);
    btn.dataset.value = level;

    if (level === selectedVolume && soundEnabled) {
      btn.classList.add('bg-indigo-600', 'text-white', 'ring-2', 'ring-indigo-400', 'shadow-lg');
    } else {
      btn.classList.add('bg-gray-700', 'hover:bg-gray-600', 'text-gray-300');
    }

    if (!soundEnabled) {
      btn.disabled = true;
      btn.classList.add('opacity-50', 'cursor-not-allowed');
    }

    btn.addEventListener('click', () => {
      if (soundEnabled) {
        saveVolumeSetting(level);
        // Optionally play a test sound at new volume
        if (window.playSound && level > 0) window.playSound('break'); // Play a short sound
      }
    });
    volumeGrid.appendChild(btn);
  });

  const volumeDisplay = document.getElementById('volume-display');
  if (volumeDisplay) {
      volumeDisplay.textContent = soundEnabled ? `${selectedVolume}%` : 'Muted';
  }
}

function saveVolumeSetting(value) {
  const settings = loadData('settings', SCHEMAS.settings);
  settings.soundVolume = value;
  settings.enableSounds = enableSoundsToggle ? enableSoundsToggle.checked : settings.enableSounds; // Ensure enableSounds is current
  saveData('settings', settings);

  if(window.setVolume) window.setVolume(value / 100); // Update audio.js gainNode

  setupVolumeGrid(value, settings.enableSounds); // Redraw grid
  if (settingsFeedback) settingsFeedback.textContent = `Volume set to ${value}%.`;
}


// Save all current UI settings to localStorage
function saveCurrentSettings() {
  const currentTheme = Array.from(themePreviewElements).find(el => el.classList.contains('active'))?.dataset.theme || window.DEFAULT_SETTINGS.theme;
  const settings = {
    focusDuration: focusDurationSlider ? parseInt(focusDurationSlider.value) : window.DEFAULT_SETTINGS.focusDuration,
    shortBreakDuration: shortBreakDurationSlider ? parseInt(shortBreakDurationSlider.value) : window.DEFAULT_SETTINGS.shortBreakDuration,
    longBreakDuration: longBreakDurationSlider ? parseInt(longBreakDurationSlider.value) : window.DEFAULT_SETTINGS.longBreakDuration,
    sessionsBeforeLongBreak: sessionsBeforeLongBreakSlider ? parseInt(sessionsBeforeLongBreakSlider.value) : window.DEFAULT_SETTINGS.sessionsBeforeLongBreak,
    enableNotifications: enableNotificationsToggle ? enableNotificationsToggle.checked : window.DEFAULT_SETTINGS.enableNotifications,
    enableSounds: enableSoundsToggle ? enableSoundsToggle.checked : window.DEFAULT_SETTINGS.enableSounds,
    soundVolume: parseInt(document.querySelector('#volume-grid button.bg-indigo-600')?.dataset.value || window.DEFAULT_SETTINGS.soundVolume),
    theme: currentTheme,
    // Keep these other settings if they are managed elsewhere or are advanced
    enableBackgroundSync: loadData('settings', SCHEMAS.settings).enableBackgroundSync,
    enablePushNotifications: loadData('settings', SCHEMAS.settings).enablePushNotifications
  };
  saveData('settings', settings);
  // Dispatch storage event so other parts of the app (like timer.js) can react
  window.dispatchEvent(new StorageEvent('storage', { key: `${APP_NAME}_settings`, newValue: JSON.stringify(settings) }));
}


// Handle Reset All Data
function handleResetAllData() {
  if (confirm('Are you sure you want to reset ALL application data (settings, sessions, tasks, streaks) to default? This cannot be undone.')) {
    resetAllAppData(); // From storage.js
    showToast('All application data has been reset to default. The page will now reload.', 'success');
    setTimeout(() => window.location.reload(), 2000);
  }
}

// Handle Import Data
function handleImportData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const success = importAllAppData(e.target.result); // From storage.js
    if (success) {
      showToast('Data imported successfully! The page will now reload to apply changes.', 'success');
      setTimeout(() => window.location.reload(), 2500);
    } else {
      showToast('Error importing data. Please check the file format and console for details.', 'error');
    }
    importFileInput.value = ''; // Reset file input
  };
  reader.onerror = function() {
      showToast('Error reading the import file.', 'error');
      importFileInput.value = '';
  };
  reader.readAsText(file);
}


// Show toast notification (simple version)
function showToast(message, type = 'success') {
  const toastId = 'toast-notification';
  let toast = document.getElementById(toastId);
  if (!toast) {
    toast = document.createElement('div');
    toast.id = toastId;
    toast.className = `fixed bottom-5 right-5 px-6 py-3 rounded-lg text-white shadow-xl z-50 transform translate-y-full opacity-0 transition-all duration-300 ease-out`;
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.remove('bg-green-600', 'bg-red-600', 'bg-blue-500', 'translate-y-full', 'opacity-0'); // Clear old states

  if (type === 'success') toast.classList.add('bg-green-600');
  else if (type === 'error') toast.classList.add('bg-red-600');
  else toast.classList.add('bg-blue-500'); // Default/info

  // Animate in
  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-full', 'opacity-0');
    toast.style.transform = 'translateY(0)';
    toast.style.opacity = '1';
  });

  // Clear previous timeout if any
  if (toast.currentTimeout) clearTimeout(toast.currentTimeout);

  // Animate out after some time
  toast.currentTimeout = setTimeout(() => {
    toast.style.transform = 'translateY(20px)';
    toast.style.opacity = '0';
    setTimeout(() => {
        if(toast.parentNode) toast.parentNode.removeChild(toast); // Clean up if still there
    }, 300); // after fade out
  }, 4000); // Display duration
}
window.showToast = showToast; // Expose if needed by other modules like import/export

// Push notification related functions (placeholder, VAPID key needed)
const PUBLIC_VAPID_KEY = 'YOUR_PUBLIC_VAPID_KEY_HERE'; // Replace with your actual key

function urlBase64ToUint8Array(base64String) {
    // ... (implementation from original settings.js) ...
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

function requestPushPermission() {
  if (PUBLIC_VAPID_KEY === 'YOUR_PUBLIC_VAPID_KEY_HERE') {
      showToast('Push notification VAPID key not configured.', 'error');
      return;
  }
  // ... (rest of the push permission logic from original settings.js) ...
  // Make sure to handle `enablePushNotificationsToggle.checked = false;` on error
}

// Initialize settings UI when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initSettings();
  if (!settingsFeedback && document.body) {
    const feedbackDiv = document.createElement('div');
    feedbackDiv.id = 'settings-feedback';
    feedbackDiv.setAttribute('aria-live', 'polite');
    feedbackDiv.className = 'sr-only'; // Visually hidden but announced
    document.body.appendChild(feedbackDiv);
  }
});

// Listen for direct theme changes from main.js (e.g., nav dropdown)
window.addEventListener('themeChanged', (event) => {
    if (window.location.pathname.includes('settings.html')) {
        setActiveThemePreview(event.detail.theme);
    }
});
