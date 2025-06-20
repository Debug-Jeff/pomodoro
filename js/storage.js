/**
 * Storage functionality for the Pomodoro app
 * Handles localStorage operations and data schema
 */

const SCHEMAS = {
  settings: window.DEFAULT_SETTINGS,
  sessions: [],
  streak: { currentStreak: 0, bestStreak: 0, lastActiveDay: null },
  tasks: [],
  sequences: [],
  active_sequence_id: null,
  popOutTimerOpen: false,
  popOutTimerState: { x: null, y: null }
};
window.SCHEMAS = SCHEMAS;

function saveData(key, data) {
  try {
    localStorage.setItem(`${window.APP_NAME}_${key}`, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('appStorageChange', {
      detail: { key: key, newValue: data }
    }));
    return true;
  } catch (error) {
    console.error(`Error saving ${key} data:`, error);
    if (error.name === 'QuotaExceededError') {
      alert('Storage quota exceeded. Please clear some browser data or export your settings and reset the app.');
    }
    return false;
  }
}
window.saveData = saveData;

function loadData(key, defaultValue = undefined) {
  try {
    const data = localStorage.getItem(`${window.APP_NAME}_${key}`);
    if (data !== null) {
      const parsedData = JSON.parse(data);
      if (SCHEMAS[key] && typeof SCHEMAS[key] === 'object' && !Array.isArray(SCHEMAS[key])) {
        return { ...SCHEMAS[key], ...parsedData };
      }
      return parsedData;
    }
    return defaultValue !== undefined ? defaultValue : (SCHEMAS[key] !== undefined ? SCHEMAS[key] : null);
  } catch (error) {
    console.error(`Error loading ${key} data:`, error);
    return defaultValue !== undefined ? defaultValue : (SCHEMAS[key] !== undefined ? SCHEMAS[key] : null);
  }
}
window.loadData = loadData;

function clearData(key) {
  try {
    localStorage.removeItem(`${window.APP_NAME}_${key}`);
    window.dispatchEvent(new CustomEvent('appStorageChange', {
      detail: { key: key, newValue: SCHEMAS[key] }
    }));
    return true;
  } catch (error) {
    console.error(`Error clearing ${key} data:`, error);
    return false;
  }
}
window.clearData = clearData;

function resetAllAppData() {
  try {
    if (confirm("Are you sure you want to reset ALL application data? This action cannot be undone.")) {
      Object.keys(SCHEMAS).forEach(key => {
        if (key === 'settings') {
          saveData(key, { ...window.DEFAULT_SETTINGS });
        } else if (SCHEMAS[key] !== undefined) {
          const schemaDefault = SCHEMAS[key];
          const defaultValue = Array.isArray(schemaDefault) ? [...schemaDefault] : (typeof schemaDefault === 'object' && schemaDefault !== null ? { ...schemaDefault } : schemaDefault);
          saveData(key, defaultValue);
        }
      });
      alert('All app data has been reset. The page will now reload.');
      window.location.reload();
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error resetting all data:', error);
    alert('An error occurred while resetting data. Please check the console.');
    return false;
  }
}
window.resetAllAppData = resetAllAppData;

function exportAllAppData() {
  const exportData = {};
  Object.keys(SCHEMAS).forEach(key => {
    exportData[key] = loadData(key);
  });
  exportData.appContext = {
    appName: window.APP_NAME,
    exportDate: new Date().toISOString(),
    version: "1.1.0"
  };

  const dataStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', url);
  linkElement.setAttribute('download', `${window.APP_NAME}_backup_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.json`);
  document.body.appendChild(linkElement);
  linkElement.click();
  document.body.removeChild(linkElement);
  URL.revokeObjectURL(url);
  if (window.showToast) window.showToast("Data exported successfully!", "success");
}
window.exportAllAppData = exportAllAppData;

function importAllAppData(jsonData) {
  try {
    const data = JSON.parse(jsonData);

    if (!data.appContext || data.appContext.appName !== window.APP_NAME) {
      throw new Error('File does not appear to be a valid backup for this application.');
    }

    let settingsImported = false;
    let importedTheme = null;

    Object.keys(SCHEMAS).forEach(key => {
      if (data.hasOwnProperty(key)) {
        const schemaType = SCHEMAS[key] !== null ? typeof SCHEMAS[key] : null;
        const dataType = data[key] !== null ? typeof data[key] : null;

        if (schemaType === null || dataType === null || schemaType === dataType || (Array.isArray(SCHEMAS[key]) && Array.isArray(data[key]))) {
          let valueToSave = data[key];
          if (key === 'settings') {
            valueToSave = { ...window.DEFAULT_SETTINGS, ...data[key] };
            settingsImported = true;
            if (valueToSave.theme) importedTheme = valueToSave.theme;
          }
          saveData(key, valueToSave);
        } else {
          console.warn(`Skipping import for key '${key}': type mismatch. Schema: ${schemaType}, Data: ${dataType}`);
        }
      }
    });

    if (settingsImported && importedTheme && window.setAndApplyTheme) {
      window.setAndApplyTheme(importedTheme);
    }
    if (window.showToast) window.showToast("Data imported successfully! Reloading...", "success");
    setTimeout(() => window.location.reload(), 1500);
    return true;
  } catch (error) {
    console.error('Error importing application data:', error);
    if (window.showToast) window.showToast(`Import Error: ${error.message}`, "error");
    return false;
  }
}
window.importAllAppData = importAllAppData;

// Date utility functions for session filtering
function getSessionsByDateRange(startDate, endDate) {
  const sessions = loadData('sessions', []);
  return sessions.filter(session => {
    const sessionDate = new Date(session.timestamp);
    return sessionDate >= startDate && sessionDate <= endDate;
  });
}
window.getSessionsByDateRange = getSessionsByDateRange;

function getTodaySessions() {
  const todayStart = new Date(); 
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(); 
  todayEnd.setHours(23, 59, 59, 999);
  return getSessionsByDateRange(todayStart, todayEnd);
}
window.getTodaySessions = getTodaySessions;

function getWeekSessions() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - dayOfWeek);
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  return getSessionsByDateRange(startOfWeek, endOfWeek);
}
window.getWeekSessions = getWeekSessions;

function getMonthSessions() {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0, 0);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
  return getSessionsByDateRange(startOfMonth, endOfMonth);
}
window.getMonthSessions = getMonthSessions;

function initStorage() {
  Object.keys(SCHEMAS).forEach(key => {
    const existingData = localStorage.getItem(`${window.APP_NAME}_${key}`);
    if (existingData === null) {
      if (key === 'settings') {
        saveData(key, { ...window.DEFAULT_SETTINGS });
      } else if (SCHEMAS[key] !== undefined) {
        const schemaDefault = SCHEMAS[key];
        const defaultValue = Array.isArray(schemaDefault) ? [...schemaDefault] : (typeof schemaDefault === 'object' && schemaDefault !== null ? { ...schemaDefault } : schemaDefault);
        saveData(key, defaultValue);
      }
    } else {
      if (key === 'settings') {
        try {
          const parsedSettings = JSON.parse(existingData);
          saveData(key, { ...window.DEFAULT_SETTINGS, ...parsedSettings });
        } catch (e) {
          console.error("Error parsing existing settings, resetting to default:", e);
          saveData(key, { ...window.DEFAULT_SETTINGS });
        }
      }
    }
  });
  
  const initialSettings = loadData('settings');
  if (initialSettings && window.setAndApplyTheme) {
    window.setAndApplyTheme(initialSettings.theme);
  }
}

initStorage();