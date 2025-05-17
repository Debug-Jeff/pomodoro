/**
 * Timer functionality for the Pomodoro app
 * Handles countdown, mode switching, and session tracking
 */

// Timer state
let timerState = {
  mode: 'focus', // 'focus', 'shortBreak', 'longBreak'
  timeRemaining: 25 * 60, // in seconds
  isRunning: false,
  startTime: null,
  timerId: null,
  completedSessions: 0,
  sessionsUntilLongBreak: 4,
  currentSequenceStep: 0
};

// DOM elements
const timerDisplay = document.getElementById('timer-display');
const timerEdit = document.getElementById('timer-edit');
const timerDisplayContainer = document.getElementById('timer-display-container');
const timerLabel = document.getElementById('timer-label');
const timerProgress = document.getElementById('timer-progress');
const timerContainer = document.getElementById('timer-container');
const startBtn = document.getElementById('start-btn');
const resetBtn = document.getElementById('reset-btn');
const focusBtn = document.getElementById('focus-btn');
const shortBreakBtn = document.getElementById('short-break-btn');
const longBreakBtn = document.getElementById('long-break-btn');
const completedCount = document.getElementById('completed-count');
const popOutBtn = document.getElementById('pop-out-btn');
const popOutTimer = document.getElementById('pop-out-timer');
const popTimerDisplay = document.getElementById('pop-timer-display');
const popTimerLabel = document.getElementById('pop-timer-label');
const popStartBtn = document.getElementById('pop-start-btn');
const popResetBtn = document.getElementById('pop-reset-btn');
const closePopOutBtn = document.getElementById('close-pop-out');

// Initialize timer
function initTimer() {
  const settings = loadData('settings', SCHEMAS.settings);
  
  // Set initial timer duration based on mode
  timerState.sessionsUntilLongBreak = settings.sessionsBeforeLongBreak;
  
  // Load completed sessions count for today
  loadCompletedSessions();
  
  // Set up timer progress circle
  if (timerProgress) {
    const circumference = 2 * Math.PI * 45; // 2πr where r=45
    timerProgress.style.strokeDasharray = circumference;
    timerProgress.style.strokeDashoffset = '0';
  }
  
  // Set up mode buttons
  if (focusBtn) {
    focusBtn.addEventListener('click', () => switchMode('focus'));
  }
  
  if (shortBreakBtn) {
    shortBreakBtn.addEventListener('click', () => switchMode('shortBreak'));
  }
  
  if (longBreakBtn) {
    longBreakBtn.addEventListener('click', () => switchMode('longBreak'));
  }
  
  // Set up control buttons
  if (startBtn) {
    startBtn.addEventListener('click', toggleTimer);
  }
  
  if (resetBtn) {
    resetBtn.addEventListener('click', resetTimer);
  }
  
  // Set up timer display editing
  if (timerDisplayContainer) {
    timerDisplayContainer.addEventListener('click', enableTimerEdit);
  }
  
  if (timerEdit) {
    timerEdit.addEventListener('blur', disableTimerEdit);
    timerEdit.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        disableTimerEdit();
      }
    });
  }
  
  // Set up pop-out timer
  if (popOutBtn) {
    popOutBtn.addEventListener('click', togglePopOutTimer);
  }
  
  if (closePopOutBtn) {
    closePopOutBtn.addEventListener('click', closePopOutTimer);
  }
  
  if (popStartBtn) {
    popStartBtn.addEventListener('click', toggleTimer);
  }
  
  if (popResetBtn) {
    popResetBtn.addEventListener('click', resetTimer);
  }
  
  // Make pop-out timer draggable
  if (popOutTimer) {
    makeElementDraggable(popOutTimer);
  }
  
  // Initialize timer display
  switchMode('focus');
}

