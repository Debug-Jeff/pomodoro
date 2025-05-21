/**
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
const taskChartCanvas = document.getElementById('task-chart'); // New for task chart

// Productivity Score Elements
const productivityScoreElement = document.getElementById('productivity-score');
const gaugeFillElement = document.getElementById('gauge-fill');
const focusTimeBarElement = document.getElementById('focus-time-bar');
const taskCompletionBarElement = document.getElementById('task-completion-bar');
const consistencyBarElement = document.getElementById('consistency-bar');
const goalAchievementBarElement = document.getElementById('goal-achievement-bar'); // Assuming future goals

// Chart instances
let weeklyChartInstance = null;
let taskChartInstance = null;

// Initialize dashboard
function initDashboard() {
  loadTodayStats();
  loadWeekStats();
  loadStreakData();
  createWeeklyChart();
  loadRecentSessions();
  createTaskCompletionChart(); // New
  loadProductivityScore();     // New
}

// Load today's statistics
function loadTodayStats() {
  const todaySessions = getTodaySessions().filter(session => session.mode === 'focus' && session.completed);
  const totalCount = todaySessions.length;
  const totalMinutes = todaySessions.reduce((total, session) => total + session.duration, 0);

  if (todayCountElement) todayCountElement.textContent = totalCount;
  if (todayMinutesElement) todayMinutesElement.textContent = Math.round(totalMinutes);
}

// Load this week's statistics
function loadWeekStats() {
  const weekSessions = getWeekSessions().filter(session => session.mode === 'focus' && session.completed);
  const totalCount = weekSessions.length;

  const sessionsByDay = {};
  weekSessions.forEach(session => {
    const day = new Date(session.timestamp).toLocaleDateString();
    sessionsByDay[day] = (sessionsByDay[day] || 0) + 1;
  });

  const daysWithSessions = Object.keys(sessionsByDay).length;
  const dailyAverage = daysWithSessions > 0 ? (totalCount / daysWithSessions).toFixed(1) : '0.0';

  if (weekCountElement) weekCountElement.textContent = totalCount;
  if (dailyAverageElement) dailyAverageElement.textContent = dailyAverage;
}

// Load streak data
function loadStreakData() {
  const streakData = loadData('streak', SCHEMAS.streak);
  if (streakCountElement) streakCountElement.textContent = streakData.currentStreak;
  if (bestStreakElement) bestStreakElement.textContent = streakData.bestStreak;
}

// Create weekly chart
function createWeeklyChart() {
  if (!weeklyChartCanvas || !window.Chart) return;
  if (weeklyChartInstance) weeklyChartInstance.destroy(); // Destroy previous instance

  const today = new Date();
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - i));
    return date;
  });

  const labels = last7Days.map(date => date.toLocaleDateString(undefined, { weekday: 'short' }));
  const data = last7Days.map(date => {
    const startOfDay = new Date(date); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date); endOfDay.setHours(23, 59, 59, 999);
    return getSessionsByDateRange(startOfDay, endOfDay)
      .filter(session => session.mode === 'focus' && session.completed).length;
  });

  const currentThemeColors = getChartColors();

  weeklyChartInstance = new Chart(weeklyChartCanvas, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Completed Pomodoros',
        data: data,
        backgroundColor: currentThemeColors.primaryTransparent,
        borderColor: currentThemeColors.primary,
        borderWidth: 1,
        borderRadius: 5,
        barThickness: 'flex',
        maxBarThickness: 20
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: { precision: 0, color: currentThemeColors.text },
          grid: { color: currentThemeColors.grid }
        },
        x: {
          ticks: { color: currentThemeColors.text },
          grid: { display: false }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: currentThemeColors.tooltipBg,
          titleColor: currentThemeColors.tooltipText,
          bodyColor: currentThemeColors.tooltipText,
          borderColor: currentThemeColors.grid,
          borderWidth: 1,
          padding: 10,
          cornerRadius: 4,
          displayColors: false
        }
      }
    }
  });
}

// Create Task Completion Chart
function createTaskCompletionChart() {
  if (!taskChartCanvas || !window.Chart || !window.getTaskStats) return; // Check for getTaskStats
  if (taskChartInstance) taskChartInstance.destroy();

  const taskStats = window.getTaskStats(); // From tasks.js
  const completed = taskStats.completedTasks;
  const pending = taskStats.totalTasks - taskStats.completedTasks;

  const currentThemeColors = getChartColors();

  taskChartInstance = new Chart(taskChartCanvas, {
    type: 'doughnut',
    data: {
      labels: ['Completed', 'Pending'],
      datasets: [{
        label: 'Task Status',
        data: [completed, pending],
        backgroundColor: [
          currentThemeColors.success, // Completed
          currentThemeColors.muted    // Pending
        ],
        borderColor: [
          currentThemeColors.success,
          currentThemeColors.muted
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: currentThemeColors.text, boxWidth: 12, padding: 15 }
        },
        tooltip: {
          backgroundColor: currentThemeColors.tooltipBg,
          titleColor: currentThemeColors.tooltipText,
          bodyColor: currentThemeColors.tooltipText,
          borderColor: currentThemeColors.grid,
          borderWidth: 1,
          padding: 10,
          cornerRadius: 4,
          displayColors: true
        }
      }
    }
  });
}

// Load Productivity Score (Basic Implementation)
function loadProductivityScore() {
  if (!productivityScoreElement || !gaugeFillElement) return;

  const todaySessions = getTodaySessions().filter(s => s.mode === 'focus' && s.completed).length;
  const taskStats = window.getTaskStats ? window.getTaskStats() : { completedTasks: 0, totalTasks: 1, currentStreak: 0 };
  const streakData = loadData('streak', SCHEMAS.streak);

  // Simple scoring:
  let score = 0;
  // Focus: max 40 points (e.g., 5 points per pomodoro, capped at 8)
  const focusScore = Math.min(todaySessions * 5, 40);
  score += focusScore;

  // Tasks: max 30 points (completion rate * 30)
  const taskCompletionRate = taskStats.totalTasks > 0 ? (taskStats.completedTasks / taskStats.totalTasks) : 0;
  const taskScore = Math.round(taskCompletionRate * 30);
  score += taskScore;

  // Consistency (Streak): max 30 points (e.g., 2 points per streak day, capped at 15 days)
  const consistencyScore = Math.min(streakData.currentStreak * 2, 30);
  score += consistencyScore;

  score = Math.min(Math.max(score, 0), 100); // Clamp between 0-100

  productivityScoreElement.textContent = score;
  const gaugeRotation = (score / 100) * 180; // Max 180 degrees for semi-circle
  gaugeFillElement.style.transform = `rotate(${gaugeRotation}deg)`;

  // Update bars (simple % based on their contribution to max score)
  if (focusTimeBarElement) focusTimeBarElement.style.width = `${(focusScore / 40) * 100}%`;
  if (taskCompletionBarElement) taskCompletionBarElement.style.width = `${(taskScore / 30) * 100}%`;
  if (consistencyBarElement) consistencyBarElement.style.width = `${(consistencyScore / 30) * 100}%`;
  if (goalAchievementBarElement) goalAchievementBarElement.style.width = `0%`; // Placeholder
}


// Load recent sessions
function loadRecentSessions() {
  if (!sessionsTableElement) return;

  const allSessions = loadData('sessions', []);
  const allTasks = loadData('tasks', []); // From storage.js

  const sortedSessions = allSessions
    .filter(session => session.completed)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 10); // Get only the 10 most recent

  sessionsTableElement.innerHTML = ''; // Clear table

  if (sortedSessions.length === 0) {
    sessionsTableElement.innerHTML = `<tr><td colspan="5" class="py-4 text-center text-gray-400">No completed sessions yet.</td></tr>`;
  } else {
    sortedSessions.forEach(session => {
      const row = sessionsTableElement.insertRow();
      row.className = 'text-gray-300 border-b border-gray-800 hover:bg-gray-800/50 transition-colors';
      const date = new Date(session.timestamp);

      row.insertCell().textContent = formatDate(date);
      row.insertCell().textContent = formatTimeOfDay(date);
      row.insertCell().textContent = {
        'focus': '🎯 Focus', 'shortBreak': '☕ Short Break', 'longBreak': '🛌 Long Break'
      }[session.mode] || session.mode;
      row.insertCell().textContent = `${session.duration} min`;

      const associatedTask = allTasks.find(task => task.id === session.taskId);
      row.insertCell().textContent = associatedTask ? associatedTask.text : 'N/A';

      Array.from(row.cells).forEach(cell => cell.className = 'py-3 px-2');
    });
  }
}


// Helper to get theme-aware chart colors
function getChartColors() {
    const computedStyle = getComputedStyle(document.body);
    return {
        primary: `rgb(${computedStyle.getPropertyValue('--primary-rgb').trim()})`,
        primaryTransparent: `rgba(${computedStyle.getPropertyValue('--primary-rgb').trim()}, 0.7)`,
        secondary: `rgb(${computedStyle.getPropertyValue('--secondary-rgb').trim()})`,
        success: `rgb(${computedStyle.getPropertyValue('--success-rgb').trim()})`,
        muted: `rgba(${computedStyle.getPropertyValue('--muted-foreground-rgb').trim()}, 0.5)`,
        text: `rgb(${computedStyle.getPropertyValue('--muted-foreground-rgb').trim()})`,
        grid: `rgba(${computedStyle.getPropertyValue('--muted-foreground-rgb').trim()}, 0.15)`,
        tooltipBg: `rgb(${computedStyle.getPropertyValue('--card-background-rgb').trim()})`,
        tooltipText: `rgb(${computedStyle.getPropertyValue('--card-foreground-rgb').trim()})`,
    };
}


// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', initDashboard);

// Listen for storage changes to update dashboard live
window.addEventListener('storage', function(event) {
  if (event.key === `${APP_NAME}_sessions` ||
      event.key === `${APP_NAME}_streak` ||
      event.key === `${APP_NAME}_tasks`) {
    initDashboard(); // Re-initialize all parts of the dashboard
  }
});

// Listen for theme changes to redraw charts with new colors
window.addEventListener('themeChanged', () => {
    if (window.location.pathname.includes('dashboard.html')) {
        createWeeklyChart();
        createTaskCompletionChart();
    }
});
