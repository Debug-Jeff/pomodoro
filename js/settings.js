/**
 * Settings functionality for the Pomodoro app
 * Handles user preferences and configuration
 */

// Default settings
const DEFAULT_SETTINGS = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  sessionsBeforeLongBreak: 4,
  enableNotifications: true,
  enableSounds: true,
  soundVolume: 80,
  theme: 'dark',
  enableBackgroundSync: true,
  enablePushNotifications: false
};

// DOM elements
const focusDurationSlider = document.getElementById('focus-duration');
const shortBreakDurationSlider = document.getElementById('short-break-duration');
const longBreakDurationSlider = document.getElementById('long-break-duration');
const sessionsBeforeLongBreakSlider = document.getElementById('sessions-before-long-break');
const enableNotificationsToggle = document.getElementById('enable-notifications');
const enableSoundsToggle = document.getElementById('enable-sounds');
const volumeControlSlider = document.getElementById('volume-control');
const enableBackgroundSyncToggle = document.getElementById('enable-background-sync');
const enablePushNotificationsToggle = document.getElementById('enable-push-notifications');
const themePreviewElements = document.querySelectorAll('.theme-preview');
const exportSettingsBtn = document.getElementById('export-settings');
const importSettingsBtn = document.getElementById('import-settings');
const resetSettingsBtn = document.getElementById('reset-settings');
const importFileInput = document.getElementById('import-file');

// Initialize settings
function initSettings() {
  // Load settings from localStorage
  const settings = getSettings();
  
  // Apply settings to UI elements
  if (focusDurationSlider) {
    focusDurationSlider.value = settings.focusDuration;
    updateSliderProgress(focusDurationSlider, 'focus-duration-progress', 'focus-duration-display', 'min');
  }
  
  if (shortBreakDurationSlider) {
    shortBreakDurationSlider.value = settings.shortBreakDuration;
    updateSliderProgress(shortBreakDurationSlider, 'short-break-duration-progress', 'short-break-duration-display', 'min');
  }
  
  if (longBreakDurationSlider) {
    longBreakDurationSlider.value = settings.longBreakDuration;
    updateSliderProgress(longBreakDurationSlider, 'long-break-duration-progress', 'long-break-duration-display', 'min');
  }
  
  if (sessionsBeforeLongBreakSlider) {
    sessionsBeforeLongBreakSlider.value = settings.sessionsBeforeLongBreak;
    updateSliderProgress(sessionsBeforeLongBreakSlider, 'sessions-before-long-break-progress', 'sessions-before-long-break-display', 'sessions');
  }
  
  if (enableNotificationsToggle) {
    enableNotificationsToggle.checked = settings.enableNotifications;
  }
  
  if (enableSoundsToggle) {
    enableSoundsToggle.checked = settings.enableSounds;
  }
  
  if (volumeControlSlider) {
    volumeControlSlider.value = settings.soundVolume;
    updateSliderProgress(volumeControlSlider, 'volume-control-progress', 'volume-display', '%');
  }
  
  if (enableBackgroundSyncToggle) {
    enableBackgroundSyncToggle.checked = settings.enableBackgroundSync;
  }
  
  if (enablePushNotificationsToggle) {
    enablePushNotificationsToggle.checked = settings.enablePushNotifications;
  }
  
  // Apply theme
  applyTheme(settings.theme);
  
  // Set up event listeners
  setupEventListeners();
}

