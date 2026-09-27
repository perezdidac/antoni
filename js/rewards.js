// rewards.js - Reward system and inventory management
// Persists Antoni's earned tracks, golden tickets, and train cars

const STORAGE_KEY = 'antoni_train_express_v1';

const DEFAULT_STATE = {
  stars: 5,
  tickets: 1,
  inventory: {
    straight: 12,
    curve: 12,
    crossing: 4,
    station: 2,
    tree: 6
  },
  unlockedTrains: ['red_steam', 'blue_puff'],
  selectedTrain: 'red_steam',
  unlockedCars: ['coal_tender', 'passenger_car'],
  selectedCars: ['coal_tender', 'passenger_car'],
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
          inventory: { ...DEFAULT_STATE.inventory, ...(parsed.inventory || {}) }
        };
      }
    } catch (e) {
      console.warn('Could not load saved rewards:', e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_STATE));
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.warn('Could not save rewards:', e);
    }
    this.notify();
  }

  onChange(callback) {
    this.listeners.push(callback);
    callback(this.state);
  }

  notify() {
    this.listeners.forEach((fn) => fn(this.state));
  }

  // Award rewards when a letter, number, or word is completed
  awardTracingReward(item, isWord = false) {
    const tracksEarned = item.rewardTracks || 3;
    const straightEarned = Math.ceil(tracksEarned / 2);
    const curveEarned = Math.floor(tracksEarned / 2);

    this.state.stars += 3;
    this.state.tickets += 1;
    this.state.inventory.straight += straightEarned;
    this.state.inventory.curve += curveEarned;

    // Check special unlocks
    let specialUnlock = null;
    if ((item.symbol === 'P' || item.symbol === 'A' || item.symbol === 'Antoni') && !this.state.unlockedTrains.includes('golden_express')) {
      this.state.unlockedTrains.push('golden_express');
      specialUnlock = '✨ Golden Conductor Train!';
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

    return {
      straight: straightEarned,
      curve: curveEarned,
      stars: 3,
      specialUnlock
    };
  }

  getPieceCount(type) {
    return this.state.inventory[type] || 0;
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

  selectTrain(trainId) {
    if (this.state.unlockedTrains.includes(trainId)) {
      this.state.selectedTrain = trainId;
      this.save();
    }
  }

  resetAll() {
    this.state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    this.save();
  }
}

export const rewards = new RewardManager();
