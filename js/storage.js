/**
 * Storage functionality for the Pomodoro app
 * Handles localStorage operations and data schema
 */

// Data schemas
const SCHEMAS = {
  settings: {
    focusDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    sessionsBeforeLongBreak: 4,
    enableNotifications: true,
    enableSounds: true,
    volume: 80,
    theme: 'dark' // 'dark', 'dim', or 'auto'
  },
  sessions: [], // Array of session objects
  streak: {
    currentStreak: 0,
    bestStreak: 0,
    lastActiveDay: null
  }
};

// Save data to localStorage
function saveData(key, data) {
  try {
    localStorage.setItem(`${APP_NAME}_${key}`, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error(`Error saving ${key} data:`, error);
    return false;
  }
}

// Load data from localStorage
function loadData(key, defaultValue = null) {
  try {
    const data = localStorage.getItem(`${APP_NAME}_${key}`);
    return data ? JSON.parse(data) : (defaultValue || SCHEMAS[key] || null);
  } catch (error) {
    console.error(`Error loading ${key} data:`, error);
    return defaultValue || SCHEMAS[key] || null;
  }
}

// Clear specific data
function clearData(key) {
  try {
    localStorage.removeItem(`${APP_NAME}_${key}`);
    return true;
  } catch (error) {
    console.error(`Error clearing ${key} data:`, error);
    return false;
  }
}

// Reset all app data
function resetAllData() {
  try {
    Object.keys(SCHEMAS).forEach(key => {
      saveData(key, SCHEMAS[key]);
    });
    return true;
  } catch (error) {
    console.error('Error resetting all data:', error);
    return false;
  }
}

// Export settings as JSON
function exportSettings() {
  const settings = loadData('settings');
  const sessions = loadData('sessions');
  const streak = loadData('streak');
  
  const exportData = {
    settings,
    sessions,
    streak,
    exportDate: new Date().toISOString()
  };
  
  const dataStr = JSON.stringify(exportData, null, 2);
  const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
  
  const exportFileName = `pomodoro_settings_${new Date().toISOString().slice(0, 10)}.json`;
  
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileName);
  linkElement.click();
}

// Import settings from JSON
function importSettings(jsonData) {
  try {
    const data = JSON.parse(jsonData);
    
    // Validate data structure
    if (!data.settings) {
      throw new Error('Invalid settings data');
    }
    
    // Import settings
    saveData('settings', data.settings);
    
    // Import sessions if available
    if (data.sessions) {
      saveData('sessions', data.sessions);
    }
    
    // Import streak if available
    if (data.streak) {
      saveData('streak', data.streak);
    }
    
    return true;
  } catch (error) {
    console.error('Error importing settings:', error);
    return false;
  }
}

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
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return getSessionsByDateRange(today, tomorrow);
}

// Get sessions for this week
function getWeekSessions() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - dayOfWeek);
  startOfWeek.setHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);
  
  return getSessionsByDateRange(startOfWeek, endOfWeek);
}

// Get sessions for this month
function getMonthSessions() {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  return getSessionsByDateRange(startOfMonth, endOfMonth);
}

// Initialize storage
function initStorage() {
  // Check if settings exist, if not create defaults
  if (!localStorage.getItem(`${APP_NAME}_settings`)) {
    saveData('settings', SCHEMAS.settings);
  }
  
  // Check if sessions exist, if not create empty array
  if (!localStorage.getItem(`${APP_NAME}_sessions`)) {
    saveData('sessions', SCHEMAS.sessions);
  }
  
  // Check if streak data exists, if not create defaults
  if (!localStorage.getItem(`${APP_NAME}_streak`)) {
    saveData('streak', SCHEMAS.streak);
  }
}

// Initialize storage when DOM is loaded
document.addEventListener('DOMContentLoaded', initStorage);