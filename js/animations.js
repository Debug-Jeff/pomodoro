/**
 * Animations for the Pomodoro app
 * Handles visual effects and transitions
 */

// This function is intended for the landing page (index.html)
// It's called from index.html's inline script.
function initLandingPageVisuals() { // Renamed to avoid conflict if main.js had one
  const logo = document.getElementById('logo-landing'); // Specific ID for landing page
  const enterAppBtn = document.getElementById('enter-app-btn'); // Specific ID

  if (logo && window.gsap && !prefersReducedMotion()) {
    const logoCircle = logo.querySelector('.logo-circle-landing');
    const logoHands = logo.querySelectorAll('.logo-hand-landing');
    const title = document.querySelector('h1.landing-title');
    const subtext = document.querySelector('p.landing-subtext');

    gsap.set([logoCircle, ...logoHands, title, subtext, enterAppBtn], { autoAlpha: 0 });
    gsap.set(logoCircle, { strokeDasharray: 283, strokeDashoffset: 283 });
    gsap.set(enterAppBtn, { y: 20 });

    const tl = gsap.timeline({ delay: 0.3 });
    tl.to(logoCircle, { strokeDashoffset: 0, autoAlpha: 1, duration: 1.2, ease: "power2.inOut" })
      .to(logoHands, { autoAlpha: 1, duration: 0.8, stagger: 0.25, ease: "elastic.out(1, 0.75)" }, "-=0.6")
      .to(title, { y: 0, autoAlpha: 1, duration: 0.7, ease: "power2.out" }, "-=0.5")
      .to(subtext, { y: 0, autoAlpha: 1, duration: 0.7, ease: "power2.out" }, "-=0.5")
      .to(enterAppBtn, { y: 0, autoAlpha: 1, duration: 0.5, ease: "back.out(1.7)" }, "-=0.3");
  } else if (logo && enterAppBtn) { // Basic fallback if no GSAP or reduced motion
    logo.style.opacity = 1;
    const title = document.querySelector('h1.landing-title');
    const subtext = document.querySelector('p.landing-subtext');
    if (title) title.style.opacity = 1;
    if (subtext) subtext.style.opacity = 1;
    enterAppBtn.style.opacity = 1;
    enterAppBtn.style.transform = 'translateY(0px)';
  }

  if (enterAppBtn) {
    enterAppBtn.addEventListener('click', () => {
      navigateWithTransition('home.html');
    });
  }
}
// window.initLandingPageVisuals = initLandingPageVisuals; // Expose if needed, but index.html calls it directly.


function navigateWithTransition(url) {
  const pageTransitionElement = document.getElementById('page-transition');
  if (pageTransitionElement && !prefersReducedMotion()) {
    pageTransitionElement.classList.add('active'); // Makes it opaque
    setTimeout(() => {
      window.location.href = url;
      // Page will reload, transition element will be reset by new page's CSS.
    }, 350); // Match CSS transition duration
  } else {
    window.location.href = url;
  }
}
window.navigateWithTransition = navigateWithTransition;


function setupPageLoadTransition() {
  const pageTransitionElement = document.getElementById('page-transition');
  window.addEventListener('load', () => {
    if (pageTransitionElement && !prefersReducedMotion()) {
      // Transition layer should start opaque (CSS opacity 1 or add 'active' class before this)
      // Then fade out by removing 'active'
      setTimeout(() => { // Ensure content is painted before fade-out
        pageTransitionElement.classList.remove('active'); // Fades out the overlay
      }, 50);
    } else if (pageTransitionElement) {
      pageTransitionElement.style.opacity = '0'; // Instantly hide if reduced motion
      pageTransitionElement.style.pointerEvents = 'none';
    }
  });
}


function injectAnimatedBackground() {
  const body = document.body;
  const effectiveTheme = Array.from(body.classList).find(c => c.startsWith('theme-')) || 'theme-dark';
  const isActuallyDark = effectiveTheme === 'theme-dark' || (effectiveTheme === 'theme-auto' && body.classList.contains('dark-mode'));

  const oldBgContainer = document.querySelector('.background-container');
  if (oldBgContainer) oldBgContainer.remove();

  if (prefersReducedMotion() || !isActuallyDark) {
    // If not dark or reduced motion, ensure cosmic cloud backgrounds (set by CSS) are not interfered with
    // and no star container is added.
    return;
  }

  // Only inject stars/twinkling for dark theme
  const bgContainer = document.createElement('div');
  bgContainer.id = "dynamic-animated-background"; // Consistent ID
  bgContainer.className = 'background-container'; // CSS handles positioning and z-index

  const stars = document.createElement('div');
  stars.className = 'stars'; // CSS should define animation for .stars
  bgContainer.appendChild(stars);

  const twinkling = document.createElement('div');
  twinkling.className = 'twinkling'; // CSS should define animation for .twinkling
  bgContainer.appendChild(twinkling);

  // Insert at the beginning of body, so it's behind other content
  document.body.insertBefore(bgContainer, document.body.firstChild);
}
window.injectAnimatedBackground = injectAnimatedBackground;


document.addEventListener('DOMContentLoaded', () => {
  // Page load transition is handled for all pages (except index.html if it has its own)
  if (!document.getElementById('logo-landing')) { // Don't run general page load on index.html
    setupPageLoadTransition();
  }

    // The injectAnimatedBackground() is called from inline scripts of HTML pages
    // after DOMContentLoaded and after main.js has set the theme.
});
