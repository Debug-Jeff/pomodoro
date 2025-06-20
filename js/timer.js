/**
 * Timer functionality for the Pomodoro app
 * Handles countdown, mode switching, and session tracking
 */

let timerState = {
  mode: 'focus',
  timeRemaining: 25 * 60,
  isRunning: false,
  startTime: null,
  totalDurationAtStart: 25 * 60,
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

// Pop-out Timer Elements
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
  const initialSettings = loadData('settings', window.DEFAULT_SETTINGS);
  timerState.timeRemaining = initialSettings.focusDuration * 60;
  timerState.totalDurationAtStart = timerState.timeRemaining;

  switchModeAndSequence('focus', null, true);
  setupTimerEventListeners();
  updatePomodoroCycleDisplay();

  if (timerProgressRingElement) {
    const radius = timerProgressRingElement.r.baseVal.value;
    const circumference = 2 * Math.PI * radius;
    timerProgressRingElement.style.strokeDasharray = circumference;
    timerProgressRingElement.style.strokeDashoffset = 0;
  }
  updateTimerProgressRingVisual(true);
  globalUpdatePopOutTimerDisplayStatus();
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
    timerEditInputElement.addEventListener('keydown', (e) => { 
      if (e.key === 'Enter') {
        e.preventDefault();
        disableTimerDisplayEdit();
      }
    });
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
  
  const timePattern = /^(\d{1,3}):(\d{2})$/;
  const match = timerEditInputElement.value.match(timePattern);
  let timeChanged = false;

  if (match) {
    let minutes = parseInt(match[1], 10);
    let seconds = parseInt(match[2], 10);
    if (minutes >= 0 && minutes <= 180 && seconds >= 0 && seconds < 60) {
      let newTime = (minutes * 60) + seconds;
      if (newTime === 0 && timerState.mode === 'focus') {
        newTime = 60;
        if (window.showToast) window.showToast("Focus time set to minimum 01:00.", "info");
      }
      if (timerState.timeRemaining !== newTime) {
        timerState.timeRemaining = newTime;
        timerState.totalDurationAtStart = newTime;
        timeChanged = true;
      }
    } else if (window.showToast) {
      window.showToast("Invalid time. Use MM:SS format (max 180:00).", "error");
    }
  } else if (timerEditInputElement.value !== "" && window.showToast) {
    window.showToast("Invalid format. Use MM:SS.", "error");
  }

  timerEditInputElement.classList.add('hidden');
  timerDisplayElement.classList.remove('hidden');

  if (timeChanged) {
    updateAllTimerDisplays();
    updateTimerProgressRingVisual(true);
  }
  updateStartButtonUIText();
}

function switchModeAndSequence(mode, sequenceStepIndex = null, isInitial = false) {
  if (!isInitial && timerState.isRunning) stopTimerExecution();

  const settings = loadData('settings', window.DEFAULT_SETTINGS);
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
    if (window.updateCustomSequenceUI) window.updateCustomSequenceUI();
  } else {
    timerState.mode = mode;
    timerState.currentSequenceStep = 0;
    if (activeSequenceId && !currentSequence) saveData('active_sequence_id', null);

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
  updateTimerProgressRingVisual(true);
}

window.timerJsSwitchToSequenceStep = (index) => switchModeAndSequence(null, index);
window.timerJsSwitchMode = (mode) => switchModeAndSequence(mode);

