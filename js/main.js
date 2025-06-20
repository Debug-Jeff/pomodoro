/**
 * Main JavaScript file for the Pomodoro app
 * Contains shared utilities and initialization code
 */

// App constants
const APP_NAME = 'PomodoroApp';
window.APP_NAME = APP_NAME;

const DEFAULT_SETTINGS = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  sessionsBeforeLongBreak: 4,
  enableNotifications: true,
  enableSounds: true,
  soundVolume: 80,
  theme: 'dark',
  notificationSound: 'default_alarm',
  enableBackgroundSync: true,
  enablePushNotifications: false
};
window.DEFAULT_SETTINGS = DEFAULT_SETTINGS;

// Utility functions
function formatTime(minutes, seconds) {
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
window.formatTime = formatTime;

function formatDate(date) {
  return new Date(date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}
window.formatDate = formatDate;

function formatTimeOfDay(date) {
  return new Date(date).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit'
  });
}
window.formatTimeOfDay = formatTimeOfDay;

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
window.prefersReducedMotion = prefersReducedMotion;

async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }
  if (Notification.permission === 'granted') return true;
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
}
window.requestNotificationPermission = requestNotificationPermission;

function showNotification(title, options = {}) {
  if (Notification.permission === 'granted') {
    const notification = new Notification(title, {
      icon: 'assets/logo.png',
      badge: 'assets/icons/clock-3.png',
      silent: false,
      ...options
    });
    return notification;
  }
  return null;
}
window.showNotification = showNotification;

function setAndApplyTheme(themeName) {
  const body = document.body;
  const oldThemeClasses = Array.from(body.classList).filter(cls => cls.startsWith('theme-'));
  body.classList.remove(...oldThemeClasses);
  body.classList.remove('dark-mode', 'light-mode');

  let effectiveTheme = themeName;
  if (themeName === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    effectiveTheme = prefersDark ? 'dark' : 'dim';
    localStorage.setItem(`${APP_NAME}_theme`, 'auto');
    body.classList.add(prefersDark ? 'dark-mode' : 'light-mode');
  } else {
    localStorage.setItem(`${APP_NAME}_theme`, themeName);
  }
  body.classList.add(`theme-${effectiveTheme}`);

  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeColorMeta) {
    setTimeout(() => {
      const computedStyle = getComputedStyle(body);
      const bgColorValue = computedStyle.getPropertyValue('--background-rgb').trim();
      themeColorMeta.content = bgColorValue ? `rgb(${bgColorValue})` : '#0A0A0C';
    }, 60);
  }

  updateThemeBackground(effectiveTheme);
  window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: themeName, effectiveTheme: effectiveTheme } }));
}
window.setAndApplyTheme = setAndApplyTheme;

function updateThemeBackground(effectiveThemeName) {
  const body = document.body;
  const oldBgContainer = document.querySelector('.background-container');
  if (oldBgContainer) oldBgContainer.remove();

  if (prefersReducedMotion() || effectiveThemeName !== 'dark') {
    return;
  }

  if (effectiveThemeName === 'dark' && window.injectAnimatedBackground) {
    window.injectAnimatedBackground();
  }
}

function getCurrentTheme() {
  return localStorage.getItem(`${APP_NAME}_theme`) || DEFAULT_SETTINGS.theme;
}
window.getCurrentTheme = getCurrentTheme;

function setActiveNavLink() {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('nav a.nav-link');
  navLinks.forEach(link => {
    const linkPath = link.getAttribute('href').split('/').pop() || 'index.html';
    if (currentPath === linkPath) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });
}

function initAnalogClock(clockId) {
  const clock = document.getElementById(clockId);
  if (!clock) return;

  // Clear existing content
  clock.innerHTML = '';

  // Create hands
  const hourHand = document.createElement('div');
  hourHand.className = 'hand hour-hand';
  clock.appendChild(hourHand);

  const minuteHand = document.createElement('div');
  minuteHand.className = 'hand minute-hand';
  clock.appendChild(minuteHand);

  const secondHand = document.createElement('div');
  secondHand.className = 'hand second-hand';
  clock.appendChild(secondHand);

  const centerDot = document.createElement('div');
  centerDot.className = 'center-dot';
  clock.appendChild(centerDot);

  function setClock() {
    const now = new Date();
    const seconds = now.getSeconds();
    const secondsDegrees = ((seconds / 60) * 360) - 90;
    secondHand.style.transform = `rotate(${secondsDegrees}deg)`;

    const minutes = now.getMinutes();
    const minutesDegrees = ((minutes / 60) * 360) + ((seconds / 60) * 6) - 90;
    minuteHand.style.transform = `rotate(${minutesDegrees}deg)`;

    const hours = now.getHours();
    const hoursDegrees = ((hours / 12) * 360) + ((minutes / 60) * 30) - 90;
    hourHand.style.transform = `rotate(${hoursDegrees}deg)`;
  }

  // Add clock markings
  if (!clock.dataset.markingsAdded) {
    for (let i = 1; i <= 12; i++) {
      const mark = document.createElement('div');
      mark.classList.add('marking', 'hour-mark');
      const angle = i * 30;
      mark.style.position = 'absolute';
      mark.style.left = '50%';
      mark.style.top = '0%';
      mark.style.transformOrigin = '0% 65px';
      mark.style.transform = `translateX(-50%) rotate(${angle}deg)`;
      clock.appendChild(mark);
    }
    clock.dataset.markingsAdded = 'true';
  }

  setClock();
  if (clock.updateInterval) clearInterval(clock.updateInterval);
  clock.updateInterval = setInterval(setClock, 1000);
}
window.initAnalogClock = initAnalogClock;

