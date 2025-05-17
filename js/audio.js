/**
 * Audio functionality for the Pomodoro app
 * Handles sound effects and volume control
 */

// Audio context
let audioContext = null;
let audioBuffers = {};
let gainNode = null;

// Initialize audio
async function initAudio() {
  try {
    // Create audio context
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Create gain node for volume control
    gainNode = audioContext.createGain();
    gainNode.connect(audioContext.destination);
    
    // Set volume from settings
    const settings = getSettings();
    setVolume(settings.volume / 100);
    
    // Load sound files
    await Promise.all([
      loadSound('start', 'assets/sounds/start.wav'),
      loadSound('break', 'assets/sounds/break.wav'),
      loadSound('complete', 'assets/sounds/complete.wav')
    ]);
    
    return true;
  } catch (error) {
    console.error('Error initializing audio:', error);
    return false;
  }
}

// Load a sound file
async function loadSound(name, url) {
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    audioBuffers[name] = audioBuffer;
  } catch (error) {
    console.error(`Error loading sound ${name}:`, error);
    
    // Create a fallback buffer for testing
    const fallbackBuffer = audioContext.createBuffer(2, 44100, 44100);
    audioBuffers[name] = fallbackBuffer;
  }
}

// Play a sound
function playSound(name) {
  if (!audioContext || !audioBuffers[name]) {
    // Lazy initialize audio if not already done
    initAudio().then(() => {
      if (audioBuffers[name]) {
        playBuffer(audioBuffers[name]);
      }
    });
    return;
  }
  
  // Resume audio context if suspended (browser policy)
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  
  playBuffer(audioBuffers[name]);
}

// Play an audio buffer
function playBuffer(buffer) {
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.connect(gainNode);
  source.start(0);
}

// Set volume (0-1)
function setVolume(volume) {
  if (gainNode) {
    gainNode.gain.value = Math.max(0, Math.min(1, volume));
  }
}

// Get current volume (0-1)
function getVolume() {
  return gainNode ? gainNode.gain.value : 0;
}

// Initialize audio when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // We'll initialize audio on first user interaction to comply with browser policies
  document.addEventListener('click', () => {
    if (!audioContext) {
      initAudio();
    }
  }, { once: true });
});