// tracing-engine.js - Canvas-based letter & number stroke tracing engine
// Strictly enforces stroke order (Stroke 1 then 2) and stroke direction (top-to-bottom, curve clockwise, etc.)
// Designed specifically for 5-year-olds on touch tablets and mice.

import { sound } from './audio.js';

export class TracingEngine {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.options = {
      hitRadius: 45, // Touch-forgiving radius for kindergarteners (px)
      lookahead: 6,   // Waypoint lookahead window
      onStrokeComplete: options.onStrokeComplete || (() => {}),
      onItemComplete: options.onItemComplete || (() => {}),
      onProgress: options.onProgress || (() => {}),
      ...options
    };

    this.currentItem = null;
    this.activeStrokeIndex = 0;
    this.strokeProgress = []; // [{ maxReachedIndex: 0, completed: false, drawnPoints: [] }]
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

    // Speak letter name or phonic
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

  // Convert 400x400 normalized coordinates to canvas pixels
  toCanvasCoords(pt) {
    return {
      x: this.offsetX + pt.x * this.scaleFactor,
      y: this.offsetY + pt.y * this.scaleFactor
    };
  }

  // Convert canvas touch coordinates back to 400x400 normalized space
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
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    };

    // Pointer Down / Touch Start
    const handleDown = (e) => {
      e.preventDefault();
      if (!this.currentItem) return;
      sound.init();

      const pos = getPos(e);
      const normPos = this.fromCanvasCoords(pos);

      // Check if all strokes are already completed
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

      // If finger is moving forward along the path
      if (bestIndex > currentIndex && minDistance <= hitTolerance) {
        progress.maxReachedIndex = bestIndex;
        progress.drawnPoints.push({ ...normPos });

        // Sound chime for progress
        if (bestIndex % 4 === 0 || bestIndex === points.length - 1) {
          sound.playTraceChime(bestIndex);
          this.spawnSparkles(pos.x, pos.y, '#FF6B6B', 3);
        }

        // Check if finished this stroke
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

    // Pointer Up / Touch End
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
      // More strokes to do
      this.options.onProgress({
        item: this.currentItem,
        activeStroke: this.activeStrokeIndex,
        totalStrokes: this.currentItem.strokes.length,
        isFinished: false
      });
    } else {
      // Entire letter/number finished!
      this.handleItemFinished();
    }
  }

  handleItemFinished() {
    sound.playCelebration();
    // Confetti / firework sparkles
    for (let i = 0; i < 40; i++) {
      const x = this.width * (0.2 + Math.random() * 0.6);
      const y = this.height * (0.2 + Math.random() * 0.6);
      const colors = ['#FF4757', '#FFA502', '#2ED573', '#1E90FF', '#9B59B6'];
      this.spawnSparkles(x, y, colors[i % colors.length], 4);
    }

    this.options.onItemComplete({
      item: this.currentItem
    });

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
        x,
        y,
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
      if (this.nudgeAlpha > 0) {
        this.nudgeAlpha -= 0.015;
      }
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
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // 1. Draw Kindergarten Handwriting Paper Background
    this.drawHandwritingGuidelines();

    if (!this.currentItem) return;

    // 2. Draw Faint Gray Template Track for all strokes
    this.drawTemplateTracks();

    // 3. Draw Completed Strokes (in shiny rainbow train tracks)
    this.drawCompletedStrokes();

    // 4. Draw Current Active Stroke Progress
    this.drawActiveStroke();

    // 5. Draw Stroke Number Badges and Directional Guides
    this.drawStrokeBadgesAndGuides();

    // 6. Draw Sparkle Particles
    this.drawParticles();

    // 7. Draw Nudge Message if active
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

    // Soft rounded background card
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0, 40, 80, 0.08)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 8;
    this.roundRect(ctx, this.offsetX + 10, this.offsetY + 10, 380 * this.scaleFactor, 380 * this.scaleFactor, 24);
    ctx.fill();
    ctx.restore();

    // Top Blue Line
    ctx.strokeStyle = 'rgba(70, 130, 240, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(left, topY);
    ctx.lineTo(right, topY);
    ctx.stroke();

    // Middle Dashed Blue Line
    ctx.strokeStyle = 'rgba(70, 130, 240, 0.4)';
    ctx.setLineDash([8, 8]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(left, midY);
    ctx.lineTo(right, midY);
    ctx.stroke();
    ctx.setLineDash([]); // reset

    // Bottom Red Baseline
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
      const isPast = idx < this.activeStrokeIndex;
      if (isPast) return; // already drawn in color

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

      // Dashed centerline showing the rail track
      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 4 * this.scaleFactor;
      ctx.setLineDash([6, 6]);
      ctx.stroke();
      ctx.restore();
    });
  }

  drawCompletedStrokes() {
    const ctx = this.ctx;
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

  // Draw colorful wooden railroad tracks with sleepers/ties along the path
  drawTrackPath(points, mainColor, railColor, isComplete = false) {
    if (points.length < 2) return;
    const ctx = this.ctx;
    ctx.save();

    // 1. Broad ballast line
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

    // 2. Shiny steel rails along edges
    ctx.strokeStyle = isComplete ? '#FFFFFF' : '#FFEAA7';
    ctx.lineWidth = 3.5 * this.scaleFactor;
    ctx.stroke();

    // 3. Wooden cross-ties along path
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

    // Progress along the path [0, 1] looping every 2 seconds
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

    // Cute animated golden train engine pointing in direction!
    ctx.fillStyle = '#FFC312';
    ctx.strokeStyle = '#EE5A24';
    ctx.lineWidth = 2;

    // Locomotive body
    this.roundRect(ctx, -12 * this.scaleFactor, -8 * this.scaleFactor, 24 * this.scaleFactor, 16 * this.scaleFactor, 4);
    ctx.fill();
    ctx.stroke();

    // Cowcatcher arrow at front
    ctx.fillStyle = '#EA2027';
    ctx.beginPath();
    ctx.moveTo(12 * this.scaleFactor, -6 * this.scaleFactor);
    ctx.lineTo(20 * this.scaleFactor, 0);
    ctx.lineTo(12 * this.scaleFactor, 6 * this.scaleFactor);
    ctx.closePath();
    ctx.fill();

    // Little smokestack puff
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();
    ctx.arc(-2 * this.scaleFactor, -12 * this.scaleFactor, 4 * this.scaleFactor, 0, Math.PI * 2);
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
