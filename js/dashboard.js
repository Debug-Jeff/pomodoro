s/**
 * Dashboard functionality for the Pomodoro app
 * Handles statistics and data visualization
 */

// DOM elements
const todayCountElement = document.getElementById('today-count');
const todayMinutesElement = document.getElementById('today-minutes');
const weekCountElement = document.getElementById('week-count');
const dailyAverageElement = document.getElementById('daily-average');
const streakCountElement = document.getElementById('streak-count');
const bestStreakElement = document.getElementById('best-streak');
const weeklyChartCanvas = document.getElementById('weekly-chart');
const sessionsTableElement = document.getElementById('sessions-table');

// Chart instance
let weeklyChart = null;

// Initialize dashboard
function initDashboard() {
  loadTodayStats();
  loadWeekStats();
  loadStreakData();
  createWeeklyChart();
  loadRecentSessions();
}

// Load today's statistics
function loadTodayStats() {
  const todaySessions = getTodaySessions().filter(session => session.mode === 'focus' && session.completed);
  
  const totalCount = todaySessions.length;
  const totalMinutes = todaySessions.reduce((total, session) => total + session.duration, 0);
  
  if (todayCountElement) {
    todayCountElement.textContent = totalCount;
  }
  
  if (todayMinutesElement) {
    todayMinutesElement.textContent = Math.round(totalMinutes);
  }
}

// Load this week's statistics
function loadWeekStats() {
  const weekSessions = getWeekSessions().filter(session => session.mode === 'focus' && session.completed);
  
  const totalCount = weekSessions.length;
  
  // Group by day to calculate daily average
  const sessionsByDay = {};
  weekSessions.forEach(session => {
    const day = new Date(session.timestamp).toLocaleDateString();
    if (!sessionsByDay[day]) {
      sessionsByDay[day] = 0;
    }
    sessionsByDay[day]++;
  });
  
  const daysWithSessions = Object.keys(sessionsByDay).length;
  const dailyAverage = daysWithSessions > 0 ? (totalCount / daysWithSessions).toFixed(1) : '0';
  
  if (weekCountElement) {
    weekCountElement.textContent = totalCount;
  }
  
  if (dailyAverageElement) {
    dailyAverageElement.textContent = dailyAverage;
  }
}

// Load streak data
function loadStreakData() {
  const streakData = loadData('streak', SCHEMAS.streak);
  
  if (streakCountElement) {
    streakCountElement.textContent = streakData.currentStreak;
  }
  
  if (bestStreakElement) {
    bestStreakElement.textContent = streakData.bestStreak;
  }
}

// Create weekly chart
function createWeeklyChart() {
  if (!weeklyChartCanvas || !window.Chart) {
    return;
  }
  
  // Get data for the last 7 days
  const today = new Date();
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - i));
    return date;
  });
  
  // Format dates for display
  const labels = last7Days.map(date => {
    return date.toLocaleDateString(undefined, { weekday: 'short' });
  });
  
  // Count sessions for each day
  const data = last7Days.map(date => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const sessions = getSessionsByDateRange(startOfDay, endOfDay)
      .filter(session => session.mode === 'focus' && session.completed);
    
    return sessions.length;
  });
  
  // Create chart
  weeklyChart = new Chart(weeklyChartCanvas, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Completed Sessions',
        data: data,
        backgroundColor: 'rgba(99, 102, 241, 0.7)',
        borderColor: 'rgba(99, 102, 241, 1)',
        borderWidth: 1,
        borderRadius: 4,
        barThickness: 16
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0,
            color: 'rgba(255, 255, 255, 0.7)'
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        },
        x: {
          ticks: {
            color: 'rgba(255, 255, 255, 0.7)'
          },
          grid: {
            display: false
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(17, 25, 40, 0.9)',
          titleColor: 'rgba(255, 255, 255, 0.9)',
          bodyColor: 'rgba(255, 255, 255, 0.9)',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          padding: 10,
          cornerRadius: 4,
          displayColors: false
        }
      }
    }
  });
}

// Load recent sessions
function loadRecentSessions() {
  if (!sessionsTableElement) {
    return;
  }
  
  // Get all sessions
  const allSessions = loadData('sessions', []);
  
  // Sort by timestamp (newest first)
  const sortedSessions = allSessions
    .filter(session => session.completed)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 10); // Get only the 10 most recent
  
  // Clear table
  sessionsTableElement.innerHTML = '';
  
  // Add sessions to table
  if (sortedSessions.length === 0) {
    const emptyRow = document.createElement('tr');
    emptyRow.className = 'text-gray-300 border-b border-gray-800';
    emptyRow.innerHTML = `
      <td class="py-3" colspan="4">No sessions recorded yet.</td>
    `;
    sessionsTableElement.appendChild(emptyRow);
  } else {
    sortedSessions.forEach(session => {
      const row = document.createElement('tr');
      row.className = 'text-gray-300 border-b border-gray-800';
      
      const date = new Date(session.timestamp);
      const formattedDate = formatDate(date);
      const formattedTime = formatTimeOfDay(date);
      
      const modeLabel = {
        'focus': 'Focus',
        'shortBreak': 'Short Break',
        'longBreak': 'Long Break'
      }[session.mode] || session.mode;
      
      row.innerHTML = `
        <td class="py-3">${formattedDate}</td>
        <td class="py-3">${formattedTime}</td>
        <td class="py-3">${modeLabel}</td>
        <td class="py-3">${session.duration} min</td>
      `;
      
      sessionsTableElement.appendChild(row);
    });
  }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', initDashboard);