export const BUBBLE_COLORS = {
  ember: "#F6A24E",
  moss: "#69C49A",
  lilac: "#AD9BFF",
  rose: "#ED7890",
} as const;

export type BubbleColor = keyof typeof BUBBLE_COLORS;
export type BubbleKind = "normal" | "cursed" | "stone";
export type GoalKind = "pop" | "curses" | "stones" | "clear";

export interface Bubble {
  id: string;
  row: number;
  col: number;
  color: BubbleColor;
  kind: BubbleKind;
}

export interface Cell {
  row: number;
  col: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Level {
  id: number;
  chapter: number;
  chapterName: string;
  name: string;
  story: string;
  goal: GoalKind;
  target: number;
  moves: number;
  colors: 3 | 4;
  pattern: readonly string[];
  twoStarMoves: number;
  threeStarMoves: number;
}

const makeLevel = (
  level: Omit<Level, "chapterName">,
): Level => ({
  ...level,
  chapterName: ["", "Harvest Lane", "Witchwood", "Moonfall Mill"][
    level.chapter
  ],
});

export const LEVELS: Level[] = [
  makeLevel({
    id: 1,
    chapter: 1,
    name: "First Lantern",
    story: "Find the path through the pumpkin rows.",
    goal: "pop",
    target: 18,
    moves: 18,
    colors: 3,
    pattern: ["AABBCCAA", "ABBCCAA", "BBCCAABB", "BCCAABB"],
    twoStarMoves: 3,
    threeStarMoves: 7,
  }),
  makeLevel({
    id: 2,
    chapter: 1,
    name: "Crow's Crossing",
    story: "Bank a shot around the old scarecrow posts.",
    goal: "pop",
    target: 22,
    moves: 20,
    colors: 3,
    pattern: ["ABCCBAAB", "BCCAABB", "CCAABBAA", "CAABBAA", "ABBAACCB"],
    twoStarMoves: 3,
    threeStarMoves: 8,
  }),
  makeLevel({
    id: 3,
    chapter: 1,
    name: "Tangled Vines",
    story: "Break through the stones blocking the field.",
    goal: "stones",
    target: 4,
    moves: 18,
    colors: 3,
    pattern: ["AAB#CCAA", "ABB#CAA", "BBCC#ABB", "BCCA#BB"],
    twoStarMoves: 3,
    threeStarMoves: 7,
  }),
  makeLevel({
    id: 4,
    chapter: 1,
    name: "The Red Sash",
    story: "Clear the cursed bubbles before they spread.",
    goal: "curses",
    target: 5,
    moves: 20,
    colors: 3,
    pattern: ["AAbbCCAA", "ABbCCAA", "BBCcAABB", "BcCAABB", "ABBAACCB"],
    twoStarMoves: 3,
    threeStarMoves: 8,
  }),
  makeLevel({
    id: 5,
    chapter: 1,
    name: "Lantern Hollow",
    story: "Clear every last bubble from the hollow.",
    goal: "clear",
    target: 0,
    moves: 26,
    colors: 3,
    pattern: ["AABBCCAA", "ABBCCAA", "BBCCAABB", "BCCAABB", "CCAABBCC"],
    twoStarMoves: 4,
    threeStarMoves: 9,
  }),
  makeLevel({
    id: 6,
    chapter: 2,
    name: "Witchwood Gate",
    story: "The forest has learned to hide its colors.",
    goal: "pop",
    target: 28,
    moves: 22,
    colors: 4,
    pattern: ["AABBCCDD", "ABBCCDD", "BBCCDDaa", "BCCDDaa", "CCDDaaBB"],
    twoStarMoves: 4,
    threeStarMoves: 9,
  }),
  makeLevel({
    id: 7,
    chapter: 2,
    name: "Briar Bridge",
    story: "Knock the stones loose to reach the other side.",
    goal: "stones",
    target: 7,
    moves: 24,
    colors: 4,
    pattern: ["AA##CCDD", "AB##CDD", "BBCC##DD", "BCC##DD", "CCDD##AA"],
    twoStarMoves: 4,
    threeStarMoves: 10,
  }),
  makeLevel({
    id: 8,
    chapter: 2,
    name: "The Lost Scarf",
    story: "Free the family from the witchlight curse.",
    goal: "curses",
    target: 8,
    moves: 24,
    colors: 4,
    pattern: ["AAbbCCDD", "ABbCCDD", "BBcCDDaa", "BcCDDaa", "CCDDaaBB"],
    twoStarMoves: 4,
    threeStarMoves: 10,
  }),
  makeLevel({
    id: 9,
    chapter: 2,
    name: "Moonlit Clearing",
    story: "Use the narrow gaps to drop the hanging clusters.",
    goal: "pop",
    target: 34,
    moves: 24,
    colors: 4,
    pattern: ["AABBCCDD", "A.BCCDD", "BBCCDD..", ".CCDD.A", "CCDDABBA"],
    twoStarMoves: 4,
    threeStarMoves: 10,
  }),
  makeLevel({
    id: 10,
    chapter: 2,
    name: "Witchwood Heart",
    story: "Clear the heart of the forest.",
    goal: "clear",
    target: 0,
    moves: 32,
    colors: 4,
    pattern: ["AABBCCDD", "ABBCCDD", "BBCCDDAA", "BCCDDAB", "CCDDAABB"],
    twoStarMoves: 5,
    threeStarMoves: 12,
  }),
  makeLevel({
    id: 11,
    chapter: 3,
    name: "Millstream",
    story: "The mill wheel is turning the bubbles loose.",
    goal: "stones",
    target: 6,
    moves: 26,
    colors: 4,
    pattern: ["AA#BCCDD", "AB#CCDD", "BBCC#DDA", "BCC#DDA", "CCDD#AAB", "CDD#AAB"],
    twoStarMoves: 4,
    threeStarMoves: 11,
  }),
  makeLevel({
    id: 12,
    chapter: 3,
    name: "The Long Night",
    story: "Keep the curse from reaching the family.",
    goal: "curses",
    target: 12,
    moves: 28,
    colors: 4,
    pattern: ["AAbbCCDD", "ABbCCDD", "BBcCDDaa", "BcCDDaa", "CCDDaaBB", "CDDaaBB"],
    twoStarMoves: 4,
    threeStarMoves: 11,
  }),
  makeLevel({
    id: 13,
    chapter: 3,
    name: "Harvest Storm",
    story: "Break the storm before the final field.",
    goal: "pop",
    target: 42,
    moves: 28,
    colors: 4,
    pattern: ["AABBCCDD", "ABBCCDD", "BBCCDDAA", "BCCDDAA", "CCDDAABB", "DDAABBC"],
    twoStarMoves: 4,
    threeStarMoves: 12,
  }),
  makeLevel({
    id: 14,
    chapter: 3,
    name: "Family Fire",
    story: "Bring every lantern back to the farmhouse.",
    goal: "clear",
    target: 0,
    moves: 36,
    colors: 4,
    pattern: ["AABBCCDD", "ABBCCDD", "BBCCDDAA", "BCCDDAA", "CCDDAABB", "DDAABBC", "AABBCCDD"],
    twoStarMoves: 5,
    threeStarMoves: 14,
  }),
  makeLevel({
    id: 15,
    chapter: 3,
    name: "Nightmare Heart",
    story: "Stand together and end the nightmare.",
    goal: "curses",
    target: 14,
    moves: 34,
    colors: 4,
    pattern: ["AAbbCCDD", "ABbCCDD", "BBcCDDaa", "BcCDDaa", "CCDDaaBB", "CDDaaBB", "DDAAbbCC"],
    twoStarMoves: 5,
    threeStarMoves: 13,
  }),
];

const PALETTE = Object.keys(BUBBLE_COLORS) as BubbleColor[];
const MAX_ROWS = 14;

export function getLevel(levelId: number): Level {
  return LEVELS.find((level) => level.id === levelId) ?? LEVELS[0];
}

export function columnsInRow(row: number): number {
  return row % 2 === 0 ? 8 : 7;
}

export function cellCenter(
  cell: Cell,
  boardWidth: number,
  diameter: number,
): Point {
  return {
    x:
      (boardWidth - diameter * 8) / 2 +
      diameter / 2 +
      cell.col * diameter +
      (cell.row % 2 ? diameter / 2 : 0),
    y: diameter / 2 + cell.row * diameter * 0.86,
  };
}

export function neighborsOf(cell: Cell): Cell[] {
  const neighbors: Cell[] = [];
  for (const col of [cell.col - 1, cell.col + 1]) {
    if (col >= 0 && col < columnsInRow(cell.row)) {
      neighbors.push({ row: cell.row, col });
    }
  }

  const verticalColumns =
    cell.row % 2 === 0
      ? [cell.col - 1, cell.col]
      : [cell.col, cell.col + 1];
  for (const row of [cell.row - 1, cell.row + 1]) {
    if (row < 0 || row >= MAX_ROWS) continue;
    for (const col of verticalColumns) {
      if (col >= 0 && col < columnsInRow(row)) {
        neighbors.push({ row, col });
      }
    }
  }
  return neighbors;
}

function keyFor(cell: Cell): string {
  return `${cell.row}:${cell.col}`;
}

function parsePatternCell(
  mark: string,
  level: Level,
  row: number,
  col: number,
): Omit<Bubble, "id" | "row" | "col"> | null {
  if (mark === "." || !mark) return null;
  if (mark === "#") {
    return {
      color: PALETTE[(row * 3 + col + level.id) % level.colors],
      kind: "stone",
    };
  }

  const letter = mark.toUpperCase();
  const colorIndex = "ABCD".indexOf(letter);
  if (colorIndex < 0 || colorIndex >= level.colors) {
    throw new Error(`Invalid board mark "${mark}" in level ${level.id}.`);
  }
  return {
    color: PALETTE[colorIndex],
    kind: mark !== letter ? "cursed" : "normal",
  };
}

export function createLevelBoard(levelId: number): Bubble[] {
  const level = getLevel(levelId);
  const board: Bubble[] = [];
  for (let row = 0; row < level.pattern.length; row += 1) {
    const width = columnsInRow(row);
    const pattern = level.pattern[row];
    if (pattern.length > width) {
      throw new Error(`Level ${level.id} row ${row} exceeds its board width.`);
    }
    for (let col = 0; col < width; col += 1) {
      const parsed = parsePatternCell(pattern[col] ?? ".", level, row, col);
      if (!parsed) continue;
      board.push({ id: `level-${level.id}-${row}-${col}`, row, col, ...parsed });
    }
  }
  return board;
}

export function randomColor(colorCount: number): BubbleColor {
  const available = PALETTE.slice(0, Math.max(1, Math.min(colorCount, PALETTE.length)));
  return available[Math.floor(Math.random() * available.length)];
}

function connectedGroup(
  bubbles: Bubble[],
  start: Cell,
  color: BubbleColor,
): Bubble[] {
  const byCell = new Map(bubbles.map((bubble) => [keyFor(bubble), bubble]));
  const startBubble = byCell.get(keyFor(start));
  if (!startBubble || startBubble.kind === "stone" || startBubble.color !== color) {
    return [];
  }

  const queue = [start];
  const visited = new Set([keyFor(start)]);
  const group: Bubble[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const bubble = byCell.get(keyFor(current));
    if (!bubble || bubble.kind === "stone" || bubble.color !== color) continue;
    group.push(bubble);
    for (const next of neighborsOf(current)) {
      const key = keyFor(next);
      const neighbor = byCell.get(key);
      if (!visited.has(key) && neighbor && neighbor.kind !== "stone" && neighbor.color === color) {
        visited.add(key);
        queue.push(next);
      }
    }
  }
  return group;
}

function dropUnsupported(bubbles: Bubble[]): {
  kept: Bubble[];
  dropped: Bubble[];
} {
  const byCell = new Map(bubbles.map((bubble) => [keyFor(bubble), bubble]));
  const supported = new Set<string>();
  const queue = bubbles
    .filter((bubble) => bubble.row === 0)
    .map(({ row, col }) => ({ row, col }));

  while (queue.length > 0) {
    const current = queue.shift()!;
    const key = keyFor(current);
    if (supported.has(key) || !byCell.has(key)) continue;
    supported.add(key);
    for (const next of neighborsOf(current)) {
      const nextKey = keyFor(next);
      if (byCell.has(nextKey) && !supported.has(nextKey)) queue.push(next);
    }
  }

  return {
    kept: bubbles.filter((bubble) => supported.has(keyFor(bubble))),
    dropped: bubbles.filter((bubble) => !supported.has(keyFor(bubble))),
  };
}

function chooseWildColor(bubbles: Bubble[], landing: Cell): BubbleColor {
  const byCell = new Map(bubbles.map((bubble) => [keyFor(bubble), bubble]));
  const counts = new Map<BubbleColor, number>();
  for (const cell of neighborsOf(landing)) {
    const bubble = byCell.get(keyFor(cell));
    if (bubble && bubble.kind !== "stone") {
      counts.set(bubble.color, (counts.get(bubble.color) ?? 0) + 1);
    }
  }
  if (counts.size === 0) {
    for (const bubble of bubbles) {
      if (bubble.kind !== "stone") {
        counts.set(bubble.color, (counts.get(bubble.color) ?? 0) + 1);
      }
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? PALETTE[0];
}

export interface ShotResult {
  bubbles: Bubble[];
  matched: boolean;
  removed: Bubble[];
  dropped: Bubble[];
  clearedCurses: number;
  stonesCleared: number;
  chainLength: number;
}

function emptyResult(bubbles: Bubble[]): ShotResult {
  return {
    bubbles,
    matched: false,
    removed: [],
    dropped: [],
    clearedCurses: 0,
    stonesCleared: 0,
    chainLength: 0,
  };
}

function resolveRemoval(bubbles: Bubble[], primary: Bubble[]): ShotResult {
  const removedIds = new Set(primary.map((bubble) => bubble.id));
  const removedCells = new Set(primary.map((bubble) => keyFor(bubble)));
  const adjacentStones = bubbles.filter(
    (bubble) =>
      bubble.kind === "stone" &&
      !removedIds.has(bubble.id) &&
      neighborsOf(bubble).some((cell) => removedCells.has(keyFor(cell))),
  );
  for (const stone of adjacentStones) removedIds.add(stone.id);

  const remaining = bubbles.filter((bubble) => !removedIds.has(bubble.id));
  const { kept, dropped } = dropUnsupported(remaining);
  const removed = [...primary, ...adjacentStones, ...dropped];
  return {
    bubbles: kept,
    matched: primary.length > 0,
    removed,
    dropped,
    clearedCurses: removed.filter((bubble) => bubble.kind === "cursed").length,
    stonesCleared: removed.filter((bubble) => bubble.kind === "stone").length,
    chainLength: dropped.length > 0 ? 1 : 0,
  };
}

export function resolveShot(
  bubbles: Bubble[],
  color: BubbleColor,
  landing: Cell,
  wild = false,
): ShotResult {
  if (
    bubbles.some((bubble) => bubble.row === landing.row && bubble.col === landing.col) ||
    landing.row < 0 ||
    landing.row >= MAX_ROWS ||
    landing.col < 0 ||
    landing.col >= columnsInRow(landing.row)
  ) {
    return emptyResult(bubbles);
  }

  const shot: Bubble = {
    id: `shot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    row: landing.row,
    col: landing.col,
    color: wild ? chooseWildColor(bubbles, landing) : color,
    kind: "normal",
  };
  const attached = [...bubbles, shot];
  const group = connectedGroup(attached, landing, shot.color);
  if (group.length < 3) {
    return {
      ...emptyResult(attached),
    };
  }
  return resolveRemoval(attached, group);
}

export function resolveSwap(
  bubbles: Bubble[],
  first: Cell,
  second: Cell,
): ShotResult {
  if (!neighborsOf(first).some((cell) => cell.row === second.row && cell.col === second.col)) {
    return emptyResult(bubbles);
  }

  const firstIndex = bubbles.findIndex(
    (bubble) => bubble.row === first.row && bubble.col === first.col,
  );
  const secondIndex = bubbles.findIndex(
    (bubble) => bubble.row === second.row && bubble.col === second.col,
  );
  if (firstIndex < 0 || secondIndex < 0) return emptyResult(bubbles);

  const firstBubble = bubbles[firstIndex];
  const secondBubble = bubbles[secondIndex];
  if (
    firstBubble.kind === "stone" ||
    secondBubble.kind === "stone" ||
    firstBubble.color === secondBubble.color
  ) {
    return emptyResult(bubbles);
  }

  const swapped = bubbles.map((bubble, index) => {
    if (index === firstIndex) {
      return { ...bubble, row: second.row, col: second.col };
    }
    if (index === secondIndex) {
      return { ...bubble, row: first.row, col: first.col };
    }
    return bubble;
  });
  const groups = [
    connectedGroup(swapped, first, secondBubble.color),
    connectedGroup(swapped, second, firstBubble.color),
  ].filter((group) => group.length >= 3);
  if (groups.length === 0) return emptyResult(bubbles);

  const ids = new Set(groups.flat().map((bubble) => bubble.id));
  return resolveRemoval(
    swapped,
    swapped.filter((bubble) => ids.has(bubble.id)),
  );
}

export function removeLowestRow(bubbles: Bubble[]): ShotResult {
  if (bubbles.length === 0) return emptyResult(bubbles);
  const lowestRow = Math.max(...bubbles.map((bubble) => bubble.row));
  const removed = bubbles.filter((bubble) => bubble.row === lowestRow);
  return resolveRemoval(bubbles, removed);
}

export function blastLargestCluster(bubbles: Bubble[]): ShotResult {
  let largest: Bubble[] = [];
  const visited = new Set<string>();
  for (const bubble of bubbles) {
    if (bubble.kind === "stone" || visited.has(bubble.id)) continue;
    const group = connectedGroup(bubbles, { row: bubble.row, col: bubble.col }, bubble.color);
    for (const member of group) visited.add(member.id);
    if (group.length > largest.length) largest = group;
  }
  if (largest.length === 0) return emptyResult(bubbles);
  return resolveRemoval(bubbles, largest);
}

function nearestOpenCell(
  bubbles: Bubble[],
  candidates: Cell[],
  point: Point,
  width: number,
  diameter: number,
): Cell | null {
  const occupied = new Set(bubbles.map((bubble) => keyFor(bubble)));
  const open = candidates.filter(
    (cell) => cell.row < MAX_ROWS && !occupied.has(keyFor(cell)),
  );
  if (open.length === 0) return null;
  return open.sort((first, second) => {
    const a = cellCenter(first, width, diameter);
    const b = cellCenter(second, width, diameter);
    return Math.hypot(a.x - point.x, a.y - point.y) - Math.hypot(b.x - point.x, b.y - point.y);
  })[0];
}

function cellsAround(bubble: Bubble): Cell[] {
  const candidates = neighborsOf(bubble);
  for (let row = bubble.row + 1; row < Math.min(bubble.row + 4, MAX_ROWS); row += 1) {
    for (let col = 0; col < columnsInRow(row); col += 1) {
      candidates.push({ row, col });
    }
  }
  return candidates;
}

export interface AimResult {
  path: Point[];
  landing: Cell | null;
}

export function traceAim(
  bubbles: Bubble[],
  width: number,
  height: number,
  diameter: number,
  target: Point,
): AimResult {
  const radius = diameter / 2;
  const origin = { x: width / 2, y: height - diameter * 1.55 };
  let dx = target.x - origin.x;
  let dy = target.y - origin.y;
  if (dy > -1) dy = -Math.max(Math.abs(dx) * 0.32, 1);
  const length = Math.hypot(dx, dy) || 1;
  let vx = dx / length;
  const vy = dy / length;
  let x = origin.x;
  let y = origin.y;
  const step = Math.max(2, diameter / 12);
  const path: Point[] = [origin];

  for (let index = 1; index <= 1800; index += 1) {
    x += vx * step;
    y += vy * step;
    if (x < radius) {
      x = radius;
      vx = Math.abs(vx);
    } else if (x > width - radius) {
      x = width - radius;
      vx = -Math.abs(vx);
    }
    if (index % 5 === 0) path.push({ x, y });

    if (y <= radius) {
      const topCells = Array.from({ length: columnsInRow(0) }, (_, col) => ({
        row: 0,
        col,
      }));
      return {
        path: [...path, { x, y: radius }],
        landing: nearestOpenCell(bubbles, topCells, { x, y: radius }, width, diameter),
      };
    }

    const hit = bubbles.find((bubble) => {
      const center = cellCenter(bubble, width, diameter);
      return Math.hypot(center.x - x, center.y - y) < diameter * 0.91;
    });
    if (hit) {
      return {
        path: [...path, { x, y }],
        landing: nearestOpenCell(bubbles, cellsAround(hit), { x, y }, width, diameter),
      };
    }
    if (y >= origin.y) break;
  }
  return { path, landing: null };
}

export function goalProgress(
  level: Level,
  bubbles: Bubble[],
  poppedCount: number,
  clearedCurses: number,
  stonesCleared: number,
): number {
  if (level.goal === "pop") return Math.min(poppedCount, level.target);
  if (level.goal === "curses") return Math.min(clearedCurses, level.target);
  if (level.goal === "stones") return Math.min(stonesCleared, level.target);
  return Math.max(0, bubbles.length);
}

export function isGoalComplete(
  level: Level,
  bubbles: Bubble[],
  poppedCount: number,
  clearedCurses: number,
  stonesCleared: number,
): boolean {
  if (level.goal === "pop") return poppedCount >= level.target;
  if (level.goal === "curses") return clearedCurses >= level.target;
  if (level.goal === "stones") return stonesCleared >= level.target;
  return bubbles.length === 0;
}