document.addEventListener('DOMContentLoaded', () => {
  const savedThemePreference = getCurrentTheme();
  setAndApplyTheme(savedThemePreference);
  setActiveNavLink();

  const quotes = [
    "Focus on the step in front of you, not the whole staircase.",
    "A little progress each day adds up to big results.",
    "The key is not to prioritize what's on your schedule, but to schedule your priorities.",
    "The secret of your future is hidden in your daily routine.",
    "Discipline is choosing between what you want now and what you want most."
  ];
  let quoteIndex = 0;
  const quoteTextElement = document.getElementById('quote-text');
  
  function showQuote(index) {
    if (!quoteTextElement) return;
    if (window.gsap && !prefersReducedMotion()) {
      gsap.to(quoteTextElement, {
        autoAlpha: 0, y: 10, duration: 0.35, ease: 'power2.in', onComplete: () => {
          quoteTextElement.textContent = quotes[index];
          gsap.to(quoteTextElement, { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power2.out' });
        }
      });
    } else {
      quoteTextElement.textContent = quotes[index];
      quoteTextElement.style.opacity = 1;
    }
  }
  
  if (quoteTextElement) {
    showQuote(quoteIndex);
    setInterval(() => {
      quoteIndex = (quoteIndex + 1) % quotes.length;
      showQuote(quoteIndex);
    }, 12000);
  }

  window.pulseTimerDisplay = function () {
    const timerDisplay = document.getElementById('timer-display');
    if (timerDisplay && !prefersReducedMotion()) {
      timerDisplay.classList.add('animate-timer-pulse');
      setTimeout(() => timerDisplay.classList.remove('animate-timer-pulse'), 350);
    }
  };

  const themeSelectDropdowns = document.querySelectorAll('select#theme-select');
  themeSelectDropdowns.forEach(select => {
    select.value = getCurrentTheme();
    select.addEventListener('change', function () { 
      setAndApplyTheme(this.value); 
    });
  });
  
  window.addEventListener('themeChanged', (event) => {
    themeSelectDropdowns.forEach(select => { 
      select.value = event.detail.theme; 
    });
  });

  // Mobile Menu Toggle
  const mobileMenuButton = document.getElementById('mobile-menu-button');
  const mobileMenu = document.getElementById('mobile-menu');
  if (mobileMenuButton && mobileMenu) {
    mobileMenuButton.addEventListener('click', () => {
      const isHidden = mobileMenu.classList.contains('hidden');
      mobileMenuButton.setAttribute('aria-expanded', String(!isHidden));
      if (window.gsap && !prefersReducedMotion()) {
        if (isHidden) {
            mobileMenu.classList.remove('hidden');
            gsap.fromTo(mobileMenu, { height: 0, opacity: 0, y: -10}, { height: 'auto', opacity: 1, y:0, duration: 0.25, ease: 'power1.out'});
        } else {
            gsap.to(mobileMenu, { height: 0, opacity: 0, y: -10, duration: 0.25, ease: 'power1.in', onComplete: () => mobileMenu.classList.add('hidden') });
        }
      } else { 
        mobileMenu.classList.toggle('hidden'); 
      }
    });
  }
});

// Add toast notification functionality
function showToast(message, type = 'info', duration = 3000) {
  const existingToast = document.getElementById('toast-notification');
  if (existingToast) {
    existingToast.remove();
  }
  
  const toast = document.createElement('div');
  toast.id = 'toast-notification';
  toast.className = 'fixed bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-lg shadow-lg z-50 text-white text-sm font-medium';
  
  switch (type) {
    case 'success':
      toast.classList.add('bg-green-500');
      break;
    case 'error':
      toast.classList.add('bg-red-500');
      break;
    case 'warning':
      toast.classList.add('bg-yellow-500');
      break;
    default:
      toast.classList.add('bg-blue-500');
  }
  
  toast.textContent = message;
  document.body.appendChild(toast);
  
  if (window.gsap && !prefersReducedMotion()) {
    gsap.fromTo(toast, 
      { y: 20, opacity: 0 }, 
      { y: 0, opacity: 1, duration: 0.3, ease: 'power2.out' }
    );
    
    setTimeout(() => {
      gsap.to(toast, { 
        y: 20, 
        opacity: 0, 
        duration: 0.3, 
        ease: 'power2.in',
        onComplete: () => toast.remove()
      });
    }, duration);
  } else {
    setTimeout(() => toast.remove(), duration);
  }
}
window.showToast = showToast;