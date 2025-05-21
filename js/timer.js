/**
 * Timer functionality for the Pomodoro app
 * Handles countdown, mode switching, and session tracking
 */

// Timer state
let timerState = {
  mode: 'focus',
  timeRemaining: 25 * 60,
  isRunning: false,
  startTime: null, // Timestamp when timer started or resumed
  totalDurationAtStart: 25 * 60, // Total duration of the current mode when started
  timerId: null, // For requestAnimationFrame
  completedSessionsToday: 0, // Focus sessions completed today
  currentSequenceStep: 0, // For custom sequences
  // sessionsUntilLongBreak is now read directly from settings
};

// DOM elements
const timerDisplay = document.getElementById('timer-display');
const timerEditInput = document.getElementById('timer-edit'); // Corrected ID
const timerDisplayContainer = document.getElementById('timer-display-container');
const timerLabel = document.getElementById('timer-label');
const timerProgressRing = document.getElementById('timer-progress'); // Ring SVG
const timerContainer = document.getElementById('timer-container'); // For pulse animation target

const startBtn = document.getElementById('start-btn');
const resetBtn = document.getElementById('reset-btn');
const focusBtn = document.getElementById('focus-btn');
const shortBreakBtn = document.getElementById('short-break-btn');
const longBreakBtn = document.getElementById('long-break-btn');

const completedCountDisplay = document.getElementById('completed-count'); // Today's count
const progressBar = document.getElementById('progress-bar'); // Session cycle progress bar
const progressLabel = document.getElementById('progress-label'); // Session cycle X/Y label

// Pop-out Timer Elements
const popOutBtn = document.getElementById('pop-out-btn');
const popOutTimerElement = document.getElementById('pop-out-timer'); // Corrected var name
const popTimerDisplay = document.getElementById('pop-timer-display');
const popTimerLabel = document.getElementById('pop-timer-label');
const popStartBtn = document.getElementById('pop-start-btn');
const popResetBtn = document.getElementById('pop-reset-btn');
const closePopOutBtn = document.getElementById('close-pop-out');


// Initialize timer
function initTimer() {
  loadCompletedSessionsToday(); // Load count for today
  switchMode('focus', true); // Initial mode without stopping timer
  setupEventListeners();
  updateProgressDisplay(); // Initial progress cycle display

  if (timerProgressRing) { // Initialize progress ring
    const circumference = 2 * Math.PI * 45; // r=45
    timerProgressRing.style.strokeDasharray = circumference;
    timerProgressRing.style.strokeDashoffset = circumference; // Empty at start
  }
}

function setupEventListeners() {
  if (focusBtn) focusBtn.addEventListener('click', () => switchMode('focus'));
  if (shortBreakBtn) shortBreakBtn.addEventListener('click', () => switchMode('shortBreak'));
  if (longBreakBtn) longBreakBtn.addEventListener('click', () => switchMode('longBreak'));
  if (startBtn) startBtn.addEventListener('click', toggleTimer);
  if (resetBtn) resetBtn.addEventListener('click', resetTimer);

  if (timerDisplayContainer) timerDisplayContainer.addEventListener('click', enableTimerEdit);
  if (timerEditInput) {
    timerEditInput.addEventListener('blur', disableTimerEdit);
    timerEditInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') disableTimerEdit(); });
  }

  // Pop-out timer listeners
  if (popOutBtn) popOutBtn.addEventListener('click', togglePopOutTimer);
  if (closePopOutBtn) closePopOutBtn.addEventListener('click', closePopOutTimer);
  if (popStartBtn) popStartBtn.addEventListener('click', toggleTimer);
  if (popResetBtn) popResetBtn.addEventListener('click', resetTimer);
  if (popOutTimerElement) makeElementDraggable(popOutTimerElement);
}


function enableTimerEdit() {
  if (!timerDisplay || !timerEditInput || timerState.isRunning) return;
  stopTimer(); // Ensure timer is paused before editing

  timerDisplay.classList.add('hidden');
  timerEditInput.classList.remove('hidden');

  const minutes = Math.floor(timerState.timeRemaining / 60);
  const seconds = timerState.timeRemaining % 60;
  timerEditInput.value = formatTime(minutes, seconds);
  timerEditInput.focus();
  timerEditInput.select();
}

