// app.js - Main Application Coordinator for Antoni's Train Express
import { LETTERS, LOWERCASE_LETTERS, ALL_LETTERS, NUMBERS, WORDS } from './strokes-data.js';
import { TracingEngine } from './tracing-engine.js';
import { TrainWorld } from './train-sim.js';
import { MathGame } from './math-game.js';
import { sound } from './audio.js';
import { rewards } from './rewards.js';

class App {
  constructor() {
    this.currentCategory = 'letters'; // 'letters', 'lowercase', 'numbers', 'words'
    this.currentItemKey = 'A'; // Start with A
    this.wordLetterIndex = 0; // For multi-letter words

    this.tracingEngine = null;
    this.trainWorld = null;

    this.initDOM();
    this.initEngines();
    this.bindEvents();
    this.updateRewardStats();
    this.loadCurrentItem();
  }

  initDOM() {
    // Top bar stats
    this.starCountEl = document.getElementById('star-count');
    this.ticketCountEl = document.getElementById('ticket-count');
    this.trackCountEl = document.getElementById('track-count');

    // Screens
    this.screenTracing = document.getElementById('screen-tracing');
    this.screenMath = document.getElementById('screen-math');
    this.screenTrain = document.getElementById('screen-train');
    this.screenRewards = document.getElementById('screen-rewards');

    // Tab buttons
    this.btnTabTracing = document.getElementById('tab-tracing');
    this.btnTabMath = document.getElementById('tab-math');
    this.btnTabTrain = document.getElementById('tab-train');
    this.btnTabRewards = document.getElementById('tab-rewards');

    // Category buttons
    this.catLettersBtn = document.getElementById('cat-letters');
    this.catLowercaseBtn = document.getElementById('cat-lowercase');
    this.catNumbersBtn = document.getElementById('cat-numbers');
    this.catWordsBtn = document.getElementById('cat-words');

    // Item selector ribbon
    this.itemSelectorEl = document.getElementById('item-selector-ribbon');

    // Prompt info
    this.letterTitleEl = document.getElementById('active-letter-title');
    this.letterPhonicEl = document.getElementById('active-letter-phonic');
    this.wordTrainCarriageEl = document.getElementById('word-train-carriages');
  }

  initEngines() {
    // 1. Tracing Engine
    const traceCanvas = document.getElementById('tracing-canvas');
    this.tracingEngine = new TracingEngine(traceCanvas, {
      onStrokeComplete: (data) => {
        // Can add subtle animation or prompt
      },
      onItemComplete: (data) => {
        this.handleItemCompleted(data.item);
      },
      onProgress: (data) => {
        this.updateTracingProgressUI(data);
      }
    });

    // 2. Train World
    const trainCanvas = document.getElementById('train-canvas');
    this.trainWorld = new TrainWorld(trainCanvas);

    // 3. Train Math Game
    const mathContainer = document.getElementById('math-game-container');
    this.mathGame = new MathGame(mathContainer, {
      onCorrect: (data) => {
        // Automatically updates stats via rewards listener
      }
    });

    // Sync rewards with Train World and UI
    rewards.onChange((state) => {
      this.updateRewardStats(state);
    });

    // Handle window resize
    window.addEventListener('resize', () => {
      this.tracingEngine.resize();
      this.trainWorld.resize();
    });
  }

  bindEvents() {
    // Navigation Tabs
    this.btnTabTracing.addEventListener('click', () => this.switchTab('tracing'));
    if (this.btnTabMath) this.btnTabMath.addEventListener('click', () => this.switchTab('math'));
    this.btnTabTrain.addEventListener('click', () => this.switchTab('train'));
    this.btnTabRewards.addEventListener('click', () => this.switchTab('rewards'));

    // Category Selectors
    this.catLettersBtn.addEventListener('click', () => this.setCategory('letters'));
    if (this.catLowercaseBtn) {
      this.catLowercaseBtn.addEventListener('click', () => this.setCategory('lowercase'));
    }
    this.catNumbersBtn.addEventListener('click', () => this.setCategory('numbers'));
    this.catWordsBtn.addEventListener('click', () => this.setCategory('words'));

    // Tracing Controls
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

    // Train World Controls
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
      if (confirm('Clear all tracks on the board?')) {
        this.trainWorld.clearBoard();
        sound.playTap();
      }
    });

    document.getElementById('btn-quick-oval').addEventListener('click', () => {
      this.trainWorld.clearBoard();
      this.trainWorld.loadDefaultTrack();
      sound.playWhistle();
    });

    // Train Tool selection buttons
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

    // Audio & Voice Toggles
    const btnMute = document.getElementById('btn-toggle-sound');
    btnMute.addEventListener('click', () => {
      const on = sound.toggleSound();
      btnMute.innerText = on ? '🔊 Sound: ON' : '🔇 Sound: OFF';
    });

    // Fullscreen Toggle (Great for Tablets!)
    const btnFullscreen = document.getElementById('btn-fullscreen');
    btnFullscreen.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.().catch(() => {});
      } else {
        document.exitFullscreen?.().catch(() => {});
      }
    });

    // Whistle Pull Cord (interactive animation)
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

    if (cat === 'letters') {
      this.currentItemKey = 'A'; // Start with A
    } else if (cat === 'lowercase') {
      this.currentItemKey = 'a';
    } else if (cat === 'numbers') {
      this.currentItemKey = '0';
    } else if (cat === 'words') {
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

    // Auto-scroll ribbon to active item
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
      rewards.awardTracingReward(wordObj, true);
      sound.playCelebration();
      setTimeout(() => {
        this.nextItem();
      }, 1200);
    } else {
      rewards.awardTracingReward(item, false);
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

    // Update tool badges in Train World
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

    // Render completed badges
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

    // Render locomotive selection with all 5 unlockable skins
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

// Start application when DOM loads
window.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
