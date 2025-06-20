/**
 * Dashboard functionality for the Pomodoro app
 * Handles statistics and data visualization
 */

const todayCountElement = document.getElementById('today-count');
const todayMinutesElement = document.getElementById('today-minutes');
const weekCountElement = document.getElementById('week-count');
const dailyAverageElement = document.getElementById('daily-average');
const streakCountElement = document.getElementById('streak-count');
const bestStreakElement = document.getElementById('best-streak');
const weeklyChartCanvas = document.getElementById('weekly-chart');
const sessionsTableElement = document.getElementById('sessions-table');
const taskChartCanvas = document.getElementById('task-chart');

const productivityScoreDisplay = document.getElementById('productivity-score');
const gaugeFillElement = document.getElementById('gauge-fill');
const focusTimeBar = document.getElementById('focus-time-bar');
const taskCompletionBar = document.getElementById('task-completion-bar');
const consistencyBar = document.getElementById('consistency-bar');
const goalAchievementBar = document.getElementById('goal-achievement-bar');

let weeklyChartInstance = null;
let taskChartInstance = null;

function initDashboardModule() {
  if (!document.getElementById('dashboard-page-identifier')) return;

  loadDashboardData();
  setupDashboardEventListeners();
}

function loadDashboardData() {
  loadTodayStats();
  loadWeekStats();
  loadStreakData();
  createOrUpdateWeeklyChart();
  createOrUpdateTaskCompletionChart();
  calculateAndDisplayProductivityScore();
  loadRecentSessionsTable();
}

function setupDashboardEventListeners() {
  window.addEventListener('appStorageChange', (event) => {
    const relevantKeys = ['sessions', 'streak', 'tasks'];
    if (relevantKeys.includes(event.detail.key)) {
      loadDashboardData();
    }
  });

  window.addEventListener('storage', (event) => {
    const relevantKeys = [`${window.APP_NAME}_sessions`, `${window.APP_NAME}_streak`, `${window.APP_NAME}_tasks`];
    if (relevantKeys.includes(event.key)) {
      loadDashboardData();
    }
  });

  window.addEventListener('themeChanged', () => {
    if (weeklyChartCanvas || taskChartCanvas) {
      createOrUpdateWeeklyChart();
      createOrUpdateTaskCompletionChart();
    }
  });
}

function loadTodayStats() {
  const todayFocusSessions = getTodaySessions().filter(s => s.mode === 'focus' && s.completed);
  if (todayCountElement) todayCountElement.textContent = todayFocusSessions.length;
  if (todayMinutesElement) {
    const totalMinutes = todayFocusSessions.reduce((sum, s) => sum + s.duration, 0);
    todayMinutesElement.textContent = Math.round(totalMinutes);
  }
}

function loadWeekStats() {
  const weekFocusSessions = getWeekSessions().filter(s => s.mode === 'focus' && s.completed);
  if (weekCountElement) weekCountElement.textContent = weekFocusSessions.length;
  if (dailyAverageElement) {
    const sessionsByDay = {};
    weekFocusSessions.forEach(s => {
      const day = new Date(s.timestamp).toLocaleDateString();
      sessionsByDay[day] = (sessionsByDay[day] || 0) + 1;
    });
    const daysWithActivity = Object.keys(sessionsByDay).length;
    dailyAverageElement.textContent = daysWithActivity > 0 ? (weekFocusSessions.length / daysWithActivity).toFixed(1) : '0.0';
  }
}

function loadStreakData() {
  const streakData = loadData('streak', window.SCHEMAS.streak);
  if (streakCountElement) streakCountElement.textContent = streakData.currentStreak;
  if (bestStreakElement) bestStreakElement.textContent = streakData.bestStreak;
}

