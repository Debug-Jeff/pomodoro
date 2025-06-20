/**
 * Audio functionality for the Pomodoro app
 * Handles sound effects and volume control
 */

let audioContext = null;
let audioBuffers = {};
let masterGainNode = null;
let audioInitializedPromise = null;

async function initAudioSystem() {
  if (audioInitializedPromise) return audioInitializedPromise;

  audioInitializedPromise = (async () => {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      masterGainNode = audioContext.createGain();
      masterGainNode.connect(audioContext.destination);

      const settings = loadData('settings', window.DEFAULT_SETTINGS);
      setMasterVolume(settings.soundVolume / 100);

      // Create simple beep sounds programmatically
      createBeepSound('default_alarm', 800, 0.3);
      createBeepSound('retro_notify', 600, 0.2);
      createBeepSound('soft_chime', 400, 0.15);

      console.log('Audio system initialized.');
      return true;
    } catch (error) {
      console.error('Error initializing audio system:', error);
      audioContext = null;
      masterGainNode = null;
      audioInitializedPromise = null;
      return false;
    }
  })();
  return audioInitializedPromise;
}

function createBeepSound(name, frequency, duration) {
  if (!audioContext) return;
  
  const sampleRate = audioContext.sampleRate;
  const frameCount = sampleRate * duration;
  const buffer = audioContext.createBuffer(1, frameCount, sampleRate);
  const channelData = buffer.getChannelData(0);

  for (let i = 0; i < frameCount; i++) {
    const t = i / sampleRate;
    const envelope = Math.exp(-t * 3); // Exponential decay
    channelData[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.3;
  }

  audioBuffers[name] = buffer;
}

async function playSound(soundNameKey) {
  const settings = loadData('settings', window.DEFAULT_SETTINGS);
  if (!settings.enableSounds) return;

  if (!audioContext || Object.keys(audioBuffers).length === 0) {
    const success = await initAudioSystem();
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

function setMasterVolume(volumeLevel) {
  if (masterGainNode) {
    masterGainNode.gain.setValueAtTime(Math.max(0, Math.min(1, volumeLevel)), audioContext ? audioContext.currentTime : 0);
  }
}
window.setMasterVolume = setMasterVolume;

function warmUpAudioContext() {
  if (!audioContext) {
    initAudioSystem().then(success => {
      if (success && audioContext.state !== 'running') {
        const buffer = audioContext.createBuffer(1, 1, audioContext.sampleRate);
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(masterGainNode);
        source.start(0);
        console.log('Audio context warmed up after init.');
      }
    });
  } else if (audioContext.state === 'suspended') {
    audioContext.resume().then(() => console.log('Audio context resumed by interaction.'));
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const interactionEvents = ['pointerdown', 'keydown'];
  interactionEvents.forEach(eventType => {
    document.addEventListener(eventType, warmUpAudioContext, { once: true, passive: true });
  });

  window.addEventListener('appStorageChange', (event) => {
    if (event.detail.key === 'settings' && event.detail.newValue) {
      const newSettings = event.detail.newValue;
      if (masterGainNode && newSettings.soundVolume !== undefined) {
        setMasterVolume(newSettings.soundVolume / 100);
      }
      if (newSettings.enableSounds && !audioInitializedPromise) {
        warmUpAudioContext();
      }
    }
  });
});