function disableTimerEdit() {
  if (!timerDisplay || !timerEditInput) return;

  const timePattern = /^(\\d{1,3}):(\\d{2})$/; // Allow up to 3 digits for minutes for flexibility
  const match = timerEditInput.value.match(timePattern);

  if (match) {
    let minutes = parseInt(match[1], 10);
    let seconds = parseInt(match[2], 10);

    if (minutes >= 0 && minutes <= 180 && seconds >= 0 && seconds < 60) { // Max 3 hours
      const newTimeRemaining = (minutes * 60) + seconds;
      if (newTimeRemaining === 0 && timerState.mode === 'focus') {
          // Disallow setting focus timer to 0:00 directly, set to 1 min minimum.
          timerState.timeRemaining = 60;
      } else {
          timerState.timeRemaining = newTimeRemaining;
      }
      timerState.totalDurationAtStart = timerState.timeRemaining; // Update total duration
      updateTimerDisplay();
      updateTimerProgressRing(); // Update ring based on new manual time
    } else {
      // Invalid time, revert to previous or show error
      showToast("Invalid time. Please enter MM:SS (e.g., 25:00, max 180 min).", "error");
      const prevMinutes = Math.floor(timerState.timeRemaining / 60);
      const prevSeconds = timerState.timeRemaining % 60;
      timerEditInput.value = formatTime(prevMinutes, prevSeconds); // Revert input display
    }
  }

  timerEditInput.classList.add('hidden');
  timerDisplay.classList.remove('hidden');
  updateStartButtonText(); // Reflect paused state
}


function switchMode(mode, isInitial = false) {
  if (!isInitial && timerState.isRunning) {
    stopTimer();
  }
  timerState.mode = mode;
  const settings = loadData('settings', SCHEMAS.settings);

  switch (mode) {
    case 'focus':
      timerState.timeRemaining = settings.focusDuration * 60;
      if (timerLabel) timerLabel.textContent = 'Focus Time';
      break;
    case 'shortBreak':
      timerState.timeRemaining = settings.shortBreakDuration * 60;
      if (timerLabel) timerLabel.textContent = 'Short Break';
      break;
    case 'longBreak':
      timerState.timeRemaining = settings.longBreakDuration * 60;
      if (timerLabel) timerLabel.textContent = 'Long Break';
      break;
  }
  timerState.totalDurationAtStart = timerState.timeRemaining; // Store initial duration for this mode

  updateAllDisplays();
  updateModeButtons();
  updateProgressDisplay(); // Update pomodoro cycle progress
}

function updateAllDisplays() {
    updateTimerDisplay();
    updateTimerProgressRing(true); // Reset ring on mode switch
    updatePopOutTimerDisplay();
    updateStartButtonText();
}

function updateModeButtons() {
  [focusBtn, shortBreakBtn, longBreakBtn].forEach(btn => {
    if (btn) {
        btn.classList.remove('bg-indigo-600'); // Or your active class
        btn.setAttribute('aria-pressed', 'false');
    }
  });
  const activeBtn = timerState.mode === 'focus' ? focusBtn :
                    timerState.mode === 'shortBreak' ? shortBreakBtn : longBreakBtn;
  if (activeBtn) {
    activeBtn.classList.add('bg-indigo-600'); // Or your active class
    activeBtn.setAttribute('aria-pressed', 'true');
  }
}

function toggleTimer() {
  if (timerState.isRunning) {
    stopTimer();
  } else {
    if (timerState.timeRemaining === 0 && timerState.mode === 'focus') {
        showToast("Cannot start a focus session with 00:00. Reset or edit time.", "error");
        return;
    }
    startTimer();
  }
  updateStartButtonText();
}

function updateStartButtonText() {
    const text = timerState.isRunning ? 'Pause' : (timerState.timeRemaining < timerState.totalDurationAtStart && timerState.timeRemaining > 0 ? 'Resume' : 'Start');
    if (startBtn) startBtn.textContent = text;
    if (popStartBtn) popStartBtn.textContent = text;
}