function getChartThemeColors() {
  const cs = getComputedStyle(document.body);
  return {
    primary: `rgb(${cs.getPropertyValue('--primary-rgb').trim()})`,
    primaryTransparent: `rgba(${cs.getPropertyValue('--primary-rgb').trim()}, 0.65)`,
    success: `rgb(${cs.getPropertyValue('--success-rgb').trim()})`,
    muted: `rgba(${cs.getPropertyValue('--muted-foreground-rgb').trim()}, 0.4)`,
    text: `rgb(${cs.getPropertyValue('--muted-foreground-rgb').trim()})`,
    grid: `rgba(${cs.getPropertyValue('--muted-foreground-rgb').trim()}, 0.1)`,
    tooltipBg: `rgba(${cs.getPropertyValue('--card-background-rgb').trim()}, 0.9)`,
    tooltipText: `rgb(${cs.getPropertyValue('--card-foreground-rgb').trim()})`,
  };
}

function createOrUpdateWeeklyChart() {
  if (!weeklyChartCanvas || !window.Chart) return;
  const chartColors = getChartThemeColors();

  const today = new Date();
  const currentDayOfWeek = today.getDay();
  const labels = [];
  const data = [];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - currentDayOfWeek + i);
    labels.push(date.toLocaleDateString(undefined, { weekday: 'short' }));
    const startOfDay = new Date(date); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date); endOfDay.setHours(23, 59, 59, 999);
    data.push(getSessionsByDateRange(startOfDay, endOfDay).filter(s => s.mode === 'focus' && s.completed).length);
  }

  if (weeklyChartInstance) {
    weeklyChartInstance.data.labels = labels;
    weeklyChartInstance.data.datasets[0].data = data;
    weeklyChartInstance.data.datasets[0].backgroundColor = chartColors.primaryTransparent;
    weeklyChartInstance.data.datasets[0].borderColor = chartColors.primary;
    weeklyChartInstance.options.scales.y.ticks.color = chartColors.text;
    weeklyChartInstance.options.scales.y.grid.color = chartColors.grid;
    weeklyChartInstance.options.scales.x.ticks.color = chartColors.text;
    weeklyChartInstance.update();
  } else {
    weeklyChartInstance = new Chart(weeklyChartCanvas, {
      type: 'bar',
      data: { 
        labels, 
        datasets: [{ 
          label: 'Completed Pomodoros', 
          data, 
          backgroundColor: chartColors.primaryTransparent, 
          borderColor: chartColors.primary, 
          borderWidth: 1, 
          borderRadius: 4, 
          barPercentage: 0.6, 
          categoryPercentage: 0.7 
        }] 
      },
      options: {
        responsive: true, 
        maintainAspectRatio: false,
        scales: {
          y: { 
            beginAtZero: true, 
            ticks: { precision: 0, color: chartColors.text }, 
            grid: { color: chartColors.grid, drawBorder: false } 
          },
          x: { 
            ticks: { color: chartColors.text }, 
            grid: { display: false } 
          }
        },
        plugins: { 
          legend: { display: false }, 
          tooltip: {
            backgroundColor: chartColors.tooltipBg,
            titleColor: chartColors.tooltipText,
            bodyColor: chartColors.tooltipText
          }
        }
      }
    });
  }
}

function createOrUpdateTaskCompletionChart() {
  if (!taskChartCanvas || !window.Chart || !window.getTaskStats) return;
  const taskStats = window.getTaskStats();
  const chartColors = getChartThemeColors();
  const data = [taskStats.completedTasks, taskStats.totalTasks - taskStats.completedTasks];

  if (taskChartInstance) {
    taskChartInstance.data.datasets[0].data = data;
    taskChartInstance.data.datasets[0].backgroundColor = [chartColors.success, chartColors.muted];
    taskChartInstance.options.plugins.legend.labels.color = chartColors.text;
    taskChartInstance.update();
  } else {
    taskChartInstance = new Chart(taskChartCanvas, {
      type: 'doughnut',
      data: {
        labels: ['Completed', 'Pending'],
        datasets: [{ 
          data, 
          backgroundColor: [chartColors.success, chartColors.muted], 
          borderWidth: 0, 
          hoverOffset: 8 
        }]
      },
      options: {
        responsive: true, 
        maintainAspectRatio: false, 
        cutout: '70%',
        plugins: {
          legend: { 
            position: 'bottom', 
            labels: { 
              color: chartColors.text, 
              usePointStyle: true, 
              boxWidth: 8, 
              padding: 15 
            } 
          },
          tooltip: {
            backgroundColor: chartColors.tooltipBg,
            titleColor: chartColors.tooltipText,
            bodyColor: chartColors.tooltipText
          }
        }
      }
    });
  }
}