// Set up event listeners for settings controls
function setupEventListeners() {
  // Timer duration sliders
  if (focusDurationSlider) {
    focusDurationSlider.addEventListener('input', () => {
      updateSliderProgress(focusDurationSlider, 'focus-duration-progress', 'focus-duration-display', 'min');
      saveSettings();
    });
  }
  
  if (shortBreakDurationSlider) {
    shortBreakDurationSlider.addEventListener('input', () => {
      updateSliderProgress(shortBreakDurationSlider, 'short-break-duration-progress', 'short-break-duration-display', 'min');
      saveSettings();
    });
  }
  
  if (longBreakDurationSlider) {
    longBreakDurationSlider.addEventListener('input', () => {
      updateSliderProgress(longBreakDurationSlider, 'long-break-duration-progress', 'long-break-duration-display', 'min');
      saveSettings();
    });
  }
  
  if (sessionsBeforeLongBreakSlider) {
    sessionsBeforeLongBreakSlider.addEventListener('input', () => {
      updateSliderProgress(sessionsBeforeLongBreakSlider, 'sessions-before-long-break-progress', 'sessions-before-long-break-display', 'sessions');
      saveSettings();
    });
  }
  
  // Notification and sound toggles
  if (enableNotificationsToggle) {
    enableNotificationsToggle.addEventListener('change', () => {
      if (enableNotificationsToggle.checked) {
        requestNotificationPermission();
      }
      saveSettings();
    });
  }
  
  if (enableSoundsToggle) {
    enableSoundsToggle.addEventListener('change', saveSettings);
  }
  
  if (volumeControlSlider) {
    volumeControlSlider.addEventListener('input', () => {
      updateSliderProgress(volumeControlSlider, 'volume-control-progress', 'volume-display', '%');
      saveSettings();
    });
  }
  
  if (enableBackgroundSyncToggle) {
    enableBackgroundSyncToggle.addEventListener('change', saveSettings);
  }
  
  if (enablePushNotificationsToggle) {
    enablePushNotificationsToggle.addEventListener('change', () => {
      if (enablePushNotificationsToggle.checked) {
        requestPushPermission();
      }
      saveSettings();
    });
  }
  
  // Theme selection
  themePreviewElements.forEach(element => {
    element.addEventListener('click', () => {
      const theme = element.id.replace('theme-', '');
      applyTheme(theme);
      saveSettings();
      
      // Update active state
      themePreviewElements.forEach(el => el.classList.remove('active'));
      element.classList.add('active');
      
      // Animate selection
      if (window.gsap) {
        gsap.fromTo(element,
          { scale: 1 },
          { 
            scale: 1.05, 
            duration: 0.2,
            yoyo: true,
            repeat: 1,
            ease: "power2.inOut"
          }
        );
      }
    });
  });
  
  // Data management buttons
  if (exportSettingsBtn) {
    exportSettingsBtn.addEventListener('click', exportSettings);
  }
  
  if (importSettingsBtn) {
    importSettingsBtn.addEventListener('click', () => {
      if (importFileInput) {
        importFileInput.click();
      }
    });
  }
  
  if (importFileInput) {
    importFileInput.addEventListener('change', importSettings);
  }
  
  if (resetSettingsBtn) {
    resetSettingsBtn.addEventListener('click', resetSettings);
  }
}

// Update slider progress
function updateSliderProgress(slider, progressId, displayId, unit) {
  const progressElement = document.getElementById(progressId);
  const displayElement = document.getElementById(displayId);
  
  if (!progressElement || !displayElement) return;
  
  const value = slider.value;
  const min = slider.min;
  const max = slider.max;
  const percentage = ((value - min) / (max - min)) * 100;
  
  progressElement.style.width = `${percentage}%`;
  displayElement.textContent = `${value} ${unit}`;
}

// Apply theme
function applyTheme(theme) {
  // Remove all theme classes
  document.body.classList.remove('theme-dark', 'theme-dim', 'theme-purple', 'theme-ocean', 'theme-sunset');
  
  // Apply selected theme
  if (theme === 'auto') {
    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.body.classList.add('theme-dark');
    } else {
      document.body.classList.add('theme-dim');
    }
  } else {
    document.body.classList.add(`theme-${theme}`);
  }
  
  // Update active state in theme previews
  themePreviewElements.forEach(element => {
    element.classList.remove('active');
    if (element.id === `theme-${theme}`) {
      element.classList.add('active');
    }
  });
}

// Save settings to localStorage
function saveSettings() {
  const settings = {
    focusDuration: focusDurationSlider ? parseInt(focusDurationSlider.value) : DEFAULT_SETTINGS.focusDuration,
    shortBreakDuration: shortBreakDurationSlider ? parseInt(shortBreakDurationSlider.value) : DEFAULT_SETTINGS.shortBreakDuration,
    longBreakDuration: longBreakDurationSlider ? parseInt(longBreakDurationSlider.value) : DEFAULT_SETTINGS.longBreakDuration,
    sessionsBeforeLongBreak: sessionsBeforeLongBreakSlider ? parseInt(sessionsBeforeLongBreakSlider.value) : DEFAULT_SETTINGS.sessionsBeforeLongBreak,
    enableNotifications: enableNotificationsToggle ? enableNotificationsToggle.checked : DEFAULT_SETTINGS.enableNotifications,
    enableSounds: enableSoundsToggle ? enableSoundsToggle.checked : DEFAULT_SETTINGS.enableSounds,
    soundVolume: volumeControlSlider ? parseInt(volumeControlSlider.value) : DEFAULT_SETTINGS.soundVolume,
    theme: getActiveTheme(),
    enableBackgroundSync: enableBackgroundSyncToggle ? enableBackgroundSyncToggle.checked : DEFAULT_SETTINGS.enableBackgroundSync,
    enablePushNotifications: enablePushNotificationsToggle ? enablePushNotificationsToggle.checked : DEFAULT_SETTINGS.enablePushNotifications
  };
  
  localStorage.setItem(`${APP_NAME}_settings`, JSON.stringify(settings));
}