function updateAllTimerDisplays() {
  updateMainTimerDisplay();
  updatePopOutTimerFullDisplay();
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
  if (timerState.timerId) cancelAnimationFrame(timerState.timerId);
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
  const settings = loadData('settings', window.DEFAULT_SETTINGS);
  let newDuration;
  
  const activeSeqId = loadData('active_sequence_id');
  const sequences = loadData('sequences', []);
  const currentSeq = activeSeqId ? sequences.find(s => s.id === activeSeqId) : null;

  if (currentSeq && currentSeq.steps[timerState.currentSequenceStep]) {
    newDuration = currentSeq.steps[timerState.currentSequenceStep].duration * 60;
  } else {
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
  updateTimerProgressRingVisual(true);
}

function timerTick() {
  if (!timerState.isRunning) return;
  const now = Date.now();
  const elapsedSinceStartMs = now - timerState.startTime;
  const newTimeRemaining = timerState.totalDurationAtStart - Math.floor(elapsedSinceStartMs / 1000);
  timerState.timeRemaining = Math.max(0, newTimeRemaining);

  updateMainTimerDisplay();
  updateTimerProgressRingVisual();
  updatePopOutTimerFullDisplay();

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

  let progressFraction = 0;
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
  const settings = loadData('settings', window.DEFAULT_SETTINGS);

  if (settings.enableSounds && window.playSound) {
    let soundKey = settings.notificationSound || 'default_alarm';
    if (timerState.mode !== 'focus') {
      soundKey = settings.breakNotificationSound || 'retro_notify';
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

  const activeSequenceId = loadData('active_sequence_id');
  const sequences = loadData('sequences', []);
  const currentSequence = activeSequenceId ? sequences.find(s => s.id === activeSequenceId) : null;

  if (currentSequence && currentSequence.steps && currentSequence.steps.length > 0) {
    const nextStepIndex = (timerState.currentSequenceStep + 1) % currentSequence.steps.length;
    switchModeAndSequence(null, nextStepIndex);
    if (window.dispatchEvent) window.dispatchEvent(new CustomEvent('timerSequenceStepChanged', { detail: { currentStepIndex: nextStepIndex } }));
  } else {
    if (timerState.mode === 'focus') {
      const sessionsForLongBreak = settings.sessionsBeforeLongBreak;
      if (timerState.completedSessionsToday > 0 && timerState.completedSessionsToday % sessionsForLongBreak === 0) {
        switchModeAndSequence('longBreak');
      } else {
        switchModeAndSequence('shortBreak');
      }
    } else {
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
  let streakData = loadData('streak', window.SCHEMAS.streak);
  if (streakData.lastActiveDay === todayStr && timerState.mode === 'focus') return;

  const yesterday = new Date(); 
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toLocaleDateString();

  if (streakData.lastActiveDay === yesterdayStr) {
    streakData.currentStreak++;
  } else if (streakData.lastActiveDay !== todayStr) {
    streakData.currentStreak = 1;
  }

  streakData.lastActiveDay = todayStr;
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
  const settings = loadData('settings', window.DEFAULT_SETTINGS);
  const sessionsInCycle = settings.sessionsBeforeLongBreak;

  let completedInCurrentCycle = timerState.completedSessionsToday % sessionsInCycle;
  if (completedInCurrentCycle === 0 && timerState.completedSessionsToday > 0) {
    completedInCurrentCycle = sessionsInCycle;
  }

  cycleProgressLabelElement.textContent = `${completedInCurrentCycle}/${sessionsInCycle}`;
  const progressPercent = sessionsInCycle > 0 ? (completedInCurrentCycle / sessionsInCycle) * 100 : 0;
  cycleProgressBarElement.style.width = `${progressPercent}%`;
}

// Pop-out Timer Logic
function togglePopOutTimerVisibility() {
  if (!window.popOutTimerGlobalElement) return;
  const isHidden = window.popOutTimerGlobalElement.classList.toggle('hidden');
  if (!isHidden) {
    const popOutState = loadData('popOutTimerState', { x: null, y: null });
    if (popOutState.x !== null && popOutState.y !== null) {
      window.popOutTimerGlobalElement.style.left = popOutState.x;
      window.popOutTimerGlobalElement.style.top = popOutState.y;
    } else {
      window.popOutTimerGlobalElement.style.right = '30px';
      window.popOutTimerGlobalElement.style.top = '75px';
      window.popOutTimerGlobalElement.style.left = 'auto';
    }
    if (window.gsap && !prefersReducedMotion()) {
      gsap.fromTo(window.popOutTimerGlobalElement, { scale: 0.85, opacity: 0, y: 15 }, { scale: 1, opacity: 1, y: 0, duration: 0.25, ease: "back.out(1.5)" });
    }
  }
  saveData('popOutTimerOpen', !isHidden);
  updatePopOutTimerFullDisplay();
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
  if (!window.popOutTimerGlobalElement) return;

  const isOpen = loadData('popOutTimerOpen', false);
  if (isOpen && window.popOutTimerGlobalElement.classList.contains('hidden')) {
    const popOutState = loadData('popOutTimerState', { x: 'auto', y: '75px' });
    window.popOutTimerGlobalElement.style.left = popOutState.x || 'auto';
    window.popOutTimerGlobalElement.style.top = popOutState.y || '75px';
    window.popOutTimerGlobalElement.style.right = (popOutState.x === 'auto' && !popOutState.x) ? '30px' : 'auto';
    window.popOutTimerGlobalElement.classList.remove('hidden');
  } else if (!isOpen && !window.popOutTimerGlobalElement.classList.contains('hidden')) {
    window.popOutTimerGlobalElement.classList.add('hidden');
  }

  if (!window.popOutTimerGlobalElement.classList.contains('hidden')) {
    const minutes = Math.floor(timerState.timeRemaining / 60);
    const seconds = timerState.timeRemaining % 60;
    if (window.popTimerDisplayGlobalElement) window.popTimerDisplayGlobalElement.textContent = formatTime(minutes, seconds);

    const currentLabelText = timerLabelElement ? timerLabelElement.textContent : (timerState.mode.charAt(0).toUpperCase() + timerState.mode.slice(1) + " Mode");
    if (window.popTimerLabelGlobalElement) window.popTimerLabelGlobalElement.textContent = currentLabelText;

    updateStartButtonUIText();
  }
}

function makeTimerElementDraggable(elmnt) {
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
    elmnt.style.right = 'auto';
  }
  
  function closeDragElement() {
    document.onmouseup = null; 
    document.onmousemove = null;
    saveData('popOutTimerState', { x: elmnt.style.left, y: elmnt.style.top });
  }
}

window.getCurrentSequenceStepIndex = () => timerState.currentSequenceStep;

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('timer-display')) {
    initTimerModule();
  }
  globalUpdatePopOutTimerDisplayStatus();
});

function globalUpdatePopOutTimerDisplayStatus() {
  if (!window.popOutTimerGlobalElement && document.getElementById('pop-out-timer')) {
    window.popOutTimerGlobalElement = document.getElementById('pop-out-timer');
    window.popTimerDisplayGlobalElement = document.getElementById('pop-timer-display');
    window.popTimerLabelGlobalElement = document.getElementById('pop-timer-label');
  }
  updatePopOutTimerFullDisplay();
}

setInterval(() => {
  if (loadData('popOutTimerOpen', false) && window.popOutTimerGlobalElement && !timerState.isRunning) {
    updatePopOutTimerFullDisplay();
  }
}, 2000);

window.addEventListener('storage', function (event) {
  if (event.key === `${APP_NAME}_settings` && event.newValue) {
    const newSettings = JSON.parse(event.newValue);
    if (!timerState.isRunning) {
      let newDuration = timerState.totalDurationAtStart;
      switch (timerState.mode) {
        case 'focus': newDuration = newSettings.focusDuration * 60; break;
        case 'shortBreak': newDuration = newSettings.shortBreakDuration * 60; break;
        case 'longBreak': newDuration = newSettings.longBreakDuration * 60; break;
      }
      if (timerState.totalDurationAtStart !== newDuration && timerState.timeRemaining === timerState.totalDurationAtStart) {
        timerState.timeRemaining = newDuration;
        timerState.totalDurationAtStart = newDuration;
        updateAllTimerDisplays();
        updateTimerProgressRingVisual(true);
      }
    }
    updatePomodoroCycleDisplay();
  }
});