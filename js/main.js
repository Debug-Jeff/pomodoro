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
  notificationSound: 'default_alarm', // Added default for notification sound
  enableBackgroundSync: true,
  enablePushNotifications: false
};
window.DEFAULT_SETTINGS = DEFAULT_SETTINGS;

// Utility functions
function formatTime(minutes, seconds) {
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatDate(date) {
  return new Date(date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function formatTimeOfDay(date) {
  return new Date(date).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
window.prefersReducedMotion = prefersReducedMotion; // Make global if used by other modules directly

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
      icon: 'assets/logo.png', // Ensure this path is correct
      badge: 'assets/icons/clock-badge.png', // Optional: for Android notifications
      silent: false, // Explicitly not silent unless overridden
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
    effectiveTheme = prefersDark ? 'dark' : 'dim'; // Auto can default to dark or dim
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
        themeColorMeta.content = bgColorValue ? `rgb(${bgColorValue})` : '#0A0A0C'; // Fallback
    }, 60); // Increased delay slightly
  }

  updateThemeBackground(effectiveTheme);
  window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: themeName, effectiveTheme: effectiveTheme } }));
}
window.setAndApplyTheme = setAndApplyTheme;

function updateThemeBackground(effectiveThemeName) {
    const body = document.body;
    // This function relies on themes.css setting:
    // body.theme-xxx { --bg-image-current: var(--bg-image-xxx-clouds); background-image: var(--bg-image-current); }
    // So, just applying the class theme-xxx should trigger the CSS to set the background.
    // The JS part is mainly for the starfield on dark theme.

    // Handle starfield for dark theme
    const dynamicBgContainer = document.getElementById('dynamic-animated-background'); // A dedicated div for stars
    if (effectiveThemeName === 'dark') {
        if (window.injectAnimatedBackground && !document.querySelector('.background-container')) {
            window.injectAnimatedBackground(); // This function should create '.background-container' with stars
        } else if (document.querySelector('.background-container')) {
            document.querySelector('.background-container').style.display = 'block'; // Ensure visible
        }
    } else {
        const existingStarContainer = document.querySelector('.background-container');
        if (existingStarContainer) existingStarContainer.style.display = 'none'; // Hide for other themes
    }
}


function getCurrentTheme() {
    return localStorage.getItem(`${APP_NAME}_theme`) || DEFAULT_SETTINGS.theme;
}
window.getCurrentTheme = getCurrentTheme;