function startTimer() {
  if (timerState.isRunning) return;
  timerState.isRunning = true;
  // If resuming, startTime needs to account for already elapsed time.
  // If starting fresh, totalDurationAtStart is the full duration.
  // timeRemaining is what's left. So, elapsed = totalDurationAtStart - timeRemaining.
  const elapsedMs = (timerState.totalDurationAtStart - timerState.timeRemaining) * 1000;
  timerState.startTime = Date.now() - elapsedMs;

  if (timerContainer && !prefersReducedMotion()) timerContainer.classList.add('timer-pulse'); // Visual cue

  timerState.timerId = requestAnimationFrame(tick);
}

function stopTimer() {
  if (!timerState.isRunning) return;
  timerState.isRunning = false;
  if (timerState.timerId) cancelAnimationFrame(timerState.timerId);
  timerState.timerId = null;
  if (timerContainer) timerContainer.classList.remove('timer-pulse');
}

function resetTimer() {
  stopTimer();
  // Reset to the current mode's default duration
  const settings = loadData('settings', SCHEMAS.settings);
  switch (timerState.mode) {
    case 'focus': timerState.timeRemaining = settings.focusDuration * 60; break;
    case 'shortBreak': timerState.timeRemaining = settings.shortBreakDuration * 60; break;
    case 'longBreak': timerState.timeRemaining = settings.longBreakDuration * 60; break;
  }
  timerState.totalDurationAtStart = timerState.timeRemaining; // Update total duration
  updateAllDisplays();
}

function tick() {
  if (!timerState.isRunning) return;

  const now = Date.now();
  const elapsedSinceStartMs = now - timerState.startTime;
  timerState.timeRemaining = Math.max(0, timerState.totalDurationAtStart - Math.floor(elapsedSinceStartMs / 1000));

  updateTimerDisplay();
  updateTimerProgressRing();
  updatePopOutTimerDisplay();

  if (timerState.timeRemaining <= 0) {
    handleTimerCompletion();
  } else {
    timerState.timerId = requestAnimationFrame(tick);
  }
}

function updateTimerDisplay() {
  const minutes = Math.floor(timerState.timeRemaining / 60);
  const seconds = timerState.timeRemaining % 60;
  const formattedTime = formatTime(minutes, seconds);

  if (timerDisplay) timerDisplay.textContent = formattedTime;
  document.title = `${formattedTime} - ${timerLabel ? timerLabel.textContent : 'Pomodoro'}`;
  if (timerState.isRunning && window.pulseTimerDisplay) window.pulseTimerDisplay();
}

function updateTimerProgressRing(reset = false) {
  if (!timerProgressRing) return;
  const radius = timerProgressRing.r.baseVal.value;
  const circumference = 2 * Math.PI * radius;
  timerProgressRing.style.strokeDasharray = circumference;

  let progressFraction;
  if (reset || timerState.totalDurationAtStart === 0) { // Prevent division by zero
      progressFraction = 1; // Empty ring
  } else {
      progressFraction = timerState.timeRemaining / timerState.totalDurationAtStart;
  }

  const offset = circumference * (1 - Math.max(0, Math.min(1, progressFraction)));

  // Animate ring using GSAP if available, otherwise direct style
  if (window.gsap && !prefersReducedMotion()) {
    gsap.to(timerProgressRing, { strokeDashoffset: offset, duration: 0.5, ease: 'power1.out' });
  } else {
    timerProgressRing.style.strokeDashoffset = offset;
  }
}


