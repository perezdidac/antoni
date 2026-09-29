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

    speak(text) {
      if (!this.voiceEnabled || !this.speechSynth) return;
      try {
        this.speechSynth.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 1.0;
        utter.pitch = 1.0;
        utter.lang = 'en-US';

        const voices = this.speechSynth.getVoices();
        const preferred = voices.find(v => v.lang === 'en-US' && (v.name.includes('US English') || v.name.includes('Samantha') || v.default)) ||
                          voices.find(v => v.lang === 'en-US') ||
                          voices.find(v => v.default && v.lang.startsWith('en'));
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
        { id: 1, name: 'Slant down left', hint: 'Start at the peak, slide down to the left!', points: interpolateLine({ x: 200, y: 70 }, { x: 100, y: 340 }, 8) },
        { id: 2, name: 'Slant down right', hint: 'Start at the peak, slide down to the right!', points: interpolateLine({ x: 200, y: 70 }, { x: 300, y: 340 }, 8) },
        { id: 3, name: 'Bridge across', hint: 'Zip straight across from left to right!', points: interpolateLine({ x: 145, y: 220 }, { x: 255, y: 220 }, 8) }
      ]
    },
    B: {
      symbol: 'B',
      category: 'letter',
      phonic: 'B is for Bell and Boxcar!',
      word: 'BELL',
      rewardTracks: 3,
      strokes: [
        { id: 1, name: 'Down the stick', hint: 'Start at the top, go down!', points: interpolateLine({ x: 130, y: 70 }, { x: 130, y: 340 }, 8) },
        { id: 2, name: 'Top bubble', hint: 'Around to the middle!', points: interpolateCubicBezier({ x: 130, y: 70 }, { x: 275, y: 70 }, { x: 275, y: 195 }, { x: 130, y: 195 }, 25) },
        { id: 3, name: 'Bottom bubble', hint: 'Around to the bottom!', points: interpolateCubicBezier({ x: 130, y: 195 }, { x: 290, y: 195 }, { x: 290, y: 340 }, { x: 130, y: 340 }, 25) }
      ]
    },
    C: {
      symbol: 'C',
      category: 'letter',
      phonic: 'C is for Choo-Choo Caboose!',
      word: 'CHOO-CHOO',
      rewardTracks: 2,
      strokes: [
        { id: 1, name: 'Big curve around', hint: 'Start top right, curve back and down around!', points: interpolateCubicBezier({ x: 290, y: 110 }, { x: 110, y: 50 }, { x: 100, y: 350 }, { x: 290, y: 300 }, 40) }
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
        { id: 2, name: 'Great big curve', hint: 'Start at top, curve way out and back down!', points: interpolateCubicBezier({ x: 130, y: 70 }, { x: 320, y: 70 }, { x: 320, y: 340 }, { x: 130, y: 340 }, 36) }
      ]
    },
    E: {
      symbol: 'E',
      category: 'letter',
      phonic: 'E is for Engine Express!',
      word: 'ENGINE',
      rewardTracks: 3,
      strokes: [
        { id: 1, name: 'Straight down', hint: 'Slide down the tall line!', points: interpolateLine({ x: 130, y: 70 }, { x: 130, y: 340 }, 8) },
        { id: 2, name: 'Top line', hint: 'Slide across the top!', points: interpolateLine({ x: 130, y: 70 }, { x: 275, y: 70 }, 8) },
        { id: 3, name: 'Middle line', hint: 'Slide across the middle!', points: interpolateLine({ x: 130, y: 205 }, { x: 240, y: 205 }, 8) },
        { id: 4, name: 'Bottom line', hint: 'Slide across the track bottom!', points: interpolateLine({ x: 130, y: 340 }, { x: 275, y: 340 }, 8) }
      ]
    },
    F: {
      symbol: 'F',
      category: 'letter',
      phonic: 'F is for Freight Train!',
      word: 'FREIGHT',
      rewardTracks: 2,
      strokes: [
        { id: 1, name: 'Straight down', hint: 'Top to bottom!', points: interpolateLine({ x: 130, y: 70 }, { x: 130, y: 340 }, 8) },
        { id: 2, name: 'Top bar', hint: 'Top across!', points: interpolateLine({ x: 130, y: 70 }, { x: 275, y: 70 }, 8) },
        { id: 3, name: 'Middle bar', hint: 'Middle across!', points: interpolateLine({ x: 130, y: 205 }, { x: 240, y: 205 }, 8) }
      ]
    },
    G: {
      symbol: 'G',
      category: 'letter',
      phonic: 'G is for Green Light - Go!',
      word: 'GO',
      rewardTracks: 2,
      strokes: [
        { id: 1, name: 'Curve around and up', hint: 'Big round turn and go up!', points: interpolateCubicBezier({ x: 290, y: 110 }, { x: 110, y: 50 }, { x: 100, y: 350 }, { x: 290, y: 220 }, 36) },
        { id: 2, name: 'Bar inward', hint: 'Slide inside!', points: interpolateLine({ x: 290, y: 220 }, { x: 210, y: 220 }, 8) }
      ]
    },
    H: {
      symbol: 'H',
      category: 'letter',
      phonic: 'H is for Horn and Honk!',
      word: 'HORN',
      rewardTracks: 2,
      strokes: [
        { id: 1, name: 'Left track down', hint: 'Down the left rail!', points: interpolateLine({ x: 130, y: 70 }, { x: 130, y: 340 }, 8) },
        { id: 2, name: 'Right track down', hint: 'Down the right rail!', points: interpolateLine({ x: 270, y: 70 }, { x: 270, y: 340 }, 8) },
        { id: 3, name: 'Rail tie across', hint: 'Connect the two rails!', points: interpolateLine({ x: 130, y: 205 }, { x: 270, y: 205 }, 8) }
      ]
    },
    I: {
      symbol: 'I',
      category: 'letter',
      phonic: 'I is for Iron Railroad!',
      word: 'IRON',
      rewardTracks: 2,
      strokes: [
        { id: 1, name: 'Tall stick down', hint: 'Straight down the middle!', points: interpolateLine({ x: 200, y: 70 }, { x: 200, y: 340 }, 8) },
        { id: 2, name: 'Top roof', hint: 'Across the top!', points: interpolateLine({ x: 140, y: 70 }, { x: 260, y: 70 }, 8) },
        { id: 3, name: 'Bottom platform', hint: 'Across the bottom!', points: interpolateLine({ x: 140, y: 340 }, { x: 260, y: 340 }, 8) }
      ]
    },
    J: {
      symbol: 'J',
      category: 'letter',
      phonic: 'J is for Junction!',
      word: 'JUNCTION',
      rewardTracks: 2,
      strokes: [
        { id: 1, name: 'Down and hook left', hint: 'Down straight, then swing up like a hook!', points: interpolatePolyline([{ x: 240, y: 70 }, { x: 240, y: 270 }, { x: 210, y: 335 }, { x: 140, y: 290 }], 8) },
        { id: 2, name: 'Top hat', hint: 'Slide across the top!', points: interpolateLine({ x: 170, y: 70 }, { x: 310, y: 70 }, 8) }
      ]
    },
    K: {
      symbol: 'K',
      category: 'letter',
      phonic: 'K is for Kindergarten Conductor!',
      word: 'KINDERGARTEN',
      rewardTracks: 3,
      strokes: [
        { id: 1, name: 'Down the pole', hint: 'Slide down from top to bottom!', points: interpolateLine({ x: 130, y: 70 }, { x: 130, y: 340 }, 8) },
        { id: 2, name: 'Slant down to middle', hint: 'Slide down into the center!', points: interpolateLine({ x: 270, y: 70 }, { x: 135, y: 215 }, 8) },
        { id: 3, name: 'Kick out to bottom', hint: 'Kick down to the corner!', points: interpolateLine({ x: 135, y: 215 }, { x: 280, y: 340 }, 8) }
      ]
    },
    L: {
      symbol: 'L',
      category: 'letter',
      phonic: 'L is for Locomotive!',
      word: 'LOCOMOTIVE',
      rewardTracks: 2,
      strokes: [
        { id: 1, name: 'Down the line', hint: 'Slide straight down!', points: interpolateLine({ x: 140, y: 70 }, { x: 140, y: 340 }, 8) },
        { id: 2, name: 'Along the ground', hint: 'Turn right along the track!', points: interpolateLine({ x: 140, y: 340 }, { x: 280, y: 340 }, 8) }
      ]
    },
    M: {
      symbol: 'M',
      category: 'letter',
      phonic: 'M is for Mountain Railway!',
      word: 'MOUNTAIN',
      rewardTracks: 3,
      strokes: [
        { id: 1, name: 'Down the left mountain', hint: 'Straight down!', points: interpolateLine({ x: 110, y: 70 }, { x: 110, y: 340 }, 8) },
        { id: 2, name: 'Valley slide', hint: 'Slide down into the middle valley!', points: interpolateLine({ x: 110, y: 70 }, { x: 200, y: 260 }, 8) },
        { id: 3, name: 'Climb the peak', hint: 'Climb up to the top peak!', points: interpolateLine({ x: 200, y: 260 }, { x: 290, y: 70 }, 8) },
        { id: 4, name: 'Down the right mountain', hint: 'Slide down to the bottom!', points: interpolateLine({ x: 290, y: 70 }, { x: 290, y: 340 }, 8) }
      ]
    },
    N: {
      symbol: 'N',
      category: 'letter',
      phonic: 'N is for Night Express!',
      word: 'NIGHT',
      rewardTracks: 3,
      strokes: [
        { id: 1, name: 'Down the left side', hint: 'Top to bottom!', points: interpolateLine({ x: 120, y: 70 }, { x: 120, y: 340 }, 8) },
        { id: 2, name: 'Diagonal slide', hint: 'Slide down across to the bottom right!', points: interpolateLine({ x: 120, y: 70 }, { x: 280, y: 340 }, 8) },
        { id: 3, name: 'Right wall down', hint: 'Top down to finish the track!', points: interpolateLine({ x: 280, y: 70 }, { x: 280, y: 340 }, 8) }
      ]
    },
    O: {
      symbol: 'O',
      category: 'letter',
      phonic: 'O is for Oval Track!',
      word: 'OVAL',
      rewardTracks: 2,
      strokes: [
        { id: 1, name: 'All the way round', hint: 'Start top, go around counter-clockwise in a circle!', points: interpolateArc(200, 205, 95, 135, -90, 270, false, 42) }
      ]
    },
    P: {
      symbol: 'P',
      category: 'letter',
      phonic: 'P is for Puffing Train and Popcorn!',
      word: 'PUFF',
      rewardTracks: 2,
      strokes: [
        { id: 1, name: 'Down the stick', hint: 'Start at the top and slide down!', points: interpolateLine({ x: 130, y: 70 }, { x: 130, y: 340 }, 7) },
        { id: 2, name: 'Around the curve', hint: 'Start at the top, curve around to the middle!', points: interpolateCubicBezier({ x: 130, y: 70 }, { x: 300, y: 70 }, { x: 300, y: 210 }, { x: 130, y: 210 }, 32) }
      ]
    },
    Q: {
      symbol: 'Q',
      category: 'letter',
      phonic: 'Q is for Quick Train!',
      word: 'QUICK',
      rewardTracks: 2,
      strokes: [
        { id: 1, name: 'Big round circle', hint: 'Circle around counter-clockwise!', points: interpolateArc(200, 205, 95, 135, -90, 270, false, 42) },
        { id: 2, name: 'Train wheel kick', hint: 'Slant out through the bottom right!', points: interpolateLine({ x: 220, y: 260 }, { x: 295, y: 345 }, 8) }
      ]
    },
    R: {
      symbol: 'R',
      category: 'letter',
      phonic: 'R is for Railroad & Rails!',
      word: 'RAILROAD',
      rewardTracks: 3,
      strokes: [
        { id: 1, name: 'Straight stick down', hint: 'Top to bottom!', points: interpolateLine({ x: 130, y: 70 }, { x: 130, y: 340 }, 8) },
        { id: 2, name: 'Top curve loop', hint: 'Curve around to the middle!', points: interpolateCubicBezier({ x: 130, y: 70 }, { x: 290, y: 70 }, { x: 290, y: 210 }, { x: 130, y: 210 }, 28) },
        { id: 3, name: 'Kick leg down', hint: 'Slide down the ramp to the right!', points: interpolateLine({ x: 175, y: 210 }, { x: 280, y: 340 }, 8) }
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
          name: 'Snake around curve',
          hint: 'Curve left, swing across, and curve right!',
          points: [
            ...interpolateCubicBezier({ x: 275, y: 115 }, { x: 150, y: 50 }, { x: 110, y: 160 }, { x: 200, y: 205 }, 20),
            ...interpolateCubicBezier({ x: 200, y: 205 }, { x: 290, y: 250 }, { x: 250, y: 350 }, { x: 125, y: 300 }, 20)
          ]
        }
      ]
    },
    T: {
      symbol: 'T',
      category: 'letter',
      phonic: 'T is for Track & Train!',
      word: 'TRAIN',
      rewardTracks: 2,
      strokes: [
        { id: 1, name: 'Down the center', hint: 'Straight down the middle line!', points: interpolateLine({ x: 200, y: 70 }, { x: 200, y: 340 }, 8) },
        { id: 2, name: 'Across the top', hint: 'Slide all the way across the top!', points: interpolateLine({ x: 110, y: 70 }, { x: 290, y: 70 }, 8) }
      ]
    },
    U: {
      symbol: 'U',
      category: 'letter',
      phonic: 'U is for Under the Tunnel!',
      word: 'UNDER',
      rewardTracks: 2,
      strokes: [
        {
          id: 1,
          name: 'Down, under, and up',
          hint: 'Slide down, swoop around the curve, and go up!',
          points: [
            ...interpolateLine({ x: 130, y: 70 }, { x: 130, y: 240 }, 8),
            ...interpolateCubicBezier({ x: 130, y: 240 }, { x: 130, y: 345 }, { x: 270, y: 345 }, { x: 270, y: 240 }, 20),
            ...interpolateLine({ x: 270, y: 240 }, { x: 270, y: 70 }, 8)
          ]
        }
      ]
    },
    V: {
      symbol: 'V',
      category: 'letter',
      phonic: 'V is for Valley Train!',
      word: 'VALLEY',
      rewardTracks: 2,
      strokes: [
        { id: 1, name: 'Slant down to bottom', hint: 'Slide down to the point!', points: interpolateLine({ x: 120, y: 70 }, { x: 200, y: 340 }, 8) },
        { id: 2, name: 'Slant up to top', hint: 'Slide back up to the top right!', points: interpolateLine({ x: 200, y: 340 }, { x: 280, y: 70 }, 8) }
      ]
    },
    W: {
      symbol: 'W',
      category: 'letter',
      phonic: 'W is for Whistle - Toot Toot!',
      word: 'WHISTLE',
      rewardTracks: 3,
      strokes: [
        { id: 1, name: 'First down', hint: 'Slide down left!', points: interpolateLine({ x: 95, y: 70 }, { x: 145, y: 340 }, 8) },
        { id: 2, name: 'Up to middle', hint: 'Slide up to the middle!', points: interpolateLine({ x: 145, y: 340 }, { x: 200, y: 170 }, 8) },
        { id: 3, name: 'Down to right', hint: 'Slide down again!', points: interpolateLine({ x: 200, y: 170 }, { x: 255, y: 340 }, 8) },
        { id: 4, name: 'Up to top', hint: 'Slide up to finish!', points: interpolateLine({ x: 255, y: 340 }, { x: 305, y: 70 }, 8) }
      ]
    },
    X: {
      symbol: 'X',
      category: 'letter',
      phonic: 'X is for Railroad Crossing X!',
      word: 'CROSSING',
      rewardTracks: 2,
      strokes: [
        { id: 1, name: 'Top left to bottom right', hint: 'Slide across from top left down!', points: interpolateLine({ x: 120, y: 70 }, { x: 280, y: 340 }, 8) },
        { id: 2, name: 'Top right to bottom left', hint: 'Cross over from top right down!', points: interpolateLine({ x: 280, y: 70 }, { x: 120, y: 340 }, 8) }
      ]
    },
    Y: {
      symbol: 'Y',
      category: 'letter',
      phonic: 'Y is for Yellow Train Yard!',
      word: 'YARD',
      rewardTracks: 2,
      strokes: [
        { id: 1, name: 'Slant to center', hint: 'Slide down to the center!', points: interpolateLine({ x: 120, y: 70 }, { x: 200, y: 195 }, 8) },
        { id: 2, name: 'Right slant to center', hint: 'Slide down from right to center!', points: interpolateLine({ x: 280, y: 70 }, { x: 200, y: 195 }, 8) },
        { id: 3, name: 'Stem down', hint: 'Slide straight down to the ground!', points: interpolateLine({ x: 200, y: 195 }, { x: 200, y: 340 }, 8) }
      ]
    },
    Z: {
      symbol: 'Z',
      category: 'letter',
      phonic: 'Z is for Zig-Zag tracks!',
      word: 'ZIG-ZAG',
      rewardTracks: 3,
      strokes: [
        { id: 1, name: 'Top bar across', hint: 'Slide across the top!', points: interpolateLine({ x: 120, y: 75 }, { x: 280, y: 75 }, 8) },
        { id: 2, name: 'Slant back down', hint: 'Slide down diagonally to the bottom left!', points: interpolateLine({ x: 280, y: 75 }, { x: 120, y: 335 }, 8) },
        { id: 3, name: 'Bottom bar across', hint: 'Slide across the bottom to finish!', points: interpolateLine({ x: 120, y: 335 }, { x: 280, y: 335 }, 8) }
      ]
    }
  };

  // LOWERCASE LETTERS (a - z)
  const LOWERCASE_LETTERS = {
    a: {
      symbol: 'a',
      category: 'letter_lower',
      phonic: 'Small a is for apple and all aboard!',
      word: 'all aboard',
      rewardTracks: 2,
      strokes: [
        {
          id: 1,
          name: 'Round tummy',
          hint: 'Curve around counter-clockwise!',
          points: interpolateCubicBezier({ x: 260, y: 235 }, { x: 140, y: 190 }, { x: 130, y: 350 }, { x: 260, y: 310 }, 30)
        },
        {
          id: 2,
          name: 'Stick down',
          hint: 'Slide down the right side!',
          points: interpolateLine({ x: 260, y: 205 }, { x: 260, y: 340 }, 8)
        }
      ]
    },
    b: {
      symbol: 'b',
      category: 'letter_lower',
      phonic: 'Small b is for bell and boxcar!',
      word: 'boxcar',
      rewardTracks: 2,
      strokes: [
        {
          id: 1,
          name: 'Tall stick down',
          hint: 'Start top headline, slide all the way down!',
          points: interpolateLine({ x: 140, y: 70 }, { x: 140, y: 340 }, 8)
        },
        {
          id: 2,
          name: 'Belly curve',
          hint: 'Start at the middle line, curve around to the bottom!',
          points: interpolateCubicBezier({ x: 140, y: 205 }, { x: 280, y: 205 }, { x: 280, y: 340 }, { x: 140, y: 340 }, 28)
        }
      ]
    },
    c: {
      symbol: 'c',
      category: 'letter_lower',
      phonic: 'Small c is for caboose!',
      word: 'caboose',
      rewardTracks: 2,
      strokes: [
        {
          id: 1,
          name: 'Curve around',
          hint: 'Start top right, curve back and down to the bottom!',
          points: interpolateCubicBezier({ x: 265, y: 235 }, { x: 140, y: 190 }, { x: 135, y: 350 }, { x: 265, y: 310 }, 30)
        }
      ]
    },
    d: {
      symbol: 'd',
      category: 'letter_lower',
      phonic: 'Small d is for diesel!',
      word: 'diesel',
      rewardTracks: 2,
      strokes: [
        {
          id: 1,
          name: 'Round belly',
          hint: 'Curve around counter-clockwise on the left!',
          points: interpolateCubicBezier({ x: 260, y: 235 }, { x: 140, y: 190 }, { x: 130, y: 350 }, { x: 260, y: 310 }, 30)
        },
        {
          id: 2,
          name: 'Tall stick down',
          hint: 'Start top headline, slide down the right side!',
          points: interpolateLine({ x: 260, y: 70 }, { x: 260, y: 340 }, 8)
        }
      ]
    },
    e: {
      symbol: 'e',
      category: 'letter_lower',
      phonic: 'Small e is for engine express!',
      word: 'engine',
      rewardTracks: 2,
      strokes: [
        {
          id: 1,
          name: 'Across and loop around',
          hint: 'Slide across the middle, then loop up and around!',
          points: [
            ...interpolateLine({ x: 140, y: 275 }, { x: 265, y: 275 }, 8),
            ...interpolateCubicBezier({ x: 265, y: 275 }, { x: 265, y: 200 }, { x: 135, y: 200 }, { x: 135, y: 285 }, 18),
            ...interpolateCubicBezier({ x: 135, y: 285 }, { x: 135, y: 345 }, { x: 230, y: 345 }, { x: 265, y: 315 }, 18)
          ]
        }
      ]
    },
    f: {
      symbol: 'f',
      category: 'letter_lower',
      phonic: 'Small f is for freight train!',
      word: 'freight',
      rewardTracks: 2,
      strokes: [
        {
          id: 1,
          name: 'Top hook and down',
          hint: 'Curve around the hook and slide straight down!',
          points: [
            ...interpolateCubicBezier({ x: 250, y: 95 }, { x: 230, y: 70 }, { x: 190, y: 70 }, { x: 190, y: 120 }, 14),
            ...interpolateLine({ x: 190, y: 120 }, { x: 190, y: 340 }, 8)
          ]
        },
        {
          id: 2,
          name: 'Crossbar',
          hint: 'Slide across the middle line!',
          points: interpolateLine({ x: 145, y: 205 }, { x: 245, y: 205 }, 8)
        }
      ]
    },
    g: {
      symbol: 'g',
      category: 'letter_lower',
      phonic: 'Small g is for green signal!',
      word: 'green',
      rewardTracks: 2,
      strokes: [
        {
          id: 1,
          name: 'Circle around',
          hint: 'Make a circle counter-clockwise!',
          points: interpolateCubicBezier({ x: 260, y: 235 }, { x: 140, y: 190 }, { x: 130, y: 350 }, { x: 260, y: 310 }, 30)
        },
        {
          id: 2,
          name: 'Tail hook down',
          hint: 'Slide down past the ground line and hook left!',
          points: [
            ...interpolateLine({ x: 260, y: 205 }, { x: 260, y: 355 }, 8),
            ...interpolateCubicBezier({ x: 260, y: 355 }, { x: 260, y: 395 }, { x: 160, y: 395 }, { x: 150, y: 360 }, 16)
          ]
        }
      ]
    },
    h: {
      symbol: 'h',
      category: 'letter_lower',
      phonic: 'Small h is for honking horn!',
      word: 'horn',
      rewardTracks: 2,
      strokes: [
        {
          id: 1,
          name: 'Tall stick down',
          hint: 'Start top headline, slide down to baseline!',
          points: interpolateLine({ x: 140, y: 70 }, { x: 140, y: 340 }, 8)
        },
        {
          id: 2,
          name: 'Tunnel arch',
          hint: 'Arch up to the middle line and down to the ground!',
          points: interpolateCubicBezier({ x: 140, y: 250 }, { x: 160, y: 205 }, { x: 260, y: 205 }, { x: 260, y: 340 }, 24)
        }
      ]
    },
    i: {
      symbol: 'i',
      category: 'letter_lower',
      phonic: 'Small i is for iron rails!',
      word: 'iron',
      rewardTracks: 2,
      strokes: [
        {
          id: 1,
          name: 'Short stick down',
          hint: 'Slide down from midline to baseline!',
          points: interpolateLine({ x: 200, y: 205 }, { x: 200, y: 340 }, 8)
        },
        {
          id: 2,
          name: 'Dot on top',
          hint: 'Tap a dot right above!',
          points: interpolateLine({ x: 200, y: 135 }, { x: 200, y: 150 }, 4)
        }
      ]
    },
    j: {
      symbol: 'j',
      category: 'letter_lower',
      phonic: 'Small j is for railway junction!',
      word: 'junction',
      rewardTracks: 2,
      strokes: [
        {
          id: 1,
          name: 'Hook down',
          hint: 'Slide down past the ground line and hook left!',
          points: [
            ...interpolateLine({ x: 220, y: 205 }, { x: 220, y: 355 }, 8),
            ...interpolateCubicBezier({ x: 220, y: 355 }, { x: 220, y: 395 }, { x: 140, y: 395 }, { x: 130, y: 360 }, 16)
          ]
        },
        {
          id: 2,
          name: 'Dot on top',
          hint: 'Tap a dot right above!',
          points: interpolateLine({ x: 220, y: 135 }, { x: 220, y: 150 }, 4)
        }
      ]
    },
    k: {
      symbol: 'k',
      category: 'letter_lower',
      phonic: 'Small k is for kindergarten conductor!',
      word: 'kindergarten',
      rewardTracks: 3,
      strokes: [
        {
          id: 1,
          name: 'Tall stick down',
          hint: 'Slide down from top headline to baseline!',
          points: interpolateLine({ x: 140, y: 70 }, { x: 140, y: 340 }, 8)
        },
        {
          id: 2,
          name: 'Slant in',
          hint: 'Slide in from the right to the stick!',
          points: interpolateLine({ x: 260, y: 205 }, { x: 145, y: 280 }, 8)
        },
        {
          id: 3,
          name: 'Kick down',
          hint: 'Kick down to the bottom right!',
          points: interpolateLine({ x: 145, y: 280 }, { x: 265, y: 340 }, 8)
        }
      ]
    },
    l: {
      symbol: 'l',
      category: 'letter_lower',
      phonic: 'Small l is for locomotive!',
      word: 'locomotive',
      rewardTracks: 2,
      strokes: [
        {
          id: 1,
          name: 'Tall straight line',
          hint: 'Slide straight down from top to bottom!',
          points: interpolateLine({ x: 200, y: 70 }, { x: 200, y: 340 }, 8)
        }
      ]
    },
    m: {
      symbol: 'm',
      category: 'letter_lower',
      phonic: 'Small m is for mountain train!',
      word: 'mountain',
      rewardTracks: 3,
      strokes: [
        {
          id: 1,
          name: 'Short stick down',
          hint: 'Slide straight down!',
          points: interpolateLine({ x: 120, y: 205 }, { x: 120, y: 340 }, 8)
        },
        {
          id: 2,
          name: 'First arch',
          hint: 'Arch over midline and down to the ground!',
          points: interpolateCubicBezier({ x: 120, y: 245 }, { x: 135, y: 205 }, { x: 200, y: 205 }, { x: 200, y: 340 }, 20)
        },
        {
          id: 3,
          name: 'Second arch',
          hint: 'Arch over midline and down again!',
          points: interpolateCubicBezier({ x: 200, y: 245 }, { x: 215, y: 205 }, { x: 280, y: 205 }, { x: 280, y: 340 }, 20)
        }
      ]
    },
    n: {
      symbol: 'n',
      category: 'letter_lower',
      phonic: 'Small n is for night train!',
      word: 'night',
      rewardTracks: 2,
      strokes: [
        {
          id: 1,
          name: 'Short stick down',
          hint: 'Slide straight down!',
          points: interpolateLine({ x: 140, y: 205 }, { x: 140, y: 340 }, 8)
        },
        {
          id: 2,
          name: 'Tunnel arch',
          hint: 'Arch over midline and down to the ground!',
          points: interpolateCubicBezier({ x: 140, y: 250 }, { x: 160, y: 205 }, { x: 260, y: 205 }, { x: 260, y: 340 }, 24)
        }
      ]
    },
    o: {
      symbol: 'o',
      category: 'letter_lower',
      phonic: 'Small o is for oval loop!',
      word: 'oval',
      rewardTracks: 2,
      strokes: [
        {
          id: 1,
          name: 'Circle around',
          hint: 'Circle counter-clockwise between midline and baseline!',
          points: interpolateArc(200, 272, 68, 68, -90, 270, false, 36)
        }
      ]
    },
    p: {
      symbol: 'p',
      category: 'letter_lower',
      phonic: 'Small p is for puffing steam!',
      word: 'puff',
      rewardTracks: 2,
      strokes: [
        {
          id: 1,
          name: 'Stem down past ground',
          hint: 'Start midline, slide down past baseline!',
          points: interpolateLine({ x: 140, y: 205 }, { x: 140, y: 390 }, 8)
        },
        {
          id: 2,
          name: 'Bubble curve',
          hint: 'Curve around the right side to the ground!',
          points: interpolateCubicBezier({ x: 140, y: 205 }, { x: 270, y: 205 }, { x: 270, y: 340 }, { x: 140, y: 340 }, 28)
        }
      ]
    },
    q: {
      symbol: 'q',
      category: 'letter_lower',
      phonic: 'Small q is for quick train!',
      word: 'quick',
      rewardTracks: 2,
      strokes: [
        {
          id: 1,
          name: 'Circle around',
          hint: 'Curve around counter-clockwise on the left!',
          points: interpolateCubicBezier({ x: 260, y: 235 }, { x: 140, y: 190 }, { x: 130, y: 350 }, { x: 260, y: 310 }, 30)
        },
        {
          id: 2,
          name: 'Stem down with flick',
          hint: 'Slide down past baseline with a little flick!',
          points: [
            ...interpolateLine({ x: 260, y: 205 }, { x: 260, y: 390 }, 8),
            ...interpolateLine({ x: 260, y: 390 }, { x: 285, y: 365 }, 6)
          ]
        }
      ]
    },
    r: {
      symbol: 'r',
      category: 'letter_lower',
      phonic: 'Small r is for railroad tracks!',
      word: 'rails',
      rewardTracks: 2,
      strokes: [
        {
          id: 1,
          name: 'Short stick down',
          hint: 'Slide straight down!',
          points: interpolateLine({ x: 150, y: 205 }, { x: 150, y: 340 }, 8)
        },
        {
          id: 2,
          name: 'Branch right',
          hint: 'Arch up and curve right like a tree branch!',
          points: interpolateCubicBezier({ x: 150, y: 250 }, { x: 170, y: 205 }, { x: 235, y: 205 }, { x: 255, y: 225 }, 18)
        }
      ]
    },
    s: {
      symbol: 's',
      category: 'letter_lower',
      phonic: 'Small s is for steam whistle!',
      word: 'steam',
      rewardTracks: 2,
      strokes: [
        {
          id: 1,
          name: 'Snake curve',
          hint: 'Curve left, swing across, and curve right!',
          points: [
            ...interpolateCubicBezier({ x: 255, y: 235 }, { x: 165, y: 195 }, { x: 140, y: 255 }, { x: 200, y: 272 }, 18),
            ...interpolateCubicBezier({ x: 200, y: 272 }, { x: 265, y: 290 }, { x: 235, y: 345 }, { x: 145, y: 325 }, 18)
          ]
        }
      ]
    },
    t: {
      symbol: 't',
      category: 'letter_lower',
      phonic: 'Small t is for train track!',
      word: 'train',
      rewardTracks: 2,
      strokes: [
        {
          id: 1,
          name: 'Down with a turn',
          hint: 'Slide down from above midline and curve right!',
          points: [
            ...interpolateLine({ x: 200, y: 100 }, { x: 200, y: 315 }, 8),
            ...interpolateCubicBezier({ x: 200, y: 315 }, { x: 200, y: 340 }, { x: 235, y: 340 }, { x: 245, y: 325 }, 12)
          ]
        },
        {
          id: 2,
          name: 'Crossbar across',
          hint: 'Slide across the middle line!',
          points: interpolateLine({ x: 150, y: 205 }, { x: 250, y: 205 }, 8)
        }
      ]
    },
    u: {
      symbol: 'u',
      category: 'letter_lower',
      phonic: 'Small u is for under the bridge!',
      word: 'under',
      rewardTracks: 2,
      strokes: [
        {
          id: 1,
          name: 'Cup down and up',
          hint: 'Slide down, curve along the ground, and swoop up!',
          points: [
            ...interpolateLine({ x: 140, y: 205 }, { x: 140, y: 285 }, 8),
            ...interpolateCubicBezier({ x: 140, y: 285 }, { x: 140, y: 345 }, { x: 260, y: 345 }, { x: 260, y: 285 }, 18),
            ...interpolateLine({ x: 260, y: 285 }, { x: 260, y: 205 }, 8)
          ]
        },
        {
          id: 2,
          name: 'Down stick',
          hint: 'Slide straight down the right side!',
          points: interpolateLine({ x: 260, y: 205 }, { x: 260, y: 340 }, 8)
        }
      ]
    },
    v: {
      symbol: 'v',
      category: 'letter_lower',
      phonic: 'Small v is for valley express!',
      word: 'valley',
      rewardTracks: 2,
      strokes: [
        {
          id: 1,
          name: 'Slant down',
          hint: 'Slide down to the bottom point!',
          points: interpolateLine({ x: 135, y: 205 }, { x: 200, y: 340 }, 8)
        },
        {
          id: 2,
          name: 'Slant up',
          hint: 'Slide back up to the top right!',
          points: interpolateLine({ x: 200, y: 340 }, { x: 265, y: 205 }, 8)
        }
      ]
    },
    w: {
      symbol: 'w',
      category: 'letter_lower',
      phonic: 'Small w is for whistle toot toot!',
      word: 'whistle',
      rewardTracks: 3,
      strokes: [
        { id: 1, name: 'First down', hint: 'Slide down left!', points: interpolateLine({ x: 110, y: 205 }, { x: 145, y: 340 }, 8) },
        { id: 2, name: 'Up to middle', hint: 'Slide up to the middle line!', points: interpolateLine({ x: 145, y: 340 }, { x: 195, y: 245 }, 8) },
        { id: 3, name: 'Down right', hint: 'Slide down again!', points: interpolateLine({ x: 195, y: 245 }, { x: 245, y: 340 }, 8) },
        { id: 4, name: 'Up to finish', hint: 'Slide up to finish!', points: interpolateLine({ x: 245, y: 340 }, { x: 280, y: 205 }, 8) }
      ]
    },
    x: {
      symbol: 'x',
      category: 'letter_lower',
      phonic: 'Small x is for crossing tracks!',
      word: 'crossing',
      rewardTracks: 2,
      strokes: [
        { id: 1, name: 'Slant down right', hint: 'Slide diagonally down right!', points: interpolateLine({ x: 145, y: 205 }, { x: 255, y: 340 }, 8) },
        { id: 2, name: 'Cross down left', hint: 'Cross diagonally down left!', points: interpolateLine({ x: 255, y: 205 }, { x: 145, y: 340 }, 8) }
      ]
    },
    y: {
      symbol: 'y',
      category: 'letter_lower',
      phonic: 'Small y is for yellow yard!',
      word: 'yard',
      rewardTracks: 2,
      strokes: [
        { id: 1, name: 'Slant to middle', hint: 'Slide down right to the center!', points: interpolateLine({ x: 135, y: 205 }, { x: 200, y: 280 }, 8) },
        { id: 2, name: 'Long tail down left', hint: 'Slide down left past the baseline!', points: interpolateLine({ x: 265, y: 205 }, { x: 135, y: 390 }, 8) }
      ]
    },
    z: {
      symbol: 'z',
      category: 'letter_lower',
      phonic: 'Small z is for zig-zag!',
      word: 'zig-zag',
      rewardTracks: 3,
      strokes: [
        { id: 1, name: 'Across midline', hint: 'Slide across the middle line!', points: interpolateLine({ x: 145, y: 205 }, { x: 255, y: 205 }, 8) },
        { id: 2, name: 'Slant down', hint: 'Slide down diagonally to the bottom left!', points: interpolateLine({ x: 255, y: 205 }, { x: 145, y: 340 }, 8) },
        { id: 3, name: 'Across baseline', hint: 'Slide across the bottom line!', points: interpolateLine({ x: 145, y: 340 }, { x: 255, y: 340 }, 8) }
      ]
    }
  };

  const ALL_LETTERS = {
    ...LETTERS,
    ...LOWERCASE_LETTERS
  };

  const NUMBERS = {
    '0': {
      symbol: '0',
      category: 'number',
      phonic: 'Zero! Round like a train wheel!',
      word: 'ZERO',
      rewardTracks: 2,
      strokes: [
        { id: 1, name: 'Round and round', hint: 'Start top, circle counter-clockwise all the way!', points: interpolateArc(200, 205, 80, 135, -90, 270, false, 40) }
      ]
    },
    '1': {
      symbol: '1',
      category: 'number',
      phonic: 'Number 1! One big locomotive engine!',
      word: 'ONE',
      rewardTracks: 2,
      strokes: [
        { id: 1, name: 'Straight down', hint: 'Start at the top, slide straight down!', points: interpolateLine({ x: 200, y: 70 }, { x: 200, y: 340 }, 7) }
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
          name: 'Curve around and slide down',
          hint: 'Curve around the top, slide down diagonally!',
          points: interpolateCubicBezier({ x: 130, y: 130 }, { x: 160, y: 60 }, { x: 275, y: 60 }, { x: 260, y: 160 }, 20).concat(interpolateLine({ x: 260, y: 160 }, { x: 130, y: 340 }, 8))
        },
        { id: 2, name: 'Line along the ground', hint: 'Straight across the bottom!', points: interpolateLine({ x: 130, y: 340 }, { x: 280, y: 340 }, 8) }
      ]
    },
    '3': {
      symbol: '3',
      category: 'number',
      phonic: 'Number 3! Three colorful passenger cars!',
      word: 'THREE',
      rewardTracks: 2,
      strokes: [
        { id: 1, name: 'Top curve', hint: 'Curve around to the middle!', points: interpolateCubicBezier({ x: 135, y: 100 }, { x: 200, y: 60 }, { x: 280, y: 100 }, { x: 200, y: 195 }, 24) },
        { id: 2, name: 'Bottom curve', hint: 'Curve around to the bottom!', points: interpolateCubicBezier({ x: 200, y: 195 }, { x: 290, y: 260 }, { x: 220, y: 340 }, { x: 135, y: 300 }, 24) }
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
          hint: 'Slide down, then turn right!',
          points: [
            ...interpolateLine({ x: 230, y: 70 }, { x: 125, y: 240 }, 8),
            ...interpolateLine({ x: 125, y: 240 }, { x: 280, y: 240 }, 8)
          ]
        },
        { id: 2, name: 'Down through', hint: 'Slice straight down!', points: interpolateLine({ x: 230, y: 120 }, { x: 230, y: 340 }, 8) }
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
          name: 'Neck down and big tummy',
          hint: 'Go down a little, then big belly curve!',
          points: [
            ...interpolateLine({ x: 160, y: 80 }, { x: 150, y: 190 }, 8),
            ...interpolateCubicBezier({ x: 150, y: 190 }, { x: 290, y: 190 }, { x: 280, y: 340 }, { x: 135, y: 320 }, 26)
          ]
        },
        { id: 2, name: 'Top hat', hint: 'Give number 5 a roof!', points: interpolateLine({ x: 155, y: 80 }, { x: 265, y: 80 }, 8) }
      ]
    },
    '6': {
      symbol: '6',
      category: 'number',
      phonic: 'Number 6! Six puffs of steam in the sky!',
      word: 'SIX',
      rewardTracks: 2,
      strokes: [
        {
          id: 1,
          name: 'Curve down into a loop',
          hint: 'Curve down and loop all the way inside!',
          points: interpolatePolyline([{ x: 260, y: 80 }, { x: 170, y: 150 }, { x: 125, y: 260 }, { x: 190, y: 340 }, { x: 270, y: 290 }, { x: 240, y: 205 }, { x: 150, y: 215 }, { x: 130, y: 260 }], 8)
        }
      ]
    },
    '7': {
      symbol: '7',
      category: 'number',
      phonic: 'Number 7! Seven golden train tickets!',
      word: 'SEVEN',
      rewardTracks: 2,
      strokes: [
        {
          id: 1,
          name: 'Across and down slant',
          hint: 'Slide across the top, then slide down!',
          points: [
            ...interpolateLine({ x: 120, y: 70 }, { x: 280, y: 70 }, 8),
            ...interpolateLine({ x: 280, y: 70 }, { x: 160, y: 340 }, 8)
          ]
        }
      ]
    },
    '8': {
      symbol: '8',
      category: 'number',
      phonic: 'Number 8! A figure-eight train track!',
      word: 'EIGHT',
      rewardTracks: 3,
      strokes: [
        {
          id: 1,
          name: 'Figure 8 track',
          hint: 'Make an S down, then loop back up!',
          points: [
            ...interpolateCubicBezier({ x: 200, y: 70 }, { x: 130, y: 70 }, { x: 130, y: 200 }, { x: 200, y: 200 }, 18),
            ...interpolateCubicBezier({ x: 200, y: 200 }, { x: 270, y: 200 }, { x: 270, y: 340 }, { x: 200, y: 340 }, 18),
            ...interpolateCubicBezier({ x: 200, y: 340 }, { x: 130, y: 340 }, { x: 130, y: 200 }, { x: 200, y: 200 }, 18),
            ...interpolateCubicBezier({ x: 200, y: 200 }, { x: 270, y: 200 }, { x: 270, y: 70 }, { x: 200, y: 70 }, 18)
          ]
        }
      ]
    },
    '9': {
      symbol: '9',
      category: 'number',
      phonic: 'Number 9! Nine animal friends on the train!',
      word: 'NINE',
      rewardTracks: 2,
      strokes: [
        {
          id: 1,
          name: 'Loop and drop',
          hint: 'Make a loop at the top, then slide down!',
          points: [
            ...interpolateArc(200, 140, 65, 65, 0, 360, false, 28),
            ...interpolateLine({ x: 265, y: 140 }, { x: 250, y: 340 }, 8)
          ]
        }
      ]
    },
    '10': {
      symbol: '10',
      category: 'number',
      phonic: 'Number 10! Ten giant train wagons rolling on the tracks!',
      word: 'TEN',
      rewardTracks: 3,
      strokes: [
        { id: 1, name: 'Number one down', hint: 'Slide straight down the number 1!', points: interpolateLine({ x: 135, y: 70 }, { x: 135, y: 340 }, 8) },
        { id: 2, name: 'Zero oval around', hint: 'Circle around counter-clockwise for 0!', points: interpolateArc(265, 205, 65, 135, -90, 270, false, 40) }
      ]
    }
  };

  const WORDS = {
    Antoni: {
      symbol: 'Antoni',
      category: 'word',
      phonic: 'Antoni! The great train engineer!',
      letters: ['A', 'n', 't', 'o', 'n', 'i'],
      rewardTracks: 6,
      specialReward: 'Golden Conductor Train'
    },
    Mama: {
      symbol: 'Mama',
      category: 'word',
      phonic: 'Mama! All aboard the love train with Mama!',
      letters: ['M', 'a', 'm', 'a'],
      rewardTracks: 4,
      specialReward: 'Heart Railway Car'
    },
    Papa: {
      symbol: 'Papa',
      category: 'word',
      phonic: 'Papa! Choo-choo fun with Papa!',
      letters: ['P', 'a', 'p', 'a'],
      rewardTracks: 4,
      specialReward: 'Super Locomotive'
    },
    Didac: {
      symbol: 'Didac',
      category: 'word',
      phonic: 'Didac! High-speed railway express with Didac!',
      letters: ['D', 'i', 'd', 'a', 'c'],
      rewardTracks: 5,
      specialReward: 'Bullet Train'
    },
    Karolina: {
      symbol: 'Karolina',
      category: 'word',
      phonic: 'Karolina! The superstar passenger Karolina!',
      letters: ['K', 'a', 'r', 'o', 'l', 'i', 'n', 'a'],
      rewardTracks: 8,
      specialReward: 'Rainbow Princess Carriage'
    }
  };

  /* ==========================================================================
     3. Reward & Inventory Manager
     ========================================================================== */
  const STORAGE_KEY = 'antoni_train_express_standalone';
  const DEFAULT_STATE = {
    stars: 5,
    tickets: 1,
    inventory: { straight: 14, curve: 14, bridge: 4, station: 2, farm: 2, tree: 6 },
    unlockedTrains: ['red_steam', 'golden_express'],
    selectedTrain: 'red_steam',
    completedLetters: {},
    completedNumbers: {},
    completedWords: {}
  };

  class RewardManager {
    constructor() {
      this.state = this.load();
      this.listeners = [];
    }

    load() {
      try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) {
          const parsed = JSON.parse(data);
          return {
            ...DEFAULT_STATE,
            ...parsed,
            inventory: { ...DEFAULT_STATE.inventory, ...(parsed.inventory || {}) },
            unlockedTrains: parsed.unlockedTrains || DEFAULT_STATE.unlockedTrains,
            completedLetters: parsed.completedLetters || {},
            completedNumbers: parsed.completedNumbers || {},
            completedWords: parsed.completedWords || {}
          };
        }
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

      // Bonus bridge & farm building pieces
      if (this.state.stars % 6 === 0) {
        this.state.inventory.bridge = (this.state.inventory.bridge || 0) + 1;
      }
      if (this.state.stars % 9 === 0) {
        this.state.inventory.farm = (this.state.inventory.farm || 0) + 1;
      }

      let specialUnlock = null;
      if ((item.symbol === 'P' || item.symbol === 'A' || item.symbol === 'Antoni') && !this.state.unlockedTrains.includes('golden_express')) {
        this.state.unlockedTrains.push('golden_express');
        specialUnlock = '✨ Golden Conductor Train!';
      } else if (this.state.stars >= 10 && !this.state.unlockedTrains.includes('rainbow_rocket')) {
        this.state.unlockedTrains.push('rainbow_rocket');
        specialUnlock = '🌈 Rainbow Rocket Train!';
      } else if (this.state.stars >= 20 && !this.state.unlockedTrains.includes('bullet_train')) {
        this.state.unlockedTrains.push('bullet_train');
        specialUnlock = '⚡ Silver Bullet Shinkansen!';
      } else if (this.state.stars >= 35 && !this.state.unlockedTrains.includes('dino_express')) {
        this.state.unlockedTrains.push('dino_express');
        specialUnlock = '🦕 Dino Safari Explorer!';
      } else if (item.specialReward) {
        specialUnlock = `✨ ${item.specialReward}!`;
      }

      if (item.category === 'letter' || item.category === 'letter_lower') {
        this.state.completedLetters[item.symbol] = (this.state.completedLetters[item.symbol] || 0) + 1;
      } else if (item.category === 'number') {
        this.state.completedNumbers[item.symbol] = (this.state.completedNumbers[item.symbol] || 0) + 1;
      } else if (item.category === 'word') {
        if (!this.state.completedWords) this.state.completedWords = {};
        this.state.completedWords[item.symbol] = (this.state.completedWords[item.symbol] || 0) + 1;
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
        if (!this.isTracing) return;
        if (e.cancelable) e.preventDefault();
        if (!this.currentItem) return;

        const pos = getPos(e);
        const normPos = this.fromCanvasCoords(pos);

        if (this.activeStrokeIndex >= this.currentItem.strokes.length) return;

        const currentStroke = this.currentItem.strokes[this.activeStrokeIndex];
        const progress = this.strokeProgress[this.activeStrokeIndex];
        const points = currentStroke.points;
        const currentIndex = progress.maxReachedIndex;

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

      const handleUp = () => {
        this.isTracing = false;
      };

      this.canvas.addEventListener('mousedown', handleDown);
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);

      this.canvas.addEventListener('touchstart', handleDown, { passive: false });
      window.addEventListener('touchmove', handleMove, { passive: false });
      window.addEventListener('touchend', handleUp, { passive: true });
      window.addEventListener('touchcancel', handleUp, { passive: true });
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

        if (activePts.length >= 2) {
          const p1 = this.toCanvasCoords(activePts[activePts.length - 2]);
          const p2 = this.toCanvasCoords(activePts[activePts.length - 1]);
          const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
          this.drawMiniTrain(p2.x, p2.y, angle);
        }
      }
    }

    drawMiniTrain(x, y, angle) {
      const ctx = this.ctx;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);

      const s = this.scaleFactor * 1.35;

      // Locomotive body (crimson red)
      ctx.fillStyle = '#EA2027';
      ctx.shadowColor = 'rgba(234, 32, 39, 0.45)';
      ctx.shadowBlur = 8 * s;
      this.roundRect(ctx, -14 * s, -8 * s, 22 * s, 16 * s, 4 * s);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Engineer Cab (navy blue)
      ctx.fillStyle = '#0652DD';
      this.roundRect(ctx, -20 * s, -10 * s, 10 * s, 20 * s, 3 * s);
      ctx.fill();

      // Cab window (warm yellow glow)
      ctx.fillStyle = '#FFEAA7';
      ctx.fillRect(-18 * s, -8 * s, 6 * s, 6 * s);

      // Smokestack
      ctx.fillStyle = '#2C3A47';
      ctx.fillRect(2 * s, -14 * s, 5 * s, 7 * s);

      // Pilot cowcatcher
      ctx.fillStyle = '#F39C12';
      ctx.beginPath();
      ctx.moveTo(8 * s, -6 * s);
      ctx.lineTo(14 * s, 0);
      ctx.lineTo(8 * s, 6 * s);
      ctx.closePath();
      ctx.fill();

      // Shining headlight
      ctx.fillStyle = '#FFF200';
      ctx.beginPath();
      ctx.arc(10 * s, 0, 3.5 * s, 0, Math.PI * 2);
      ctx.fill();

      // Wheels
      ctx.fillStyle = '#2C3A47';
      [-14, -2].forEach(wx => {
        ctx.beginPath(); ctx.arc(wx * s, -9 * s, 3 * s, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(wx * s, 9 * s, 3 * s, 0, Math.PI * 2); ctx.fill();
      });

      // Animated mini smoke puff
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.beginPath();
      ctx.arc(-2 * s, -18 * s, (4 + Math.sin(this.guideAnimTime * 8) * 1.5) * s, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
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
      this.trainSpeed = 2.2;
      this.isNightMode = false;
      this.locomotiveSkin = rewards.state.selectedTrain || 'red_steam';
      this.animalPassengers = ['🐮', '🦁', '🦒', '🐶', '🐑', '🐷'];
      this.currentAnimalIdx = 0;
      this.trainPos = { row: 2, col: 2, subX: 0.5, subY: 0.5, dir: DIR_RIGHT };
      this.cars = [
        { type: 'tender', dist: 0.9 },
        { type: 'passenger', dist: 1.8 },
        { type: 'animal', dist: 2.7, animal: '🐮' }
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

    setSpeed(mult) {
      this.trainSpeed = 1.0 * mult;
    }

    toggleNight() {
      this.isNightMode = !this.isNightMode;
      return this.isNightMode;
    }

    cycleAnimalPassenger() {
      this.currentAnimalIdx = (this.currentAnimalIdx + 1) % this.animalPassengers.length;
      const nextAnimal = this.animalPassengers[this.currentAnimalIdx];
      const animalCar = this.cars.find(c => c.type === 'animal');
      if (animalCar) animalCar.animal = nextAnimal;
      return nextAnimal;
    }

    setLocomotiveSkin(skin) {
      this.locomotiveSkin = skin;
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
      else if (pieceType.startsWith('bridge')) category = 'bridge';
      else if (pieceType === 'farm') category = 'farm';
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
        case 'straight_h':
        case 'bridge_h':
        case 'farm':
          return [DIR_LEFT, DIR_RIGHT];
        case 'straight_v':
        case 'bridge_v':
          return [DIR_UP, DIR_DOWN];
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

      if (this.selectedTool === 'bridge') {
        if (existing && (existing.type === 'bridge_h' || existing.type === 'bridge_v')) {
          const nextType = existing.type === 'bridge_h' ? 'bridge_v' : 'bridge_h';
          existing.type = nextType;
          existing.connections = this.getConnections(nextType);
          sound.playTrackSnap();
          return;
        }
        if (rewards.usePiece('bridge')) {
          this.setPiece(row, col, 'bridge_h');
          sound.playTrackSnap();
        } else {
          sound.playGentleNudge();
        }
        return;
      }

      if (this.selectedTool === 'farm') {
        if (existing && existing.type === 'farm') {
          sound.playAnimalSound?.(this.animalPassengers[this.currentAnimalIdx]);
          return;
        }
        if (rewards.usePiece('farm')) {
          this.setPiece(row, col, 'farm');
          sound.playTrackSnap();
          sound.playAnimalSound?.('🐮');
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
      if (this.isNightMode) {
        const grad = ctx.createLinearGradient(0, 0, 0, this.height);
        grad.addColorStop(0, '#0B132B');
        grad.addColorStop(0.6, '#1C2541');
        grad.addColorStop(1, '#0F172A');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.width, this.height);

        // Twinkling stars
        ctx.fillStyle = '#FFFFFF';
        const stars = [
          {x: 45, y: 30, r: 1.5}, {x: 130, y: 65, r: 2}, {x: 240, y: 22, r: 1.2},
          {x: 360, y: 50, r: 2.2}, {x: 490, y: 28, r: 1.8}, {x: 620, y: 60, r: 2},
          {x: 690, y: 25, r: 1.5}, {x: 190, y: 85, r: 1.2}, {x: 550, y: 75, r: 1.6}
        ];
        stars.forEach(s => {
          const pulse = Math.sin(Date.now() * 0.003 + s.x) * 0.35 + 0.75;
          ctx.globalAlpha = Math.min(1.0, Math.max(0.2, pulse));
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1.0;

        // Glowing crescent moon
        ctx.font = '28px serif';
        ctx.fillText('🌙', this.width - 55, 42);
      } else {
        const grad = ctx.createLinearGradient(0, 0, 0, this.height);
        grad.addColorStop(0, '#B8E994');
        grad.addColorStop(1, '#78E08F');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.width, this.height);
      }
    }

    drawGridOverlay() {
      const ctx = this.ctx;
      ctx.strokeStyle = this.isNightMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.35)';
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
      } else if (item.type.startsWith('bridge_')) {
        this.drawBridgeTile(ctx, item.type, x, y, size);
      } else if (item.type === 'farm') {
        this.drawFarmTile(ctx, x, y, size);
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

    drawBridgeTile(ctx, type, x, y, size) {
      const midX = x + size / 2;
      const midY = y + size / 2;

      // Sparkling river water under tracks
      ctx.fillStyle = this.isNightMode ? '#1e3799' : '#00a8ff';
      ctx.fillRect(x + 2, y + 2, size - 4, size - 4);

      // Water ripples
      ctx.strokeStyle = this.isNightMode ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + 6, y + size * 0.3);
      ctx.lineTo(x + size * 0.45, y + size * 0.3);
      ctx.moveTo(x + size * 0.55, y + size * 0.7);
      ctx.lineTo(x + size - 6, y + size * 0.7);
      ctx.stroke();

      if (type === 'bridge_h') {
        // Wooden bridge safety railings
        ctx.fillStyle = '#8B5A2B';
        ctx.fillRect(x, y + 4, size, 5);
        ctx.fillRect(x, y + size - 9, size, 5);

        this.drawWoodenTies(ctx, x, y, size, 'h');
        this.drawSteelRails(ctx, x, midY - 7, x + size, midY - 7);
        this.drawSteelRails(ctx, x, midY + 7, x + size, midY + 7);
      } else {
        ctx.fillStyle = '#8B5A2B';
        ctx.fillRect(x + 4, y, 5, size);
        ctx.fillRect(x + size - 9, y, 5, size);

        this.drawWoodenTies(ctx, x, y, size, 'v');
        this.drawSteelRails(ctx, midX - 7, y, midX - 7, y + size);
        this.drawSteelRails(ctx, midX + 7, y, midX + 7, y + size);
      }
    }

    drawFarmTile(ctx, x, y, size) {
      const midY = y + size / 2;

      // Wooden fence along top
      ctx.strokeStyle = '#A0522D';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x + 4, y + 10);
      ctx.lineTo(x + size - 4, y + 10);
      ctx.stroke();

      // Red barn building
      ctx.fillStyle = '#C0392B';
      ctx.fillRect(x + 4, y + 12, 24, 20);
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(x + 2, y + 12);
      ctx.lineTo(x + 16, y + 5);
      ctx.lineTo(x + 30, y + 12);
      ctx.closePath();
      ctx.fill();

      // Cow grazing on pasture
      ctx.font = '16px serif';
      ctx.fillText('🐮', x + size - 26, y + 26);

      // Track passing through farm pasture
      this.drawWoodenTies(ctx, x, y, size, 'h');
      this.drawSteelRails(ctx, x, midY - 7, x + size, midY - 7);
      this.drawSteelRails(ctx, x, midY + 7, x + size, midY + 7);
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
        this.drawCar(pos.x, pos.y, pos.angle, car);
      });

      this.drawLocomotive(locoPos.x, locoPos.y, locoAngle);
    }

    drawLocomotive(x, y, angle) {
      const ctx = this.ctx;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);

      const skin = rewards.state.selectedTrain || this.locomotiveSkin || 'red_steam';

      // Night Mode Headlight Beam projecting forward!
      if (this.isNightMode) {
        ctx.save();
        const beamGrad = ctx.createRadialGradient(16, 0, 5, 80, 0, 90);
        beamGrad.addColorStop(0, 'rgba(255, 234, 167, 0.75)');
        beamGrad.addColorStop(0.5, 'rgba(255, 234, 167, 0.35)');
        beamGrad.addColorStop(1, 'rgba(255, 234, 167, 0.0)');
        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.moveTo(14, -6);
        ctx.lineTo(95, -36);
        ctx.lineTo(95, 36);
        ctx.lineTo(14, 6);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      if (skin === 'golden_express') {
        // Golden Conductor Train
        ctx.fillStyle = '#F1C40F';
        ctx.beginPath(); ctx.roundRect(-16, -11, 26, 22, 5); ctx.fill();
        ctx.fillStyle = '#F39C12';
        ctx.beginPath(); ctx.roundRect(-24, -13, 15, 26, 4); ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(-22, -10, 11, 8);
        ctx.font = '10px serif';
        ctx.fillText('👑', -12, 4);
        ctx.fillStyle = '#D68910';
        ctx.beginPath(); ctx.roundRect(4, -15, 6, 8, 2); ctx.fill();
        ctx.fillStyle = '#FFF200';
        ctx.beginPath(); ctx.arc(12, 0, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#D68910';
        [-16, 0].forEach(wx => {
          ctx.beginPath(); ctx.arc(wx, -12, 4, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(wx, 12, 4, 0, Math.PI * 2); ctx.fill();
        });
      } else if (skin === 'rainbow_rocket') {
        // Rainbow Rocket Train
        const colors = ['#FF4757', '#FFA502', '#2ED573', '#1E90FF', '#9B59B6'];
        colors.forEach((col, i) => {
          ctx.fillStyle = col;
          ctx.fillRect(-24 + i * 7, -11, 8, 22);
        });
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(11, -11);
        ctx.lineTo(22, 0);
        ctx.lineTo(11, 11);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#00CEC9';
        ctx.beginPath(); ctx.arc(-2, 0, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FF7675';
        ctx.beginPath();
        ctx.moveTo(-24, -6);
        ctx.lineTo(-32 - Math.random() * 4, 0);
        ctx.lineTo(-24, 6);
        ctx.closePath();
        ctx.fill();
      } else if (skin === 'bullet_train') {
        // Silver Shinkansen Bullet Train
        ctx.fillStyle = '#DFE4EA';
        ctx.beginPath(); ctx.roundRect(-24, -11, 35, 22, 5); ctx.fill();
        ctx.fillStyle = '#CED6E0';
        ctx.beginPath();
        ctx.moveTo(11, -11);
        ctx.lineTo(25, 0);
        ctx.lineTo(11, 11);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#2E86DE';
        ctx.fillRect(-24, -2, 42, 4);
        ctx.fillStyle = '#2C3A47';
        ctx.beginPath(); ctx.roundRect(2, -8, 12, 5, 2); ctx.fill();
        ctx.beginPath(); ctx.roundRect(2, 3, 12, 5, 2); ctx.fill();
      } else if (skin === 'dino_express') {
        // Safari Dino Train
        ctx.fillStyle = '#20BF6B';
        ctx.beginPath(); ctx.roundRect(-16, -11, 26, 22, 5); ctx.fill();
        ctx.fillStyle = '#0B8457';
        ctx.beginPath(); ctx.roundRect(-24, -13, 15, 26, 4); ctx.fill();
        ctx.fillStyle = '#26DE81';
        [-18, -10, -2, 6].forEach(sx => {
          ctx.beginPath();
          ctx.moveTo(sx - 3, -11);
          ctx.lineTo(sx, -18);
          ctx.lineTo(sx + 3, -11);
          ctx.closePath();
          ctx.fill();
        });
        ctx.fillStyle = '#FFF';
        ctx.beginPath(); ctx.arc(-16, -5, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(-15, -5, 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FFEAA7';
        ctx.beginPath(); ctx.arc(12, 0, 4, 0, Math.PI * 2); ctx.fill();
      } else {
        // Classic Red Little Steam Engine
        ctx.fillStyle = '#EA2027';
        ctx.beginPath(); ctx.roundRect(-16, -11, 26, 22, 5); ctx.fill();
        ctx.fillStyle = '#0652DD';
        ctx.beginPath(); ctx.roundRect(-24, -13, 15, 26, 4); ctx.fill();
        ctx.fillStyle = '#E0F7FA';
        ctx.fillRect(-22, -10, 11, 8);
        ctx.fillStyle = '#2C3A47';
        ctx.beginPath(); ctx.roundRect(4, -15, 6, 8, 2); ctx.fill();
        ctx.fillStyle = '#FFEAA7';
        ctx.beginPath(); ctx.arc(12, 0, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2C3A47';
        [-16, 0].forEach(wx => {
          ctx.beginPath(); ctx.arc(wx, -12, 4, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(wx, 12, 4, 0, Math.PI * 2); ctx.fill();
        });
      }

      ctx.restore();
    }

    drawCar(x, y, angle, carOrType) {
      const ctx = this.ctx;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);

      const type = typeof carOrType === 'object' ? carOrType.type : carOrType;
      const carObj = typeof carOrType === 'object' ? carOrType : null;

      if (type === 'tender') {
        ctx.fillStyle = '#2C3A47';
        ctx.beginPath();
        ctx.roundRect(-14, -10, 28, 20, 3);
        ctx.fill();
        ctx.fillStyle = '#1A252F';
        ctx.fillRect(-10, -7, 20, 14);
      } else if (type === 'passenger') {
        ctx.fillStyle = '#F39C12';
        ctx.beginPath();
        ctx.roundRect(-16, -11, 32, 22, 4);
        ctx.fill();
        // Warm glowing windows in night mode, pale blue in day
        ctx.fillStyle = this.isNightMode ? '#FFEAA7' : '#E0F7FA';
        ctx.fillRect(-12, -8, 7, 6);
        ctx.fillRect(-2, -8, 7, 6);
        ctx.fillRect(8, -8, 7, 6);
      } else {
        // Animal Passenger Carriage
        ctx.fillStyle = '#D35400';
        ctx.beginPath();
        ctx.roundRect(-16, -11, 32, 22, 4);
        ctx.fill();

        // Wooden slats
        ctx.strokeStyle = '#BA4A00';
        ctx.lineWidth = 1.5;
        [-10, 0, 10].forEach(lx => {
          ctx.beginPath(); ctx.moveTo(lx, -11); ctx.lineTo(lx, 11); ctx.stroke();
        });

        // Animal passenger emoji peeking out!
        const animalEmoji = (carObj && carObj.animal) || this.animalPassengers[this.currentAnimalIdx] || '🐮';
        ctx.font = '15px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(animalEmoji, 0, 0);
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
      } else if (this.mode === 'compare') {
        type = 'compare';
        num1 = Math.floor(Math.random() * 4) + 2;
        let candidate = Math.floor(Math.random() * 4) + 2;
        while (candidate === num1) {
          candidate = Math.floor(Math.random() * 4) + 2;
        }
        num2 = candidate;
        answer = num1 > num2 ? 'A' : 'B';

        const CARGO_ICONS = ['🍎', '⭐', '📦', '🎈', '⚙️', '🎁'];
        const icon1 = CARGO_ICONS[Math.floor(Math.random() * CARGO_ICONS.length)];
        let icon2 = CARGO_ICONS[Math.floor(Math.random() * CARGO_ICONS.length)];
        while (icon2 === icon1) {
          icon2 = CARGO_ICONS[Math.floor(Math.random() * CARGO_ICONS.length)];
        }

        questionText = 'Which Train is Longer? 🚂';
        spokenText = 'Which train is longer? Tap the train with more cargo wagons!';

        this.currentProblem = {
          type, num1, num2, answer, icon1, icon2, questionText, spokenText
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
            <button class="math-mode-btn" data-mode="compare">⚖️ Long or Short?</button>
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
      const ansLabel = this.container.querySelector('.math-answers-label');
      const optionsGrid = this.container.querySelector('#math-options-grid');

      if (p.type === 'compare') {
        if (ansLabel) ansLabel.innerText = 'Tap the longer train with MORE cargo:';
        if (optionsGrid) optionsGrid.innerHTML = '';

        trainVisualEl.innerHTML = `
          <div class="math-compare-container">
            <div class="compare-train-card ${this.answered && p.answer === 'A' ? 'selected-correct' : ''}" data-train="A">
              <div class="compare-train-header">
                <span class="compare-train-badge">🔴 Train Red</span>
                <span class="compare-train-count">${p.num1} Cargo Wagons</span>
              </div>
              <div class="compare-train-row">
                <span class="compare-loco">🚂</span>
                ${Array(p.num1).fill(0).map(() => `
                  <div class="compare-car">
                    <span class="compare-car-icon">${p.icon1}</span>
                    <span class="compare-car-wheels">● ●</span>
                  </div>
                `).join('')}
              </div>
            </div>

            <div class="compare-train-card ${this.answered && p.answer === 'B' ? 'selected-correct' : ''}" data-train="B">
              <div class="compare-train-header">
                <span class="compare-train-badge">🔵 Train Blue</span>
                <span class="compare-train-count">${p.num2} Cargo Wagons</span>
              </div>
              <div class="compare-train-row">
                <span class="compare-loco">🚆</span>
                ${Array(p.num2).fill(0).map(() => `
                  <div class="compare-car">
                    <span class="compare-car-icon">${p.icon2}</span>
                    <span class="compare-car-wheels">● ●</span>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        `;

        trainVisualEl.querySelectorAll('.compare-train-card').forEach(card => {
          card.addEventListener('click', () => {
            this.handleCompareAnswer(card.dataset.train, card);
          });
        });
        return;
      }

      if (ansLabel) ansLabel.innerText = 'Tap the winning train car:';

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

    handleCompareAnswer(trainId, cardElement) {
      if (this.answered) return;
      sound.init();

      if (trainId === this.currentProblem.answer) {
        this.answered = true;
        this.streak++;
        cardElement.classList.add('selected-correct');
        sound.playStrokeComplete();
        sound.playWhistle();

        const winningCount = Math.max(this.currentProblem.num1, this.currentProblem.num2);
        sound.speak(`Awesome! Train ${trainId === 'A' ? 'Red' : 'Blue'} has ${winningCount} cargo wagons! Winner!`);
        rewards.awardTracingReward({ symbol: 'Train Math', rewardTracks: 2 });

        setTimeout(() => {
          this.generateProblem();
        }, 1400);
      } else {
        cardElement.classList.add('shake');
        sound.playGentleNudge();
        sound.speak('Count the cars! Try the other train!');
        setTimeout(() => cardElement.classList.remove('shake'), 450);
      }
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
      this.catLowercaseBtn = document.getElementById('cat-lowercase');
      this.catNumbersBtn = document.getElementById('cat-numbers');
      this.catWordsBtn = document.getElementById('cat-words');

      this.itemSelectorEl = document.getElementById('item-selector-ribbon');

      this.letterTitleEl = document.getElementById('active-letter-title');
      this.letterPhonicEl = document.getElementById('active-letter-phonic');
      this.wordTrainCarriageEl = document.getElementById('word-train-carriages');
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
      if (this.catLowercaseBtn) {
        this.catLowercaseBtn.addEventListener('click', () => this.setCategory('lowercase'));
      }
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

      // Speed Pill Buttons
      const speedBtns = [
        document.getElementById('btn-speed-slow'),
        document.getElementById('btn-speed-normal'),
        document.getElementById('btn-speed-fast')
      ].filter(Boolean);

      speedBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          speedBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const speedVal = parseFloat(btn.dataset.speed || '2.2');
          this.trainWorld.trainSpeed = speedVal;
          sound.playTap();
        });
      });

      // Day / Night Environment Toggle
      const btnNight = document.getElementById('btn-toggle-night');
      const sandboxContainer = document.querySelector('.train-sandbox-container');
      if (btnNight) {
        btnNight.addEventListener('click', () => {
          const isNight = this.trainWorld.toggleNight();
          btnNight.classList.toggle('night-active', isNight);
          if (sandboxContainer) sandboxContainer.classList.toggle('night-mode', isNight);
          const envIcon = document.getElementById('env-icon');
          const envText = document.getElementById('env-text');
          if (envIcon) envIcon.innerText = isNight ? '☀️' : '🌙';
          if (envText) envText.innerText = isNight ? 'Day Run' : 'Night Run';
          if (isNight) sound.playNightHoot?.(); else sound.playWhistle();
        });
      }

      // Animal Friends Caller Button
      const btnAddAnimal = document.getElementById('btn-add-animal');
      if (btnAddAnimal) {
        btnAddAnimal.addEventListener('click', () => {
          const animal = this.trainWorld.cycleAnimalPassenger();
          sound.playAnimalSound?.(animal);
        });
      }

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
      if (this.catLowercaseBtn) this.catLowercaseBtn.classList.toggle('active', cat === 'lowercase');
      this.catNumbersBtn.classList.toggle('active', cat === 'numbers');
      this.catWordsBtn.classList.toggle('active', cat === 'words');

      if (cat === 'letters') this.currentItemKey = 'A';
      else if (cat === 'lowercase') this.currentItemKey = 'a';
      else if (cat === 'numbers') this.currentItemKey = '0';
      else if (cat === 'words') {
        this.currentItemKey = 'Antoni';
        this.wordLetterIndex = 0;
      }

      this.renderItemSelectorRibbon();
      this.loadCurrentItem();
    }

    renderItemSelectorRibbon() {
      this.itemSelectorEl.innerHTML = '';
      let items = {};
      if (this.currentCategory === 'letters') items = LETTERS;
      else if (this.currentCategory === 'lowercase') items = LOWERCASE_LETTERS;
      else if (this.currentCategory === 'numbers') items = NUMBERS;
      else if (this.currentCategory === 'words') items = WORDS;

      const isWordsMode = this.currentCategory === 'words';
      this.itemSelectorEl.classList.toggle('words-mode', isWordsMode);

      Object.keys(items).forEach(key => {
        const btn = document.createElement('button');
        const activeClass = key === this.currentItemKey ? 'active' : '';
        const wordClass = isWordsMode ? 'word-item-btn' : '';
        btn.className = `ribbon-item-btn ${wordClass} ${activeClass}`.trim();

        const isMastered = isWordsMode
          ? ((rewards.state.completedWords?.[key] || 0) > 0)
          : this.currentCategory === 'numbers'
            ? ((rewards.state.completedNumbers?.[key] || 0) > 0)
            : ((rewards.state.completedLetters?.[key] || 0) > 0);

        btn.innerHTML = `${key}${isMastered ? ' <span class="ribbon-star-badge">⭐</span>' : ''}`;

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
      if (this.currentCategory === 'lowercase') return LOWERCASE_LETTERS[this.currentItemKey];
      if (this.currentCategory === 'numbers') return NUMBERS[this.currentItemKey];
      if (this.currentCategory === 'words') {
        const wordObj = WORDS[this.currentItemKey];
        if (!wordObj) return null;
        const activeChar = wordObj.letters[this.wordLetterIndex];
        const charData = ALL_LETTERS[activeChar] || LETTERS[activeChar.toUpperCase()] || LOWERCASE_LETTERS[activeChar.toLowerCase()];
        return {
          ...charData,
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

      // Update Category Mastery Tracker Pill
      const masteryPill = document.getElementById('category-mastery-pill');
      if (masteryPill) {
        let items = {};
        if (this.currentCategory === 'letters') items = LETTERS;
        else if (this.currentCategory === 'lowercase') items = LOWERCASE_LETTERS;
        else if (this.currentCategory === 'numbers') items = NUMBERS;
        else if (this.currentCategory === 'words') items = WORDS;

        const isWordsMode = this.currentCategory === 'words';
        let masteredCount = 0;
        const totalCount = Object.keys(items).length;
        Object.keys(items).forEach(k => {
          const isM = isWordsMode
            ? ((rewards.state.completedWords?.[k] || 0) > 0)
            : this.currentCategory === 'numbers'
              ? ((rewards.state.completedNumbers?.[k] || 0) > 0)
              : ((rewards.state.completedLetters?.[k] || 0) > 0);
          if (isM) masteredCount++;
        });
        masteryPill.innerText = `⭐ ${masteredCount}/${totalCount} Mastered`;
      }

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
      else if (this.currentCategory === 'lowercase') keys = Object.keys(LOWERCASE_LETTERS);
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
      else if (this.currentCategory === 'lowercase') keys = Object.keys(LOWERCASE_LETTERS);
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
          }, 700);
          return;
        }
        rewards.awardTracingReward(wordObj);
        sound.playCelebration();
        setTimeout(() => {
          this.nextItem();
        }, 1200);
      } else {
        rewards.awardTracingReward(item);
        sound.playCelebration();
        setTimeout(() => {
          this.nextItem();
        }, 1200);
      }
    }

    updateRewardStats(state = rewards.state) {
      if (this.starCountEl) this.starCountEl.innerText = state.stars;
      if (this.ticketCountEl) this.ticketCountEl.innerText = state.tickets;

      const totalTracks = (state.inventory.straight || 0) + (state.inventory.curve || 0) + (state.inventory.bridge || 0);
      if (this.trackCountEl) this.trackCountEl.innerText = totalTracks;

      const badgeStraight = document.getElementById('badge-straight-count');
      const badgeCurve = document.getElementById('badge-curve-count');
      const badgeBridge = document.getElementById('badge-bridge-count');
      const badgeFarm = document.getElementById('badge-farm-count');
      const badgeStation = document.getElementById('badge-station-count');
      const badgeTree = document.getElementById('badge-tree-count');

      if (badgeStraight) badgeStraight.innerText = state.inventory.straight || 0;
      if (badgeCurve) badgeCurve.innerText = state.inventory.curve || 0;
      if (badgeBridge) badgeBridge.innerText = state.inventory.bridge || 0;
      if (badgeFarm) badgeFarm.innerText = state.inventory.farm || 0;
      if (badgeStation) badgeStation.innerText = state.inventory.station || 0;
      if (badgeTree) badgeTree.innerText = state.inventory.tree || 0;
    }

    renderRewardsScreen() {
      const listEl = document.getElementById('completed-badges-list');
      const trainSelectEl = document.getElementById('train-skin-selector');
      const state = rewards.state;

      listEl.innerHTML = '';
      const allCompleted = { ...(state.completedLetters || {}), ...(state.completedNumbers || {}), ...(state.completedWords || {}) };

      if (Object.keys(allCompleted).length === 0) {
        listEl.innerHTML = `<p class="empty-hint" style="grid-column: 1/-1; text-align: center; color: #718096; font-weight: 700; padding: 20px;">Trace letters, numbers, or words to earn golden badges and train tracks! ⭐</p>`;
      } else {
        Object.entries(allCompleted).forEach(([sym, count]) => {
          const badge = document.createElement('div');
          badge.className = 'completed-badge-card';
          badge.innerHTML = `
            <div class="badge-icon">⭐</div>
            <div class="badge-sym">${sym}</div>
            <div class="badge-count">x${count}</div>
          `;
          listEl.appendChild(badge);
        });
      }

      const trainConfigs = [
        {
          id: 'red_steam',
          name: 'Red Steam Engine',
          icon: '🚂',
          desc: 'Classic crimson locomotive with chugging steam',
          unlocked: true,
          hint: 'Default Engine'
        },
        {
          id: 'golden_express',
          name: 'Golden Conductor Express',
          icon: '✨🚂✨',
          desc: "Antoni's official golden engine with crown badge",
          unlocked: state.unlockedTrains.includes('golden_express') || (state.completedLetters?.['A'] || 0) > 0 || (state.completedWords?.['Antoni'] || 0) > 0,
          hint: 'Trace Letter A or Antoni'
        },
        {
          id: 'rainbow_rocket',
          name: 'Rainbow Rocket Train',
          icon: '🚀🌈',
          desc: 'Aerodynamic rocket nose with rainbow jet trail',
          unlocked: state.unlockedTrains.includes('rainbow_rocket') || state.stars >= 10,
          hint: 'Earn 10 Stars ⭐'
        },
        {
          id: 'bullet_train',
          name: 'Silver Bullet Shinkansen',
          icon: '⚡🚅',
          desc: 'Super high-speed streamlined silver bullet express',
          unlocked: state.unlockedTrains.includes('bullet_train') || state.stars >= 20,
          hint: 'Earn 20 Stars ⭐'
        },
        {
          id: 'dino_express',
          name: 'Dino Safari Explorer',
          icon: '🦕🚂',
          desc: 'Emerald green safari train with friendly dinosaur crest',
          unlocked: state.unlockedTrains.includes('dino_express') || state.stars >= 35,
          hint: 'Earn 35 Stars ⭐'
        }
      ];

      trainSelectEl.innerHTML = trainConfigs.map(t => `
        <div class="train-card ${state.selectedTrain === t.id ? 'selected' : ''} ${!t.unlocked ? 'locked' : ''}" data-train="${t.id}">
          <div class="train-preview-icon" style="font-size: 2.2rem; margin-bottom: 6px;">${t.icon}</div>
          <h4 style="margin-bottom: 4px;">${t.name}</h4>
          <p style="font-size: 0.8rem; color: #718096; text-align: center; margin: 0 0 10px;">${t.desc}</p>
          <span class="status-tag">${t.unlocked ? (state.selectedTrain === t.id ? 'Active Driver' : 'Select Train') : t.hint}</span>
        </div>
      `).join('');

      trainSelectEl.querySelectorAll('.train-card:not(.locked)').forEach(card => {
        card.addEventListener('click', () => {
          sound.playTap();
          rewards.selectTrain(card.dataset.train);
          this.trainWorld.setLocomotiveSkin(card.dataset.train);
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
