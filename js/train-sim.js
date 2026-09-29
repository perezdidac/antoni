// train-sim.js - Interactive Train Track Builder & Locomotive Simulation Engine
// Built for 5-year-olds: huge touch targets, tap-to-rotate, auto-alignment, sound & smoke effects

import { sound } from './audio.js';
import { rewards } from './rewards.js';

// Direction vectors: 0=UP, 1=RIGHT, 2=DOWN, 3=LEFT
const DIR_UP = 0;
const DIR_RIGHT = 1;
const DIR_DOWN = 2;
const DIR_LEFT = 3;

const OPPOSITE = [DIR_DOWN, DIR_LEFT, DIR_UP, DIR_RIGHT];

export class TrainWorld {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.options = options;

    this.cols = 12;
    this.rows = 8;
    this.grid = []; // 2D array [row][col]

    this.selectedTool = 'straight';
    this.trainRunning = false;
    this.trainSpeed = 2.2;
    this.isNightMode = false;
    this.locomotiveSkin = 'red_steam';
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
      for (let c = 0; c < this.cols; c++) {
        row.push(null);
      }
      row.push(null);
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

  // Load a lovely starter loop so Antoni can watch the train immediately!
  loadDefaultTrack() {
    // Make a 6x4 oval loop in the middle
    // Top row (r=2): curve_br at c=2, straights c=3..8, curve_bl at c=9
    // Bottom row (r=5): curve_tr at c=2, straights c=3..8, curve_tl at c=9
    this.setPiece(2, 2, 'curve_br');
    for (let c = 3; c <= 8; c++) this.setPiece(2, c, 'straight_h');
    this.setPiece(2, 9, 'curve_bl');

    this.setPiece(3, 2, 'straight_v');
    this.setPiece(3, 9, 'straight_v');
    this.setPiece(4, 2, 'straight_v');
    this.setPiece(4, 9, 'station'); // cute station on the right!

    this.setPiece(5, 2, 'curve_tr');
    for (let c = 3; c <= 8; c++) this.setPiece(5, c, 'straight_h');
    this.setPiece(5, 9, 'curve_tl');

    // Add some cute scenery trees
    this.setPiece(1, 1, 'tree');
    this.setPiece(1, 10, 'tree');
    this.setPiece(6, 1, 'tree');
    this.setPiece(6, 10, 'tree');
    this.setPiece(3, 5, 'tree');

    // Place train on track
    this.trainPos = { row: 2, col: 3, subX: 0.5, subY: 0.5, dir: DIR_RIGHT };
    this.initCarTrail();
  }

  clearBoard() {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[r][c]) {
          const type = this.grid[r][c].category;
          rewards.returnPiece(type);
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
      case 'curve_br':
        return [DIR_DOWN, DIR_RIGHT];
      case 'curve_bl':
        return [DIR_DOWN, DIR_LEFT];
      case 'curve_tr':
        return [DIR_UP, DIR_RIGHT];
      case 'curve_tl':
        return [DIR_UP, DIR_LEFT];
      case 'station':
        return [DIR_UP, DIR_DOWN];
      default:
        return [];
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
        // Tap to toggle orientation H <-> V
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
        // Tap to cycle curve orientation: br -> bl -> tl -> tr!
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
    // Spawn extra cloud of smoke from locomotive
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
      // Find first track tile on grid
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

    // Update smoke puffs
    for (let i = this.smokePuffs.length - 1; i >= 0; i--) {
      const p = this.smokePuffs[i];
      p.x += p.vx;
      p.y += p.vy;
      p.size += p.growth;
      p.alpha -= 0.015;
      if (p.alpha <= 0) {
        this.smokePuffs.splice(i, 1);
      }
    }
  }