function handleTimerCompletion() {
  stopTimer();
  const settings = loadData('settings', SCHEMAS.settings);

  if (settings.enableSounds && window.playSound) {
    window.playSound(timerState.mode === 'focus' ? 'complete' : 'break');
  }
  if (settings.enableNotifications && window.showNotification) {
    const title = timerState.mode === 'focus' ? 'Focus session complete!' : 'Break time over!';
    const message = timerState.mode === 'focus' ? 'Time for a break!' : 'Ready to focus again?';
    window.showNotification(title, { body: message });
  }

  if (timerState.mode === 'focus') {
    timerState.completedSessionsToday++;
    if (window.incrementTaskPomodoro) window.incrementTaskPomodoro();
    saveSessionRecord();
    updateStreak();
    updateCompletedCountDisplay();
  }

  // Determine next mode
  // Check for custom sequence first
  const currentSequence = loadData('sequences').find(seq => seq.id === loadData('current_sequence_id')); // Assuming current_sequence_id is stored
  if (currentSequence && currentSequence.steps && currentSequence.steps.length > 0) {
      timerState.currentSequenceStep = (timerState.currentSequenceStep + 1) % currentSequence.steps.length;
      const nextStep = currentSequence.steps[timerState.currentSequenceStep];
      switchMode(nextStep.type); // switchMode will set time based on sequence step
      timerState.timeRemaining = nextStep.duration * 60;
      timerState.totalDurationAtStart = timerState.timeRemaining;
      // TODO: Update custom sequence UI if it exists
  } else { // Standard Pomodoro logic
      if (timerState.mode === 'focus') {
        const sessionsBeforeLongBreak = settings.sessionsBeforeLongBreak;
        if (timerState.completedSessionsToday > 0 && timerState.completedSessionsToday % sessionsBeforeLongBreak === 0) {
          switchMode('longBreak');
        } else {
          switchMode('shortBreak');
        }
      } else { // After any break
        switchMode('focus');
      }
  }
  updateAllDisplays();
  updateProgressDisplay(); // Update cycle progress for new mode
  if (timerContainer && window.gsap && !prefersReducedMotion()) {
    gsap.to(timerContainer, { scale: 1.05, duration: 0.2, ease: "power2.out", yoyo: true, repeat: 1 });
  }
}

function saveSessionRecord() {
  const session = {
    timestamp: new Date().toISOString(),
    mode: timerState.mode, // Should be 'focus' when this is called
    duration: timerState.totalDurationAtStart / 60, // Duration in minutes
    completed: true,
    taskId: window.getCurrentTask ? (window.getCurrentTask()?.id || null) : null
  };
  const sessions = loadData('sessions', []);
  sessions.push(session);
  saveData('sessions', sessions);
}

function updateStreak() {
  const todayStr = new Date().toLocaleDateString();
  let streakData = loadData('streak', SCHEMAS.streak);

  if (streakData.lastActiveDay === todayStr) return; // Already counted today

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toLocaleDateString();

  if (streakData.lastActiveDay === yesterdayStr) {
    streakData.currentStreak++;
  } else {
    streakData.currentStreak = 1; // Streak broken or first day
  }
  streakData.lastActiveDay = todayStr;
  streakData.bestStreak = Math.max(streakData.bestStreak, streakData.currentStreak);
  saveData('streak', streakData);
}

function loadCompletedSessionsToday() {
  const todaySessions = getTodaySessions().filter(s => s.mode === 'focus' && s.completed);
  timerState.completedSessionsToday = todaySessions.length;
  updateCompletedCountDisplay();
}

function updateCompletedCountDisplay() {
  if (completedCountDisplay) completedCountDisplay.textContent = timerState.completedSessionsToday;
}

// Update Pomodoro cycle progress (e.g., 2/4 sessions done)
function updateProgressDisplay() {
  if (!progressBar || !progressLabel) return;
  const settings = loadData('settings', SCHEMAS.settings);
  const sessionsInCycle = settings.sessionsBeforeLongBreak;

  // If a custom sequence is active, this logic might need to be different
  // For now, assume standard Pomodoro cycle for this display
  let currentCycleSession = timerState.completedSessionsToday % sessionsInCycle;
  if (timerState.mode === 'focus' && timerState.isRunning) {
      // If a focus session is running, it counts towards the *next* completed one for display
      // This is a bit tricky. If current is 1, display 1/4 (meaning one is done, working on 2nd).
      // If current is 0, but we are in focus, effectively we are on session 1 of cycle.
      if (currentCycleSession === 0 && timerState.completedSessionsToday > 0) {
          // This means we just completed a full cycle.
          currentCycleSession = sessionsInCycle;
      } else if (timerState.mode === 'focus' && timerState.completedSessionsToday === 0 && currentCycleSession === 0){
          // Starting the very first session
          // no change needed, currentCycleSession is 0, display 0/4
      } else if (timerState.mode === 'focus' && currentCycleSession === 0 && timerState.completedSessionsToday > 0) {
          // Starting a new cycle after a long break
          currentCycleSession = 0; // Display 0/4
      }
  } else if (timerState.mode !== 'focus') { // If on break, show progress based on last completed focus
      // currentCycleSession is already correct based on completedSessionsToday % sessionsInCycle
      if (currentCycleSession === 0 && timerState.completedSessionsToday > 0) {
          currentCycleSession = sessionsInCycle; // Show 4/4 if long break just started or is current
      }
  }


  progressLabel.textContent = `${currentCycleSession}/${sessionsInCycle}`;
  progressBar.style.width = sessionsInCycle > 0 ? `${(currentCycleSession / sessionsInCycle) * 100}%` : '0%';
}