function calculateAndDisplayProductivityScore() {
  if (!productivityScoreDisplay || !gaugeFillElement) return;
  
  const todayFocusSessions = getTodaySessions().filter(s => s.mode === 'focus' && s.completed).length;
  const taskStats = window.getTaskStats ? window.getTaskStats() : { completionRate: 0 };
  const streakData = loadData('streak', window.SCHEMAS.streak);

  const focusWeight = 0.4, taskWeight = 0.35, consistencyWeight = 0.25;
  const focusTarget = 8, consistencyTargetStreak = 14;

  const focusScoreRaw = Math.min((todayFocusSessions / focusTarget) * 100, 100);
  const taskScoreRaw = taskStats.completionRate * 100;
  const consistencyScoreRaw = Math.min((streakData.currentStreak / consistencyTargetStreak) * 100, 100);

  let totalScore = (focusScoreRaw * focusWeight) + (taskScoreRaw * taskWeight) + (consistencyScoreRaw * consistencyWeight);
  totalScore = Math.round(Math.max(0, Math.min(totalScore, 100)));

  productivityScoreDisplay.textContent = totalScore;
  const gaugeRotation = -90 + (totalScore / 100) * 180;
  gaugeFillElement.style.transform = `rotate(${gaugeRotation}deg)`;

  if (focusTimeBar) focusTimeBar.style.width = `${Math.round(focusScoreRaw)}%`;
  if (taskCompletionBar) taskCompletionBar.style.width = `${Math.round(taskScoreRaw)}%`;
  if (consistencyBar) consistencyBar.style.width = `${Math.round(consistencyScoreRaw)}%`;
  if (goalAchievementBar) goalAchievementBar.style.width = `0%`;
}

function loadRecentSessionsTable() {
  if (!sessionsTableElement) return;
  const allSessions = loadData('sessions', []);
  const allTasks = loadData('tasks', []);
  const sortedSessions = allSessions
    .filter(s => s.completed)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 15);

  sessionsTableElement.innerHTML = '';
  if (sortedSessions.length === 0) {
    sessionsTableElement.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-[rgb(var(--muted-foreground-rgb))]">No completed sessions recorded yet.</td></tr>`;
  } else {
    sortedSessions.forEach(session => {
      const row = sessionsTableElement.insertRow();
      row.className = 'border-b border-[rgba(var(--foreground-rgb),0.07)] hover:bg-[rgba(var(--primary-rgb),0.05)] transition-colors';
      const date = new Date(session.timestamp);
      const associatedTask = allTasks.find(t => t.id === session.taskId);
      const modeMap = { 'focus': '🎯 Focus', 'shortBreak': '☕ Short Break', 'longBreak': '🛌 Long Break' };

      row.insertCell().textContent = formatDate(date);
      row.insertCell().textContent = formatTimeOfDay(date);
      row.insertCell().textContent = modeMap[session.mode] || session.mode;
      row.insertCell().textContent = `${session.duration} min`;
      row.insertCell().textContent = associatedTask ? associatedTask.text : 'N/A';
      Array.from(row.cells).forEach(cell => cell.className = 'py-3 px-3 text-sm');
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.querySelector('body[data-page="dashboard"]')) {
    initDashboardModule();
  }
});