// Make an element draggable
function makeElementDraggable(element) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  const header = element.querySelector('.pop-out-header') || element;
  header.style.cursor = 'move';
  header.addEventListener('mousedown', dragMouseDown);
  
  function dragMouseDown(e) {
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.addEventListener('mouseup', closeDragElement);
    document.addEventListener('mousemove', elementDrag);
  }
  
  function elementDrag(e) {
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    element.style.top = (element.offsetTop - pos2) + "px";
    element.style.left = (element.offsetLeft - pos1) + "px";
  }
  
  function closeDragElement() {
    document.removeEventListener('mouseup', closeDragElement);
    document.removeEventListener('mousemove', elementDrag);
  }
}

// Enable timer edit
function enableTimerEdit() {
  if (!timerDisplay || !timerEdit || timerState.isRunning) return;
  
  // Hide display, show edit input
  timerDisplay.classList.add('hidden');
  timerEdit.classList.remove('hidden');
  
  // Set input value to current time
  const minutes = Math.floor(timerState.timeRemaining / 60);
  const seconds = timerState.timeRemaining % 60;
  timerEdit.value = formatTime(minutes, seconds);
  
  // Focus input
  timerEdit.focus();
}

// Disable timer edit
function disableTimerEdit() {
  if (!timerDisplay || !timerEdit) return;
  
  // Parse input value
  const timePattern = /^(\d{1,2}):(\d{2})$/;
  const match = timerEdit.value.match(timePattern);
  
  if (match) {
    const minutes = parseInt(match[1], 10);
    const seconds = parseInt(match[2], 10);
    
    if (minutes >= 0 && minutes <= 99 && seconds >= 0 && seconds < 60) {
      timerState.timeRemaining = (minutes * 60) + seconds;
      updateTimerDisplay();
    }
  }
  
  // Hide edit input, show display
  timerEdit.classList.add('hidden');
  timerDisplay.classList.remove('hidden');
}

