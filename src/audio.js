const gemSlotAudio = new Audio('assets/audio/gem-slot.mp3');
gemSlotAudio.preload = 'auto';
gemSlotAudio.volume = 0.55;

const fireballAudio = new Audio('assets/audio/fireball.mp3');
fireballAudio.preload = 'auto';
fireballAudio.volume = 0.4;

let audioContext = null;

export function playGemSlotSound() {
  const sound = gemSlotAudio.cloneNode();
  sound.volume = gemSlotAudio.volume;
  sound.play().catch(() => {});
}

export function playFireballSound() {
  const sound = fireballAudio.cloneNode();
  sound.volume = fireballAudio.volume;
  sound.play().catch(() => {});
}

export function playUIClick(kind = 'confirm') {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  if (!audioContext) audioContext = new AudioContextClass();
  if (audioContext.state === 'suspended') audioContext.resume();

  const now = audioContext.currentTime;
  const master = audioContext.createGain();
  const delay = audioContext.createDelay(0.25);
  const echo = audioContext.createGain();
  master.gain.setValueAtTime(0.12, now);
  delay.delayTime.setValueAtTime(0.075, now);
  echo.gain.setValueAtTime(0.14, now);
  master.connect(audioContext.destination);
  master.connect(delay);
  delay.connect(echo);
  echo.connect(audioContext.destination);

  if (kind === 'gem') {
    master.gain.setValueAtTime(0.16, now);
    delay.delayTime.setValueAtTime(0.13, now);
    echo.gain.setValueAtTime(0.28, now);
    [
      { frequency: 82.41, type: 'sine', start: 0, duration: 0.52, gain: 0.7, endFrequency: 55 },
      { frequency: 246.94, type: 'triangle', start: 0.025, duration: 0.42, gain: 0.34, endFrequency: 185 },
      { frequency: 739.99, type: 'sine', start: 0.07, duration: 0.7, gain: 0.22, endFrequency: 554.37 }
    ].forEach((voice) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = voice.type;
      oscillator.frequency.setValueAtTime(voice.frequency, now + voice.start);
      oscillator.frequency.exponentialRampToValueAtTime(voice.endFrequency, now + voice.start + voice.duration);
      gain.gain.setValueAtTime(0.0001, now + voice.start);
      gain.gain.exponentialRampToValueAtTime(voice.gain, now + voice.start + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + voice.start + voice.duration);
      oscillator.connect(gain);
      gain.connect(master);
      oscillator.start(now + voice.start);
      oscillator.stop(now + voice.start + voice.duration + 0.02);
    });
    return;
  }

  const notes = kind === 'open' ? [392, 587.33]
    : kind === 'close' ? [587.33, 392]
    : kind === 'toggle' ? [523.25, 783.99]
    : kind === 'skill' ? [523.25, 659.25, 987.77]
    : [440, 659.25];
  notes.forEach((frequency, index) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = index === 0 ? 'sine' : 'triangle';
    oscillator.frequency.setValueAtTime(frequency, now + index * 0.025);
    oscillator.detune.setValueAtTime(index % 2 ? 5 : -4, now);
    gain.gain.setValueAtTime(0.0001, now + index * 0.025);
    gain.gain.exponentialRampToValueAtTime(index === 0 ? 0.6 : 0.28, now + 0.012 + index * 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16 + index * 0.045);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(now + index * 0.025);
    oscillator.stop(now + 0.2 + index * 0.05);
  });
}
