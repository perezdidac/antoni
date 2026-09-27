// bundle.js - Complete standalone game logic for Antoni's Train Express
// Zero dependencies, runs directly from file:/// without a web server or module bundler!

(function() {
  'use strict';

  /* ==========================================================================
     1. Audio Engine (Web Audio API & Speech Synthesis)
     ========================================================================== */
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

    playWhistle() {
      if (!this.soundEnabled) return;
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const tones = [587.33, 739.99, 880.0]; // D5, F#5, A5 train whistle chord

      tones.forEach((freq) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq * 0.96, now);
        osc.frequency.linearRampToValueAtTime(freq, now + 0.1);
        osc.frequency.setValueAtTime(freq, now + 0.6);
        osc.frequency.linearRampToValueAtTime(freq * 0.94, now + 0.9);

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

    playTraceChime(step = 0) {
      if (!this.soundEnabled) return;
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const scale = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
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

    playStrokeComplete() {
      if (!this.soundEnabled) return;
      this.init();
      if (!this.ctx) return;

      const notes = [659.25, 880.0, 1046.5];
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

    playCelebration() {
      if (!this.soundEnabled) return;
      this.init();
      if (!this.ctx) return;

      const melody = [
        { f: 523.25, d: 0.12 },
        { f: 659.25, d: 0.12 },
        { f: 783.99, d: 0.12 },
        { f: 1046.5, d: 0.35 }
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

      setTimeout(() => {
        this.playWhistle();
      }, 450);
    }

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

    playBell() {
      if (!this.soundEnabled) return;
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(987.77, now);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.75);
    }

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

    speak(text) {
      if (!this.voiceEnabled || !this.speechSynth) return;
      try {
        this.speechSynth.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 0.95;
        utter.pitch = 1.15;

        const voices = this.speechSynth.getVoices();
        const preferred = voices.find(v => (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Zira') || v.name.includes('Karen')) && v.lang.startsWith('en'));
        if (preferred) utter.voice = preferred;

        this.speechSynth.speak(utter);
      } catch (e) {
        console.warn('Speech error:', e);
      }
    }
  }

  const sound = new SoundEngine();

  /* ==========================================================================
     2. Handwriting Stroke Data & Interpolation
     ========================================================================== */
  function interpolateLine(p1, p2, step = 8) {
    const points = [];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.hypot(dx, dy);
    const count = Math.max(2, Math.ceil(dist / step));
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      points.push({ x: p1.x + dx * t, y: p1.y + dy * t });
    }
    return points;
  }

  function interpolatePolyline(rawPoints, step = 8) {
    const result = [];
    for (let i = 0; i < rawPoints.length - 1; i++) {
      const seg = interpolateLine(rawPoints[i], rawPoints[i + 1], step);
      if (i > 0) seg.shift();
      result.push(...seg);
    }
    return result;
  }

  function interpolateCubicBezier(p0, p1, p2, p3, steps = 30) {
    const points = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const mt = 1 - t;
      const x = mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x;
      const y = mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y;
      points.push({ x, y });
    }
    return points;
  }

  function interpolateArc(cx, cy, rx, ry, startAngleDeg, endAngleDeg, clockwise = true, steps = 30) {
    const points = [];
    let startRad = (startAngleDeg * Math.PI) / 180;
    let endRad = (endAngleDeg * Math.PI) / 180;
    if (clockwise && endRad < startRad) endRad += 2 * Math.PI;
    if (!clockwise && endRad > startRad) endRad -= 2 * Math.PI;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const angle = startRad + (endRad - startRad) * t;
      points.push({
        x: cx + rx * Math.cos(angle),
        y: cy + ry * Math.sin(angle)
      });
    }
    return points;
  }

  const LETTERS = {
    A: {
      symbol: 'A',
      category: 'letter',
      phonic: 'A is for Antoni and All Aboard!',
      word: 'ALL ABOARD',
      rewardTracks: 3,
      strokes: [
        { id: 1, name: 'Slant down left', hint: 'Peak to bottom left!', points: interpolateLine({ x: 200, y: 70 }, { x: 100, y: 340 }, 8) },
        { id: 2, name: 'Slant down right', hint: 'Peak to bottom right!', points: interpolateLine({ x: 200, y: 70 }, { x: 300, y: 340 }, 8) },
        { id: 3, name: 'Bridge across', hint: 'Bridge across!', points: interpolateLine({ x: 145, y: 220 }, { x: 255, y: 220 }, 8) }
      ]
    },
    B: {
      symbol: 'B',
      category: 'letter',
      phonic: 'B is for Bell and Boxcar!',
      word: 'BELL',
      rewardTracks: 3,
      strokes: [
        { id: 1, name: 'Down the stick', hint: 'Top to bottom!', points: interpolateLine({ x: 130, y: 70 }, { x: 130, y: 340 }, 8) },
        { id: 2, name: 'Top bubble', hint: 'Top bubble!', points: interpolateCubicBezier({ x: 130, y: 70 }, { x: 275, y: 70 }, { x: 275, y: 195 }, { x: 130, y: 195 }, 25) },
        { id: 3, name: 'Bottom bubble', hint: 'Bottom bubble!', points: interpolateCubicBezier({ x: 130, y: 195 }, { x: 290, y: 195 }, { x: 290, y: 340 }, { x: 130, y: 340 }, 25) }
      ]
    },
    C: {
      symbol: 'C',
      category: 'letter',
      phonic: 'C is for Choo-Choo Caboose!',
      word: 'CABOOSE',
      rewardTracks: 2,
      strokes: [
        { id: 1, name: 'Curve around', hint: 'Top right around to bottom right!', points: interpolateCubicBezier({ x: 290, y: 110 }, { x: 110, y: 50 }, { x: 100, y: 350 }, { x: 290, y: 300 }, 40) }
      ]
    },
    D: {
      symbol: 'D',
      category: 'letter',
      phonic: 'D is for Diesel Train!',
      word: 'DIESEL',
      rewardTracks: 2,
      strokes: [
        { id: 1, name: 'Straight down', hint: 'Top to bottom!', points: interpolateLine({ x: 130, y: 70 }, { x: 130, y: 340 }, 8) },
        { id: 2, name: 'Big belly curve', hint: 'Top around to bottom!', points: interpolateCubicBezier({ x: 130, y: 70 }, { x: 320, y: 70 }, { x: 320, y: 340 }, { x: 130, y: 340 }, 36) }
      ]
    },
    E: {
      symbol: 'E',
      category: 'letter',
      phonic: 'E is for Engine Express!',
      word: 'ENGINE',
      rewardTracks: 3,
      strokes: [
        { id: 1, name: 'Down the spine', hint: 'Top to bottom!', points: interpolateLine({ x: 130, y: 70 }, { x: 130, y: 340 }, 8) },
        { id: 2, name: 'Top bar', hint: 'Top across!', points: interpolateLine({ x: 130, y: 70 }, { x: 275, y: 70 }, 8) },
        { id: 3, name: 'Middle bar', hint: 'Middle across!', points: interpolateLine({ x: 130, y: 205 }, { x: 240, y: 205 }, 8) },
        { id: 4, name: 'Bottom bar', hint: 'Bottom across!', points: interpolateLine({ x: 130, y: 340 }, { x: 275, y: 340 }, 8) }
      ]
    },
    T: {
      symbol: 'T',
      category: 'letter',
      phonic: 'T is for Track & Train!',
      word: 'TRAIN',
      rewardTracks: 2,
      strokes: [
        { id: 1, name: 'Down the middle', hint: 'Slide down the center!', points: interpolateLine({ x: 200, y: 70 }, { x: 200, y: 340 }, 8) },
        { id: 2, name: 'Top roof', hint: 'Across the top!', points: interpolateLine({ x: 110, y: 70 }, { x: 290, y: 70 }, 8) }
      ]
    },
    O: {
      symbol: 'O',
      category: 'letter',
      phonic: 'O is for Oval Track!',
      word: 'OVAL',
      rewardTracks: 2,
      strokes: [
        { id: 1, name: 'Circle around', hint: 'Top around counter-clockwise!', points: interpolateArc(200, 205, 95, 135, -90, 270, false, 42) }
      ]
    },
    P: {
      symbol: 'P',
      category: 'letter',
      phonic: 'P is for Puffing Train and Popcorn!',
      word: 'PUFF',
      rewardTracks: 2,
      strokes: [
        {
          id: 1,
          name: 'Down the stick',
          hint: 'Start at the top and slide down!',
          points: interpolateLine({ x: 130, y: 70 }, { x: 130, y: 340 }, 7)
        },
        {
          id: 2,
          name: 'Around the curve',
          hint: 'Start at the top, curve around to the middle!',
          points: interpolateCubicBezier(
            { x: 130, y: 70 },
            { x: 300, y: 70 },
            { x: 300, y: 210 },
            { x: 130, y: 210 },
            32
          )
        }
      ]
    },
    N: {
      symbol: 'N',
      category: 'letter',
      phonic: 'N is for Night Express!',
      word: 'NIGHT',
      rewardTracks: 3,
      strokes: [
        { id: 1, name: 'Left wall down', hint: 'Top to bottom!', points: interpolateLine({ x: 120, y: 70 }, { x: 120, y: 340 }, 8) },
        { id: 2, name: 'Diagonal slide', hint: 'Slide down across!', points: interpolateLine({ x: 120, y: 70 }, { x: 280, y: 340 }, 8) },
        { id: 3, name: 'Right wall down', hint: 'Top to bottom!', points: interpolateLine({ x: 280, y: 70 }, { x: 280, y: 340 }, 8) }
      ]
    },
    I: {
      symbol: 'I',
      category: 'letter',
      phonic: 'I is for Iron Railroad!',
      word: 'IRON',
      rewardTracks: 2,
      strokes: [
        { id: 1, name: 'Center post', hint: 'Top to bottom!', points: interpolateLine({ x: 200, y: 70 }, { x: 200, y: 340 }, 8) },
        { id: 2, name: 'Top bar', hint: 'Across top!', points: interpolateLine({ x: 140, y: 70 }, { x: 260, y: 70 }, 8) },
        { id: 3, name: 'Bottom bar', hint: 'Across bottom!', points: interpolateLine({ x: 140, y: 340 }, { x: 260, y: 340 }, 8) }
      ]
    },
    S: {
      symbol: 'S',
      category: 'letter',
      phonic: 'S is for Steam and Station!',
      word: 'STEAM',
      rewardTracks: 2,
      strokes: [
        {
          id: 1,
          name: 'Snake curve',
          hint: 'Curve left, swing right, curve left!',
          points: [
            ...interpolateCubicBezier({ x: 275, y: 115 }, { x: 150, y: 50 }, { x: 110, y: 160 }, { x: 200, y: 205 }, 20),
            ...interpolateCubicBezier({ x: 200, y: 205 }, { x: 290, y: 250 }, { x: 250, y: 350 }, { x: 125, y: 300 }, 20)
          ]
        }
      ]
    },
    R: {
      symbol: 'R',
      category: 'letter',
      phonic: 'R is for Railroad & Rails!',
      word: 'RAILROAD',
      rewardTracks: 3,
      strokes: [
        { id: 1, name: 'Vertical stick', hint: 'Top to bottom!', points: interpolateLine({ x: 130, y: 70 }, { x: 130, y: 340 }, 8) },
        { id: 2, name: 'Top loop', hint: 'Loop to middle!', points: interpolateCubicBezier({ x: 130, y: 70 }, { x: 290, y: 70 }, { x: 290, y: 210 }, { x: 130, y: 210 }, 28) },
        { id: 3, name: 'Kick leg', hint: 'Kick out to bottom right!', points: interpolateLine({ x: 175, y: 210 }, { x: 280, y: 340 }, 8) }
      ]
    }
  };

  const NUMBERS = {
    '1': {
      symbol: '1',
      category: 'number',
      phonic: 'Number 1! One big locomotive engine!',
      word: 'ONE',
      rewardTracks: 2,
      strokes: [
        { id: 1, name: 'Straight down', hint: 'Top to bottom!', points: interpolateLine({ x: 200, y: 70 }, { x: 200, y: 340 }, 7) }
      ]
    },
    '2': {
      symbol: '2',
      category: 'number',
      phonic: 'Number 2! Two shining steel rails!',
      word: 'TWO',
      rewardTracks: 2,
      strokes: [
        {
          id: 1,
          name: 'Curve and slant',
          hint: 'Curve around and slide down!',
          points: interpolateCubicBezier({ x: 130, y: 130 }, { x: 160, y: 60 }, { x: 275, y: 60 }, { x: 260, y: 160 }, 20)
            .concat(interpolateLine({ x: 260, y: 160 }, { x: 130, y: 340 }, 8))
        },
        { id: 2, name: 'Ground line', hint: 'Across the ground!', points: interpolateLine({ x: 130, y: 340 }, { x: 280, y: 340 }, 8) }
      ]
    },
    '3': {
      symbol: '3',
      category: 'number',
      phonic: 'Number 3! Three colorful passenger cars!',
      word: 'THREE',
      rewardTracks: 2,
      strokes: [
        { id: 1, name: 'Top curve', hint: 'Curve to middle!', points: interpolateCubicBezier({ x: 135, y: 100 }, { x: 200, y: 60 }, { x: 280, y: 100 }, { x: 200, y: 195 }, 24) },
        { id: 2, name: 'Bottom curve', hint: 'Curve to bottom!', points: interpolateCubicBezier({ x: 200, y: 195 }, { x: 290, y: 260 }, { x: 220, y: 340 }, { x: 135, y: 300 }, 24) }
      ]
    },
    '4': {
      symbol: '4',
      category: 'number',
      phonic: 'Number 4! Four sturdy train wheels!',
      word: 'FOUR',
      rewardTracks: 2,
      strokes: [
        {
          id: 1,
          name: 'Down and across',
          hint: 'Down and across!',
          points: [...interpolateLine({ x: 230, y: 70 }, { x: 125, y: 240 }, 8), ...interpolateLine({ x: 125, y: 240 }, { x: 280, y: 240 }, 8)]
        },
        { id: 2, name: 'Vertical cut', hint: 'Top to bottom!', points: interpolateLine({ x: 230, y: 120 }, { x: 230, y: 340 }, 8) }
      ]
    },
    '5': {
      symbol: '5',
      category: 'number',
      phonic: 'Number 5! Five happy passengers boarding!',
      word: 'FIVE',
      rewardTracks: 3,
      strokes: [
        {
          id: 1,
          name: 'Down and belly',
          hint: 'Down and big belly curve!',
          points: [...interpolateLine({ x: 160, y: 80 }, { x: 150, y: 190 }, 8), ...interpolateCubicBezier({ x: 150, y: 190 }, { x: 290, y: 190 }, { x: 280, y: 340 }, { x: 135, y: 320 }, 26)]
        },
        { id: 2, name: 'Top hat', hint: 'Roof on top!', points: interpolateLine({ x: 155, y: 80 }, { x: 265, y: 80 }, 8) }
      ]
    }
  };

  const WORDS = {
    ANTONI: {
      symbol: 'ANTONI',
      category: 'word',
      phonic: 'Antoni! The great train engineer!',
      letters: ['A', 'N', 'T', 'O', 'N', 'I'],
      rewardTracks: 6,
      specialReward: 'Golden Conductor Train'
    },
    TRAIN: {
      symbol: 'TRAIN',
      category: 'word',
      phonic: 'Train! Choo-choo here it comes!',
      letters: ['T', 'R', 'A', 'I', 'N'],
      rewardTracks: 5,
      specialReward: 'Rainbow Locomotive'
    }
  };

  /* ==========================================================================
     3. Reward & Inventory Manager
     ========================================================================== */
  const STORAGE_KEY = 'antoni_train_express_standalone';
  const DEFAULT_STATE = {
    stars: 5,
    tickets: 1,
    inventory: { straight: 14, curve: 14, station: 2, tree: 6 },
    unlockedTrains: ['red_steam'],
    selectedTrain: 'red_steam',
    completedLetters: {},
    completedNumbers: {}
  };

  class RewardManager {
    constructor() {
      this.state = this.load();
      this.listeners = [];
    }

    load() {
      try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) return { ...DEFAULT_STATE, ...JSON.parse(data) };
      } catch (e) {}
      return JSON.parse(JSON.stringify(DEFAULT_STATE));
    }

    save() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      } catch (e) {}
      this.notify();
    }

    onChange(fn) {
      this.listeners.push(fn);
      fn(this.state);
    }

    notify() {
      this.listeners.forEach(fn => fn(this.state));
    }

    awardTracingReward(item) {
      const tracks = item.rewardTracks || 2;
      const straight = Math.ceil(tracks / 2);
      const curve = Math.floor(tracks / 2);
      this.state.stars += 3;
      this.state.tickets += 1;
      this.state.inventory.straight += straight;
      this.state.inventory.curve += curve;

      let specialUnlock = null;
      if (item.symbol === 'P' && !this.state.unlockedTrains.includes('golden_express')) {
        this.state.unlockedTrains.push('golden_express');
        specialUnlock = '✨ Golden Conductor Train!';
      }

      this.save();
      return { straight, curve, stars: 3, specialUnlock };
    }

    usePiece(type) {
      if (this.state.inventory[type] > 0) {
        this.state.inventory[type]--;
        this.save();
        return true;
      }
      return false;
    }

    returnPiece(type) {
      if (this.state.inventory[type] !== undefined) {
        this.state.inventory[type]++;
        this.save();
      }
    }

    selectTrain(t) {
      this.state.selectedTrain = t;
      this.save();
    }
  }

  const rewards = new RewardManager();

  /* ==========================================================================
     4. Tracing Engine
     ========================================================================== */
  class TracingEngine {
    constructor(canvas, options = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.options = {
        hitRadius: 45,
        lookahead: 6,
        onStrokeComplete: options.onStrokeComplete || (() => {}),
        onItemComplete: options.onItemComplete || (() => {}),
        onProgress: options.onProgress || (() => {}),
        ...options
      };

      this.currentItem = null;
      this.activeStrokeIndex = 0;
      this.strokeProgress = [];
      this.isTracing = false;
      this.guideAnimTime = 0;
      this.particles = [];
      this.hintPulse = 0;
      this.nudgeMessage = null;
      this.nudgeAlpha = 0;

      this.initCanvasResolution();
      this.attachEvents();
      this.startRenderLoop();
    }

    initCanvasResolution() {
      const rect = this.canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      this.width = rect.width || 420;
      this.height = rect.height || 420;
      this.canvas.width = this.width * dpr;
      this.canvas.height = this.height * dpr;
      this.ctx.resetTransform?.();
      this.ctx.scale(dpr, dpr);
      this.scaleFactor = Math.min(this.width / 400, this.height / 400);
      this.offsetX = (this.width - 400 * this.scaleFactor) / 2;
      this.offsetY = (this.height - 400 * this.scaleFactor) / 2;
    }

    resize() {
      this.initCanvasResolution();
      this.render();
    }

    loadItem(item) {
      this.currentItem = item;
      this.activeStrokeIndex = 0;
      this.strokeProgress = item.strokes.map(() => ({
        maxReachedIndex: 0,
        completed: false,
        drawnPoints: []
      }));
      this.isTracing = false;
      this.particles = [];
      this.nudgeMessage = null;
      this.nudgeAlpha = 0;

      if (item.symbol) {
        sound.speak(item.phonic || item.symbol);
      }

      this.options.onProgress({
        item: this.currentItem,
        activeStroke: 0,
        totalStrokes: item.strokes.length,
        isFinished: false
      });
    }

    toCanvasCoords(pt) {
      return {
        x: this.offsetX + pt.x * this.scaleFactor,
        y: this.offsetY + pt.y * this.scaleFactor
      };
    }

    fromCanvasCoords(touchPt) {
      return {
        x: (touchPt.x - this.offsetX) / this.scaleFactor,
        y: (touchPt.y - this.offsetY) / this.scaleFactor
      };
    }

    attachEvents() {
      const getPos = (e) => {
        const rect = this.canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: clientX - rect.left, y: clientY - rect.top };
      };

      const handleDown = (e) => {
        e.preventDefault();
        if (!this.currentItem) return;
        sound.init();

        const pos = getPos(e);
        const normPos = this.fromCanvasCoords(pos);

        if (this.activeStrokeIndex >= this.currentItem.strokes.length) return;

        const currentStroke = this.currentItem.strokes[this.activeStrokeIndex];
        const progress = this.strokeProgress[this.activeStrokeIndex];
        const targetWaypoint = currentStroke.points[progress.maxReachedIndex] || currentStroke.points[0];
        const startPoint = currentStroke.points[0];

        const distToTarget = Math.hypot(normPos.x - targetWaypoint.x, normPos.y - targetWaypoint.y);
        const distToStart = Math.hypot(normPos.x - startPoint.x, normPos.y - startPoint.y);

        // Generous touch radius for kindergarteners (at least 55px)
        const allowedRadius = Math.max(55, 50 / this.scaleFactor);

        // If touching near the active stroke's start or current progress waypoint: START TRACING!
        if (distToTarget <= allowedRadius || (progress.maxReachedIndex === 0 && distToStart <= allowedRadius * 1.6)) {
          this.isTracing = true;
          progress.drawnPoints.push({ ...normPos });
          this.spawnSparkles(pos.x, pos.y, '#FFD700', 5);
          sound.playTap();
          return;
        }

        // Only warn about wrong stroke if touching a subsequent stroke whose start is far from active start
        let touchedWrongStroke = false;
        for (let sIdx = this.activeStrokeIndex + 1; sIdx < this.currentItem.strokes.length; sIdx++) {
          const otherStroke = this.currentItem.strokes[sIdx];
          const distOther = Math.hypot(normPos.x - otherStroke.points[0].x, normPos.y - otherStroke.points[0].y);
          const distBetweenStarts = Math.hypot(otherStroke.points[0].x - startPoint.x, otherStroke.points[0].y - startPoint.y);
          if (distBetweenStarts > 45 && distOther < allowedRadius) {
            touchedWrongStroke = true;
            break;
          }
        }

        if (touchedWrongStroke) {
          this.triggerNudge(`Start at Stroke #${this.activeStrokeIndex + 1}!`);
          sound.playGentleNudge();
        } else {
          this.triggerNudge(`Put your finger on #${this.activeStrokeIndex + 1}!`);
        }
      };

      const handleMove = (e) => {
        e.preventDefault();
        if (!this.currentItem) return;

        const pos = getPos(e);
        const normPos = this.fromCanvasCoords(pos);

        if (this.activeStrokeIndex >= this.currentItem.strokes.length) return;

        const currentStroke = this.currentItem.strokes[this.activeStrokeIndex];
        const progress = this.strokeProgress[this.activeStrokeIndex];
        const points = currentStroke.points;
        const currentIndex = progress.maxReachedIndex;
        const targetWaypoint = points[currentIndex] || points[0];
        const startPoint = points[0];
        const allowedRadius = Math.max(55, 50 / this.scaleFactor);

        // If not tracing yet, check if finger dragged into the start circle or waypoint!
        if (!this.isTracing) {
          const distToStart = Math.hypot(normPos.x - startPoint.x, normPos.y - startPoint.y);
          const distToTarget = Math.hypot(normPos.x - targetWaypoint.x, normPos.y - targetWaypoint.y);
          if (distToTarget <= allowedRadius || (progress.maxReachedIndex === 0 && distToStart <= allowedRadius * 1.6)) {
            this.isTracing = true;
            progress.drawnPoints.push({ ...normPos });
            this.spawnSparkles(pos.x, pos.y, '#FFD700', 5);
            sound.playTap();
          }
          return;
        }

        // Look ahead generously along the stroke path
        const maxLook = Math.min(points.length - 1, currentIndex + 14);
        let bestIndex = -1;
        let minDistance = Infinity;

        for (let i = currentIndex; i <= maxLook; i++) {
          const d = Math.hypot(normPos.x - points[i].x, normPos.y - points[i].y);
          if (d < minDistance) {
            minDistance = d;
            bestIndex = i;
          }
        }

        const hitTolerance = Math.max(65, 55 / this.scaleFactor);

        if (bestIndex > currentIndex && minDistance <= hitTolerance) {
          progress.maxReachedIndex = bestIndex;
          progress.drawnPoints.push({ ...normPos });

          if (bestIndex % 4 === 0 || bestIndex === points.length - 1) {
            sound.playTraceChime(bestIndex);
            this.spawnSparkles(pos.x, pos.y, '#FF6B6B', 3);
          }

          if (progress.maxReachedIndex >= points.length - 2) {
            progress.maxReachedIndex = points.length - 1;
            progress.completed = true;
            this.isTracing = false;
            this.handleStrokeFinished();
          }
        } else if (minDistance > hitTolerance * 1.8) {
          this.triggerNudge('Stay on the track!');
        } else if (currentIndex > 3) {
          const prevPt = points[currentIndex - 3];
          const distPrev = Math.hypot(normPos.x - prevPt.x, normPos.y - prevPt.y);
          if (distPrev < 25) {
            this.triggerNudge('Follow the train arrow! ➡️');
            sound.playGentleNudge();
          }
        }
      };

      const handleUp = (e) => {
        e.preventDefault();
        this.isTracing = false;
      };

      this.canvas.addEventListener('mousedown', handleDown);
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);

      this.canvas.addEventListener('touchstart', handleDown, { passive: false });
      window.addEventListener('touchmove', handleMove, { passive: false });
      window.addEventListener('touchend', handleUp, { passive: false });
      window.addEventListener('touchcancel', handleUp, { passive: false });
    }

    triggerNudge(message) {
      this.nudgeMessage = message;
      this.nudgeAlpha = 1.0;
    }

    handleStrokeFinished() {
      sound.playStrokeComplete();
      const currentStroke = this.currentItem.strokes[this.activeStrokeIndex];
      const endPt = this.toCanvasCoords(currentStroke.points[currentStroke.points.length - 1]);
      this.spawnSparkles(endPt.x, endPt.y, '#FFD700', 16);

      this.options.onStrokeComplete({
        strokeIndex: this.activeStrokeIndex,
        stroke: currentStroke,
        item: this.currentItem
      });

      this.activeStrokeIndex++;

      if (this.activeStrokeIndex < this.currentItem.strokes.length) {
        this.options.onProgress({
          item: this.currentItem,
          activeStroke: this.activeStrokeIndex,
          totalStrokes: this.currentItem.strokes.length,
          isFinished: false
        });
      } else {
        this.handleItemFinished();
      }
    }

    handleItemFinished() {
      sound.playCelebration();
      for (let i = 0; i < 40; i++) {
        const x = this.width * (0.2 + Math.random() * 0.6);
        const y = this.height * (0.2 + Math.random() * 0.6);
        const colors = ['#FF4757', '#FFA502', '#2ED573', '#1E90FF', '#9B59B6'];
        this.spawnSparkles(x, y, colors[i % colors.length], 4);
      }

      this.options.onItemComplete({ item: this.currentItem });
      this.options.onProgress({
        item: this.currentItem,
        activeStroke: this.activeStrokeIndex,
        totalStrokes: this.currentItem.strokes.length,
        isFinished: true
      });
    }

    spawnSparkles(x, y, color = '#FFD700', count = 6) {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 3.5;
        this.particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 3 + Math.random() * 4,
          color,
          alpha: 1.0,
          decay: 0.02 + Math.random() * 0.03
        });
      }
    }

    startRenderLoop() {
      const loop = (timestamp) => {
        this.guideAnimTime = timestamp * 0.0015;
        this.hintPulse += 0.05;
        if (this.nudgeAlpha > 0) this.nudgeAlpha -= 0.015;
        this.updateParticles();
        this.render();
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }

    updateParticles() {
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
        if (p.alpha <= 0) this.particles.splice(i, 1);
      }
    }

    render() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.width, this.height);

      this.drawHandwritingGuidelines();
      if (!this.currentItem) return;

      this.drawTemplateTracks();
      this.drawCompletedStrokes();
      this.drawActiveStroke();
      this.drawStrokeBadgesAndGuides();
      this.drawParticles();

      if (this.nudgeAlpha > 0 && this.nudgeMessage) {
        this.drawNudgeToast();
      }
    }

    drawHandwritingGuidelines() {
      const ctx = this.ctx;
      const left = this.offsetX + 20 * this.scaleFactor;
      const right = this.offsetX + 380 * this.scaleFactor;
      const topY = this.offsetY + 70 * this.scaleFactor;
      const midY = this.offsetY + 205 * this.scaleFactor;
      const baseY = this.offsetY + 340 * this.scaleFactor;

      ctx.save();
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = 'rgba(0, 40, 80, 0.08)';
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 8;
      this.roundRect(ctx, this.offsetX + 10, this.offsetY + 10, 380 * this.scaleFactor, 380 * this.scaleFactor, 24);
      ctx.fill();
      ctx.restore();

      ctx.strokeStyle = 'rgba(70, 130, 240, 0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(left, topY);
      ctx.lineTo(right, topY);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(70, 130, 240, 0.4)';
      ctx.setLineDash([8, 8]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(left, midY);
      ctx.lineTo(right, midY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.strokeStyle = 'rgba(235, 87, 87, 0.4)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(left, baseY);
      ctx.lineTo(right, baseY);
      ctx.stroke();
    }

    drawTemplateTracks() {
      const ctx = this.ctx;
      this.currentItem.strokes.forEach((stroke, idx) => {
        if (idx < this.activeStrokeIndex) return;

        ctx.save();
        ctx.strokeStyle = '#E2E8F0';
        ctx.lineWidth = 32 * this.scaleFactor;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        stroke.points.forEach((pt, pIdx) => {
          const cPt = this.toCanvasCoords(pt);
          if (pIdx === 0) ctx.moveTo(cPt.x, cPt.y);
          else ctx.lineTo(cPt.x, cPt.y);
        });
        ctx.stroke();

        ctx.strokeStyle = '#CBD5E1';
        ctx.lineWidth = 4 * this.scaleFactor;
        ctx.setLineDash([6, 6]);
        ctx.stroke();
        ctx.restore();
      });
    }

    drawCompletedStrokes() {
      for (let i = 0; i < this.activeStrokeIndex; i++) {
        const stroke = this.currentItem.strokes[i];
        this.drawTrackPath(stroke.points, '#2ED573', '#26AF5F', true);
      }
    }

    drawActiveStroke() {
      if (this.activeStrokeIndex >= this.currentItem.strokes.length) return;
      const stroke = this.currentItem.strokes[this.activeStrokeIndex];
      const progress = this.strokeProgress[this.activeStrokeIndex];

      if (progress.maxReachedIndex > 0) {
        const activePts = stroke.points.slice(0, progress.maxReachedIndex + 1);
        this.drawTrackPath(activePts, '#FF6B6B', '#EE5253', false);
      }
    }

    drawTrackPath(points, mainColor, railColor, isComplete = false) {
      if (points.length < 2) return;
      const ctx = this.ctx;
      ctx.save();

      ctx.strokeStyle = mainColor;
      ctx.lineWidth = 26 * this.scaleFactor;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      points.forEach((pt, idx) => {
        const cPt = this.toCanvasCoords(pt);
        if (idx === 0) ctx.moveTo(cPt.x, cPt.y);
        else ctx.lineTo(cPt.x, cPt.y);
      });
      ctx.stroke();

      ctx.strokeStyle = isComplete ? '#FFFFFF' : '#FFEAA7';
      ctx.lineWidth = 3.5 * this.scaleFactor;
      ctx.stroke();

      ctx.strokeStyle = railColor;
      ctx.lineWidth = 3 * this.scaleFactor;
      for (let i = 0; i < points.length - 1; i += 3) {
        const p1 = this.toCanvasCoords(points[i]);
        const p2 = this.toCanvasCoords(points[i + 1]);
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) + Math.PI / 2;
        const tieLen = 12 * this.scaleFactor;
        ctx.beginPath();
        ctx.moveTo(p1.x - Math.cos(angle) * tieLen, p1.y - Math.sin(angle) * tieLen);
        ctx.lineTo(p1.x + Math.cos(angle) * tieLen, p1.y + Math.sin(angle) * tieLen);
        ctx.stroke();
      }

      ctx.restore();
    }

    drawStrokeBadgesAndGuides() {
      const ctx = this.ctx;
      if (!this.currentItem || this.activeStrokeIndex >= this.currentItem.strokes.length) return;

      const currentStroke = this.currentItem.strokes[this.activeStrokeIndex];
      const startPt = this.toCanvasCoords(currentStroke.points[0]);

      // Pulsing Start Badge "1", "2", "3" ONLY for the currently active stroke!
      const pulse = 1 + Math.sin(this.hintPulse * 2.5) * 0.12;
      const radius = 24 * this.scaleFactor * pulse;

      ctx.save();
      // Glowing halo
      ctx.fillStyle = 'rgba(255, 71, 87, 0.28)';
      ctx.beginPath();
      ctx.arc(startPt.x, startPt.y, radius * 1.45, 0, Math.PI * 2);
      ctx.fill();

      // Main circle badge
      ctx.fillStyle = '#FF4757';
      ctx.shadowColor = 'rgba(255, 71, 87, 0.5)';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(startPt.x, startPt.y, radius, 0, Math.PI * 2);
      ctx.fill();

      // Stroke Number (1, 2, 3...)
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold ${20 * this.scaleFactor}px "Nunito", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(this.activeStrokeIndex + 1), startPt.x, startPt.y);
      ctx.restore();

      // Animated Train / Arrow Gliding along the active stroke to demonstrate direction
      this.drawAnimatedDirectionGuide(currentStroke);
    }

    drawAnimatedDirectionGuide(stroke) {
      const ctx = this.ctx;
      const points = stroke.points;
      if (points.length < 2) return;

      const t = (this.guideAnimTime % 2.0) / 2.0;
      const sampleIdx = Math.floor(t * (points.length - 1));
      const nextIdx = Math.min(points.length - 1, sampleIdx + 1);

      const pt1 = this.toCanvasCoords(points[sampleIdx]);
      const pt2 = this.toCanvasCoords(points[nextIdx]);

      const frac = t * (points.length - 1) - sampleIdx;
      const curX = pt1.x + (pt2.x - pt1.x) * frac;
      const curY = pt1.y + (pt2.y - pt1.y) * frac;
      const angle = Math.atan2(pt2.y - pt1.y, pt2.x - pt1.x);

      ctx.save();
      ctx.translate(curX, curY);
      ctx.rotate(angle);

      ctx.fillStyle = '#FFC312';
      ctx.strokeStyle = '#EE5A24';
      ctx.lineWidth = 2;

      this.roundRect(ctx, -12 * this.scaleFactor, -8 * this.scaleFactor, 24 * this.scaleFactor, 16 * this.scaleFactor, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#EA2027';
      ctx.beginPath();
      ctx.moveTo(12 * this.scaleFactor, -6 * this.scaleFactor);
      ctx.lineTo(20 * this.scaleFactor, 0);
      ctx.lineTo(12 * this.scaleFactor, 6 * this.scaleFactor);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }

    drawParticles() {
      const ctx = this.ctx;
      this.particles.forEach((p) => {
        ctx.save();
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * this.scaleFactor, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }

    drawNudgeToast() {
      const ctx = this.ctx;
      ctx.save();
      ctx.globalAlpha = Math.min(1.0, this.nudgeAlpha * 1.5);
      ctx.fillStyle = 'rgba(45, 52, 54, 0.85)';

      const text = this.nudgeMessage;
      ctx.font = `bold ${16 * this.scaleFactor}px "Nunito", sans-serif`;
      const textWidth = ctx.measureText(text).width;
      const pad = 18 * this.scaleFactor;
      const boxW = textWidth + pad * 2;
      const boxH = 40 * this.scaleFactor;
      const boxX = (this.width - boxW) / 2;
      const boxY = this.height - 56 * this.scaleFactor;

      this.roundRect(ctx, boxX, boxY, boxW, boxH, 20);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, this.width / 2, boxY + boxH / 2);
      ctx.restore();
    }

    roundRect(ctx, x, y, w, h, r) {
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, r);
        return;
      }
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }
  }

  /* ==========================================================================
     5. Train World Sandbox Simulation
     ========================================================================== */
  const DIR_UP = 0;
  const DIR_RIGHT = 1;
  const DIR_DOWN = 2;
  const DIR_LEFT = 3;
  const OPPOSITE = [DIR_DOWN, DIR_LEFT, DIR_UP, DIR_RIGHT];

  class TrainWorld {
    constructor(canvas, options = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.options = options;
      this.cols = 12;
      this.rows = 8;
      this.grid = [];
      this.selectedTool = 'straight';
      this.trainRunning = false;
      this.trainSpeed = 2.0;
      this.trainPos = { row: 2, col: 2, subX: 0.5, subY: 0.5, dir: DIR_RIGHT };
      this.cars = [
        { type: 'tender', dist: 0.9 },
        { type: 'passenger', dist: 1.8 },
        { type: 'animal', dist: 2.7 }
      ];
      this.historyTrail = [];
      this.smokePuffs = [];
      this.stationTimer = 0;
      this.chugTimer = 0;

      this.initGrid();
      this.loadDefaultTrack();
      this.initCanvasResolution();
      this.attachEvents();
      this.startLoop();
    }

    initGrid() {
      this.grid = [];
      for (let r = 0; r < this.rows; r++) {
        const row = [];
        for (let c = 0; c < this.cols; c++) row.push(null);
        this.grid.push(row);
      }
    }

    initCanvasResolution() {
      const rect = this.canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      this.width = rect.width || 750;
      this.height = rect.height || 500;
      this.canvas.width = this.width * dpr;
      this.canvas.height = this.height * dpr;
      this.ctx.resetTransform?.();
      this.ctx.scale(dpr, dpr);

      this.tileSize = Math.floor(Math.min(this.width / this.cols, this.height / this.rows));
      this.gridOffsetX = Math.floor((this.width - this.cols * this.tileSize) / 2);
      this.gridOffsetY = Math.floor((this.height - this.rows * this.tileSize) / 2);
    }

    resize() {
      this.initCanvasResolution();
    }

    loadDefaultTrack() {
      this.setPiece(2, 2, 'curve_br');
      for (let c = 3; c <= 8; c++) this.setPiece(2, c, 'straight_h');
      this.setPiece(2, 9, 'curve_bl');

      this.setPiece(3, 2, 'straight_v');
      this.setPiece(3, 9, 'straight_v');
      this.setPiece(4, 2, 'straight_v');
      this.setPiece(4, 9, 'station');

      this.setPiece(5, 2, 'curve_tr');
      for (let c = 3; c <= 8; c++) this.setPiece(5, c, 'straight_h');
      this.setPiece(5, 9, 'curve_tl');

      this.setPiece(1, 1, 'tree');
      this.setPiece(1, 10, 'tree');
      this.setPiece(6, 1, 'tree');
      this.setPiece(6, 10, 'tree');

      this.trainPos = { row: 2, col: 3, subX: 0.5, subY: 0.5, dir: DIR_RIGHT };
      this.initCarTrail();
    }

    clearBoard() {
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          if (this.grid[r][c]) {
            rewards.returnPiece(this.grid[r][c].category);
            this.grid[r][c] = null;
          }
        }
      }
      this.trainRunning = false;
    }

    setPiece(row, col, pieceType) {
      if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return;
      let category = 'straight';
      if (pieceType.startsWith('curve')) category = 'curve';
      else if (pieceType === 'station') category = 'station';
      else if (pieceType === 'tree') category = 'tree';

      this.grid[row][col] = {
        type: pieceType,
        category,
        connections: this.getConnections(pieceType)
      };
    }

    getConnections(type) {
      switch (type) {
        case 'straight_h': return [DIR_LEFT, DIR_RIGHT];
        case 'straight_v': return [DIR_UP, DIR_DOWN];
        case 'curve_br': return [DIR_DOWN, DIR_RIGHT];
        case 'curve_bl': return [DIR_DOWN, DIR_LEFT];
        case 'curve_tr': return [DIR_UP, DIR_RIGHT];
        case 'curve_tl': return [DIR_UP, DIR_LEFT];
        case 'station': return [DIR_UP, DIR_DOWN];
        default: return [];
      }
    }

    initCarTrail() {
      this.historyTrail = [];
      for (let i = 0; i < 80; i++) {
        this.historyTrail.push({
          x: (this.trainPos.col + this.trainPos.subX) * this.tileSize + this.gridOffsetX,
          y: (this.trainPos.row + this.trainPos.subY) * this.tileSize + this.gridOffsetY,
          angle: this.dirToAngle(this.trainPos.dir)
        });
      }
    }

    dirToAngle(dir) {
      switch (dir) {
        case DIR_RIGHT: return 0;
        case DIR_DOWN: return Math.PI / 2;
        case DIR_LEFT: return Math.PI;
        case DIR_UP: return -Math.PI / 2;
        default: return 0;
      }
    }

    attachEvents() {
      const handleTap = (e) => {
        const rect = this.canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const x = clientX - rect.left - this.gridOffsetX;
        const y = clientY - rect.top - this.gridOffsetY;

        const col = Math.floor(x / this.tileSize);
        const row = Math.floor(y / this.tileSize);

        if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
          this.handleGridClick(row, col);
        }
      };

      this.canvas.addEventListener('click', handleTap);
      this.canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleTap(e);
      }, { passive: false });
    }

    handleGridClick(row, col) {
      sound.init();
      const existing = this.grid[row][col];

      if (this.selectedTool === 'erase') {
        if (existing) {
          rewards.returnPiece(existing.category);
          this.grid[row][col] = null;
          sound.playTap();
        }
        return;
      }

      if (this.selectedTool === 'straight') {
        if (existing && (existing.type === 'straight_h' || existing.type === 'straight_v')) {
          const nextType = existing.type === 'straight_h' ? 'straight_v' : 'straight_h';
          existing.type = nextType;
          existing.connections = this.getConnections(nextType);
          sound.playTrackSnap();
          return;
        }
        if (rewards.usePiece('straight')) {
          this.setPiece(row, col, 'straight_h');
          sound.playTrackSnap();
        } else {
          sound.playGentleNudge();
        }
        return;
      }

      if (this.selectedTool === 'curve') {
        if (existing && existing.type.startsWith('curve_')) {
          const cycle = ['curve_br', 'curve_bl', 'curve_tl', 'curve_tr'];
          const nextIdx = (cycle.indexOf(existing.type) + 1) % cycle.length;
          existing.type = cycle[nextIdx];
          existing.connections = this.getConnections(existing.type);
          sound.playTrackSnap();
          return;
        }
        if (rewards.usePiece('curve')) {
          this.setPiece(row, col, 'curve_br');
          sound.playTrackSnap();
        } else {
          sound.playGentleNudge();
        }
        return;
      }

      if (this.selectedTool === 'station') {
        if (rewards.usePiece('station')) {
          this.setPiece(row, col, 'station');
          sound.playTrackSnap();
        } else {
          sound.playGentleNudge();
        }
        return;
      }

      if (this.selectedTool === 'tree') {
        if (rewards.usePiece('tree')) {
          this.setPiece(row, col, 'tree');
          sound.playTap();
        } else {
          sound.playGentleNudge();
        }
        return;
      }
    }

    toggleTrain() {
      this.trainRunning = !this.trainRunning;
      if (this.trainRunning) {
        sound.playWhistle();
        this.ensureTrainOnTrack();
      }
      return this.trainRunning;
    }

    blowWhistle() {
      sound.playWhistle();
      const pos = this.getLocoPixelPos();
      for (let i = 0; i < 6; i++) {
        this.smokePuffs.push({
          x: pos.x,
          y: pos.y,
          vx: (Math.random() - 0.5) * 1.5,
          vy: -2 - Math.random() * 2,
          size: 10 + Math.random() * 10,
          alpha: 0.9,
          growth: 0.4
        });
      }
    }

    ensureTrainOnTrack() {
      const tile = this.grid[this.trainPos.row]?.[this.trainPos.col];
      if (!tile || !tile.connections || tile.connections.length === 0) {
        for (let r = 0; r < this.rows; r++) {
          for (let c = 0; c < this.cols; c++) {
            const t = this.grid[r][c];
            if (t && t.connections && t.connections.length > 0) {
              this.trainPos = { row: r, col: c, subX: 0.5, subY: 0.5, dir: t.connections[0] };
              this.initCarTrail();
              return;
            }
          }
        }
      }
    }

    startLoop() {
      let lastTime = performance.now();
      const step = (now) => {
        const dt = Math.min((now - lastTime) / 1000, 0.1);
        lastTime = now;
        this.update(dt);
        this.render();
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }

    update(dt) {
      if (this.trainRunning) {
        if (this.stationTimer > 0) {
          this.stationTimer -= dt;
        } else {
          this.updateTrainPhysics(dt);
        }
      }

      for (let i = this.smokePuffs.length - 1; i >= 0; i--) {
        const p = this.smokePuffs[i];
        p.x += p.vx;
        p.y += p.vy;
        p.size += p.growth;
        p.alpha -= 0.015;
        if (p.alpha <= 0) this.smokePuffs.splice(i, 1);
      }
    }

    updateTrainPhysics(dt) {
      const speed = this.trainSpeed;
      const stepDist = speed * dt;
      let { row, col, subX, subY, dir } = this.trainPos;

      switch (dir) {
        case DIR_RIGHT: subX += stepDist; break;
        case DIR_DOWN:  subY += stepDist; break;
        case DIR_LEFT:  subX -= stepDist; break;
        case DIR_UP:    subY -= stepDist; break;
      }

      this.chugTimer += dt * speed;
      if (this.chugTimer > 0.45) {
        this.chugTimer = 0;
        sound.playChug();
        const pos = this.getLocoPixelPos();
        this.smokePuffs.push({
          x: pos.x,
          y: pos.y - 10,
          vx: (Math.random() - 0.5) * 0.8,
          vy: -1.5 - Math.random() * 1.5,
          size: 7 + Math.random() * 5,
          alpha: 0.8,
          growth: 0.3
        });
      }

      if (subX >= 1.0) {
        col++; subX -= 1.0;
        this.handleEnterTile(row, col, DIR_RIGHT, subX, subY);
      } else if (subX < 0.0) {
        col--; subX += 1.0;
        this.handleEnterTile(row, col, DIR_LEFT, subX, subY);
      } else if (subY >= 1.0) {
        row++; subY -= 1.0;
        this.handleEnterTile(row, col, DIR_DOWN, subX, subY);
      } else if (subY < 0.0) {
        row--; subY += 1.0;
        this.handleEnterTile(row, col, DIR_UP, subX, subY);
      } else {
        this.trainPos.subX = subX;
        this.trainPos.subY = subY;
      }

      const currentLocoPos = this.getLocoPixelPos();
      this.historyTrail.unshift({
        x: currentLocoPos.x,
        y: currentLocoPos.y,
        angle: this.dirToAngle(this.trainPos.dir)
      });
      if (this.historyTrail.length > 200) this.historyTrail.pop();
    }

    handleEnterTile(row, col, entryDir, subX, subY) {
      if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
        this.stopAtBumper();
        return;
      }

      const tile = this.grid[row][col];
      const incomingFrom = OPPOSITE[entryDir];

      if (!tile || !tile.connections || !tile.connections.includes(incomingFrom)) {
        this.stopAtBumper();
        return;
      }

      const exits = tile.connections.filter(d => d !== incomingFrom);
      const exitDir = exits.length > 0 ? exits[0] : incomingFrom;

      this.trainPos.row = row;
      this.trainPos.col = col;
      this.trainPos.dir = exitDir;
      this.trainPos.subX = 0.5;
      this.trainPos.subY = 0.5;

      if (tile.type === 'station') {
        sound.playBell();
        this.stationTimer = 2.0;
      }
    }

    stopAtBumper() {
      this.trainRunning = false;
      sound.playGentleNudge();
    }

    getLocoPixelPos() {
      return {
        x: (this.trainPos.col + this.trainPos.subX) * this.tileSize + this.gridOffsetX,
        y: (this.trainPos.row + this.trainPos.subY) * this.tileSize + this.gridOffsetY
      };
    }

    render() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.width, this.height);

      this.drawLandscape();
      this.drawGridOverlay();
      this.drawTiles();
      this.drawTrain();
      this.drawSmoke();
    }

    drawLandscape() {
      const ctx = this.ctx;
      const grad = ctx.createLinearGradient(0, 0, 0, this.height);
      grad.addColorStop(0, '#B8E994');
      grad.addColorStop(1, '#78E08F');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    drawGridOverlay() {
      const ctx = this.ctx;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1.5;

      for (let r = 0; r <= this.rows; r++) {
        const y = this.gridOffsetY + r * this.tileSize;
        ctx.beginPath();
        ctx.moveTo(this.gridOffsetX, y);
        ctx.lineTo(this.gridOffsetX + this.cols * this.tileSize, y);
        ctx.stroke();
      }

      for (let c = 0; c <= this.cols; c++) {
        const x = this.gridOffsetX + c * this.tileSize;
        ctx.beginPath();
        ctx.moveTo(x, this.gridOffsetY);
        ctx.lineTo(x, this.gridOffsetY + this.rows * this.tileSize);
        ctx.stroke();
      }
    }

    drawTiles() {
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          const item = this.grid[r][c];
          if (item) {
            const x = this.gridOffsetX + c * this.tileSize;
            const y = this.gridOffsetY + r * this.tileSize;
            this.drawTile(item, x, y, this.tileSize);
          }
        }
      }
    }

    drawTile(item, x, y, size) {
      const ctx = this.ctx;
      const midX = x + size / 2;
      const midY = y + size / 2;

      ctx.save();
      if (item.type === 'straight_h') {
        this.drawWoodenTies(ctx, x, y, size, 'h');
        this.drawSteelRails(ctx, x, midY - 7, x + size, midY - 7);
        this.drawSteelRails(ctx, x, midY + 7, x + size, midY + 7);
      } else if (item.type === 'straight_v') {
        this.drawWoodenTies(ctx, x, y, size, 'v');
        this.drawSteelRails(ctx, midX - 7, y, midX - 7, y + size);
        this.drawSteelRails(ctx, midX + 7, y, midX + 7, y + size);
      } else if (item.type.startsWith('curve_')) {
        this.drawCurveTrack(ctx, item.type, x, y, size);
      } else if (item.type === 'station') {
        this.drawWoodenTies(ctx, x, y, size, 'v');
        this.drawSteelRails(ctx, midX - 7, y, midX - 7, y + size);
        this.drawSteelRails(ctx, midX + 7, y, midX + 7, y + size);
        this.drawStationBuilding(ctx, x, y, size);
      } else if (item.type === 'tree') {
        this.drawTree(ctx, midX, midY, size);
      }
      ctx.restore();
    }

    drawWoodenTies(ctx, x, y, size, dir) {
      ctx.strokeStyle = '#8B5A2B';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      const step = size / 5;
      if (dir === 'h') {
        for (let i = step / 2; i < size; i += step) {
          ctx.beginPath();
          ctx.moveTo(x + i, y + size * 0.22);
          ctx.lineTo(x + i, y + size * 0.78);
          ctx.stroke();
        }
      } else {
        for (let i = step / 2; i < size; i += step) {
          ctx.beginPath();
          ctx.moveTo(x + size * 0.22, y + i);
          ctx.lineTo(x + size * 0.78, y + i);
          ctx.stroke();
        }
      }
    }

    drawSteelRails(ctx, x1, y1, x2, y2) {
      ctx.strokeStyle = '#D1D8E0';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    drawCurveTrack(ctx, type, x, y, size) {
      let cx, cy;
      if (type === 'curve_br') { cx = x + size; cy = y + size; }
      else if (type === 'curve_bl') { cx = x; cy = y + size; }
      else if (type === 'curve_tl') { cx = x; cy = y; }
      else if (type === 'curve_tr') { cx = x + size; cy = y; }

      const rInner = size / 2 - 7;
      const rOuter = size / 2 + 7;

      ctx.strokeStyle = '#A4B0BE';
      ctx.lineWidth = 22;
      ctx.beginPath();
      ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#8B5A2B';
      ctx.lineWidth = 4;
      for (let a = 0; a <= Math.PI / 2; a += Math.PI / 10) {
        let angle = a;
        if (type === 'curve_br') angle += Math.PI;
        else if (type === 'curve_bl') angle += Math.PI * 1.5;
        else if (type === 'curve_tl') angle += 0;
        else if (type === 'curve_tr') angle += Math.PI * 0.5;

        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * (size / 2 - 12), cy + Math.sin(angle) * (size / 2 - 12));
        ctx.lineTo(cx + Math.cos(angle) * (size / 2 + 12), cy + Math.sin(angle) * (size / 2 + 12));
        ctx.stroke();
      }

      ctx.strokeStyle = '#D1D8E0';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, rInner, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, rOuter, 0, Math.PI * 2);
      ctx.stroke();
    }

    drawStationBuilding(ctx, x, y, size) {
      ctx.fillStyle = '#E55039';
      ctx.fillRect(x + 2, y + 4, size * 0.28, size - 8);

      ctx.fillStyle = '#F8C291';
      ctx.beginPath();
      ctx.moveTo(x, y + 2);
      ctx.lineTo(x + size * 0.35, y + 2);
      ctx.lineTo(x + size * 0.28, y + 10);
      ctx.lineTo(x, y + 10);
      ctx.closePath();
      ctx.fill();
    }

    drawTree(ctx, midX, midY, size) {
      ctx.fillStyle = '#795548';
      ctx.fillRect(midX - 4, midY + 4, 8, size * 0.35);

      ctx.fillStyle = '#2ED573';
      ctx.beginPath();
      ctx.arc(midX, midY - 6, size * 0.28, 0, Math.PI * 2);
      ctx.fill();
    }

    drawTrain() {
      const locoPos = this.getLocoPixelPos();
      const locoAngle = this.dirToAngle(this.trainPos.dir);

      const spacing = 38;
      this.cars.forEach((car, idx) => {
        const trailIndex = Math.min(this.historyTrail.length - 1, Math.floor((idx + 1) * spacing * 0.5));
        const pos = this.historyTrail[trailIndex] || { x: locoPos.x, y: locoPos.y, angle: locoAngle };
        this.drawCar(pos.x, pos.y, pos.angle, car.type);
      });

      this.drawLocomotive(locoPos.x, locoPos.y, locoAngle);
    }

    drawLocomotive(x, y, angle) {
      const ctx = this.ctx;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);

      const isGolden = rewards.state.selectedTrain === 'golden_express';
      const bodyColor = isGolden ? '#F1C40F' : '#EA2027';
      const cabColor = isGolden ? '#F39C12' : '#0652DD';

      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.roundRect(-16, -11, 26, 22, 5);
      ctx.fill();

      ctx.fillStyle = cabColor;
      ctx.beginPath();
      ctx.roundRect(-24, -13, 15, 26, 4);
      ctx.fill();

      ctx.fillStyle = '#E0F7FA';
      ctx.fillRect(-22, -10, 11, 8);

      ctx.fillStyle = '#2C3A47';
      ctx.beginPath();
      ctx.roundRect(4, -15, 6, 8, 2);
      ctx.fill();

      ctx.fillStyle = '#FFEAA7';
      ctx.beginPath();
      ctx.arc(12, 0, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#2C3A47';
      ctx.beginPath();
      ctx.arc(-16, -12, 4, 0, Math.PI * 2);
      ctx.arc(0, -12, 4, 0, Math.PI * 2);
      ctx.arc(-16, 12, 4, 0, Math.PI * 2);
      ctx.arc(0, 12, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    drawCar(x, y, angle, type) {
      const ctx = this.ctx;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);

      if (type === 'tender') {
        ctx.fillStyle = '#2C3A47';
        ctx.beginPath();
        ctx.roundRect(-14, -10, 28, 20, 3);
        ctx.fill();
      } else if (type === 'passenger') {
        ctx.fillStyle = '#F39C12';
        ctx.beginPath();
        ctx.roundRect(-16, -11, 32, 22, 4);
        ctx.fill();
        ctx.fillStyle = '#E0F7FA';
        ctx.fillRect(-12, -8, 7, 6);
        ctx.fillRect(-2, -8, 7, 6);
        ctx.fillRect(8, -8, 7, 6);
      } else {
        ctx.fillStyle = '#27AE60';
        ctx.beginPath();
        ctx.roundRect(-16, -11, 32, 22, 4);
        ctx.fill();
        ctx.fillStyle = '#F1C40F';
        ctx.beginPath();
        ctx.arc(0, -12, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#333333';
      ctx.beginPath();
      ctx.arc(-10, -11, 3, 0, Math.PI * 2);
      ctx.arc(10, -11, 3, 0, Math.PI * 2);
      ctx.arc(-10, 11, 3, 0, Math.PI * 2);
      ctx.arc(10, 11, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    drawSmoke() {
      const ctx = this.ctx;
      this.smokePuffs.forEach((p) => {
        ctx.save();
        ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }
  }

  /* ==========================================================================
     6. Train Math & Cargo Sums Game
     ========================================================================== */
  class MathGame {
    constructor(containerEl, options = {}) {
      this.container = containerEl;
      this.options = { onCorrect: options.onCorrect || (() => {}), ...options };
      this.mode = 'add_5';
      this.currentProblem = null;
      this.answered = false;
      this.streak = 0;

      this.renderLayout();
      this.generateProblem();
    }

    setMode(mode) {
      this.mode = mode;
      this.streak = 0;
      this.generateProblem();
    }

    generateProblem() {
      this.answered = false;
      let num1, num2, answer, type, symbol, questionText, spokenText, cargoItems1, cargoItems2;
      const CARGO_ICONS = ['🍎', '⭐', '📦', '🎈', '⚙️', '🎁'];
      const icon = CARGO_ICONS[Math.floor(Math.random() * CARGO_ICONS.length)];

      if (this.mode === 'add_5') {
        type = 'addition';
        symbol = '+';
        num1 = Math.floor(Math.random() * 4) + 1;
        const maxNum2 = 5 - num1;
        num2 = Math.floor(Math.random() * maxNum2) + 1;
        answer = num1 + num2;
        questionText = `${num1} + ${num2} = ?`;
        spokenText = `What is ${num1} plus ${num2}?`;
      } else if (this.mode === 'add_10') {
        type = 'addition';
        symbol = '+';
        num1 = Math.floor(Math.random() * 6) + 1;
        const maxNum2 = 10 - num1;
        num2 = Math.floor(Math.random() * maxNum2) + 1;
        answer = num1 + num2;
        questionText = `${num1} + ${num2} = ?`;
        spokenText = `What is ${num1} plus ${num2}?`;
      } else if (this.mode === 'sub_5') {
        type = 'subtraction';
        symbol = '−';
        num1 = Math.floor(Math.random() * 4) + 2;
        num2 = Math.floor(Math.random() * (num1 - 1)) + 1;
        answer = num1 - num2;
        questionText = `${num1} − ${num2} = ?`;
        spokenText = `${num1} minus ${num2} equals what?`;
      } else if (this.mode === 'missing') {
        type = 'missing';
        const start = Math.floor(Math.random() * 6) + 1;
        const missingIndex = Math.floor(Math.random() * 3) + 1;
        const sequence = [start, start + 1, start + 2, start + 3];
        answer = sequence[missingIndex];
        sequence[missingIndex] = '?';
        questionText = sequence.join('  •  ');
        spokenText = 'Which number is missing on the train?';
        this.currentProblem = {
          type, sequence, answer, spokenText,
          options: this.generateOptions(answer, 10)
        };
        this.render();
        sound.speak(spokenText);
        return;
      }

      cargoItems1 = Array(num1).fill(icon);
      cargoItems2 = Array(num2).fill(icon);

      const options = this.generateOptions(answer, this.mode === 'add_10' ? 10 : 6);

      this.currentProblem = {
        type, symbol, num1, num2, answer, icon,
        cargoItems1, cargoItems2, questionText, spokenText, options
      };

      this.render();
      sound.speak(spokenText);
    }

    generateOptions(correctAnswer, maxVal = 10) {
      const opts = new Set([correctAnswer]);
      while (opts.size < 4) {
        let offset = (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 3) + 1);
        let cand = correctAnswer + offset;
        if (cand >= 1 && cand <= maxVal) {
          opts.add(cand);
        } else {
          opts.add(Math.floor(Math.random() * maxVal) + 1);
        }
      }
      return Array.from(opts).sort(() => Math.random() - 0.5);
    }

    renderLayout() {
      this.container.innerHTML = `
        <div class="math-game-wrapper">
          <div class="math-modes-bar">
            <button class="math-mode-btn active" data-mode="add_5">🍎 Sums to 5</button>
            <button class="math-mode-btn" data-mode="add_10">🌟 Sums to 10</button>
            <button class="math-mode-btn" data-mode="sub_5">➖ Take Away</button>
            <button class="math-mode-btn" data-mode="missing">🔢 Missing Car</button>
          </div>

          <div class="math-stage">
            <div class="math-prompt-banner">
              <div class="math-streak-badge">⭐ Streak: <span id="math-streak-val">0</span></div>
              <h2 id="math-question-text" class="math-equation-heading">2 + 3 = ?</h2>
              <button id="btn-math-speak" class="btn-speak" title="Hear Problem">📢 Listen</button>
            </div>

            <div id="math-train-visual" class="math-train-visual"></div>

            <div class="math-answers-label">Tap the winning train car:</div>
            <div id="math-options-grid" class="math-options-grid"></div>
          </div>
        </div>
      `;

      const modeBtns = this.container.querySelectorAll('.math-mode-btn');
      modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          modeBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          sound.playTap();
          this.setMode(btn.dataset.mode);
        });
      });

      this.container.querySelector('#btn-math-speak').addEventListener('click', () => {
        sound.init();
        if (this.currentProblem) sound.speak(this.currentProblem.spokenText);
      });
    }

    render() {
      if (!this.currentProblem) return;

      const eqHeading = this.container.querySelector('#math-question-text');
      eqHeading.innerText = this.currentProblem.questionText;

      const streakEl = this.container.querySelector('#math-streak-val');
      streakEl.innerText = this.streak;

      const trainVisualEl = this.container.querySelector('#math-train-visual');
      const p = this.currentProblem;

      if (p.type === 'addition') {
        trainVisualEl.innerHTML = `
          <div class="cargo-train-row">
            <div class="loco-front">🚂</div>
            <div class="cargo-car car-1">
              <div class="car-cargo-items">
                ${p.cargoItems1.map((item, idx) => `<span class="cargo-icon" data-idx="${idx + 1}">${item}</span>`).join('')}
              </div>
              <div class="car-number-label">${p.num1}</div>
              <div class="car-bogie">● ●</div>
            </div>

            <div class="cargo-operator">${p.symbol}</div>

            <div class="cargo-car car-2">
              <div class="car-cargo-items">
                ${p.cargoItems2.map((item, idx) => `<span class="cargo-icon" data-idx="${p.num1 + idx + 1}">${item}</span>`).join('')}
              </div>
              <div class="car-number-label">${p.num2}</div>
              <div class="car-bogie">● ●</div>
            </div>

            <div class="cargo-operator">=</div>

            <div class="cargo-car car-target ${this.answered ? 'revealed' : ''}">
              <div class="car-mystery-symbol">${this.answered ? p.answer : '?'}</div>
              <div class="car-bogie">● ●</div>
            </div>
          </div>
        `;
      } else if (p.type === 'subtraction') {
        const items = [];
        for (let i = 0; i < p.num1; i++) {
          const isRemoved = i >= (p.num1 - p.num2);
          items.push(`<span class="cargo-icon ${isRemoved ? 'removed' : ''}">${p.icon}</span>`);
        }

        trainVisualEl.innerHTML = `
          <div class="cargo-train-row">
            <div class="loco-front">🚂</div>
            <div class="cargo-car car-1">
              <div class="car-cargo-items">${items.join('')}</div>
              <div class="car-number-label">${p.num1} start • ${p.num2} took off</div>
              <div class="car-bogie">● ●</div>
            </div>

            <div class="cargo-operator">=</div>

            <div class="cargo-car car-target ${this.answered ? 'revealed' : ''}">
              <div class="car-mystery-symbol">${this.answered ? p.answer : '?'}</div>
              <div class="car-bogie">● ●</div>
            </div>
          </div>
        `;
      } else if (p.type === 'missing') {
        trainVisualEl.innerHTML = `
          <div class="cargo-train-row">
            <div class="loco-front">🚂</div>
            ${p.sequence.map(num => `
              <div class="cargo-car ${num === '?' ? 'car-target' : ''} ${num === '?' && this.answered ? 'revealed' : ''}">
                <div class="car-number-label" style="font-size: 2rem;">${num === '?' && this.answered ? p.answer : num}</div>
                <div class="car-bogie">● ●</div>
              </div>
            `).join('')}
          </div>
        `;
      }

      trainVisualEl.querySelectorAll('.cargo-icon').forEach(iconEl => {
        iconEl.addEventListener('click', () => {
          sound.init();
          iconEl.classList.add('pop');
          const count = iconEl.dataset.idx;
          if (count) {
            sound.playTraceChime(parseInt(count, 10));
            sound.speak(count);
          } else {
            sound.playTap();
          }
          setTimeout(() => iconEl.classList.remove('pop'), 200);
        });
      });

      const optionsGrid = this.container.querySelector('#math-options-grid');
      optionsGrid.innerHTML = '';

      p.options.forEach(val => {
        const btn = document.createElement('button');
        btn.className = 'math-option-btn';
        btn.innerHTML = `
          <span class="option-roof">▲</span>
          <span class="option-val">${val}</span>
          <span class="option-wheels">● ●</span>
        `;
        btn.addEventListener('click', () => this.handleAnswer(val, btn));
        optionsGrid.appendChild(btn);
      });
    }

    handleAnswer(val, btnElement) {
      if (this.answered) return;
      sound.init();

      if (val === this.currentProblem.answer) {
        this.answered = true;
        this.streak++;
        btnElement.classList.add('correct');
        sound.playStrokeComplete();
        sound.playWhistle();

        let praise = `${this.currentProblem.answer}! That's right!`;
        if (this.currentProblem.type === 'addition') {
          praise = `${this.currentProblem.num1} plus ${this.currentProblem.num2} equals ${this.currentProblem.answer}! Super job, Antoni!`;
        }
        sound.speak(praise);

        const reward = rewards.awardTracingReward({
          symbol: `Math`,
          category: 'math',
          rewardTracks: 2
        });

        const trainRow = this.container.querySelector('.cargo-train-row');
        if (trainRow) {
          trainRow.classList.add('chug-celebrate');
        }

        this.render();

        this.options.onCorrect({
          problem: this.currentProblem,
          reward,
          streak: this.streak
        });

        setTimeout(() => {
          this.generateProblem();
        }, 2200);
      } else {
        btnElement.classList.add('shake');
        sound.playGentleNudge();
        sound.speak('Try again! Count the cargo with your finger!');
        setTimeout(() => btnElement.classList.remove('shake'), 500);
      }
    }
  }

  /* ==========================================================================
     7. Main App Coordinator
     ========================================================================== */
  class App {
    constructor() {
      this.currentCategory = 'letters';
      this.currentItemKey = 'A';
      this.wordLetterIndex = 0;

      this.tracingEngine = null;
      this.trainWorld = null;
      this.mathGame = null;

      this.initDOM();
      this.initEngines();
      this.bindEvents();
      this.updateRewardStats();
      this.loadCurrentItem();
    }

    initDOM() {
      this.starCountEl = document.getElementById('star-count');
      this.ticketCountEl = document.getElementById('ticket-count');
      this.trackCountEl = document.getElementById('track-count');

      this.screenTracing = document.getElementById('screen-tracing');
      this.screenMath = document.getElementById('screen-math');
      this.screenTrain = document.getElementById('screen-train');
      this.screenRewards = document.getElementById('screen-rewards');

      this.btnTabTracing = document.getElementById('tab-tracing');
      this.btnTabMath = document.getElementById('tab-math');
      this.btnTabTrain = document.getElementById('tab-train');
      this.btnTabRewards = document.getElementById('tab-rewards');

      this.catLettersBtn = document.getElementById('cat-letters');
      this.catNumbersBtn = document.getElementById('cat-numbers');
      this.catWordsBtn = document.getElementById('cat-words');

      this.itemSelectorEl = document.getElementById('item-selector-ribbon');

      this.letterTitleEl = document.getElementById('active-letter-title');
      this.letterPhonicEl = document.getElementById('active-letter-phonic');
      this.wordTrainCarriageEl = document.getElementById('word-train-carriages');

      this.rewardModal = document.getElementById('reward-modal');
      this.rewardTracksCountEl = document.getElementById('reward-tracks-count');
      this.rewardSpecialEl = document.getElementById('reward-special-text');
    }

    initEngines() {
      const traceCanvas = document.getElementById('tracing-canvas');
      this.tracingEngine = new TracingEngine(traceCanvas, {
        onItemComplete: (data) => this.handleItemCompleted(data.item),
        onProgress: (data) => this.updateTracingProgressUI(data)
      });

      const trainCanvas = document.getElementById('train-canvas');
      this.trainWorld = new TrainWorld(trainCanvas);

      const mathContainer = document.getElementById('math-game-container');
      this.mathGame = new MathGame(mathContainer, {
        onCorrect: () => {}
      });

      rewards.onChange((state) => {
        this.updateRewardStats(state);
      });

      window.addEventListener('resize', () => {
        this.tracingEngine.resize();
        this.trainWorld.resize();
      });
    }

    bindEvents() {
      this.btnTabTracing.addEventListener('click', () => this.switchTab('tracing'));
      if (this.btnTabMath) this.btnTabMath.addEventListener('click', () => this.switchTab('math'));
      this.btnTabTrain.addEventListener('click', () => this.switchTab('train'));
      this.btnTabRewards.addEventListener('click', () => this.switchTab('rewards'));

      this.catLettersBtn.addEventListener('click', () => this.setCategory('letters'));
      this.catNumbersBtn.addEventListener('click', () => this.setCategory('numbers'));
      this.catWordsBtn.addEventListener('click', () => this.setCategory('words'));

      document.getElementById('btn-prev-item').addEventListener('click', () => this.prevItem());
      document.getElementById('btn-next-item').addEventListener('click', () => this.nextItem());
      document.getElementById('btn-speak-phonic').addEventListener('click', () => {
        sound.init();
        const current = this.getCurrentItemData();
        if (current) sound.speak(current.phonic || current.symbol);
      });
      document.getElementById('btn-retry-trace').addEventListener('click', () => {
        sound.playTap();
        this.loadCurrentItem();
      });

      document.getElementById('btn-toggle-train').addEventListener('click', (e) => {
        const isRunning = this.trainWorld.toggleTrain();
        const btn = e.currentTarget;
        btn.innerHTML = isRunning ? '<span>🛑</span> STOP TRAIN' : '<span>🚂</span> GO TRAIN GO!';
        btn.classList.toggle('running', isRunning);
      });

      document.getElementById('btn-train-whistle').addEventListener('click', () => {
        this.trainWorld.blowWhistle();
      });

      document.getElementById('btn-clear-tracks').addEventListener('click', () => {
        this.trainWorld.clearBoard();
        sound.playTap();
      });

      document.getElementById('btn-quick-oval').addEventListener('click', () => {
        this.trainWorld.clearBoard();
        this.trainWorld.loadDefaultTrack();
        sound.playWhistle();
      });

      const toolBtns = document.querySelectorAll('.train-tool-btn');
      toolBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          toolBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.trainWorld.selectedTool = btn.dataset.tool;
          sound.playTap();
        });
      });

      const btnMute = document.getElementById('btn-toggle-sound');
      btnMute.addEventListener('click', () => {
        const on = sound.toggleSound();
        btnMute.innerText = on ? '🔊 Sound: ON' : '🔇 Sound: OFF';
      });

      const btnFullscreen = document.getElementById('btn-fullscreen');
      btnFullscreen.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen?.().catch(() => {});
        } else {
          document.exitFullscreen?.().catch(() => {});
        }
      });

      const dismissReward = () => {
        sound.playTap();
        this.rewardModal.classList.add('hidden');
        this.rewardModal.style.display = 'none';
      };

      document.getElementById('btn-reward-keep-tracing').addEventListener('click', (e) => {
        e.stopPropagation();
        dismissReward();
        this.nextItem();
      });

      document.getElementById('btn-reward-go-train').addEventListener('click', (e) => {
        e.stopPropagation();
        dismissReward();
        this.switchTab('train');
      });

      const closeBtn = document.getElementById('btn-close-reward-modal');
      if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          dismissReward();
        });
      }

      this.rewardModal.addEventListener('click', (e) => {
        if (e.target === this.rewardModal) {
          dismissReward();
        }
      });

      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !this.rewardModal.classList.contains('hidden')) {
          dismissReward();
        }
      });

      const whistleCord = document.getElementById('whistle-pull-cord');
      if (whistleCord) {
        whistleCord.addEventListener('click', () => {
          this.trainWorld.blowWhistle();
          whistleCord.classList.add('pulled');
          setTimeout(() => whistleCord.classList.remove('pulled'), 300);
        });
      }
    }

    switchTab(tab) {
      sound.playTap();
      this.screenTracing.classList.add('hidden');
      if (this.screenMath) this.screenMath.classList.add('hidden');
      this.screenTrain.classList.add('hidden');
      this.screenRewards.classList.add('hidden');

      this.btnTabTracing.classList.remove('active');
      if (this.btnTabMath) this.btnTabMath.classList.remove('active');
      this.btnTabTrain.classList.remove('active');
      this.btnTabRewards.classList.remove('active');

      if (tab === 'tracing') {
        this.screenTracing.classList.remove('hidden');
        this.btnTabTracing.classList.add('active');
        this.tracingEngine.resize();
      } else if (tab === 'math') {
        if (this.screenMath) this.screenMath.classList.remove('hidden');
        if (this.btnTabMath) this.btnTabMath.classList.add('active');
      } else if (tab === 'train') {
        this.screenTrain.classList.remove('hidden');
        this.btnTabTrain.classList.add('active');
        this.trainWorld.resize();
      } else if (tab === 'rewards') {
        this.screenRewards.classList.remove('hidden');
        this.btnTabRewards.classList.add('active');
        this.renderRewardsScreen();
      }
    }

    setCategory(cat) {
      sound.playTap();
      this.currentCategory = cat;
      this.catLettersBtn.classList.toggle('active', cat === 'letters');
      this.catNumbersBtn.classList.toggle('active', cat === 'numbers');
      this.catWordsBtn.classList.toggle('active', cat === 'words');

      if (cat === 'letters') this.currentItemKey = 'A';
      else if (cat === 'numbers') this.currentItemKey = '1';
      else if (cat === 'words') {
        this.currentItemKey = 'ANTONI';
        this.wordLetterIndex = 0;
      }

      this.renderItemSelectorRibbon();
      this.loadCurrentItem();
    }

    renderItemSelectorRibbon() {
      this.itemSelectorEl.innerHTML = '';
      let items = {};
      if (this.currentCategory === 'letters') items = LETTERS;
      else if (this.currentCategory === 'numbers') items = NUMBERS;
      else if (this.currentCategory === 'words') items = WORDS;

      Object.keys(items).forEach(key => {
        const btn = document.createElement('button');
        btn.className = `ribbon-item-btn ${key === this.currentItemKey ? 'active' : ''}`;
        btn.innerText = key;
        btn.addEventListener('click', () => {
          sound.playTap();
          this.currentItemKey = key;
          this.wordLetterIndex = 0;
          this.renderItemSelectorRibbon();
          this.loadCurrentItem();
        });
        this.itemSelectorEl.appendChild(btn);
      });

      const activeBtn = this.itemSelectorEl.querySelector('.active');
      if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }

    getCurrentItemData() {
      if (this.currentCategory === 'letters') return LETTERS[this.currentItemKey];
      if (this.currentCategory === 'numbers') return NUMBERS[this.currentItemKey];
      if (this.currentCategory === 'words') {
        const wordObj = WORDS[this.currentItemKey];
        const activeChar = wordObj.letters[this.wordLetterIndex];
        return {
          ...LETTERS[activeChar],
          wordParent: wordObj,
          charIndex: this.wordLetterIndex
        };
      }
      return null;
    }

    loadCurrentItem() {
      const item = this.getCurrentItemData();
      if (!item) return;

      this.renderItemSelectorRibbon();

      if (this.currentCategory === 'words') {
        const wordObj = WORDS[this.currentItemKey];
        this.letterTitleEl.innerText = `${wordObj.symbol} (${item.symbol})`;
        this.letterPhonicEl.innerText = `${wordObj.phonic} - Tracing letter ${item.symbol}!`;
        this.renderWordTrainCarriages(wordObj, this.wordLetterIndex);
      } else {
        this.letterTitleEl.innerText = item.symbol;
        this.letterPhonicEl.innerText = item.phonic || '';
        this.wordTrainCarriageEl.innerHTML = '';
      }

      this.tracingEngine.loadItem(item);
    }

    renderWordTrainCarriages(wordObj, activeIdx) {
      this.wordTrainCarriageEl.innerHTML = `
        <div class="train-word-bar">
          <span class="loco-icon">🚂</span>
          ${wordObj.letters.map((char, i) => `
            <div class="word-car ${i === activeIdx ? 'current' : i < activeIdx ? 'done' : ''}">
              <span class="car-letter">${char}</span>
              <span class="car-wheels">● ●</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    prevItem() {
      sound.playTap();
      let keys = [];
      if (this.currentCategory === 'letters') keys = Object.keys(LETTERS);
      else if (this.currentCategory === 'numbers') keys = Object.keys(NUMBERS);
      else if (this.currentCategory === 'words') keys = Object.keys(WORDS);

      const idx = keys.indexOf(this.currentItemKey);
      const nextIdx = (idx - 1 + keys.length) % keys.length;
      this.currentItemKey = keys[nextIdx];
      this.wordLetterIndex = 0;
      this.loadCurrentItem();
    }

    nextItem() {
      sound.playTap();
      let keys = [];
      if (this.currentCategory === 'letters') keys = Object.keys(LETTERS);
      else if (this.currentCategory === 'numbers') keys = Object.keys(NUMBERS);
      else if (this.currentCategory === 'words') keys = Object.keys(WORDS);

      const idx = keys.indexOf(this.currentItemKey);
      const nextIdx = (idx + 1) % keys.length;
      this.currentItemKey = keys[nextIdx];
      this.wordLetterIndex = 0;
      this.loadCurrentItem();
    }

    updateTracingProgressUI(data) {
      const dotsEl = document.getElementById('stroke-dots-indicator');
      dotsEl.innerHTML = '';
      for (let i = 0; i < data.totalStrokes; i++) {
        const dot = document.createElement('span');
        dot.className = `stroke-dot ${i < data.activeStroke ? 'done' : i === data.activeStroke ? 'current' : ''}`;
        dot.innerText = i + 1;
        dotsEl.appendChild(dot);
      }
    }

    handleItemCompleted(item) {
      if (this.currentCategory === 'words') {
        const wordObj = WORDS[this.currentItemKey];
        if (this.wordLetterIndex < wordObj.letters.length - 1) {
          sound.playStrokeComplete();
          setTimeout(() => {
            this.wordLetterIndex++;
            this.loadCurrentItem();
          }, 800);
          return;
        }
        const reward = rewards.awardTracingReward(wordObj);
        this.showRewardModal(wordObj, reward);
      } else {
        const reward = rewards.awardTracingReward(item);
        this.showRewardModal(item, reward);
      }
    }

    showRewardModal(item, reward) {
      sound.playCelebration();
      this.rewardTracksCountEl.innerText = `+${reward.straight} Straight & +${reward.curve} Curved Tracks`;
      if (reward.specialUnlock) {
        this.rewardSpecialEl.innerText = reward.specialUnlock;
        this.rewardSpecialEl.classList.remove('hidden');
        this.rewardSpecialEl.style.display = 'block';
      } else {
        this.rewardSpecialEl.classList.add('hidden');
        this.rewardSpecialEl.style.display = 'none';
      }
      this.rewardModal.classList.remove('hidden');
      this.rewardModal.style.display = 'flex';
    }

    updateRewardStats(state = rewards.state) {
      if (this.starCountEl) this.starCountEl.innerText = state.stars;
      if (this.ticketCountEl) this.ticketCountEl.innerText = state.tickets;

      const totalTracks = (state.inventory.straight || 0) + (state.inventory.curve || 0);
      if (this.trackCountEl) this.trackCountEl.innerText = totalTracks;

      const badgeStraight = document.getElementById('badge-straight-count');
      const badgeCurve = document.getElementById('badge-curve-count');
      const badgeStation = document.getElementById('badge-station-count');
      const badgeTree = document.getElementById('badge-tree-count');

      if (badgeStraight) badgeStraight.innerText = state.inventory.straight || 0;
      if (badgeCurve) badgeCurve.innerText = state.inventory.curve || 0;
      if (badgeStation) badgeStation.innerText = state.inventory.station || 0;
      if (badgeTree) badgeTree.innerText = state.inventory.tree || 0;
    }

    renderRewardsScreen() {
      const listEl = document.getElementById('completed-badges-list');
      const trainSelectEl = document.getElementById('train-skin-selector');
      const state = rewards.state;

      listEl.innerHTML = `
        <div class="completed-badge-card">
          <div class="badge-icon">⭐</div>
          <div class="badge-sym">P</div>
          <div class="badge-count">Mastered!</div>
        </div>
        <div class="completed-badge-card">
          <div class="badge-icon">⭐</div>
          <div class="badge-sym">A</div>
          <div class="badge-count">Mastered!</div>
        </div>
        <div class="completed-badge-card">
          <div class="badge-icon">⭐</div>
          <div class="badge-sym">ANTONI</div>
          <div class="badge-count">Champion!</div>
        </div>
      `;

      trainSelectEl.innerHTML = `
        <div class="train-card ${state.selectedTrain === 'red_steam' ? 'selected' : ''}" data-train="red_steam">
          <div class="train-preview-icon">🚂</div>
          <h4>Red Little Steam Engine</h4>
          <span class="status-tag">Default</span>
        </div>
        <div class="train-card ${state.selectedTrain === 'golden_express' ? 'selected' : !state.unlockedTrains.includes('golden_express') ? 'locked' : ''}" data-train="golden_express">
          <div class="train-preview-icon">✨🚂✨</div>
          <h4>Golden Conductor Express</h4>
          <span class="status-tag">${state.unlockedTrains.includes('golden_express') ? 'Unlocked!' : 'Trace Letter P to Unlock'}</span>
        </div>
      `;

      trainSelectEl.querySelectorAll('.train-card:not(.locked)').forEach(card => {
        card.addEventListener('click', () => {
          sound.playTap();
          rewards.selectTrain(card.dataset.train);
          this.renderRewardsScreen();
        });
      });
    }
  }

  // Auto-launch on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new App());
  } else {
    new App();
  }
})();