// Toggle pop-out timer
function togglePopOutTimer() {
  if (!popOutTimer) return;
  
  popOutTimer.classList.toggle('hidden');
  
  // Animate pop-out
  if (!popOutTimer.classList.contains('hidden') && window.gsap) {
    gsap.fromTo(popOutTimer,
      { scale: 0.5, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(1.7)" }
    );
  }
  
  // Update pop-out timer display
  updatePopOutTimerDisplay();
}

// Close pop-out timer
function closePopOutTimer() {
  if (!popOutTimer) return;
  
  // Animate closing
  if (window.gsap) {
    gsap.to(popOutTimer, {
      scale: 0.5,
      opacity: 0,
      duration: 0.3,
      ease: "power2.in",
      onComplete: () => {
        popOutTimer.classList.add('hidden');
      }
    });
  } else {
    popOutTimer.classList.add('hidden');
  }
}

// Update pop-out timer display
function updatePopOutTimerDisplay() {
  if (!popTimerDisplay || !popTimerLabel) return;
  
  const minutes = Math.floor(timerState.timeRemaining / 60);
  const seconds = timerState.timeRemaining % 60;
  
  popTimerDisplay.textContent = formatTime(minutes, seconds);
  
  // Update label
  switch (timerState.mode) {
    case 'focus':
      popTimerLabel.textContent = 'Focus Time';
      break;
    case 'shortBreak':
      popTimerLabel.textContent = 'Short Break';
      break;
    case 'longBreak':
      popTimerLabel.textContent = 'Long Break';
      break;
  }
  
  // Update button text
  if (popStartBtn) {
    popStartBtn.textContent = timerState.isRunning ? 'Pause' : 'Start';
  }
}

// Switch timer mode
function switchMode(mode) {
  // Stop the timer if it's running
  if (timerState.isRunning) {
    stopTimer();
  }
  
  timerState.mode = mode;
  const settings = loadData('settings', SCHEMAS.settings);
  
  // Set time based on mode
  switch (mode) {
    case 'focus':
      timerState.timeRemaining = settings.focusDuration * 60;
      timerLabel.textContent = 'Focus Time';
      break;
    case 'shortBreak':
      timerState.timeRemaining = settings.shortBreakDuration * 60;
      timerLabel.textContent = 'Short Break';
      break;
    case 'longBreak':
      timerState.timeRemaining = settings.longBreakDuration * 60;
      timerLabel.textContent = 'Long Break';
      break;
  }
  
  // Update UI
  updateTimerDisplay();
  updateModeButtons();
  resetTimerProgress();
  updatePopOutTimerDisplay();
}

// Switch to a specific step in a custom sequence
function switchToSequenceStep(index) {
  // Get current sequence
  const currentSequence = JSON.parse(localStorage.getItem(`${APP_NAME}_current_sequence`));
  if (!currentSequence || !currentSequence.steps || !currentSequence.steps[index]) return;
  
  // Stop the timer if it's running
  if (timerState.isRunning) {
    stopTimer();
  }
  
  // Get step
  const step = currentSequence.steps[index];
  
  // Set current step
  timerState.currentSequenceStep = index;
  
  // Set mode and time
  timerState.mode = step.type;
  timerState.timeRemaining = step.duration * 60;
  
  // Update label
  switch (step.type) {
    case 'focus':
      timerLabel.textContent = 'Focus Time';
      break;
    case 'shortBreak':
      timerLabel.textContent = 'Short Break';
      break;
    case 'longBreak':
      timerLabel.textContent = 'Long Break';
      break;
  }
  
  // Update UI
  updateTimerDisplay();
  updateModeButtons();
  resetTimerProgress();
  updatePopOutTimerDisplay();
  
  // Update sequence steps preview
  if (typeof renderSequenceStepsPreview === 'function') {
    renderSequenceStepsPreview();
  }
}

// Get current sequence step index
function getCurrentSequenceStepIndex() {
  return timerState.currentSequenceStep;
}

// Move to next step in sequence
function moveToNextSequenceStep() {
  // Get current sequence
  const currentSequence = JSON.parse(localStorage.getItem(`${APP_NAME}_current_sequence`));
  if (!currentSequence || !currentSequence.steps) return false;
  
  // Calculate next step
  const nextStep = (timerState.currentSequenceStep + 1) % currentSequence.steps.length;
  
  // Switch to next step
  switchToSequenceStep(nextStep);
  
  return true;
}

// Update mode buttons to show active state
function updateModeButtons() {
  const modeButtons = document.querySelectorAll('.mode-btn');
  modeButtons.forEach(btn => {
    btn.classList.remove('bg-indigo-600');
    btn.setAttribute('aria-pressed', 'false');
  });
  
  let activeButton;
  switch (timerState.mode) {
    case 'focus':
      activeButton = focusBtn;
      break;
    case 'shortBreak':
      activeButton = shortBreakBtn;
      break;
    case 'longBreak':
      activeButton = longBreakBtn;
      break;
  }
  
  if (activeButton) {
    activeButton.classList.add('bg-indigo-600');
    activeButton.setAttribute('aria-pressed', 'true');
  }
}

// Toggle timer between start and pause
function toggleTimer() {
  if (timerState.isRunning) {
    stopTimer();
    startBtn.textContent = 'Resume';
    if (popStartBtn) popStartBtn.textContent = 'Resume';
  } else {
    startTimer();
    startBtn.textContent = 'Pause';
    if (popStartBtn) popStartBtn.textContent = 'Pause';
  }
}

// Start the timer
function startTimer() {
  if (!timerState.isRunning) {
    timerState.isRunning = true;
    timerState.startTime = Date.now() - ((getTimerDuration() - timerState.timeRemaining) * 1000);
    
    // Use requestAnimationFrame for smoother countdown
    requestAnimationFrame(updateTimer);
    
    // Add pulse animation to timer
    // if (timerContainer && window.gsap) {
    //   timerContainer.classList.add('timer-pulse');
    // }
  }
}

// Stop the timer
function stopTimer() {
  timerState.isRunning = false;
  cancelAnimationFrame(timerState.timerId);
  timerState.timerId = null;
  
  // Remove pulse animation
  // if (timerContainer) {
  //   timerContainer.classList.remove('timer-pulse');
  // }
}

// Reset the timer
function resetTimer() {
  stopTimer();
  switchMode(timerState.mode);
  startBtn.textContent = 'Start';
  if (popStartBtn) popStartBtn.textContent = 'Start';
}

// Update timer using requestAnimationFrame
function updateTimer(timestamp) {
  if (!timerState.isRunning) return;
  
  const elapsedSeconds = Math.floor((Date.now() - timerState.startTime) / 1000);
  const totalDuration = getTimerDuration();
  timerState.timeRemaining = Math.max(0, totalDuration - elapsedSeconds);
  
  updateTimerDisplay();
  updateTimerProgress();
  updatePopOutTimerDisplay();
  
  if (timerState.timeRemaining <= 0) {
    timerComplete();
  } else {
    timerState.timerId = requestAnimationFrame(updateTimer);
  }
}

// Get total duration for current mode
function getTimerDuration() {
  const settings = loadData('settings', SCHEMAS.settings);
  switch (timerState.mode) {
    case 'focus':
      return settings.focusDuration * 60;
    case 'shortBreak':
      return settings.shortBreakDuration * 60;
    case 'longBreak':
      return settings.longBreakDuration * 60;
    default:
      return settings.focusDuration * 60;
  }
}

// Update timer display
function updateTimerDisplay() {
  const minutes = Math.floor(timerState.timeRemaining / 60);
  const seconds = timerState.timeRemaining % 60;
  
  if (timerDisplay) {
    timerDisplay.textContent = formatTime(minutes, seconds);
    if (window.pulseTimerDisplay) window.pulseTimerDisplay();
  }
  
  // Update document title
  document.title = `${formatTime(minutes, seconds)} - Pomodoro Timer`;
}

// Update timer progress circle
function updateTimerProgress() {
  if (!timerProgress) return;
  
  const totalDuration = getTimerDuration();
  const progress = timerState.timeRemaining / totalDuration;
  const circumference = 2 * Math.PI * 45; // 2πr where r=45
  
  // Call animateTimerRing to use GSAP for smooth animation
  animateTimerRing(circumference * (1 - progress));
}

// Reset timer progress circle
function resetTimerProgress() {
  if (!timerProgress) return;
  
  const circumference = 2 * Math.PI * 45;
  timerProgress.style.strokeDashoffset = '0';
}

// Handle timer completion
function timerComplete() {
  stopTimer();
  
  // Play sound
  const settings = loadData('settings', SCHEMAS.settings);
  if (settings.enableSounds) {
    playSound(timerState.mode === 'focus' ? 'complete' : 'break');
  }
  
  // Show notification
  if (settings.enableNotifications) {
    const title = timerState.mode === 'focus' ? 'Focus session complete!' : 'Break time over!';
    const message = timerState.mode === 'focus' ? 'Time for a break!' : 'Ready to focus again?';
    
    showNotification(title, {
      body: message,
      silent: false
    });
  }
  
  // Update session count if focus session completed
  if (timerState.mode === 'focus') {
    timerState.completedSessions++;
    
    // Increment pomodoro count for current task
    if (typeof incrementTaskPomodoro === 'function') {
      incrementTaskPomodoro();
    }
    
    saveSession();
    updateCompletedCount();
    
    // Check if using a custom sequence
    const currentSequence = JSON.parse(localStorage.getItem(`${APP_NAME}_current_sequence`));
    if (currentSequence && currentSequence.steps) {
      // Move to next step in sequence
      moveToNextSequenceStep();
    } else {
      // Use standard Pomodoro technique
      // Check if it's time for a long break
      if (timerState.completedSessions % timerState.sessionsUntilLongBreak === 0) {
        switchMode('longBreak');
      } else {
        switchMode('shortBreak');
      }
    }
  } else {
    // Check if using a custom sequence
    const currentSequence = JSON.parse(localStorage.getItem(`${APP_NAME}_current_sequence`));
    if (currentSequence && currentSequence.steps) {
      // Move to next step in sequence
      moveToNextSequenceStep();
    } else {
      // After a break, switch back to focus mode
      switchMode('focus');
    }
  }
  
  startBtn.textContent = 'Start';
  if (popStartBtn) popStartBtn.textContent = 'Start';
  
  // Animate timer completion
  if (timerContainer && window.gsap) {
    gsap.to(timerContainer, {
      scale: 1.1,
      duration: 0.2,
      ease: "power2.out",
      yoyo: true,
      repeat: 3
    });
  }
}

// Save completed session to localStorage
function saveSession() {
  const now = new Date();
  const session = {
    timestamp: now.toISOString(),
    mode: timerState.mode,
    duration: getTimerDuration() / 60, // in minutes
    completed: true,
    taskId: typeof getCurrentTask === 'function' ? (getCurrentTask()?.id || null) : null
  };
  
  // Get existing sessions
  let sessions = JSON.parse(localStorage.getItem(`${APP_NAME}_sessions`)) || [];
  
  // Add new session
  sessions.push(session);
  
  // Save back to localStorage
  saveData('sessions', sessions);
  
  // Update streak data
  updateStreak();
}

// Update streak data
function updateStreak() {
  const today = new Date().toLocaleDateString();
  
  // Get existing streak data
  let streakData = JSON.parse(localStorage.getItem(`${APP_NAME}_streak`)) || {
    currentStreak: 0,
    bestStreak: 0,
    lastActiveDay: null
  };
  
  if (streakData.lastActiveDay === today) {
    // Already recorded activity today, no need to update streak
    return;
  }
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayString = yesterday.toLocaleDateString();
  
  if (streakData.lastActiveDay === yesterdayString) {
    // Consecutive day, increment streak
    streakData.currentStreak++;
  } else if (streakData.lastActiveDay !== today) {
    // Streak broken, reset
    streakData.currentStreak = 1;
  }
  
  // Update last active day
  streakData.lastActiveDay = today;
  
  // Update best streak if needed
  if (streakData.currentStreak > streakData.bestStreak) {
    streakData.bestStreak = streakData.currentStreak;
  }
  
  // Save back to localStorage
  saveData('streak', streakData);
}

// Load and display completed sessions for today
function loadCompletedSessions() {
  const today = new Date().toLocaleDateString();
  let sessions = JSON.parse(localStorage.getItem(`${APP_NAME}_sessions`)) || [];
  
  // Filter sessions for today
  const todaySessions = sessions.filter(session => {
    const sessionDate = new Date(session.timestamp).toLocaleDateString();
    return sessionDate === today && session.mode === 'focus' && session.completed;
  });
  
  timerState.completedSessions = todaySessions.length;
  updateCompletedCount();
}

// Update completed count display
function updateCompletedCount() {
  if (completedCount) {
    completedCount.textContent = timerState.completedSessions;
  }
}

// Initialize timer when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initTimer();
  
  // Request notification permission if enabled in settings
  const settings = loadData('settings', SCHEMAS.settings);
  if (settings.enableNotifications) {
    requestNotificationPermission();
  }
});

// Listen for storage changes to settings and update timer
window.addEventListener('storage', function(event) {
  if (event.key === `${APP_NAME}_settings`) {
    // Reload settings and update timer durations and theme
    const settings = loadData('settings', SCHEMAS.settings);
    timerState.sessionsUntilLongBreak = settings.sessionsBeforeLongBreak;
    // If timer is not running, update the current mode duration
    if (!timerState.isRunning) {
      switchMode(timerState.mode);
    }
    // Apply theme
    if (window.setAndApplyTheme) window.setAndApplyTheme(settings.theme);
  }
});

// In your timer tick/update logic, replace direct timerDisplay.textContent = ... with updateTimerDisplay(...)
// For timer ring animation, if using GSAP:
function animateTimerRing(progress) {
  const ring = document.getElementById('timer-progress');
  if (ring && window.gsap) {
    gsap.to(ring, { strokeDashoffset: progress, duration: 0.5, ease: 'power1.out' });
  } else if (ring) {
    ring.style.strokeDashoffset = progress;
  }
}