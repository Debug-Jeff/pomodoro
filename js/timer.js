/**
 * Timer functionality for the Pomodoro app
 * Handles countdown, mode switching, and session tracking
 */

let timerState = {
  mode: 'focus',
  timeRemaining: DEFAULT_SETTINGS.focusDuration * 60,
  isRunning: false,
  startTime: null,
  totalDurationAtStart: DEFAULT_SETTINGS.focusDuration * 60,
  timerId: null,
  completedSessionsToday: 0,
  currentSequenceStep: 0,
};

// DOM elements (main timer)
const timerDisplayElement = document.getElementById('timer-display');
const timerEditInputElement = document.getElementById('timer-edit');
const timerDisplayContainerElement = document.getElementById('timer-display-container');
const timerLabelElement = document.getElementById('timer-label');
const timerProgressRingElement = document.getElementById('timer-progress');
const timerContainerElement = document.getElementById('timer-container');

const startButton = document.getElementById('start-btn');
const resetButton = document.getElementById('reset-btn');
const focusModeButton = document.getElementById('focus-btn');
const shortBreakModeButton = document.getElementById('short-break-btn');
const longBreakModeButton = document.getElementById('long-break-btn');

const completedCountDisplayElement = document.getElementById('completed-count');
const cycleProgressBarElement = document.getElementById('progress-bar');
const cycleProgressLabelElement = document.getElementById('progress-label');

// Pop-out Timer Elements (global for potential cross-page access attempts)
window.popOutTimerGlobalElement = null;
window.popTimerDisplayGlobalElement = null;
window.popTimerLabelGlobalElement = null;
window.popStartBtnGlobalElement = null;
window.popResetBtnGlobalElement = null;
window.closePopOutBtnGlobalElement = null;


function initTimerModule() {
  // Assign pop-out elements if they exist on the current page
  window.popOutTimerGlobalElement = document.getElementById('pop-out-timer');
  if (window.popOutTimerGlobalElement) {
    window.popTimerDisplayGlobalElement = document.getElementById('pop-timer-display');
    window.popTimerLabelGlobalElement = document.getElementById('pop-timer-label');
    window.popStartBtnGlobalElement = document.getElementById('pop-start-btn');
    window.popResetBtnGlobalElement = document.getElementById('pop-reset-btn');
    window.closePopOutBtnGlobalElement = document.getElementById('close-pop-out');
  }

  loadCompletedSessionsToday();
  const initialSettings = loadData('settings', SCHEMAS.settings);
  timerState.timeRemaining = initialSettings.focusDuration * 60;
  timerState.totalDurationAtStart = timerState.timeRemaining;

  switchModeAndSequence('focus', null, true); // Initial mode without stopping timer
  setupTimerEventListeners();
  updatePomodoroCycleDisplay();

  if (timerProgressRingElement) {
    const radius = timerProgressRingElement.r.baseVal.value;
    const circumference = 2 * Math.PI * radius;
    timerProgressRingElement.style.strokeDasharray = circumference;
    timerProgressRingElement.style.strokeDashoffset = 0; // Full at start, will be updated
  }
  updateTimerProgressRingVisual(true); // Set initial visual state of ring
  globalUpdatePopOutTimerDisplayStatus(); // Check if pop-out should be shown
}

