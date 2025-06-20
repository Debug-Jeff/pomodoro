/**
 * Animations for the Pomodoro app
 * Handles visual effects and transitions
 */

function navigateWithTransition(url) {
  const pageTransitionElement = document.getElementById('page-transition');
  if (pageTransitionElement && !prefersReducedMotion()) {
    pageTransitionElement.classList.add('active');
    setTimeout(() => {
      window.location.href = url;
    }, 350);
  } else {
    window.location.href = url;
  }
}
window.navigateWithTransition = navigateWithTransition;

function setupPageLoadTransition() {
  const pageTransitionElement = document.getElementById('page-transition');
  window.addEventListener('load', () => {
    if (pageTransitionElement && !prefersReducedMotion()) {
      setTimeout(() => {
        pageTransitionElement.classList.remove('active');
      }, 50);
    } else if (pageTransitionElement) {
      pageTransitionElement.style.opacity = '0';
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
    return;
  }

  const bgContainer = document.createElement('div');
  bgContainer.id = "dynamic-animated-background";
  bgContainer.className = 'background-container';

  const stars = document.createElement('div');
  stars.className = 'stars';
  bgContainer.appendChild(stars);

  const twinkling = document.createElement('div');
  twinkling.className = 'twinkling';
  bgContainer.appendChild(twinkling);

  document.body.insertBefore(bgContainer, document.body.firstChild);
}
window.injectAnimatedBackground = injectAnimatedBackground;

document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('logo-landing')) {
    setupPageLoadTransition();
  }
});