  updateTrainPhysics(dt) {
    const speed = this.trainSpeed; // units per second
    const stepDist = speed * dt;

    // Advance subX / subY along dir
    let { row, col, subX, subY, dir } = this.trainPos;

    switch (dir) {
      case DIR_RIGHT: subX += stepDist; break;
      case DIR_DOWN:  subY += stepDist; break;
      case DIR_LEFT:  subX -= stepDist; break;
      case DIR_UP:    subY -= stepDist; break;
    }

    // Chug sound periodically
    this.chugTimer += dt * speed;
    if (this.chugTimer > 0.45) {
      this.chugTimer = 0;
      sound.playChug();
      // Smoke puff
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

    // Transition across tile boundary
    if (subX >= 1.0) {
      col++;
      subX -= 1.0;
      this.handleEnterTile(row, col, DIR_RIGHT, subX, subY);
    } else if (subX < 0.0) {
      col--;
      subX += 1.0;
      this.handleEnterTile(row, col, DIR_LEFT, subX, subY);
    } else if (subY >= 1.0) {
      row++;
      subY -= 1.0;
      this.handleEnterTile(row, col, DIR_DOWN, subX, subY);
    } else if (subY < 0.0) {
      row--;
      subY += 1.0;
      this.handleEnterTile(row, col, DIR_UP, subX, subY);
    } else {
      this.trainPos.subX = subX;
      this.trainPos.subY = subY;
    }

    // Record trail for cars
    const currentLocoPos = this.getLocoPixelPos();
    this.historyTrail.unshift({
      x: currentLocoPos.x,
      y: currentLocoPos.y,
      angle: this.dirToAngle(this.trainPos.dir)
    });
    if (this.historyTrail.length > 200) {
      this.historyTrail.pop();
    }
  }

  handleEnterTile(row, col, entryDir, subX, subY) {
    // Check boundary
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
      this.stopAtBumper();
      return;
    }

    const tile = this.grid[row][col];
    const incomingFrom = OPPOSITE[entryDir];

    if (!tile || !tile.connections || !tile.connections.includes(incomingFrom)) {
      // Off track or no connection!
      this.stopAtBumper();
      return;
    }

    // Determine exit direction
    const exits = tile.connections.filter(d => d !== incomingFrom);
    const exitDir = exits.length > 0 ? exits[0] : incomingFrom;

    this.trainPos.row = row;
    this.trainPos.col = col;
    this.trainPos.dir = exitDir;
    this.trainPos.subX = 0.5;
    this.trainPos.subY = 0.5;

    // Station check
    if (tile.type === 'station') {
      sound.playBell();
      this.stationTimer = 2.0; // pause at station
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

    // 1. Draw Pleasant Grass & Landscape Background
    this.drawLandscape();

    // 2. Draw Grid Lines (subtle for kindergarten alignment)
    this.drawGridOverlay();

    // 3. Draw Track Tiles & Scenery
    this.drawTiles();

    // 4. Draw Trailing Cars & Locomotive
    this.drawTrain();

    // 5. Draw Smoke Puffs
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

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(25, 25, 5, 0, Math.PI * 2);
      ctx.arc(this.width - 25, 30, 5, 0, Math.PI * 2);
      ctx.arc(35, this.height - 25, 5, 0, Math.PI * 2);
      ctx.arc(this.width - 35, this.height - 30, 5, 0, Math.PI * 2);
      ctx.fill();
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

    ctx.strokeStyle = '#4B6584';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  drawCurveTrack(ctx, type, x, y, size) {
    // Determine corner center
    let cx, cy;
    if (type === 'curve_br') { cx = x + size; cy = y + size; } // bottom-right center
    else if (type === 'curve_bl') { cx = x; cy = y + size; }
    else if (type === 'curve_tl') { cx = x; cy = y; }
    else if (type === 'curve_tr') { cx = x + size; cy = y; }

    const rInner = size / 2 - 7;
    const rOuter = size / 2 + 7;

    // Ballast curve
    ctx.strokeStyle = '#A4B0BE';
    ctx.lineWidth = 22;
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
    ctx.stroke();

    // Wooden ties along arc
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

    // Steel rails
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
    // Station platform & roof on side of track
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

    // Little station clock
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(x + size * 0.14, y + size / 2, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2C3A47';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  drawTree(ctx, midX, midY, size) {
    // Tree trunk
    ctx.fillStyle = '#795548';
    ctx.fillRect(midX - 4, midY + 4, 8, size * 0.35);

    // Tree canopy layers (fluffy cute cartoon pine / oak)
    ctx.fillStyle = '#2ED573';
    ctx.beginPath();
    ctx.arc(midX, midY - 6, size * 0.28, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#26AF5F';
    ctx.beginPath();
    ctx.arc(midX - 6, midY - 2, size * 0.18, 0, Math.PI * 2);
    ctx.arc(midX + 6, midY - 2, size * 0.18, 0, Math.PI * 2);
    ctx.fill();
  }

  drawTrain() {
    const locoPos = this.getLocoPixelPos();
    const locoAngle = this.dirToAngle(this.trainPos.dir);

    // 1. Draw Trailing Cars first (so engine is in front)
    const spacing = 38;
    this.cars.forEach((car, idx) => {
      const trailIndex = Math.min(this.historyTrail.length - 1, Math.floor((idx + 1) * spacing * 0.5));
      const pos = this.historyTrail[trailIndex] || { x: locoPos.x, y: locoPos.y, angle: locoAngle };
      this.drawCar(pos.x, pos.y, pos.angle, car);
    });

    // 2. Draw Locomotive Engine
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