function setupTimerEventListeners() {
  if (focusModeButton) focusModeButton.addEventListener('click', () => switchModeAndSequence('focus'));
  if (shortBreakModeButton) shortBreakModeButton.addEventListener('click', () => switchModeAndSequence('shortBreak'));
  if (longBreakModeButton) longBreakModeButton.addEventListener('click', () => switchModeAndSequence('longBreak'));
  if (startButton) startButton.addEventListener('click', toggleTimerExecution);
  if (resetButton) resetButton.addEventListener('click', resetCurrentTimer);

  if (timerDisplayContainerElement) timerDisplayContainerElement.addEventListener('click', enableTimerDisplayEdit);
  if (timerEditInputElement) {
    timerEditInputElement.addEventListener('blur', disableTimerDisplayEdit);
    timerEditInputElement.addEventListener('keydown', (e) => { if (e.key === 'Enter') disableTimerDisplayEdit(); });
  }

  if (window.popOutTimerGlobalElement && document.getElementById('pop-out-btn')) {
    document.getElementById('pop-out-btn').addEventListener('click', togglePopOutTimerVisibility);
  }
  if (window.closePopOutBtnGlobalElement) window.closePopOutBtnGlobalElement.addEventListener('click', closePopOutTimer);
  if (window.popStartBtnGlobalElement) window.popStartBtnGlobalElement.addEventListener('click', toggleTimerExecution);
  if (window.popResetBtnGlobalElement) window.popResetBtnGlobalElement.addEventListener('click', resetCurrentTimer);
  if (window.popOutTimerGlobalElement) makeTimerElementDraggable(window.popOutTimerGlobalElement);
}

function enableTimerDisplayEdit() {
  if (!timerDisplayElement || !timerEditInputElement || timerState.isRunning) {
    if (timerState.isRunning && window.showToast) window.showToast("Pause timer to edit time.", "info");
    return;
  }
  timerDisplayElement.classList.add('hidden');
  timerEditInputElement.classList.remove('hidden');
  const minutes = Math.floor(timerState.timeRemaining / 60);
  const seconds = timerState.timeRemaining % 60;
  timerEditInputElement.value = formatTime(minutes, seconds);
  timerEditInputElement.focus();
  timerEditInputElement.select();
}

function disableTimerDisplayEdit() {
  if (!timerDisplayElement || !timerEditInputElement) return;
  const timePattern = /^(\\d{1,3}):(\\d{2})$/;
  const match = timerEditInputElement.value.match(timePattern);
  let timeChanged = false;

  if (match) {
    let minutes = parseInt(match[1], 10);
    let seconds = parseInt(match[2], 10);
    if (minutes >= 0 && minutes <= 180 && seconds >= 0 && seconds < 60) { // Max 3 hours
      let newTime = (minutes * 60) + seconds;
      if (newTime === 0 && timerState.mode === 'focus') {
        newTime = 60; // Min 1 min for focus
        if (window.showToast) window.showToast("Focus time set to minimum 01:00.", "info");
      }
      if (timerState.timeRemaining !== newTime) {
        timerState.timeRemaining = newTime;
        timerState.totalDurationAtStart = newTime; // User explicitly set this duration
        timeChanged = true;
      }
    } else if (window.showToast) {
      window.showToast("Invalid time. Reverted.", "error");
    }
  } else if (timerEditInputElement.value !== "" && window.showToast) { // Value was entered but didn't match pattern
    window.showToast("Invalid format. Use MM:SS.", "error");
  }

  timerEditInputElement.classList.add('hidden');
  timerDisplayElement.classList.remove('hidden');

  if (timeChanged) {
    updateAllTimerDisplays(); // Update main, popout, title
    updateTimerProgressRingVisual(true); // Reset ring to new duration
  }
  updateStartButtonUIText();
}

