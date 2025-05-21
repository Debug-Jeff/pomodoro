/**
 * Main JavaScript file for the Pomodoro app
 * Contains shared utilities and initialization code
 */

// App constants
const APP_NAME = 'PomodoroApp'; // Made accessible globally for other scripts
window.APP_NAME = APP_NAME;

const DEFAULT_SETTINGS = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  sessionsBeforeLongBreak: 4,
  enableNotifications: true,
  enableSounds: true,
  soundVolume: 80, // Changed from 'volume' to 'soundVolume' for consistency
  theme: 'dark', // Default theme
  enableBackgroundSync: true, // Kept from original settings.js
  enablePushNotifications: false // Kept from original settings.js
};
window.DEFAULT_SETTINGS = DEFAULT_SETTINGS; // Make accessible

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

// Navigation active state
function setActiveNavLink() {
  const currentPath = window.location.pathname.split('/').pop(); // Get last part of path
  const navLinks = document.querySelectorAll('nav a.nav-link');

  navLinks.forEach(link => {
    const linkPath = link.getAttribute('href').split('/').pop();
    if (currentPath === linkPath || (currentPath === '' && linkPath === 'index.html')) {
      link.setAttribute('aria-current', 'page');
      // CSS handles active styling via [aria-current="page"]
    } else {
      link.removeAttribute('aria-current');
    }
  });
}

// Check if user prefers reduced motion
function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Request notification permission
async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

// Show notification
function showNotification(title, options = {}) {
  if (Notification.permission === 'granted') {
    const notification = new Notification(title, {
      icon: 'assets/logo.png', // Ensure this path is correct
      ...options
    });
    return notification;
  }
  return null;
}

// Apply theme by changing body class and saving to localStorage
function setAndApplyTheme(themeName) {
  const body = document.body;
  // Remove all theme-`name` classes
  body.className = body.className.replace(/\\btheme-\\w+/g, '').trim();

  if (themeName === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    body.classList.add(prefersDark ? 'theme-dark' : 'theme-dim'); // Example: auto defaults to dim or dark
    localStorage.setItem(`${APP_NAME}_theme`, 'auto');
  } else {
    body.classList.add(`theme-${themeName}`);
    localStorage.setItem(`${APP_NAME}_theme`, themeName);
  }

  // Update theme color meta tag (optional, good for mobile browser chrome)
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeColorMeta) {
    // This needs to be more dynamic based on the actual theme's background
    let color = '#121214'; // Default dark
    if (themeName === 'dim') color = '#1e293b'; // Slate-800
    else if (themeName === 'purple') color = '#2e1a47';
    else if (themeName === 'ocean') color = '#0f172a';
    else if (themeName === 'sunset') color = '#1f0f0f';
    themeColorMeta.content = color;
  }
  // Dispatch a custom event for other components to listen to theme changes
  window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: themeName } }));
}
window.setAndApplyTheme = setAndApplyTheme; // Expose globally

function getCurrentTheme() {
    return localStorage.getItem(`${APP_NAME}_theme`) || DEFAULT_SETTINGS.theme;
}
window.getCurrentTheme = getCurrentTheme;


// Initialize app on DOM content loaded
document.addEventListener('DOMContentLoaded', () => {
  // Apply theme from localStorage or default
  const savedTheme = localStorage.getItem(`${APP_NAME}_theme`) || DEFAULT_SETTINGS.theme;
  setAndApplyTheme(savedTheme);

  // Set active navigation link
  setActiveNavLink();

  // Animated Quotes logic (from original main.js)
  const quotes = [
    "Stay focused and never give up.",
    "Small steps every day lead to big results.",
    "Breaks are part of the process, not a distraction.",
    "You are capable of amazing things.",
    "Discipline is the bridge between goals and accomplishment.",
    "Progress, not perfection.",
    "The secret of getting ahead is getting started.",
    "Your future is created by what you do today."
  ];
  let quoteIndex = 0;
  const quoteText = document.getElementById('quote-text');
  function showQuote(index) {
    if (!quoteText) return;
    quoteText.style.opacity = 0;
    quoteText.style.transform = 'translateY(5px)';
    setTimeout(() => {
      quoteText.textContent = quotes[index];
      quoteText.style.opacity = 1;
      quoteText.style.transform = 'translateY(0px)';
    }, 400);
  }
  function nextQuote() {
    quoteIndex = (quoteIndex + 1) % quotes.length;
    showQuote(quoteIndex);
  }
  if (quoteText) {
    showQuote(quoteIndex); // Show initial quote
    setInterval(nextQuote, 10000); // Change quote every 10 seconds
  }

  // Timer pulse animation helper
  window.pulseTimerDisplay = function() {
    const timerDisplay = document.getElementById('timer-display');
    if (timerDisplay && !prefersReducedMotion()) {
      timerDisplay.classList.add('animate-timer-pulse');
      setTimeout(() => timerDisplay.classList.remove('animate-timer-pulse'), 350);
    }
  };

    // Global listener for theme select dropdowns (if any exist on the page)
    const themeSelectDropdowns = document.querySelectorAll('select#theme-select');
    themeSelectDropdowns.forEach(select => {
        select.value = getCurrentTheme(); // Set initial value
        select.addEventListener('change', function() {
            setAndApplyTheme(this.value);
        });
    });
     // Update dropdown when theme changed by other means (e.g. settings page)
    window.addEventListener('themeChanged', (event) => {
        themeSelectDropdowns.forEach(select => {
            select.value = event.detail.theme;
        });
    });
});

