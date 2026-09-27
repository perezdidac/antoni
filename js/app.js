// app.js - Main Application Coordinator for Antoni's Train Express
import { LETTERS, NUMBERS, WORDS } from './strokes-data.js';
import { TracingEngine } from './tracing-engine.js';
import { TrainWorld } from './train-sim.js';
import { MathGame } from './math-game.js';
import { sound } from './audio.js';
import { rewards } from './rewards.js';

class App {
  constructor() {
    this.currentCategory = 'letters'; // 'letters', 'numbers', 'words'
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
    this.catNumbersBtn = document.getElementById('cat-numbers');
    this.catWordsBtn = document.getElementById('cat-words');

    // Item selector ribbon
    this.itemSelectorEl = document.getElementById('item-selector-ribbon');

    // Prompt info
    this.letterTitleEl = document.getElementById('active-letter-title');
    this.letterPhonicEl = document.getElementById('active-letter-phonic');
    this.wordTrainCarriageEl = document.getElementById('word-train-carriages');

    // Modals
    this.rewardModal = document.getElementById('reward-modal');
    this.rewardTracksCountEl = document.getElementById('reward-tracks-count');
    this.rewardSpecialEl = document.getElementById('reward-special-text');
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

    // Reward Modal Actions
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
    this.catNumbersBtn.classList.toggle('active', cat === 'numbers');
    this.catWordsBtn.classList.toggle('active', cat === 'words');

    if (cat === 'letters') {
      this.currentItemKey = 'A'; // Start with A
    } else if (cat === 'numbers') {
      this.currentItemKey = '1';
    } else if (cat === 'words') {
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

    // Auto-scroll ribbon to active item
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
        // Next letter in word!
        sound.playStrokeComplete();
        setTimeout(() => {
          this.wordLetterIndex++;
          this.loadCurrentItem();
        }, 800);
        return;
      }
      // Entire word completed!
      const reward = rewards.awardTracingReward(wordObj, true);
      this.showRewardModal(wordObj, reward);
    } else {
      // Single letter/number completed!
      const reward = rewards.awardTracingReward(item, false);
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

    // Update tool badges in Train World
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

    // Render completed badges
    listEl.innerHTML = '';
    const allCompleted = { ...state.completedLetters, ...state.completedNumbers, ...state.completedWords };

    if (Object.keys(allCompleted).length === 0) {
      listEl.innerHTML = `<p class="empty-hint">Trace your first letter to earn golden badges and train tracks! ⭐</p>`;
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

    // Render locomotive selection
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

// Start application when DOM loads
window.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