function switchModeAndSequence(mode, sequenceStepIndex = null, isInitial = false) {
  if (!isInitial && timerState.isRunning) stopTimerExecution();

  const settings = loadData('settings', SCHEMAS.settings);
  let newDurationSeconds;
  let newLabel;

  const activeSequenceId = loadData('active_sequence_id');
  const sequences = loadData('sequences', []);
  const currentSequence = activeSequenceId ? sequences.find(s => s.id === activeSequenceId) : null;

  if (currentSequence && sequenceStepIndex !== null && currentSequence.steps[sequenceStepIndex]) {
    const step = currentSequence.steps[sequenceStepIndex];
    timerState.mode = step.type;
    newDurationSeconds = step.duration * 60;
    newLabel = step.type === 'focus' ? 'Focus Time' : step.type === 'shortBreak' ? 'Short Break' : 'Long Break';
    timerState.currentSequenceStep = sequenceStepIndex;
    if (window.updateCustomSequenceUI) window.updateCustomSequenceUI(); // Update home page sequence display
  } else {
    // Standard mode switch or sequence ended/cleared
    timerState.mode = mode;
    timerState.currentSequenceStep = 0; // Reset sequence step if not in a sequence call
    if (activeSequenceId && !currentSequence) saveData('active_sequence_id', null); // Clear invalid active sequence

    switch (mode) {
      case 'focus': newDurationSeconds = settings.focusDuration * 60; newLabel = 'Focus Time'; break;
      case 'shortBreak': newDurationSeconds = settings.shortBreakDuration * 60; newLabel = 'Short Break'; break;
      case 'longBreak': newDurationSeconds = settings.longBreakDuration * 60; newLabel = 'Long Break'; break;
      default: newDurationSeconds = settings.focusDuration * 60; newLabel = 'Focus Time';
    }
  }

  timerState.timeRemaining = newDurationSeconds;
  timerState.totalDurationAtStart = newDurationSeconds;
  if (timerLabelElement) timerLabelElement.textContent = newLabel;

  updateAllTimerDisplays();
  updateModeButtonUI();
  updatePomodoroCycleDisplay();
  updateTimerProgressRingVisual(true); // Reset ring for new mode/duration
}
// Make switchModeAndSequence globally available for custom-sequences.js
window.timerJsSwitchToSequenceStep = (index) => switchModeAndSequence(null, index);
window.timerJsSwitchMode = (mode) => switchModeAndSequence(mode);


function updateAllTimerDisplays() {
  updateMainTimerDisplay();
  updatePopOutTimerFullDisplay(); // Syncs content and visibility state
  updateStartButtonUIText();
}

function updateModeButtonUI() {
  [focusModeButton, shortBreakModeButton, longBreakModeButton].forEach(btn => {
    if (btn) {
      btn.classList.remove('bg-[rgb(var(--primary-rgb))]', 'text-[rgb(var(--primary-foreground-rgb))]', 'shadow-md');
      btn.setAttribute('aria-pressed', 'false');
    }
  });
  let activeBtn;
  if (timerState.mode === 'focus') activeBtn = focusModeButton;
  else if (timerState.mode === 'shortBreak') activeBtn = shortBreakModeButton;
  else if (timerState.mode === 'longBreak') activeBtn = longBreakModeButton;

  if (activeBtn) {
    activeBtn.classList.add('bg-[rgb(var(--primary-rgb))]', 'text-[rgb(var(--primary-foreground-rgb))]', 'shadow-md');
    activeBtn.setAttribute('aria-pressed', 'true');
  }
}

function toggleTimerExecution() {
  if (timerState.isRunning) {
    stopTimerExecution();
  } else {
    if (timerState.timeRemaining === 0 && timerState.mode === 'focus') {
      if (window.showToast) window.showToast("Cannot start 00:00 focus. Edit time.", "error");
      return;
    }
    startTimerExecution();
  }
  updateStartButtonUIText();
}

function updateStartButtonUIText() {
  const text = timerState.isRunning ? 'Pause' :
    (timerState.timeRemaining < timerState.totalDurationAtStart && timerState.timeRemaining > 0 ? 'Resume' : 'Start');
  if (startButton) startButton.textContent = text;
  if (window.popStartBtnGlobalElement) window.popStartBtnGlobalElement.textContent = text;
}

function startTimerExecution() {
  if (timerState.isRunning) return;
  timerState.isRunning = true;
  const elapsedMs = (timerState.totalDurationAtStart - timerState.timeRemaining) * 1000;
  timerState.startTime = Date.now() - elapsedMs;

  if (timerContainerElement && !prefersReducedMotion()) timerContainerElement.classList.add('timer-pulse');
  if (timerState.timerId) cancelAnimationFrame(timerState.timerId); // Clear any existing frame
  timerState.timerId = requestAnimationFrame(timerTick);
}

function stopTimerExecution() {
  if (!timerState.isRunning) return;
  timerState.isRunning = false;
  if (timerState.timerId) cancelAnimationFrame(timerState.timerId);
  timerState.timerId = null;
  if (timerContainerElement) timerContainerElement.classList.remove('timer-pulse');
}