// Get active theme
function getActiveTheme() {
  const activeThemeElement = document.querySelector('.theme-preview.active');
  if (activeThemeElement) {
    return activeThemeElement.id.replace('theme-', '');
  }
  return DEFAULT_SETTINGS.theme;
}

// Export settings
function exportSettings() {
  const settings = getSettings();
  const dataStr = JSON.stringify(settings, null, 2);
  const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
  
  const exportFileDefaultName = `pomodoro_settings_${new Date().toISOString().slice(0, 10)}.json`;
  
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
  
  // Show success message
  showToast('Settings exported successfully!');
}

// Import settings
function importSettings(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const settings = JSON.parse(e.target.result);
      
      // Validate settings
      const validSettings = {
        focusDuration: settings.focusDuration || DEFAULT_SETTINGS.focusDuration,
        shortBreakDuration: settings.shortBreakDuration || DEFAULT_SETTINGS.shortBreakDuration,
        longBreakDuration: settings.longBreakDuration || DEFAULT_SETTINGS.longBreakDuration,
        sessionsBeforeLongBreak: settings.sessionsBeforeLongBreak || DEFAULT_SETTINGS.sessionsBeforeLongBreak,
        enableNotifications: settings.enableNotifications !== undefined ? settings.enableNotifications : DEFAULT_SETTINGS.enableNotifications,
        enableSounds: settings.enableSounds !== undefined ? settings.enableSounds : DEFAULT_SETTINGS.enableSounds,
        soundVolume: settings.soundVolume || DEFAULT_SETTINGS.soundVolume,
        theme: settings.theme || DEFAULT_SETTINGS.theme,
        enableBackgroundSync: settings.enableBackgroundSync !== undefined ? settings.enableBackgroundSync : DEFAULT_SETTINGS.enableBackgroundSync,
        enablePushNotifications: settings.enablePushNotifications !== undefined ? settings.enablePushNotifications : DEFAULT_SETTINGS.enablePushNotifications
      };
      
      // Save settings
      localStorage.setItem(`${APP_NAME}_settings`, JSON.stringify(validSettings));
      
      // Reload page to apply settings
      window.location.reload();
    } catch (error) {
      console.error('Error importing settings:', error);
      showToast('Error importing settings. Please check the file format.', 'error');
    }
  };
  
  reader.readAsText(file);
}

// Reset settings
function resetSettings() {
  if (confirm('Are you sure you want to reset all settings to default?')) {
    localStorage.setItem(`${APP_NAME}_settings`, JSON.stringify(DEFAULT_SETTINGS));
    
    // Reload page to apply settings
    window.location.reload();
  }
}

// Show toast notification
function showToast(message, type = 'success') {
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `fixed bottom-4 right-4 px-4 py-2 rounded-lg text-white ${type === 'success' ? 'bg-green-600' : 'bg-red-600'} shadow-lg z-50 transform translate-y-20 opacity-0 transition-all duration-300`;
  toast.textContent = message;
  
  // Add to document
  document.body.appendChild(toast);
  
  // Animate in
  setTimeout(() => {
    toast.classList.remove('translate-y-20', 'opacity-0');
  }, 10);
  
  // Animate out after 3 seconds
  setTimeout(() => {
    toast.classList.add('translate-y-20', 'opacity-0');
    
    // Remove from DOM after animation
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 3000);
}

// Request notification permission
function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return;
  }
  
  if (Notification.permission !== 'granted') {
    Notification.requestPermission().then(permission => {
      if (permission !== 'granted') {
        console.log('Notification permission denied');
      }
    });
  }
}

// Request push notification permission
function requestPushPermission() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Push notifications not supported');
    return;
  }
  
  navigator.serviceWorker.ready.then(registration => {
    registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
    }).then(subscription => {
      // Send subscription to server
      console.log('Push subscription successful:', subscription);
    }).catch(error => {
      console.error('Push subscription failed:', error);
      enablePushNotificationsToggle.checked = false;
      saveSettings();
    });
  });
}

// Convert base64 string to Uint8Array for VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Initialize settings when DOM is loaded
document.addEventListener('DOMContentLoaded', initSettings);