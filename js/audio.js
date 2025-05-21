/**
 * Audio functionality for the Pomodoro app
 * Handles sound effects and volume control
 */

// Audio context
let audioContext = null;
let audioBuffers = {};
let gainNode = null;
let audioInitialized = false; // Flag to prevent multiple initializations

// Initialize audio
async function initAudio() {
  if (audioInitialized || audioContext) return true; // Already initialized or in process

  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    gainNode = audioContext.createGain();
    gainNode.connect(audioContext.destination);

    const settings = loadData('settings', SCHEMAS.settings); // Uses global loadData/SCHEMAS
    setVolume(settings.soundVolume / 100); // Use soundVolume

    await Promise.all([
      loadSound('start', 'assets/audio/intro-transition.wav'),
      loadSound('break', 'assets/audio/retro-game-notification.wav'),
      loadSound('complete', 'assets/audio/classic-alarm.wav')
    ]);

    audioInitialized = true;
    console.log('Audio initialized successfully.');
    return true;
  } catch (error) {
    console.error('Error initializing audio:', error);
    audioContext = null; // Reset on error
    return false;
  }
}

// Load a sound file
async function loadSound(name, url) {
  if (!audioContext) {
    console.warn('AudioContext not available for loading sound:', name);
    return;
  }
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} for ${url}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    audioBuffers[name] = audioBuffer;
  } catch (error) {
    console.error(`Error loading sound ${name} from ${url}:`, error);
    // Create a silent fallback buffer
    if (audioContext) {
        const fallbackBuffer = audioContext.createBuffer(1, 1, audioContext.sampleRate);
        audioBuffers[name] = fallbackBuffer;
    }
  }
}

// Play a sound
async function playSound(name) {
  if (!audioContext) {
    // Try to initialize audio on first play attempt if not done by user interaction
    const success = await initAudio();
    if (!success || !audioBuffers[name]) {
      console.warn(`Cannot play sound ${name}, audio not ready or buffer missing.`);
      return;
    }
  } else if (audioContext.state === 'suspended') {
    // Resume audio context if suspended (browser policy)
    try {
      await audioContext.resume();
    } catch (e) {
      console.error("Could not resume audio context:", e);
      return;
    }
  }

  if (audioBuffers[name]) {
    playBuffer(audioBuffers[name]);
  } else {
    console.warn(`Sound buffer for ${name} not found.`);
  }
}
window.playSound = playSound; // Expose globally

// Play an audio buffer
function playBuffer(buffer) {
  if (!audioContext || !gainNode) return;
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.connect(gainNode);
  source.start(0);
}

// Set volume (0-1)
function setVolume(volumeLevel) {
  if (gainNode) {
    gainNode.gain.value = Math.max(0, Math.min(1, volumeLevel));
  }
  // Save to settings if changed by a control that doesn't do it itself
  const settings = loadData('settings', SCHEMAS.settings);
  if (settings.soundVolume / 100 !== volumeLevel) {
    settings.soundVolume = Math.round(volumeLevel * 100);
    saveData('settings', settings);
  }
}
window.setVolume = setVolume; // Expose globally

// Get current volume (0-1) - not directly used by settings.js, but good utility
function getVolume() {
  return gainNode ? gainNode.gain.value : (loadData('settings', SCHEMAS.settings).soundVolume / 100);
}
// window.getVolume = getVolume;

// Initialize audio on first user interaction
function WARM_UP_AUDIO_CONTEXT_SAFELY() {
    if (!audioContext) {
        initAudio().then(success => {
            if (success) {
                // Play a tiny silent sound to ensure context is truly 'running'
                // Some browsers require this for full un-suspension
                const buffer = audioContext.createBuffer(1, 1, audioContext.sampleRate);
                const source = audioContext.createBufferSource();
                source.buffer = buffer;
                source.connect(audioContext.destination); // Connect to destination directly, not gainNode for this
                source.start(0);
                console.log('Audio context warmed up.');
            }
        });
    } else if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => console.log('Audio context resumed.'));
    }
}

document.addEventListener('DOMContentLoaded', () => {
  // Attempt to initialize audio on first user interaction to comply with browser policies
  // Using 'pointerdown' as it's often earlier than 'click' and covers touch.
  document.addEventListener('pointerdown', WARM_UP_AUDIO_CONTEXT_SAFELY, { once: true });
  document.addEventListener('keydown', WARM_UP_AUDIO_CONTEXT_SAFELY, { once: true });

  // Listen for settings changes to update volume
  window.addEventListener('storage', (event) => {
    if (event.key === `${APP_NAME}_settings` && event.newValue) {
      try {
        const newSettings = JSON.parse(event.newValue);
        if (gainNode && newSettings.soundVolume !== undefined) {
          setVolume(newSettings.soundVolume / 100);
        }
      } catch (e) {
        console.error("Error parsing settings from storage event in audio.js", e);
      }
    }
  });
});