function setActiveNavLink() {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html'; // Default to index.html if path is empty
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

    // Create hands if they don't exist (more robust)
    let hourHand = clock.querySelector('.hour-hand');
    if (!hourHand) { hourHand = document.createElement('div'); hourHand.className = 'hand hour-hand'; clock.appendChild(hourHand); }
    let minuteHand = clock.querySelector('.minute-hand');
    if (!minuteHand) { minuteHand = document.createElement('div'); minuteHand.className = 'hand minute-hand'; clock.appendChild(minuteHand); }
    let secondHand = clock.querySelector('.second-hand');
    if (!secondHand) { secondHand = document.createElement('div'); secondHand.className = 'hand second-hand'; clock.appendChild(secondHand); }
    let centerDot = clock.querySelector('.center-dot');
    if (!centerDot) { centerDot = document.createElement('div'); centerDot.className = 'center-dot'; clock.appendChild(centerDot); }

    function setClock() {
        const now = new Date();
        const seconds = now.getSeconds();
        const secondsDegrees = ((seconds / 60) * 360) - 90; // Offset for 12 at top
        secondHand.style.transform = `rotate(${secondsDegrees}deg)`;

        const minutes = now.getMinutes();
        const minutesDegrees = ((minutes / 60) * 360) + ((seconds / 60) * 6) - 90;
        minuteHand.style.transform = `rotate(${minutesDegrees}deg)`;

        const hours = now.getHours();
        const hoursDegrees = ((hours / 12) * 360) + ((minutes / 60) * 30) - 90;
        hourHand.style.transform = `rotate(${hoursDegrees}deg)`;
    }

    // Add clock markings only once
    if (!clock.dataset.markingsAdded) {
        for (let i = 1; i <= 12; i++) {
            const mark = document.createElement('div');
            mark.classList.add('marking', 'hour-mark');
            // Position calculation needs to account for hand transform-origin (bottom center)
            // and clock center. Simpler: use absolute positioning with rotation.
            const angle = i * 30; // 30 degrees per hour
            mark.style.position = 'absolute';
            mark.style.left = '50%';
            mark.style.top = '0%'; // Start from top edge of clock for rotation
            mark.style.transformOrigin = '0% 65px'; // Rotate around center (65px is radius for 130px clock)
            mark.style.transform = `translateX(-50%) rotate(${angle}deg)`;
            clock.appendChild(mark);
        }
        clock.dataset.markingsAdded = 'true';
    }

    setClock();
    if (clock.updateInterval) clearInterval(clock.updateInterval); // Clear existing interval if any
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
        gsap.to(quoteTextElement, { autoAlpha: 0, y: 10, duration: 0.35, ease: 'power2.in', onComplete: () => {
            quoteTextElement.textContent = quotes[index];
            gsap.to(quoteTextElement, { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power2.out' });
        }});
    } else {
        quoteTextElement.textContent = quotes[index];
        quoteTextElement.style.opacity = 1; // Ensure visible if no GSAP
    }
  }
  if (quoteTextElement) {
    showQuote(quoteIndex);
    setInterval(() => {
      quoteIndex = (quoteIndex + 1) % quotes.length;
      showQuote(quoteIndex);
    }, 12000); // Slower quote change
  }

  window.pulseTimerDisplay = function() {
    const timerDisplay = document.getElementById('timer-display');
    if (timerDisplay && !prefersReducedMotion()) {
      timerDisplay.classList.add('animate-timer-pulse');
      setTimeout(() => timerDisplay.classList.remove('animate-timer-pulse'), 350);
    }
  };

  const themeSelectDropdowns = document.querySelectorAll('select#theme-select');
  themeSelectDropdowns.forEach(select => {
      select.value = getCurrentTheme();
      select.addEventListener('change', function() { setAndApplyTheme(this.value); });
  });
  window.addEventListener('themeChanged', (event) => {
      themeSelectDropdowns.forEach(select => { select.value = event.detail.theme; });
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
            gsap.fromTo(mobileMenu, { height: 0, opacity: 0 }, { height: 'auto', opacity: 1, duration: 0.3, ease: 'power1.out' });
        } else {
            gsap.to(mobileMenu, { height: 0, opacity: 0, duration: 0.3, ease: 'power1.in', onComplete: () => mobileMenu.classList.add('hidden') });
        }
      } else {
        mobileMenu.classList.toggle('hidden');
      }
    });
  }
});

// Timer pulse animation CSS (ensure it uses theme variables)
const pulseStyle = document.createElement('style');
pulseStyle.innerHTML = `
@keyframes timer-pulse-anim {
  0% { text-shadow: 0 0 0 rgba(var(--primary-rgb), 0.6), 0 0 0 rgb(var(--foreground-rgb)); }
  50% { text-shadow: 0 0 10px rgba(var(--primary-rgb), 0.8), 0 0 6px rgb(var(--foreground-rgb)); }
  100% { text-shadow: 0 0 0 rgba(var(--primary-rgb), 0.6), 0 0 0 rgb(var(--foreground-rgb)); }
}
.animate-timer-pulse {
  animation: timer-pulse-anim 0.35s cubic-bezier(.4,0,.2,1);
}
`;
document.head.appendChild(pulseStyle);

// This was in main.js before, for the landing page.
// It's better called from index.html's inline script if it's specific to that page.
// If initLandingPageAnimations uses elements not on other pages, it might error.
// For now, I've removed the auto-call from main.js. index.html's inline script handles it.