function resetCurrentTimer() {
  stopTimerExecution();
  const settings = loadData('settings', SCHEMAS.settings);
  let newDuration;
  // Check if in a sequence, if so, reset to current step's duration
  const activeSeqId = loadData('active_sequence_id');
  const sequences = loadData('sequences', []);
  const currentSeq = activeSeqId ? sequences.find(s => s.id === activeSeqId) : null;

  if (currentSeq && currentSeq.steps[timerState.currentSequenceStep]) {
    newDuration = currentSeq.steps[timerState.currentSequenceStep].duration * 60;
  } else { // Standard mode durations
    switch (timerState.mode) {
      case 'focus': newDuration = settings.focusDuration * 60; break;
      case 'shortBreak': newDuration = settings.shortBreakDuration * 60; break;
      case 'longBreak': newDuration = settings.longBreakDuration * 60; break;
      default: newDuration = settings.focusDuration * 60;
    }
  }
  timerState.timeRemaining = newDuration;
  timerState.totalDurationAtStart = newDuration;
  updateAllTimerDisplays();
  updateTimerProgressRingVisual(true); // Reset ring fully
}

function timerTick() {
  if (!timerState.isRunning) return;
  const now = Date.now();
  const elapsedSinceStartMs = now - timerState.startTime;
  const newTimeRemaining = timerState.totalDurationAtStart - Math.floor(elapsedSinceStartMs / 1000);
  timerState.timeRemaining = Math.max(0, newTimeRemaining);

  updateMainTimerDisplay();
  updateTimerProgressRingVisual();
  updatePopOutTimerFullDisplay(); // Keep pop-out synced

  if (timerState.timeRemaining <= 0) {
    handleTimerSessionCompletion();
  } else {
    timerState.timerId = requestAnimationFrame(timerTick);
  }
}

function updateMainTimerDisplay() {
  const minutes = Math.floor(timerState.timeRemaining / 60);
  const seconds = timerState.timeRemaining % 60;
  const formattedTime = formatTime(minutes, seconds);

  if (timerDisplayElement) timerDisplayElement.textContent = formattedTime;
  const currentLabel = timerLabelElement ? timerLabelElement.textContent : (timerState.mode.charAt(0).toUpperCase() + timerState.mode.slice(1));
  document.title = `${formattedTime} - ${currentLabel}`;
  if (timerState.isRunning && window.pulseTimerDisplay) window.pulseTimerDisplay();
}

function updateTimerProgressRingVisual(resetRing = false) {
  if (!timerProgressRingElement) return;
  const radius = timerProgressRingElement.r.baseVal.value;
  const circumference = 2 * Math.PI * radius;
  timerProgressRingElement.style.strokeDasharray = circumference;

  let progressFraction = 0; // Default to full ring (offset 0)
  if (timerState.totalDurationAtStart > 0 && !resetRing) {
    progressFraction = timerState.timeRemaining / timerState.totalDurationAtStart;
  }

  const offset = circumference * (1 - Math.max(0, Math.min(1, progressFraction)));

  if (window.gsap && !prefersReducedMotion()) {
    gsap.to(timerProgressRingElement, { strokeDashoffset: offset, duration: timerState.isRunning ? 0.9 : 0.4, ease: 'linear' });
  } else {
    timerProgressRingElement.style.strokeDashoffset = offset;
  }
}

