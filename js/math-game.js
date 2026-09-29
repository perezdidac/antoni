// math-game.js - Kindergarten Train Math & Cargo Sums
// Designed for 5-year-olds: visual cargo counting, addition up to 5 and 10, take-away, and missing numbers

import { sound } from './audio.js';
import { rewards } from './rewards.js';

export class MathGame {
  constructor(containerEl, options = {}) {
    this.container = containerEl;
    this.options = {
      onCorrect: options.onCorrect || (() => {}),
      ...options
    };

    this.mode = 'add_5'; // 'add_5', 'add_10', 'sub_5', 'missing'
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
      num1 = Math.floor(Math.random() * 4) + 1; // 1 to 4
      const maxNum2 = 5 - num1;
      num2 = Math.floor(Math.random() * maxNum2) + 1; // sum <= 5
      answer = num1 + num2;
      questionText = `${num1} + ${num2} = ?`;
      spokenText = `What is ${num1} plus ${num2}?`;
    } else if (this.mode === 'add_10') {
      type = 'addition';
      symbol = '+';
      num1 = Math.floor(Math.random() * 6) + 1; // 1 to 6
      const maxNum2 = 10 - num1;
      num2 = Math.floor(Math.random() * maxNum2) + 1; // sum <= 10
      answer = num1 + num2;
      questionText = `${num1} + ${num2} = ?`;
      spokenText = `What is ${num1} plus ${num2}?`;
    } else if (this.mode === 'sub_5') {
      type = 'subtraction';
      symbol = '−';
      num1 = Math.floor(Math.random() * 4) + 2; // 2 to 5
      num2 = Math.floor(Math.random() * (num1 - 1)) + 1; // 1 to num1-1
      answer = num1 - num2;
      questionText = `${num1} − ${num2} = ?`;
      spokenText = `${num1} minus ${num2} equals what?`;
    } else if (this.mode === 'missing') {
      type = 'missing';
      const start = Math.floor(Math.random() * 6) + 1; // 1 to 6
      const missingIndex = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3
      const sequence = [start, start + 1, start + 2, start + 3];
      answer = sequence[missingIndex];
      sequence[missingIndex] = '?';
      questionText = sequence.join('  •  ');
      spokenText = 'Which number is missing on the train?';
      this.currentProblem = {
        type,
        sequence,
        answer,
        spokenText,
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
      type,
      symbol,
      num1,
      num2,
      answer,
      icon,
      cargoItems1,
      cargoItems2,
      questionText,
      spokenText,
      options
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
        <!-- Sub-modes / Levels -->
        <div class="math-modes-bar">
          <button class="math-mode-btn active" data-mode="add_5">🍎 Sums to 5</button>
          <button class="math-mode-btn" data-mode="add_10">🌟 Sums to 10</button>
          <button class="math-mode-btn" data-mode="sub_5">➖ Take Away</button>
          <button class="math-mode-btn" data-mode="missing">🔢 Missing Car</button>
          <button class="math-mode-btn" data-mode="compare">⚖️ Long or Short?</button>
        </div>

        <!-- Train Track Delivery Stage -->
        <div class="math-stage">
          <div class="math-prompt-banner">
            <div class="math-streak-badge">⭐ Streak: <span id="math-streak-val">0</span></div>
            <h2 id="math-question-text" class="math-equation-heading">2 + 3 = ?</h2>
            <button id="btn-math-speak" class="btn-speak" title="Hear Problem">📢 Listen</button>
          </div>

          <!-- Train with Visual Cargo -->
          <div id="math-train-visual" class="math-train-visual">
            <!-- Rendered by JS -->
          </div>

          <!-- Answer Choices: Train Freight Cars -->
          <div class="math-answers-label">Tap the winning train car:</div>
          <div id="math-options-grid" class="math-options-grid">
            <!-- Rendered by JS -->
          </div>
        </div>
      </div>
    `;

    // Bind mode buttons
    const modeBtns = this.container.querySelectorAll('.math-mode-btn');
    modeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        modeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        sound.playTap();
        this.setMode(btn.dataset.mode);
      });
    });

    // Bind speak button
    this.container.querySelector('#btn-math-speak').addEventListener('click', () => {
      sound.init();
      if (this.currentProblem) sound.speak(this.currentProblem.spokenText);
    });
  }

  render() {
    if (!this.currentProblem) return;

    // Update heading
    const eqHeading = this.container.querySelector('#math-question-text');
    eqHeading.innerText = this.currentProblem.questionText;

    // Update streak
    const streakEl = this.container.querySelector('#math-streak-val');
    streakEl.innerText = this.streak;

    // Render Train Visual
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
      // Show total items, with take-away items crossed/dimmed
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

    // Interactive counting when tapping cargo icons
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

    // Render Answer Choices
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
      // Correct!
      this.answered = true;
      this.streak++;
      btnElement.classList.add('correct');
      sound.playStrokeComplete();
      sound.playWhistle();

      // Speak enthusiastic praise
      let praise = `${this.currentProblem.answer}! That's right!`;
      if (this.currentProblem.type === 'addition') {
        praise = `${this.currentProblem.num1} plus ${this.currentProblem.num2} equals ${this.currentProblem.answer}! Super job, Antoni!`;
      }
      sound.speak(praise);

      // Award +2 train tracks and 2 stars!
      const reward = rewards.awardTracingReward({
        symbol: `Math ${this.currentProblem.questionText}`,
        category: 'math',
        rewardTracks: 2
      });

      // Animate train moving across track
      const trainRow = this.container.querySelector('.cargo-train-row');
      if (trainRow) {
        trainRow.classList.add('chug-celebrate');
      }

      this.render(); // update revealed answer

      // Notify parent app
      this.options.onCorrect({
        problem: this.currentProblem,
        reward,
        streak: this.streak
      });

      // Advance to next problem after cheerful animation
      setTimeout(() => {
        this.generateProblem();
      }, 2200);

    } else {
      // Incorrect - gentle bouncy sound
      btnElement.classList.add('shake');
      sound.playGentleNudge();
      sound.speak('Try again! Count the cargo with your finger!');
      setTimeout(() => btnElement.classList.remove('shake'), 500);
    }
  }
}
