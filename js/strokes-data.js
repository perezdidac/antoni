// strokes-data.js - Accurate stroke geometry, stroke orders, and directions
// Follows early childhood & kindergarten handwriting standards (e.g. Zaner-Bloser).

// Helper to generate interpolated points along lines and curves
function interpolateLine(p1, p2, step = 8) {
  const points = [];
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dist = Math.hypot(dx, dy);
  const count = Math.max(2, Math.ceil(dist / step));
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    points.push({
      x: p1.x + dx * t,
      y: p1.y + dy * t
    });
  }
  return points;
}

function interpolatePolyline(rawPoints, step = 8) {
  const result = [];
  for (let i = 0; i < rawPoints.length - 1; i++) {
    const seg = interpolateLine(rawPoints[i], rawPoints[i + 1], step);
    if (i > 0) seg.shift(); // avoid duplicate joints
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

// Coordinate grid: 400 x 400.
// Standard guide lines:
// Top line: y = 60
// Middle line: y = 200
// Baseline: y = 340
// Left margin: x = 90, Right margin: x = 310, Center: x = 200

export const LETTERS = {
  A: {
    symbol: 'A',
    category: 'letter',
    phonic: 'A is for Antoni and All Aboard!',
    word: 'ALL ABOARD',
    rewardTracks: 3,
    strokes: [
      {
        id: 1,
        name: 'Slant down left',
        hint: 'Start at the peak, slide down to the left!',
        points: interpolateLine({ x: 200, y: 70 }, { x: 100, y: 340 }, 8)
      },
      {
        id: 2,
        name: 'Slant down right',
        hint: 'Start at the peak, slide down to the right!',
        points: interpolateLine({ x: 200, y: 70 }, { x: 300, y: 340 }, 8)
      },
      {
        id: 3,
        name: 'Bridge across',
        hint: 'Zip straight across from left to right!',
        points: interpolateLine({ x: 145, y: 220 }, { x: 255, y: 220 }, 8)
      }
    ]
  },

  B: {
    symbol: 'B',
    category: 'letter',
    phonic: 'B is for Bell and Boxcar!',
    word: 'BELL',
    rewardTracks: 3,
    strokes: [
      {
        id: 1,
        name: 'Down the stick',
        hint: 'Start at the top, go down!',
        points: interpolateLine({ x: 130, y: 70 }, { x: 130, y: 340 }, 8)
      },
      {
        id: 2,
        name: 'Top bubble',
        hint: 'Around to the middle!',
        points: interpolateCubicBezier(
          { x: 130, y: 70 },
          { x: 275, y: 70 },
          { x: 275, y: 195 },
          { x: 130, y: 195 },
          25
        )
      },
      {
        id: 3,
        name: 'Bottom bubble',
        hint: 'Around to the bottom!',
        points: interpolateCubicBezier(
          { x: 130, y: 195 },
          { x: 290, y: 195 },
          { x: 290, y: 340 },
          { x: 130, y: 340 },
          25
        )
      }
    ]
  },

  C: {
    symbol: 'C',
    category: 'letter',
    phonic: 'C is for Choo-Choo Caboose!',
    word: 'CHOO-CHOO',
    rewardTracks: 2,
    strokes: [
      {
        id: 1,
        name: 'Big curve around',
        hint: 'Start top right, curve back and down around!',
        points: interpolateCubicBezier(
          { x: 290, y: 110 },
          { x: 110, y: 50 },
          { x: 100, y: 350 },
          { x: 290, y: 300 },
          40
        )
      }
    ]
  },

  D: {
    symbol: 'D',
    category: 'letter',
    phonic: 'D is for Diesel Train!',
    word: 'DIESEL',
    rewardTracks: 2,
    strokes: [
      {
        id: 1,
        name: 'Straight down',
        hint: 'Top to bottom!',
        points: interpolateLine({ x: 130, y: 70 }, { x: 130, y: 340 }, 8)
      },
      {
        id: 2,
        name: 'Great big curve',
        hint: 'Start at top, curve way out and back down!',
        points: interpolateCubicBezier(
          { x: 130, y: 70 },
          { x: 320, y: 70 },
          { x: 320, y: 340 },
          { x: 130, y: 340 },
          36
        )
      }
    ]
  },

  E: {
    symbol: 'E',
    category: 'letter',
    phonic: 'E is for Engine Express!',
    word: 'ENGINE',
    rewardTracks: 3,
    strokes: [
      {
        id: 1,
        name: 'Straight down',
        hint: 'Slide down the tall line!',
        points: interpolateLine({ x: 130, y: 70 }, { x: 130, y: 340 }, 8)
      },
      {
        id: 2,
        name: 'Top line',
        hint: 'Slide across the top!',
        points: interpolateLine({ x: 130, y: 70 }, { x: 275, y: 70 }, 8)
      },
      {
        id: 3,
        name: 'Middle line',
        hint: 'Slide across the middle!',
        points: interpolateLine({ x: 130, y: 205 }, { x: 240, y: 205 }, 8)
      },
      {
        id: 4,
        name: 'Bottom line',
        hint: 'Slide across the track bottom!',
        points: interpolateLine({ x: 130, y: 340 }, { x: 275, y: 340 }, 8)
      }
    ]
  },

  F: {
    symbol: 'F',
    category: 'letter',
    phonic: 'F is for Freight Train!',
    word: 'FREIGHT',
    rewardTracks: 2,
    strokes: [
      {
        id: 1,
        name: 'Straight down',
        hint: 'Top to bottom!',
        points: interpolateLine({ x: 130, y: 70 }, { x: 130, y: 340 }, 8)
      },
      {
        id: 2,
        name: 'Top bar',
        hint: 'Top across!',
        points: interpolateLine({ x: 130, y: 70 }, { x: 275, y: 70 }, 8)
      },
      {
        id: 3,
        name: 'Middle bar',
        hint: 'Middle across!',
        points: interpolateLine({ x: 130, y: 205 }, { x: 240, y: 205 }, 8)
      }
    ]
  },

  G: {
    symbol: 'G',
    category: 'letter',
    phonic: 'G is for Green Light - Go!',
    word: 'GO',
    rewardTracks: 2,
    strokes: [
      {
        id: 1,
        name: 'Curve around and up',
        hint: 'Big round turn and go up!',
        points: interpolateCubicBezier(
          { x: 290, y: 110 },
          { x: 110, y: 50 },
          { x: 100, y: 350 },
          { x: 290, y: 220 },
          36
        )
      },
      {
        id: 2,
        name: 'Bar inward',
        hint: 'Slide inside!',
        points: interpolateLine({ x: 290, y: 220 }, { x: 210, y: 220 }, 8)
      }
    ]
  },

  H: {
    symbol: 'H',
    category: 'letter',
    phonic: 'H is for Horn and Honk!',
    word: 'HORN',
    rewardTracks: 2,
    strokes: [
      {
        id: 1,
        name: 'Left track down',
        hint: 'Down the left rail!',
        points: interpolateLine({ x: 130, y: 70 }, { x: 130, y: 340 }, 8)
      },
      {
        id: 2,
        name: 'Right track down',
        hint: 'Down the right rail!',
        points: interpolateLine({ x: 270, y: 70 }, { x: 270, y: 340 }, 8)
      },
      {
        id: 3,
        name: 'Rail tie across',
        hint: 'Connect the two rails!',
        points: interpolateLine({ x: 130, y: 205 }, { x: 270, y: 205 }, 8)
      }
    ]
  },

  I: {
    symbol: 'I',
    category: 'letter',
    phonic: 'I is for Iron Railroad!',
    word: 'IRON',
    rewardTracks: 2,
    strokes: [
      {
        id: 1,
        name: 'Tall stick down',
        hint: 'Straight down the middle!',
        points: interpolateLine({ x: 200, y: 70 }, { x: 200, y: 340 }, 8)
      },
      {
        id: 2,
        name: 'Top roof',
        hint: 'Across the top!',
        points: interpolateLine({ x: 140, y: 70 }, { x: 260, y: 70 }, 8)
      },
      {
        id: 3,
        name: 'Bottom platform',
        hint: 'Across the bottom!',
        points: interpolateLine({ x: 140, y: 340 }, { x: 260, y: 340 }, 8)
      }
    ]
  },

  J: {
    symbol: 'J',
    category: 'letter',
    phonic: 'J is for Junction!',
    word: 'JUNCTION',
    rewardTracks: 2,
    strokes: [
      {
        id: 1,
        name: 'Down and hook left',
        hint: 'Down straight, then swing up like a hook!',
        points: interpolatePolyline([
          { x: 240, y: 70 },
          { x: 240, y: 270 },
          { x: 210, y: 335 },
          { x: 140, y: 290 }
        ], 8)
      },
      {
        id: 2,
        name: 'Top hat',
        hint: 'Slide across the top!',
        points: interpolateLine({ x: 170, y: 70 }, { x: 310, y: 70 }, 8)
      }
    ]
  },

  K: {
    symbol: 'K',
    category: 'letter',
    phonic: 'K is for Kindergarten Conductor!',
    word: 'KINDERGARTEN',
    rewardTracks: 3,
    strokes: [
      {
        id: 1,
        name: 'Down the pole',
        hint: 'Slide down from top to bottom!',
        points: interpolateLine({ x: 130, y: 70 }, { x: 130, y: 340 }, 8)
      },
      {
        id: 2,
        name: 'Slant down to middle',
        hint: 'Slide down into the center!',
        points: interpolateLine({ x: 270, y: 70 }, { x: 135, y: 215 }, 8)
      },
      {
        id: 3,
        name: 'Kick out to bottom',
        hint: 'Kick down to the corner!',
        points: interpolateLine({ x: 135, y: 215 }, { x: 280, y: 340 }, 8)
      }
    ]
  },

  L: {
    symbol: 'L',
    category: 'letter',
    phonic: 'L is for Locomotive!',
    word: 'LOCOMOTIVE',
    rewardTracks: 2,
    strokes: [
      {
        id: 1,
        name: 'Down the line',
        hint: 'Slide straight down!',
        points: interpolateLine({ x: 140, y: 70 }, { x: 140, y: 340 }, 8)
      },
      {
        id: 2,
        name: 'Along the ground',
        hint: 'Turn right along the track!',
        points: interpolateLine({ x: 140, y: 340 }, { x: 280, y: 340 }, 8)
      }
    ]
  },

  M: {
    symbol: 'M',
    category: 'letter',
    phonic: 'M is for Mountain Railway!',
    word: 'MOUNTAIN',
    rewardTracks: 3,
    strokes: [
      {
        id: 1,
        name: 'Down the left mountain',
        hint: 'Straight down!',
        points: interpolateLine({ x: 110, y: 70 }, { x: 110, y: 340 }, 8)
      },
      {
        id: 2,
        name: 'Valley slide',
        hint: 'Slide down into the middle valley!',
        points: interpolateLine({ x: 110, y: 70 }, { x: 200, y: 260 }, 8)
      },
      {
        id: 3,
        name: 'Climb the peak',
        hint: 'Climb up to the top peak!',
        points: interpolateLine({ x: 200, y: 260 }, { x: 290, y: 70 }, 8)
      },
      {
        id: 4,
        name: 'Down the right mountain',
        hint: 'Slide down to the bottom!',
        points: interpolateLine({ x: 290, y: 70 }, { x: 290, y: 340 }, 8)
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
      {
        id: 1,
        name: 'Down the left side',
        hint: 'Top to bottom!',
        points: interpolateLine({ x: 120, y: 70 }, { x: 120, y: 340 }, 8)
      },
      {
        id: 2,
        name: 'Diagonal slide',
        hint: 'Slide down across to the bottom right!',
        points: interpolateLine({ x: 120, y: 70 }, { x: 280, y: 340 }, 8)
      },
      {
        id: 3,
        name: 'Right wall down',
        hint: 'Top down to finish the track!',
        points: interpolateLine({ x: 280, y: 70 }, { x: 280, y: 340 }, 8)
      }
    ]
  },

  O: {
    symbol: 'O',
    category: 'letter',
    phonic: 'O is for Oval Track!',
    word: 'OVAL',
    rewardTracks: 2,
    strokes: [
      {
        id: 1,
        name: 'All the way round',
        hint: 'Start top, go around counter-clockwise in a circle!',
        points: interpolateArc(200, 205, 95, 135, -90, 270, false, 42)
      }
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

  Q: {
    symbol: 'Q',
    category: 'letter',
    phonic: 'Q is for Quick Train!',
    word: 'QUICK',
    rewardTracks: 2,
    strokes: [
      {
        id: 1,
        name: 'Big round circle',
        hint: 'Circle around counter-clockwise!',
        points: interpolateArc(200, 205, 95, 135, -90, 270, false, 42)
      },
      {
        id: 2,
        name: 'Train wheel kick',
        hint: 'Slant out through the bottom right!',
        points: interpolateLine({ x: 220, y: 260 }, { x: 295, y: 345 }, 8)
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
      {
        id: 1,
        name: 'Straight stick down',
        hint: 'Top to bottom!',
        points: interpolateLine({ x: 130, y: 70 }, { x: 130, y: 340 }, 8)
      },
      {
        id: 2,
        name: 'Top curve loop',
        hint: 'Curve around to the middle!',
        points: interpolateCubicBezier(
          { x: 130, y: 70 },
          { x: 290, y: 70 },
          { x: 290, y: 210 },
          { x: 130, y: 210 },
          28
        )
      },
      {
        id: 3,
        name: 'Kick leg down',
        hint: 'Slide down the ramp to the right!',
        points: interpolateLine({ x: 175, y: 210 }, { x: 280, y: 340 }, 8)
      }
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
          ...interpolateCubicBezier(
            { x: 275, y: 115 },
            { x: 150, y: 50 },
            { x: 110, y: 160 },
            { x: 200, y: 205 },
            20
          ),
          ...interpolateCubicBezier(
            { x: 200, y: 205 },
            { x: 290, y: 250 },
            { x: 250, y: 350 },
            { x: 125, y: 300 },
            20
          )
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
      {
        id: 1,
        name: 'Down the center',
        hint: 'Straight down the middle line!',
        points: interpolateLine({ x: 200, y: 70 }, { x: 200, y: 340 }, 8)
      },
      {
        id: 2,
        name: 'Across the top',
        hint: 'Slide all the way across the top!',
        points: interpolateLine({ x: 110, y: 70 }, { x: 290, y: 70 }, 8)
      }
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
          ...interpolateCubicBezier(
            { x: 130, y: 240 },
            { x: 130, y: 345 },
            { x: 270, y: 345 },
            { x: 270, y: 240 },
            20
          ),
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
      {
        id: 1,
        name: 'Slant down to bottom',
        hint: 'Slide down to the point!',
        points: interpolateLine({ x: 120, y: 70 }, { x: 200, y: 340 }, 8)
      },
      {
        id: 2,
        name: 'Slant up to top',
        hint: 'Slide back up to the top right!',
        points: interpolateLine({ x: 200, y: 340 }, { x: 280, y: 70 }, 8)
      }
    ]
  },

  W: {
    symbol: 'W',
    category: 'letter',
    phonic: 'W is for Whistle - Toot Toot!',
    word: 'WHISTLE',
    rewardTracks: 3,
    strokes: [
      {
        id: 1,
        name: 'First down',
        hint: 'Slide down left!',
        points: interpolateLine({ x: 95, y: 70 }, { x: 145, y: 340 }, 8)
      },
      {
        id: 2,
        name: 'Up to middle',
        hint: 'Slide up to the middle!',
        points: interpolateLine({ x: 145, y: 340 }, { x: 200, y: 170 }, 8)
      },
      {
        id: 3,
        name: 'Down to right',
        hint: 'Slide down again!',
        points: interpolateLine({ x: 200, y: 170 }, { x: 255, y: 340 }, 8)
      },
      {
        id: 4,
        name: 'Up to top',
        hint: 'Slide up to finish!',
        points: interpolateLine({ x: 255, y: 340 }, { x: 305, y: 70 }, 8)
      }
    ]
  },

  X: {
    symbol: 'X',
    category: 'letter',
    phonic: 'X is for Railroad Crossing X!',
    word: 'CROSSING',
    rewardTracks: 2,
    strokes: [
      {
        id: 1,
        name: 'Top left to bottom right',
        hint: 'Slide across from top left down!',
        points: interpolateLine({ x: 120, y: 70 }, { x: 280, y: 340 }, 8)
      },
      {
        id: 2,
        name: 'Top right to bottom left',
        hint: 'Cross over from top right down!',
        points: interpolateLine({ x: 280, y: 70 }, { x: 120, y: 340 }, 8)
      }
    ]
  },

  Y: {
    symbol: 'Y',
    category: 'letter',
    phonic: 'Y is for Yellow Train Yard!',
    word: 'YARD',
    rewardTracks: 2,
    strokes: [
      {
        id: 1,
        name: 'Slant to center',
        hint: 'Slide down to the center!',
        points: interpolateLine({ x: 120, y: 70 }, { x: 200, y: 195 }, 8)
      },
      {
        id: 2,
        name: 'Right slant to center',
        hint: 'Slide down from right to center!',
        points: interpolateLine({ x: 280, y: 70 }, { x: 200, y: 195 }, 8)
      },
      {
        id: 3,
        name: 'Stem down',
        hint: 'Slide straight down to the ground!',
        points: interpolateLine({ x: 200, y: 195 }, { x: 200, y: 340 }, 8)
      }
    ]
  },

  Z: {
    symbol: 'Z',
    category: 'letter',
    phonic: 'Z is for Zig-Zag tracks!',
    word: 'ZIG-ZAG',
    rewardTracks: 3,
    strokes: [
      {
        id: 1,
        name: 'Top bar across',
        hint: 'Slide across the top!',
        points: interpolateLine({ x: 120, y: 75 }, { x: 280, y: 75 }, 8)
      },
      {
        id: 2,
        name: 'Slant back down',
        hint: 'Slide down diagonally to the bottom left!',
        points: interpolateLine({ x: 280, y: 75 }, { x: 120, y: 335 }, 8)
      },
      {
        id: 3,
        name: 'Bottom bar across',
        hint: 'Slide across the bottom to finish!',
        points: interpolateLine({ x: 120, y: 335 }, { x: 280, y: 335 }, 8)
      }
    ]
  }
};

// NUMBERS 0 - 9
export const NUMBERS = {
  '1': {
    symbol: '1',
    category: 'number',
    phonic: 'Number 1! One big locomotive engine!',
    word: 'ONE',
    rewardTracks: 2,
    strokes: [
      {
        id: 1,
        name: 'Straight down',
        hint: 'Start at the top, slide straight down!',
        points: interpolateLine({ x: 200, y: 70 }, { x: 200, y: 340 }, 7)
      }
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
        points: interpolateCubicBezier(
          { x: 130, y: 130 },
          { x: 160, y: 60 },
          { x: 275, y: 60 },
          { x: 260, y: 160 },
          20
        ).concat(interpolateLine({ x: 260, y: 160 }, { x: 130, y: 340 }, 8))
      },
      {
        id: 2,
        name: 'Line along the ground',
        hint: 'Straight across the bottom!',
        points: interpolateLine({ x: 130, y: 340 }, { x: 280, y: 340 }, 8)
      }
    ]
  },

  '3': {
    symbol: '3',
    category: 'number',
    phonic: 'Number 3! Three colorful passenger cars!',
    word: 'THREE',
    rewardTracks: 2,
    strokes: [
      {
        id: 1,
        name: 'Top curve',
        hint: 'Curve around to the middle!',
        points: interpolateCubicBezier(
          { x: 135, y: 100 },
          { x: 200, y: 60 },
          { x: 280, y: 100 },
          { x: 200, y: 195 },
          24
        )
      },
      {
        id: 2,
        name: 'Bottom curve',
        hint: 'Curve around to the bottom!',
        points: interpolateCubicBezier(
          { x: 200, y: 195 },
          { x: 290, y: 260 },
          { x: 220, y: 340 },
          { x: 135, y: 300 },
          24
        )
      }
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
      {
        id: 2,
        name: 'Down through',
        hint: 'Slice straight down!',
        points: interpolateLine({ x: 230, y: 120 }, { x: 230, y: 340 }, 8)
      }
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
          ...interpolateCubicBezier(
            { x: 150, y: 190 },
            { x: 290, y: 190 },
            { x: 280, y: 340 },
            { x: 135, y: 320 },
            26
          )
        ]
      },
      {
        id: 2,
        name: 'Top hat',
        hint: 'Give number 5 a roof!',
        points: interpolateLine({ x: 155, y: 80 }, { x: 265, y: 80 }, 8)
      }
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
        points: interpolatePolyline([
          { x: 260, y: 80 },
          { x: 170, y: 150 },
          { x: 125, y: 260 },
          { x: 190, y: 340 },
          { x: 270, y: 290 },
          { x: 240, y: 205 },
          { x: 150, y: 215 },
          { x: 130, y: 260 }
        ], 8)
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
          ...interpolateCubicBezier(
            { x: 200, y: 70 },
            { x: 130, y: 70 },
            { x: 130, y: 200 },
            { x: 200, y: 200 },
            18
          ),
          ...interpolateCubicBezier(
            { x: 200, y: 200 },
            { x: 270, y: 200 },
            { x: 270, y: 340 },
            { x: 200, y: 340 },
            18
          ),
          ...interpolateCubicBezier(
            { x: 200, y: 340 },
            { x: 130, y: 340 },
            { x: 130, y: 200 },
            { x: 200, y: 200 },
            18
          ),
          ...interpolateCubicBezier(
            { x: 200, y: 200 },
            { x: 270, y: 200 },
            { x: 270, y: 70 },
            { x: 200, y: 70 },
            18
          )
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

  '0': {
    symbol: '0',
    category: 'number',
    phonic: 'Zero! Round like a train wheel!',
    word: 'ZERO',
    rewardTracks: 2,
    strokes: [
      {
        id: 1,
        name: 'Round and round',
        hint: 'Start top, circle counter-clockwise all the way!',
        points: interpolateArc(200, 205, 80, 135, -90, 270, false, 40)
      }
    ]
  }
};

// WORDS: Sequences of letters for full word tracing
export const WORDS = {
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
  },
  CHOO: {
    symbol: 'CHOO',
    category: 'word',
    phonic: 'Choo! Choo! Blow the whistle!',
    letters: ['C', 'H', 'O', 'O'],
    rewardTracks: 4,
    specialReward: 'Steam Whistle Car'
  },
  GO: {
    symbol: 'GO',
    category: 'word',
    phonic: 'Green light means GO!',
    letters: ['G', 'O'],
    rewardTracks: 3,
    specialReward: 'Green Signal Light'
  },
  STOP: {
    symbol: 'STOP',
    category: 'word',
    phonic: 'Red light means STOP at the station!',
    letters: ['S', 'T', 'O', 'P'],
    rewardTracks: 4,
    specialReward: 'Grand Station Depot'
  }
};
