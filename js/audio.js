/**
 * Audio functionality for the Pomodoro app
 * Handles sound effects and volume control
 */

let audioContext = null;
let audioBuffers = {}; // Store by sound key e.g., 'default_alarm', 'retro_notify'
let masterGainNode = null;
let audioInitializedPromise = null;

async function initAudioSystem() {
  if (audioInitializedPromise) return audioInitializedPromise; // Return existing promise if init in progress

  audioInitializedPromise = (async () => {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      masterGainNode = audioContext.createGain();
      masterGainNode.connect(audioContext.destination);

      const settings = loadData('settings', SCHEMAS.settings);
      setMasterVolume(settings.soundVolume / 100);

      // Define sounds to load based on potential settings
      const soundsToLoad = {
        'default_alarm': 'assets/audio/classic-alarm.wav',
        'retro_notify': 'assets/audio/retro-game-notification.wav',
        'soft_chime': 'assets/audio/intro-transition.wav',
        'timer_start': 'assets/audio/intro-transition.wav',
        'timer_break_end': 'assets/audio/retro-game-notification.wav'
      };

      const loadPromises = Object.entries(soundsToLoad).map(([key, path]) => loadSoundIntoBuffer(key, path));
      await Promise.all(loadPromises);

      console.log('Audio system initialized.');
      return true;
    } catch (error) {
      console.error('Error initializing audio system:', error);
      audioContext = null; // Reset on error
      masterGainNode = null;
      audioInitializedPromise = null; // Allow retry
      return false;
    }
  })();
  return audioInitializedPromise;
}

async function loadSoundIntoBuffer(name, url) {
  if (!audioContext) {
    console.warn('AudioContext not available for loading sound:', name);
    return;
  }
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status} for ${url}`);
    const arrayBuffer = await response.arrayBuffer();
    // Ensure context is running before decoding
    if (audioContext.state === 'suspended') await audioContext.resume();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    audioBuffers[name] = audioBuffer;
  } catch (error) {
    console.error(`Error loading sound ${name} from ${url}:`, error);
    if (audioContext) { // Create a silent fallback buffer if context exists
        const fallbackBuffer = audioContext.createBuffer(1, 1, audioContext.sampleRate);
        audioBuffers[name] = fallbackBuffer;
    }
  }
}

async function playSound(soundNameKey) { // Takes key like 'default_alarm'
  const settings = loadData('settings', SCHEMAS.settings);
  if (!settings.enableSounds) return;

  if (!audioContext || Object.keys(audioBuffers).length === 0) {
    const success = await initAudioSystem(); // Ensure system is initialized
    if (!success) {
      console.warn(`Cannot play sound ${soundNameKey}, audio system failed to initialize.`);
      return;
    }
  }

  if (audioContext.state === 'suspended') {
    try {
      await audioContext.resume();
    } catch (e) {
      console.error("Could not resume audio context:", e);
      return;
    }
  }

  const bufferToPlay = audioBuffers[soundNameKey];
  if (bufferToPlay) {
    const source = audioContext.createBufferSource();
    source.buffer = bufferToPlay;
    source.connect(masterGainNode);
    source.start(0);
  } else {
    console.warn(`Sound buffer for key "${soundNameKey}" not found. Available:`, Object.keys(audioBuffers));
  }
}
window.playSound = playSound;

function setMasterVolume(volumeLevel) { // Volume 0-1
  if (masterGainNode) {
    masterGainNode.gain.setValueAtTime(Math.max(0, Math.min(1, volumeLevel)), audioContext ? audioContext.currentTime : 0);
  }
}
window.setMasterVolume = setMasterVolume; // Expose for settings.js

function WARM_UP_AUDIO_CONTEXT_SAFELY() {
    if (!audioContext) {
        initAudioSystem().then(success => {
            if (success && audioContext.state !== 'running') {
                // Play a tiny silent sound to ensure context is truly 'running'
                const buffer = audioContext.createBuffer(1, 1, audioContext.sampleRate);
                const source = audioContext.createBufferSource();
                source.buffer = buffer;
                source.connect(masterGainNode); // Connect to gain node which is connected to destination
                source.start(0);
                console.log('Audio context warmed up after init.');
            } else if (success) {
                 console.log('Audio context already running or initAudioSystem handled it.');
            }
        });
    } else if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => console.log('Audio context resumed by interaction.'));
    }
}

document.addEventListener('DOMContentLoaded', () => {
  // Pre-warm/init audio on first user interaction
  const interactionEvents = ['pointerdown', 'keydown'];
  interactionEvents.forEach(eventType => {
    document.addEventListener(eventType, WARM_UP_AUDIO_CONTEXT_SAFELY, { once: true, passive: true });
  });

  // Listen for settings changes from storage to update volume
  window.addEventListener('appStorageChange', (event) => {
    if (event.detail.key === 'settings' && event.detail.newValue) {
      const newSettings = event.detail.newValue;
      if (masterGainNode && newSettings.soundVolume !== undefined) {
        setMasterVolume(newSettings.soundVolume / 100);
      }
       // Re-initialize audio system if enableSounds was toggled on, and it wasn't initialized
      if (newSettings.enableSounds && !audioInitializedPromise) {
          WARM_UP_AUDIO_CONTEXT_SAFELY();
      }
    }
  });
});