// audio.js - Web Audio API procedural sound synthesizer and Web Speech API
// Completely self-contained, no external audio files required, works offline on any device/tablet!

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.soundEnabled = true;
    this.voiceEnabled = true;
    this.speechSynth = window.speechSynthesis || null;
    this.chugTimer = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    return this.soundEnabled;
  }

  toggleVoice() {
    this.voiceEnabled = !this.voiceEnabled;
    return this.voiceEnabled;
  }

  // Authentic Steam Train Whistle (Dual tone chord + slight pitch slide)
  playWhistle() {
    if (!this.soundEnabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const tones = [587.33, 739.99, 880.0]; // D5, F#5, A5 train chord

    tones.forEach((freq) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      // Slight pitch rise then drop like real steam pressure
      osc.frequency.setValueAtTime(freq * 0.96, now);
      osc.frequency.linearRampToValueAtTime(freq, now + 0.1);
      osc.frequency.setValueAtTime(freq, now + 0.6);
      osc.frequency.linearRampToValueAtTime(freq * 0.94, now + 0.9);

      // Low pass to soften the steam tone
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.12);
      gain.gain.setValueAtTime(0.08, now + 0.65);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.95);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 1.0);
    });
  }

  // Steam locomotive exhaust puff (chug)
  playChug() {
    if (!this.soundEnabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.12;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(450, now);
    filter.Q.setValueAtTime(2.5, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(now);
  }

  // Happy wooden train track snap sound
  playTrackSnap() {
    if (!this.soundEnabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.08);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.09);
  }

  // Cheerful chime when advancing along the stroke
  playTraceChime(step = 0) {
    if (!this.soundEnabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const scale = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5]; // Pentatonic C
    const freq = scale[step % scale.length];

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  // Stroke completed chime
  playStrokeComplete() {
    if (!this.soundEnabled) return;
    this.init();
    if (!this.ctx) return;

    const notes = [659.25, 880.0, 1046.5]; // E5, A5, C6
    notes.forEach((freq, idx) => {
      const now = this.ctx.currentTime + idx * 0.08;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.4);
    });
  }

  // Big celebration fanfare when entire letter / word is done
  playCelebration() {
    if (!this.soundEnabled) return;
    this.init();
    if (!this.ctx) return;

    const melody = [
      { f: 523.25, d: 0.12 }, // C5
      { f: 659.25, d: 0.12 }, // E5
      { f: 783.99, d: 0.12 }, // G5
      { f: 1046.5, d: 0.35 }  // C6
    ];

    let t = this.ctx.currentTime;
    melody.forEach((note) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(note.f, t);

      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + note.d);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + note.d + 0.05);

      t += note.d * 0.85;
    });

    // Whistle right after fanfare!
    setTimeout(() => {
      this.playWhistle();
    }, 450);
  }

  // Gentle soft boing / nudge if child traces backwards or out of order
  playGentleNudge() {
    if (!this.soundEnabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.linearRampToValueAtTime(320, now + 0.08);
    osc.frequency.linearRampToValueAtTime(220, now + 0.2);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  // Train Station Bell (Ding... Ding...)
  playBell() {
    if (!this.soundEnabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(987.77, now); // B5

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.75);
  }

  // Button tap UI pop
  playTap() {
    if (!this.soundEnabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.05);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  playAnimalSound(animal) {
    if (!this.soundEnabled) return;
    this.init();
    if (animal === '🐮') {
      if (this.ctx) {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(145, now);
        osc.frequency.linearRampToValueAtTime(110, now + 0.45);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.5);
      }
      this.speak('Moo! The happy cow is on board!');
    } else if (animal === '🐶') {
      this.speak('Woof woof! Puppy is ready for the railway adventure!');
    } else if (animal === '🦁') {
      this.speak('Roar! Lion engineer is on duty!');
    } else if (animal === '🐑') {
      this.speak('Baa! The sheep loves the train ride!');
    } else if (animal === '🦒') {
      this.speak('The tall giraffe can see the whole railway!');
    } else if (animal === '🐷') {
      this.speak('Oink oink! Piggy is enjoying the ride!');
    } else {
      this.playBell();
    }
  }

  playNightHoot() {
    if (!this.soundEnabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [440, 392].forEach((freq, i) => {
      const t = now + i * 0.28;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.26);
    });
  }

  // Text-To-Speech with standard, clear voice
  speak(text) {
    if (!this.voiceEnabled || !this.speechSynth) return;
    try {
      this.speechSynth.cancel(); // Stop any pending speech
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1.0;
      utter.pitch = 1.0;
      utter.lang = 'en-US';

      // Pick standard US English voice or default
      const voices = this.speechSynth.getVoices();
      const preferred = voices.find(v => v.lang === 'en-US' && (v.name.includes('US English') || v.name.includes('Samantha') || v.default)) ||
                        voices.find(v => v.lang === 'en-US') ||
                        voices.find(v => v.default && v.lang.startsWith('en'));
      if (preferred) utter.voice = preferred;

      this.speechSynth.speak(utter);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  }
}

export const sound = new SoundEngine();