// Pop-out Timer Logic
function togglePopOutTimer() {
  if (!popOutTimerElement) return;
  constisHidden = popOutTimerElement.classList.toggle('hidden');
  if (!isHidden && window.gsap && !prefersReducedMotion()) {
    gsap.fromTo(popOutTimerElement, { scale: 0.8, opacity: 0, y: 20 }, { scale: 1, opacity: 1, y: 0, duration: 0.3, ease: "back.out(1.7)" });
  }
  updatePopOutTimerDisplay();
}

function closePopOutTimer() {
  if (!popOutTimerElement) return;
  if (window.gsap && !prefersReducedMotion()) {
    gsap.to(popOutTimerElement, { scale: 0.8, opacity: 0, y: 20, duration: 0.3, ease: "power2.in", onComplete: () => popOutTimerElement.classList.add('hidden') });
  } else {
    popOutTimerElement.classList.add('hidden');
  }
}

function updatePopOutTimerDisplay() {
  if (!popTimerDisplay || !popTimerLabel || popOutTimerElement.classList.contains('hidden')) return;
  const minutes = Math.floor(timerState.timeRemaining / 60);
  const seconds = timerState.timeRemaining % 60;
  popTimerDisplay.textContent = formatTime(minutes, seconds);
  popTimerLabel.textContent = timerLabel ? timerLabel.textContent : 'Timer'; // Use main timer label
  if (popStartBtn) popStartBtn.textContent = timerState.isRunning ? 'Pause' : (timerState.timeRemaining < timerState.totalDurationAtStart && timerState.timeRemaining > 0 ? 'Resume' : 'Start');
}

function makeElementDraggable(elmnt) {
  // ... (draggable logic from original, ensure header selector is correct if pop-out HTML changed)
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  const dragHeader = elmnt.querySelector('.pop-out-header') || elmnt;
  dragHeader.style.cursor = 'move';
  dragHeader.onmousedown = dragMouseDown;

  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
    elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
  }

  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

// Global reference for custom sequences if needed
window.switchToSequenceStep = function(index) {
    // Implementation for custom sequences if they directly control the timer
    // This function is declared in custom-sequences.js, ensure it's loaded
    // For now, this is a placeholder if custom-sequences.js defines it globally.
    console.log("Switching to sequence step (timer.js):", index);
    // Actual logic would involve:
    // const sequence = ... get sequence data ...
    // const step = sequence.steps[index];
    // timerState.currentSequenceStep = index;
    // switchMode(step.type); // This will set defaults
    // timerState.timeRemaining = step.duration * 60; // Override with sequence duration
    // timerState.totalDurationAtStart = timerState.timeRemaining;
    // updateAllDisplays();
    // updateProgressDisplay(); // Update cycle progress based on sequence
};
window.getCurrentSequenceStepIndex = function() {
    return timerState.currentSequenceStep;
};


// Initialize timer when DOM is loaded
document.addEventListener('DOMContentLoaded', initTimer);

// Listen for storage changes to settings and update timer if necessary
window.addEventListener('storage', function(event) {
  if (event.key === `${APP_NAME}_settings` && event.newValue) {
    const newSettings = JSON.parse(event.newValue);
    // If timer is not running, update the current mode's duration
    if (!timerState.isRunning) {
      switch (timerState.mode) {
        case 'focus': timerState.timeRemaining = newSettings.focusDuration * 60; break;
        case 'shortBreak': timerState.timeRemaining = newSettings.shortBreakDuration * 60; break;
        case 'longBreak': timerState.timeRemaining = newSettings.longBreakDuration * 60; break;
      }
      timerState.totalDurationAtStart = timerState.timeRemaining;
      updateAllDisplays();
    }
    updateProgressDisplay(); // Max sessions in cycle might have changed
  }
});