function handleTimerSessionCompletion() {
  stopTimerExecution();
  const settings = loadData('settings', SCHEMAS.settings);

  if (settings.enableSounds && window.playSound) {
    let soundKey = settings.notificationSound || 'default_alarm';
    if (timerState.mode !== 'focus') { // Different sound for break completion
      soundKey = settings.breakNotificationSound || 'retro_notify'; // Assuming breakNotificationSound setting exists
    }
    window.playSound(soundKey);
  }
  if (settings.enableNotifications && window.showNotification) {
    const title = timerState.mode === 'focus' ? 'Focus session complete!' : 'Break time over!';
    const message = timerState.mode === 'focus' ? 'Well done! Time for a break.' : 'Ready for the next focus session?';
    window.showNotification(title, { body: message, tag: `pomodoro-${timerState.mode}` });
  }

  if (timerState.mode === 'focus') {
    timerState.completedSessionsToday++;
    if (window.incrementTaskPomodoro) window.incrementTaskPomodoro();
    recordCompletedSession();
    updateDailyStreak();
    updateCompletedSessionsDisplay();
  }

  // Determine next mode (sequence or standard)
  const activeSequenceId = loadData('active_sequence_id');
  const sequences = loadData('sequences', []);
  const currentSequence = activeSequenceId ? sequences.find(s => s.id === activeSequenceId) : null;

  if (currentSequence && currentSequence.steps && currentSequence.steps.length > 0) {
    const nextStepIndex = (timerState.currentSequenceStep + 1) % currentSequence.steps.length;
    switchModeAndSequence(null, nextStepIndex);
    if (window.dispatchEvent) window.dispatchEvent(new CustomEvent('timerSequenceStepChanged', { detail: { currentStepIndex: nextStepIndex } }));

  } else { // Standard Pomodoro logic
    if (timerState.mode === 'focus') {
      const sessionsForLongBreak = settings.sessionsBeforeLongBreak;
      if (timerState.completedSessionsToday > 0 && timerState.completedSessionsToday % sessionsForLongBreak === 0) {
        switchModeAndSequence('longBreak');
      } else {
        switchModeAndSequence('shortBreak');
      }
    } else { // After any break
      switchModeAndSequence('focus');
    }
  }
  updateAllTimerDisplays();
  updatePomodoroCycleDisplay();
  if (timerContainerElement && window.gsap && !prefersReducedMotion()) {
    gsap.fromTo(timerContainerElement, { scale: 1 }, { scale: 1.03, duration: 0.15, yoyo: true, repeat: 1, ease: "power1.out" });
  }
}

function recordCompletedSession() {
  const session = {
    timestamp: new Date().toISOString(),
    mode: timerState.mode,
    duration: timerState.totalDurationAtStart / 60,
    completed: true,
    taskId: window.getCurrentTask ? (window.getCurrentTask()?.id || null) : null
  };
  const sessions = loadData('sessions', []);
  sessions.push(session);
  saveData('sessions', sessions);
}

function updateDailyStreak() {
  const todayStr = new Date().toLocaleDateString();
  let streakData = loadData('streak', SCHEMAS.streak);
  if (streakData.lastActiveDay === todayStr && timerState.mode === 'focus') return; // Only count first focus session of the day for streak

  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toLocaleDateString();

  if (streakData.lastActiveDay === yesterdayStr) {
    streakData.currentStreak++;
  } else if (streakData.lastActiveDay !== todayStr) { // If not yesterday and not today, streak broken
    streakData.currentStreak = 1;
  } else { // Already recorded today but this is a subsequent focus session, don't increment streak
    // No change to currentStreak if lastActiveDay is today but this is not the first focus session of the day triggering streak update
  }

  streakData.lastActiveDay = todayStr; // Mark today as active
  streakData.bestStreak = Math.max(streakData.bestStreak, streakData.currentStreak);
  saveData('streak', streakData);
}

function loadCompletedSessionsToday() {
  const todayFocusSessions = getTodaySessions().filter(s => s.mode === 'focus' && s.completed);
  timerState.completedSessionsToday = todayFocusSessions.length;
  updateCompletedSessionsDisplay();
}

function updateCompletedSessionsDisplay() {
  if (completedCountDisplayElement) completedCountDisplayElement.textContent = timerState.completedSessionsToday;
}

