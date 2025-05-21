/**
 * Animations for the Pomodoro app
 * Handles visual effects and transitions
 */

// Initialize landing page animations - This is often called from main.js or index.html directly
// For this refactor, main.js contains a version of this. If this is the one to be used,
// ensure it's called appropriately from the landing page.
function initLandingPage() {
  const logo = document.getElementById('logo');
  const enterAppBtn = document.getElementById('enter-app');

  if (logo && window.gsap && !prefersReducedMotion()) {
    const logoCircle = logo.querySelector('.logo-circle');
    const logoHands = logo.querySelectorAll('.logo-hand');

    gsap.set(logoCircle, { strokeDasharray: 283, strokeDashoffset: 283 });
    gsap.set(logoHands, { opacity: 0 }); // Changed from strokeDasharray for hands for simpler reveal

    const timeline = gsap.timeline({ delay: 0.5 });

    timeline.to(logoCircle, {
      strokeDashoffset: 0,
      duration: 1.0,
      ease: "power2.inOut"
    });

    timeline.to(logoHands, {
      opacity: 1, // Animate opacity for reveal
      duration: 0.8,
      stagger: 0.3,
      ease: "power2.inOut"
    }, "-=0.5");

    // Ensure these elements exist on the landing page
    if (document.querySelector("h1")) {
        timeline.from("h1", { y: 20, opacity: 0, duration: 0.8, ease: "power2.out" }, "-=0.3");
    }
    // Be specific with selectors if there are multiple P tags
    if (document.querySelector("p.landing-subtext")) { // Assuming a class for the landing page subtext
        timeline.from("p.landing-subtext", { y: 20, opacity: 0, duration: 0.8, ease: "power2.out" }, "-=0.6");
    }

    if (enterAppBtn) {
        timeline.from(enterAppBtn, { y: 20, opacity: 0, duration: 0.3, ease: "power2.out" }, "-=0.2");
    }
  }

  if (enterAppBtn) {
    enterAppBtn.addEventListener('click', () => {
      navigateWithTransition('home.html');
    });
  }
}
// Expose if called from HTML: window.initLandingPage = initLandingPage;


// Navigate to a page with transition
function navigateWithTransition(url) {
  const pageTransitionElement = document.getElementById('page-transition'); // Renamed for clarity

  if (pageTransitionElement && !prefersReducedMotion()) {
    pageTransitionElement.classList.add('active');
    setTimeout(() => {
      window.location.href = url;
      // No need to remove 'active' here, new page will load.
    }, 300); // Match CSS transition duration
  } else {
    window.location.href = url;
  }
}
window.navigateWithTransition = navigateWithTransition; // Expose for global use

// Create animated particles (generic version, main.js has a landing-page specific one)
// This function is not explicitly called in the provided HTMLs' inline scripts.
// If it's meant for general background, it needs to be called.
function createGenericParticles() {
  const particlesContainer = document.getElementById('particles-general'); // Needs a distinct ID
  if (!particlesContainer || prefersReducedMotion()) return;

  particlesContainer.innerHTML = ''; // Clear existing particles

  for (let i = 0; i < 15; i++) { // Reduced count for general purpose
    const particle = document.createElement('div');
    particle.classList.add('particle'); // Assumes .particle CSS

    const size = Math.floor(Math.random() * 3) + 2; // 2px to 5px
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;

    particle.style.left = `${Math.random() * 100}%`;
    particle.style.top = `${Math.random() * 100}%`;

    // Use theme-aware colors or a neutral one
    // For now, using a generic light color adaptable to dark themes
    particle.style.backgroundColor = `hsla(220, 70%, 70%, 0.5)`; // Softer blue

    particle.style.animationDelay = `${Math.random() * 8}s`;
    particle.style.animationDuration = `${Math.random() * 10 + 8}s`; // Varied duration

    particlesContainer.appendChild(particle);
  }
}
// window.createGenericParticles = createGenericParticles; // Expose if needed


// Set up page transition effect for page load and navigation links
function setupPageTransitions() {
  const pageTransitionElement = document.getElementById('page-transition');

  // Fade in on page load
  window.addEventListener('load', () => { // Use 'load' to ensure all content is ready
    if (pageTransitionElement && !prefersReducedMotion()) {
      // Start as active (opaque) and fade out
      // This assumes CSS initially has .page-transition with opacity 1 or it's added before this
      // For a fade-in effect, CSS should have opacity 0 initially, then JS adds active to fade to 1, then removes to fade out.
      // The current setup is: opacity 0, add active (opacity 1), then remove active (opacity 0).
      // This would make the page flash visible then invisible.
      // Let's adjust for a "fade out of old page, fade in of new page" feel.
      // On load, we want to fade IN the content. So transition layer should fade OUT.
      pageTransitionElement.classList.remove('active');
    }
  });

  // Set up navigation links for transition
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href]:not([target="_blank"])');
    if (!link) return;

    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // Modifier keys

    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

    // Check if it's an external link or a different domain
    if (link.hostname !== window.location.hostname) return;

    // Check if it's a link that should trigger client-side routing or special handling
    if (link.dataset.noTransition) return;


    e.preventDefault();
    if (pageTransitionElement && !prefersReducedMotion()) {
        pageTransitionElement.classList.add('active'); // Fade OUT old content
        setTimeout(() => {
            window.location.href = href;
        }, 300); // Duration of fade out
    } else {
        window.location.href = href;
    }
  });
}


// Inject animated background (stars and twinkling only, assumed CSS exists)
function injectAnimatedBackground() {
  if (prefersReducedMotion()) return;

  const oldBg = document.querySelector('.background-container');
  if (oldBg) oldBg.remove();

  const bgContainer = document.createElement('div');
  bgContainer.className = 'background-container'; // Assumes CSS handles positioning

  const stars = document.createElement('div');
  stars.className = 'stars'; // Assumes CSS for .stars
  bgContainer.appendChild(stars);

  const twinkling = document.createElement('div');
  twinkling.className = 'twinkling'; // Assumes CSS for .twinkling
  bgContainer.appendChild(twinkling);

  // Insert at the beginning of body so it's behind other content
  document.body.insertBefore(bgContainer, document.body.firstChild);
}
window.injectAnimatedBackground = injectAnimatedBackground;

// Initialize animations
document.addEventListener('DOMContentLoaded', () => {
    // If not on landing page, setup general transitions. Landing page has its own.
    if (!document.getElementById('logo') || !document.getElementById('enter-app')) {
        setupPageTransitions();
    }
    // Inject background if called from specific pages' inline scripts
    // The injectAnimatedBackground() is now called from inline scripts of HTML pages.
});