// Timer pulse animation CSS (from original main.js)
const style = document.createElement('style');
style.innerHTML = `
@keyframes timer-pulse-anim {
  0% { text-shadow: 0 0 0 rgba(var(--primary-rgb), 0.7), 0 0 0 #fff; }
  50% { text-shadow: 0 0 12px rgba(var(--primary-rgb), 0.7), 0 0 8px #fff; }
  100% { text-shadow: 0 0 0 rgba(var(--primary-rgb), 0.7), 0 0 0 #fff; }
}
.animate-timer-pulse {
  animation: timer-pulse-anim 0.35s cubic-bezier(.4,0,.2,1);
}
`;
document.head.appendChild(style);

// Landing page specific initialization (moved from animations.js for clarity if this is the primary landing page script)
function initLandingPageAnimations() {
  const logo = document.getElementById('logo'); // Assuming index.html has this
  const enterAppBtn = document.getElementById('enter-app'); // Assuming index.html has this

  if (logo && window.gsap && !prefersReducedMotion()) {
    const logoCircle = logo.querySelector('.logo-circle');
    const logoHands = logo.querySelectorAll('.logo-hand');

    gsap.set(logoCircle, { strokeDasharray: 283, strokeDashoffset: 283 });
    gsap.set(logoHands, { opacity: 0 });

    const timeline = gsap.timeline({ delay: 0.5 });

    timeline.to(logoCircle, {
      strokeDashoffset: 0,
      duration: 1.0,
      ease: "power2.inOut"
    });

    timeline.to(logoHands, {
      opacity: 1,
      duration: 0.8, // Matched to h1
      stagger: 0.3,
      ease: "power2.inOut"
    }, "-=0.5");

    // Assuming h1, p, enter-app are part of the landing page structure
    timeline.from("h1", { y: 20, opacity: 0, duration: 0.8, ease: "power2.out" }, "-=0.3");
    timeline.from("p.landing-subtext", { y: 20, opacity: 0, duration: 0.8, ease: "power2.out" }, "-=0.6"); // Added class for specificity
    if (enterAppBtn) {
      timeline.from(enterAppBtn, { y: 20, opacity: 0, duration: 0.3, ease: "power2.out" }, "-=0.2");
    }
  }

  if (enterAppBtn) {
    enterAppBtn.addEventListener('click', () => {
      // Use navigateWithTransition if available from animations.js, otherwise direct nav
      if (typeof window.navigateWithTransition === 'function') {
        window.navigateWithTransition('home.html');
      } else {
        window.location.href = 'home.html';
      }
    });
  }

  // Create particles for landing page
  const particlesContainer = document.getElementById('particles'); // Assuming index.html has this
  if (particlesContainer && !prefersReducedMotion()) {
    for (let i = 0; i < 20; i++) { // Reduced from 30 for potentially better performance
        const particle = document.createElement('div');
        particle.classList.add('particle'); // Assuming .particle styles are in animated-background.css

        const size = Math.floor(Math.random() * 20) + 5; // Smaller range
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;

        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = `${Math.random() * 100}%`;

        const hue = Math.floor(Math.random() * 60) + 200; // Blue to purple
        particle.style.backgroundColor = `hsla(${hue}, 70%, 70%, 0.2)`; // Softer alpha

        particle.style.animationDelay = `${Math.random() * 7}s`; // Longer delay variation
        particle.style.animationDuration = `${Math.random() * 10 + 10}s`; // Varied duration

        particlesContainer.appendChild(particle);
    }
  }
}

// Call landing page init if on the landing page (e.g. check for a specific element)
if (document.getElementById('logo') && document.getElementById('enter-app')) {
    initLandingPageAnimations();
}
