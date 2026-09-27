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

    this.selectedTool = 'straight'; // 'straight', 'curve', 'station', 'tree', 'erase'
    this.curveSubtype = 'br'; // 'br', 'bl', 'tr', 'tl'

    // Train state
    this.trainRunning = false;
    this.trainSpeed = 2.0; // Slow, pleasant speed
    this.trainPos = { row: 2, col: 2, subX: 0.5, subY: 0.5, dir: DIR_RIGHT };
    this.cars = [
      { type: 'tender', dist: 0.9 },
      { type: 'passenger', dist: 1.8 },
      { type: 'animal', dist: 2.7 }
    ];
    this.historyTrail = []; // recorded positions for trailing cars
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
        return [DIR_LEFT, DIR_RIGHT];
      case 'straight_v':
        return [DIR_UP, DIR_DOWN];
      case 'curve_br': // Top-left corner: connects Bottom and Right
        return [DIR_DOWN, DIR_RIGHT];
      case 'curve_bl': // Top-right corner: connects Bottom and Left
        return [DIR_DOWN, DIR_LEFT];
      case 'curve_tr': // Bottom-left corner: connects Top and Right
        return [DIR_UP, DIR_RIGHT];
      case 'curve_tl': // Bottom-right corner: connects Top and Left
        return [DIR_UP, DIR_LEFT];
      case 'station':
        return [DIR_UP, DIR_DOWN]; // or horizontal
      case 'crossing':
        return [DIR_UP, DIR_DOWN, DIR_LEFT, DIR_RIGHT];
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
    // Cheerful lush meadow gradient
    const grad = ctx.createLinearGradient(0, 0, 0, this.height);
    grad.addColorStop(0, '#B8E994');
    grad.addColorStop(1, '#78E08F');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);

    // Cute little daisies in corners
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(25, 25, 5, 0, Math.PI * 2);
    ctx.arc(this.width - 25, 30, 5, 0, Math.PI * 2);
    ctx.arc(35, this.height - 25, 5, 0, Math.PI * 2);
    ctx.arc(this.width - 35, this.height - 30, 5, 0, Math.PI * 2);
    ctx.fill();
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
      this.drawCar(pos.x, pos.y, pos.angle, car.type);
    });

    // 2. Draw Locomotive Engine
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

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.roundRect(-22, -12, 44, 26, 4);
    ctx.fill();

    // Boiler body
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.roundRect(-16, -11, 26, 22, 5);
    ctx.fill();

    // Cabin
    ctx.fillStyle = cabColor;
    ctx.beginPath();
    ctx.roundRect(-24, -13, 15, 26, 4);
    ctx.fill();

    // Cabin window
    ctx.fillStyle = '#E0F7FA';
    ctx.fillRect(-22, -10, 11, 8);

    // Smokestack
    ctx.fillStyle = '#2C3A47';
    ctx.beginPath();
    ctx.roundRect(4, -15, 6, 8, 2);
    ctx.fill();

    // Golden headlight
    ctx.fillStyle = '#FFEAA7';
    ctx.beginPath();
    ctx.arc(12, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    // Big friendly locomotive face / cowcatcher
    ctx.fillStyle = '#B33939';
    ctx.beginPath();
    ctx.moveTo(10, -9);
    ctx.lineTo(16, -4);
    ctx.lineTo(16, 4);
    ctx.lineTo(10, 9);
    ctx.closePath();
    ctx.fill();

    // Wheels
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
      // Coal tender car
      ctx.fillStyle = '#2C3A47';
      ctx.beginPath();
      ctx.roundRect(-14, -10, 28, 20, 3);
      ctx.fill();

      // Coal chunks
      ctx.fillStyle = '#1E272E';
      ctx.beginPath();
      ctx.arc(-4, -2, 5, 0, Math.PI * 2);
      ctx.arc(4, -2, 5, 0, Math.PI * 2);
      ctx.arc(0, 2, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'passenger') {
      // Cheerful Yellow/Blue passenger car
      ctx.fillStyle = '#F39C12';
      ctx.beginPath();
      ctx.roundRect(-16, -11, 32, 22, 4);
      ctx.fill();

      // Windows
      ctx.fillStyle = '#E0F7FA';
      ctx.fillRect(-12, -8, 7, 6);
      ctx.fillRect(-2, -8, 7, 6);
      ctx.fillRect(8, -8, 7, 6);

      // Roof
      ctx.fillStyle = '#D35400';
      ctx.fillRect(-16, -13, 32, 3);
    } else {
      // Animal safari car (with smiling giraffe neck poking out!)
      ctx.fillStyle = '#27AE60';
      ctx.beginPath();
      ctx.roundRect(-16, -11, 32, 22, 4);
      ctx.fill();

      // Cute Giraffe head
      ctx.fillStyle = '#F1C40F';
      ctx.beginPath();
      ctx.arc(0, -12, 6, 0, Math.PI * 2);
      ctx.fill();
      // Spots
      ctx.fillStyle = '#E67E22';
      ctx.beginPath();
      ctx.arc(-2, -13, 2, 0, Math.PI * 2);
      ctx.arc(2, -11, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Wheels
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
