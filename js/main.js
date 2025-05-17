/**
 * Main JavaScript file for the Pomodoro app
 * Contains shared utilities and initialization code
 */

// App constants
const APP_NAME = 'PomodoroApp';
const DEFAULT_SETTINGS = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  sessionsBeforeLongBreak: 4,
  enableNotifications: true,
  enableSounds: true,
  volume: 80,
  theme: 'dark' // 'dark', 'dim', or 'auto'
};

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
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll('nav a');
  
  navLinks.forEach(link => {
    const linkPath = new URL(link.href).pathname;
    if (currentPath.includes(linkPath) && linkPath !== '/index.html') {
      link.setAttribute('aria-current', 'page');
      link.classList.remove('text-opacity-70');
    } else {
      link.removeAttribute('aria-current');
      if (!link.classList.contains('text-opacity-70') && !currentPath.includes(linkPath)) {
        link.classList.add('text-opacity-70');
      }
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
      icon: 'assets/logo.svg',
      ...options
    });
    
    return notification;
  }
  return null;
}

// Apply theme
function applyTheme(theme) {
  const body = document.body;
  
  // Remove existing theme classes
  body.classList.remove('theme-dark', 'theme-dim');
  
  if (theme === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    body.classList.add(prefersDark ? 'theme-dark' : 'theme-dim');
  } else {
    body.classList.add(`theme-${theme}`);
  }
  
  // Update theme color meta tag
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeColorMeta) {
    themeColorMeta.content = theme === 'dim' ? '#1f2937' : '#121212';
  }
}

// Initialize landing page
function initLandingPage() {
  // Create particles
  const particlesContainer = document.getElementById('particles');
  if (particlesContainer) {
    const reduceMotion = prefersReducedMotion();
    
    if (!reduceMotion) {
      for (let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        
        // Random size between 10px and 40px
        const size = Math.floor(Math.random() * 30) + 10;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        
        // Random position
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = `${Math.random() * 100}%`;
        
        // Random color
        const hue = Math.floor(Math.random() * 60) + 220; // Blue to purple range
        particle.style.backgroundColor = `hsla(${hue}, 70%, 60%, 0.3)`;
        
        // Random animation delay
        particle.style.animationDelay = `${Math.random() * 5}s`;
        
        particlesContainer.appendChild(particle);
      }
    }
  }
  
  // Handle enter app button
  const enterAppBtn = document.getElementById('enter-app');
  if (enterAppBtn) {
    enterAppBtn.addEventListener('click', () => {
      window.location.href = 'home.html';
    });
  }
  
  // Animate logo
  const logo = document.getElementById('logo');
  if (logo && !prefersReducedMotion()) {
    const logoCircle = logo.querySelector('.logo-circle');
    const logoHands = logo.querySelectorAll('.logo-hand');
    
    // Use GSAP for animation
    if (window.gsap) {
      // Initial state
      gsap.set(logoCircle, { strokeDasharray: 283, strokeDashoffset: 283 });
      gsap.set(logoHands, { opacity: 0 });
      
      // Animation timeline
      const tl = gsap.timeline();
      
      tl.to(logoCircle, { 
        strokeDashoffset: 0, 
        duration: 1.5, 
        ease: "power2.inOut" 
      });
      
      tl.to(logoHands, { 
        opacity: 1, 
        duration: 0.5, 
        stagger: 0.2,
        ease: "power2.out" 
      });
      
      // Subtle rotation animation for the second hand
      tl.to(logoHands[1], {
        rotate: 360,
        transformOrigin: "0 0",
        duration: 20,
        repeat: -1,
        ease: "linear"
      });
    }
  }
}

// Initialize app on DOM content loaded
document.addEventListener('DOMContentLoaded', () => {
  // Set active navigation link
  setActiveNavLink();
  
  // Apply theme from settings
  const settings = JSON.parse(localStorage.getItem(`${APP_NAME}_settings`)) || DEFAULT_SETTINGS;
  applyTheme(settings.theme);
});