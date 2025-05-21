/**
 * Storage functionality for the Pomodoro app
 * Handles localStorage operations and data schema
 */

// Data schemas
const SCHEMAS = {
  settings: window.DEFAULT_SETTINGS, // Use global DEFAULT_SETTINGS
  sessions: [], // Array of session objects
  streak: {
    currentStreak: 0,
    bestStreak: 0,
    lastActiveDay: null
  },
  tasks: [], // Added schema for tasks
  sequences: [] // Added schema for custom sequences
};
window.SCHEMAS = SCHEMAS; // Make accessible

// Save data to localStorage
function saveData(key, data) {
  try {
    localStorage.setItem(`${window.APP_NAME}_${key}`, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error(`Error saving ${key} data:`, error);
    // Potentially alert user if critical storage fails (e.g. quota exceeded)
    return false;
  }
}
window.saveData = saveData; // Make accessible

// Load data from localStorage
function loadData(key, defaultValue = null) {
  try {
    const data = localStorage.getItem(`${window.APP_NAME}_${key}`);
    if (data) {
        const parsedData = JSON.parse(data);
        // Basic schema validation/migration placeholder
        if (key === 'settings' && SCHEMAS.settings) {
            return { ...SCHEMAS.settings, ...parsedData }; // Merge with defaults to ensure all keys exist
        }
        return parsedData;
    }
    return defaultValue !== null ? defaultValue : (SCHEMAS[key] || null);
  } catch (error) {
    console.error(`Error loading ${key} data:`, error);
    return defaultValue !== null ? defaultValue : (SCHEMAS[key] || null);
  }
}
window.loadData = loadData; // Make accessible

// Clear specific data
function clearData(key) {
  try {
    localStorage.removeItem(`${window.APP_NAME}_${key}`);
    return true;
  } catch (error) {
    console.error(`Error clearing ${key} data:`, error);
    return false;
  }
}
// window.clearData = clearData; // Expose if needed elsewhere

// Reset all app data to schema defaults
function resetAllAppData() {
  try {
    Object.keys(SCHEMAS).forEach(key => {
      // For settings, ensure we use a fresh copy of DEFAULT_SETTINGS
      if (key === 'settings') {
        saveData(key, { ...window.DEFAULT_SETTINGS });
      } else {
        saveData(key, SCHEMAS[key]);
      }
    });
    // Reload or notify user to reload for changes to take full effect
    // alert('All app data has been reset. The page will now reload.');
    // window.location.reload();
    return true;
  } catch (error) {
    console.error('Error resetting all data:', error);
    return false;
  }
}
window.resetAllAppData = resetAllAppData; // Expose for settings page

// Export all application data
function exportAllAppData() {
  const exportData = {};
  Object.keys(SCHEMAS).forEach(key => {
    exportData[key] = loadData(key);
  });
  exportData.exportDate = new Date().toISOString();
  exportData.appName = window.APP_NAME; // Add app name for context
  exportData.appVersion = "1.0.0"; // Example version

  const dataStr = JSON.stringify(exportData, null, 2);
  const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
  const exportFileName = `${window.APP_NAME}_backup_${new Date().toISOString().slice(0, 10)}.json`;

  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileName);
  linkElement.click();
}
window.exportAllAppData = exportAllAppData; // Expose for settings page

// Import application data from JSON
function importAllAppData(jsonData) {
  try {
    const data = JSON.parse(jsonData);

    if (!data.appName || data.appName !== window.APP_NAME) {
        throw new Error('File does not appear to be a valid backup for this application.');
    }

    let settingsImported = false;
    Object.keys(SCHEMAS).forEach(key => {
      if (data.hasOwnProperty(key)) {
        // Validate against schema structure before saving (simple check)
        if (typeof data[key] === typeof SCHEMAS[key] || SCHEMAS[key] === null) {
            if (key === 'settings') {
                // Merge imported settings with defaults to catch missing new settings
                const mergedSettings = { ...SCHEMAS.settings, ...data[key] };
                saveData(key, mergedSettings);
                settingsImported = true;
            } else {
                saveData(key, data[key]);
            }
        } else {
            console.warn(`Skipping import for key '${key}': type mismatch or unknown structure.`);
        }
      }
    });

    if (settingsImported && data.settings && data.settings.theme) {
        // Apply the imported theme immediately
        if (window.setAndApplyTheme) window.setAndApplyTheme(data.settings.theme);
    }
    return true;
  } catch (error) {
    console.error('Error importing application data:', error);
    alert(`Error importing data: ${error.message}`); // User-friendly error
    return false;
  }
}
window.importAllAppData = importAllAppData; // Expose for settings page


// Get sessions for a specific date range
function getSessionsByDateRange(startDate, endDate) {
  const sessions = loadData('sessions', []);
  return sessions.filter(session => {
    const sessionDate = new Date(session.timestamp);
    return sessionDate >= startDate && sessionDate <= endDate;
  });
}

// Get sessions for today
function getTodaySessions() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  return getSessionsByDateRange(todayStart, todayEnd);
}

// Get sessions for this week (assuming week starts on Sunday)
function getWeekSessions() {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 (Sun) - 6 (Sat)
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - dayOfWeek);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6); // End of Saturday
  endOfWeek.setHours(23, 59, 59, 999);

  return getSessionsByDateRange(startOfWeek, endOfWeek);
}

// Get sessions for this month
function getMonthSessions() {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0, 0);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999); // Day 0 of next month is last day of current
  return getSessionsByDateRange(startOfMonth, endOfMonth);
}

// Initialize storage: Ensure all keys have default values if they don't exist
function initStorage() {
  Object.keys(SCHEMAS).forEach(key => {
    if (localStorage.getItem(`${window.APP_NAME}_${key}`) === null) {
      // For settings, ensure we use a fresh copy of DEFAULT_SETTINGS
      if (key === 'settings') {
        saveData(key, { ...window.DEFAULT_SETTINGS });
      } else {
        saveData(key, SCHEMAS[key]);
      }
    }
  });
  // Load initial settings to apply them (e.g. theme)
  const initialSettings = loadData('settings');
  if (initialSettings && window.setAndApplyTheme) {
    window.setAndApplyTheme(initialSettings.theme);
  }
}

// Initialize storage when DOM is loaded or script is run
initStorage();
