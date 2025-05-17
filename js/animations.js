/**
 * Animations for the Pomodoro app
 * Handles visual effects and transitions
 */

// Initialize landing page animations
function initLandingPage() {
  const logo = document.getElementById('logo');
  const enterAppBtn = document.getElementById('enter-app');
  
  if (logo && window.gsap) {
    // Animate logo
    const logoCircle = logo.querySelector('.logo-circle');
    const logoHands = logo.querySelectorAll('.logo-hand');
    
    gsap.set(logoCircle, { strokeDasharray: 283, strokeDashoffset: 283 });
    gsap.set(logoHands, { strokeDasharray: 50, strokeDashoffset: 50 });
    
    const timeline = gsap.timeline({ delay: 0.5 });
    
    timeline.to(logoCircle, {
      strokeDashoffset: 0,
      duration: 1.5,
      ease: "power2.inOut"
    });
    
    timeline.to(logoHands, {
      strokeDashoffset: 0,
      duration: 1,
      stagger: 0.3,
      ease: "power2.inOut"
    }, "-=0.5");
    
    timeline.from("h1", {
      y: 20,
      opacity: 0,
      duration: 0.8,
      ease: "power2.out"
    }, "-=0.3");
    
    timeline.from("p", {
      y: 20,
      opacity: 0,
      duration: 0.8,
      ease: "power2.out"
    }, "-=0.6");
    
    timeline.from(enterAppBtn, {
      y: 20,
      opacity: 0,
      duration: 0.8,
      ease: "power2.out"
    }, "-=0.4");
  }
  
  // Set up enter app button
  if (enterAppBtn) {
    enterAppBtn.addEventListener('click', () => {
      navigateWithTransition('home.html');
    });
  }
}

// Navigate to a page with transition
function navigateWithTransition(url) {
  const pageTransition = document.getElementById('page-transition');
  
  if (pageTransition) {
    pageTransition.classList.add('active');
    
    setTimeout(() => {
      window.location.href = url;
    }, 300);
  } else {
    window.location.href = url;
  }
}

// Create animated particles
function createParticles() {
  const particlesContainer = document.getElementById('particles');
  if (!particlesContainer) return;
  
  // Check if user prefers reduced motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }
  
  // Create particles
  for (let i = 0; i < 20; i++) {
    const particle = document.createElement('div');
    particle.classList.add('particle');
    
    // Random size between 2px and 6px
    const size = Math.floor(Math.random() * 4) + 2;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    
    // Random position
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.top = `${Math.random() * 100}%`;
    
    // Random color
    const hue = Math.floor(Math.random() * 60) + 200; // Blue to purple range
    particle.style.backgroundColor = `hsl(${hue}, 70%, 70%)`;
    
    // Random animation delay
    particle.style.animationDelay = `${Math.random() * 5}s`;
    
    particlesContainer.appendChild(particle);
  }
}

// Set up page transition effect
function setupPageTransitions() {
  document.addEventListener('DOMContentLoaded', () => {
    const pageTransition = document.getElementById('page-transition');
    if (pageTransition) {
      pageTransition.classList.add('active');
      
      setTimeout(() => {
        pageTransition.classList.remove('active');
      }, 300);
    }
    
    // Set up navigation links
    const navLinks = document.querySelectorAll('a[href]:not([target="_blank"])');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        // Skip if modifier keys are pressed
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        
        const href = link.getAttribute('href');
        
        // Skip for external links or anchors
        if (href.startsWith('http') || href.startsWith('#')) return;
        
        e.preventDefault();
        navigateWithTransition(href);
      });
    });
  });
}

// Initialize animations
setupPageTransitions();