function updatePomodoroCycleDisplay() {
  if (!cycleProgressBarElement || !cycleProgressLabelElement) return;
  const settings = loadData('settings', SCHEMAS.settings);
  const sessionsInCycle = settings.sessionsBeforeLongBreak;

  let completedInCurrentCycle = timerState.completedSessionsToday % sessionsInCycle;
  if (completedInCurrentCycle === 0 && timerState.completedSessionsToday > 0) {
    completedInCurrentCycle = sessionsInCycle; // Show 4/4 if cycle just completed
  }

  // If currently in a focus session that's not yet complete, it's the "next" one in the cycle.
  // This display typically shows *completed* sessions towards the next long break.
  // So, completedInCurrentCycle as calculated above is usually correct.
  // If timerState.mode is 'focus' and isRunning, and completedInCurrentCycle is sessionsInCycle, it means user is ON the last session of cycle.
  // If timerState.mode is 'longBreak', it means completedInCurrentCycle should show sessionsInCycle.

  cycleProgressLabelElement.textContent = `${completedInCurrentCycle}/${sessionsInCycle}`;
  const progressPercent = sessionsInCycle > 0 ? (completedInCurrentCycle / sessionsInCycle) * 100 : 0;
  cycleProgressBarElement.style.width = `${progressPercent}%`;
}


// --- Pop-out Timer Logic ---
function togglePopOutTimerVisibility() {
  if (!window.popOutTimerGlobalElement) return;
  const isHidden = window.popOutTimerGlobalElement.classList.toggle('hidden');
  if (!isHidden) {
    const popOutState = loadData('popOutTimerState', { x: null, y: null });
    if (popOutState.x !== null && popOutState.y !== null) {
      window.popOutTimerGlobalElement.style.left = popOutState.x;
      window.popOutTimerGlobalElement.style.top = popOutState.y;
    } else {
      window.popOutTimerGlobalElement.style.right = '30px'; // Default position
      window.popOutTimerGlobalElement.style.top = '75px';  // Default position
      window.popOutTimerGlobalElement.style.left = 'auto';
    }
    if (window.gsap && !prefersReducedMotion()) {
      gsap.fromTo(window.popOutTimerGlobalElement, { scale: 0.85, opacity: 0, y: 15 }, { scale: 1, opacity: 1, y: 0, duration: 0.25, ease: "back.out(1.5)" });
    }
  }
  saveData('popOutTimerOpen', !isHidden);
  updatePopOutTimerFullDisplay(); // Sync content
}

function closePopOutTimer() {
  if (!window.popOutTimerGlobalElement) return;
  if (window.gsap && !prefersReducedMotion()) {
    gsap.to(window.popOutTimerGlobalElement, { scale: 0.85, opacity: 0, y: 15, duration: 0.25, ease: "power2.in", onComplete: () => window.popOutTimerGlobalElement.classList.add('hidden') });
  } else {
    window.popOutTimerGlobalElement.classList.add('hidden');
  }
  saveData('popOutTimerOpen', false);
}

function updatePopOutTimerFullDisplay() {
  if (!window.popOutTimerGlobalElement) return; // Element might not be on this page

  // Visibility based on stored preference
  const isOpen = loadData('popOutTimerOpen', false);
  if (isOpen && window.popOutTimerGlobalElement.classList.contains('hidden')) {
    // Restore position and show
    const popOutState = loadData('popOutTimerState', { x: 'auto', y: '75px' });
    window.popOutTimerGlobalElement.style.left = popOutState.x || 'auto';
    window.popOutTimerGlobalElement.style.top = popOutState.y || '75px';
    window.popOutTimerGlobalElement.style.right = (popOutState.x === 'auto' && !popOutState.x) ? '30px' : 'auto';
    window.popOutTimerGlobalElement.classList.remove('hidden');
  } else if (!isOpen && !window.popOutTimerGlobalElement.classList.contains('hidden')) {
    window.popOutTimerGlobalElement.classList.add('hidden');
  }

  // Update content if visible
  if (!window.popOutTimerGlobalElement.classList.contains('hidden')) {
    const minutes = Math.floor(timerState.timeRemaining / 60);
    const seconds = timerState.timeRemaining % 60;
    if (window.popTimerDisplayGlobalElement) window.popTimerDisplayGlobalElement.textContent = formatTime(minutes, seconds);

    const currentLabelText = timerLabelElement ? timerLabelElement.textContent : (timerState.mode.charAt(0).toUpperCase() + timerState.mode.slice(1) + " Mode");
    if (window.popTimerLabelGlobalElement) window.popTimerLabelGlobalElement.textContent = currentLabelText;

    updateStartButtonUIText(); // This updates popStartBtn as well
  }
}


function makeTimerElementDraggable(elmnt) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  const dragHeader = elmnt.querySelector('.pop-out-header') || elmnt;
  dragHeader.style.cursor = 'move';
  dragHeader.onmousedown = dragMouseDown;

  function dragMouseDown(e) {
    e = e || window.event; e.preventDefault();
    pos3 = e.clientX; pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }
  function elementDrag(e) {
    e = e || window.event; e.preventDefault();
    pos1 = pos3 - e.clientX; pos2 = pos4 - e.clientY;
    pos3 = e.clientX; pos4 = e.clientY;
    elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
    elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
    elmnt.style.right = 'auto'; // Clear right when dragging by left/top
  }
  function closeDragElement() {
    document.onmouseup = null; document.onmousemove = null;
    saveData('popOutTimerState', { x: elmnt.style.left, y: elmnt.style.top });
  }
}

// Expose functions for custom sequences to call
window.getCurrentSequenceStepIndex = () => timerState.currentSequenceStep;

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('timer-display')) { // Only run full init if on a page with the main timer
    initTimerModule();
  }
  globalUpdatePopOutTimerDisplayStatus(); // Always check pop-out status
});

// For pages without the main timer, this function updates the pop-out status and time.
function globalUpdatePopOutTimerDisplayStatus() {
  if (!window.popOutTimerGlobalElement && document.getElementById('pop-out-timer')) {
    // Initialize pop-out elements if not done by initTimerModule (e.g. on dashboard/settings page)
    window.popOutTimerGlobalElement = document.getElementById('pop-out-timer');
    window.popTimerDisplayGlobalElement = document.getElementById('pop-timer-display');
    window.popTimerLabelGlobalElement = document.getElementById('pop-timer-label');
    // Buttons might not exist/be functional on non-timer pages, primarily for display
  }
  updatePopOutTimerFullDisplay(); // Checks stored open state and updates
}

// Refresh pop-out periodically IF timer.js's main tick isn't running on this page.
// This is a fallback. Ideally, timer state is globally managed or events are used.
setInterval(() => {
  if (loadData('popOutTimerOpen', false) && window.popOutTimerGlobalElement && !timerState.isRunning) {
    // If timer is not running (e.g. user is on another page),
    // we need a way to get the latest timerState.
    // This is complex. For now, it will only show the last known state from timerState object.
    // A proper solution would involve localStorage for timerState or a Service Worker.
    updatePopOutTimerFullDisplay();
  }
}, 2000);


window.addEventListener('storage', function (event) {
  if (event.key === `${APP_NAME}_settings` && event.newValue) {
    const newSettings = JSON.parse(event.newValue);
    if (!timerState.isRunning) { // Only update if timer not running
      let newDuration = timerState.totalDurationAtStart;
      switch (timerState.mode) {
        case 'focus': newDuration = newSettings.focusDuration * 60; break;
        case 'shortBreak': newDuration = newSettings.shortBreakDuration * 60; break;
        case 'longBreak': newDuration = newSettings.longBreakDuration * 60; break;
      }
      // Only update if the duration for the current mode actually changed
      if (timerState.totalDurationAtStart !== newDuration && timerState.timeRemaining === timerState.totalDurationAtStart) {
        timerState.timeRemaining = newDuration;
        timerState.totalDurationAtStart = newDuration;
        updateAllTimerDisplays();
        updateTimerProgressRingVisual(true);
      }
    }
    updatePomodoroCycleDisplay(); // Max sessions in cycle might have changed
  }

  function updateAllDisplays() {
    requestAnimationFrame(() => {
      updateTimerDisplay();
      updateTimerProgressRing(true);
      updatePopOutTimerDisplay();
      updateStartButtonText();
    });
  }
  // If timer state itself was stored due to page navigation (advanced):
  // if (event.key === `${APP_NAME}_timerState` && event.newValue) { ... update local timerState ... }
});