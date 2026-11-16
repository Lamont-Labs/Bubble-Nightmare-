export const BUBBLE_COLORS = {
  ember: "#f6a24e",
  moss: "#69c49a",
  lilac: "#ad9bff",
  rose: "#ed7890",
} as const;

export type BubbleColor = keyof typeof BUBBLE_COLORS;
export type BubbleKind = "normal" | "cursed";

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
  name: string;
  goal: "pop" | "curses" | "clear";
  target: number;
  moves: number;
  rows: number;
  colors: number;
  curses: number;
}

export const LEVELS: Level[] = [
  {
    id: 1,
    name: "First Night",
    goal: "pop",
    target: 18,
    moves: 20,
    rows: 4,
    colors: 3,
    curses: 0,
  },
  {
    id: 2,
    name: "Harvest Moon",
    goal: "pop",
    target: 25,
    moves: 22,
    rows: 5,
    colors: 3,
    curses: 4,
  },
  {
    id: 3,
    name: "Witchlight",
    goal: "curses",
    target: 6,
    moves: 24,
    rows: 6,
    colors: 4,
    curses: 6,
  },
  {
    id: 4,
    name: "The Old Orchard",
    goal: "clear",
    target: 0,
    moves: 28,
    rows: 6,
    colors: 4,
    curses: 4,
  },
  {
    id: 5,
    name: "Nightmare Heart",
    goal: "pop",
    target: 42,
    moves: 30,
    rows: 7,
    colors: 4,
    curses: 8,
  },
];

const ALL_COLORS = Object.keys(BUBBLE_COLORS) as BubbleColor[];
const MAX_ROWS = 12;

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
    x: diameter / 2 + cell.col * diameter + (cell.row % 2 ? diameter / 2 : 0),
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

  const upperLowerCols =
    cell.row % 2 === 0
      ? [cell.col - 1, cell.col]
      : [cell.col, cell.col + 1];
  for (const row of [cell.row - 1, cell.row + 1]) {
    if (row < 0 || row >= MAX_ROWS) continue;
    for (const col of upperLowerCols) {
      if (col >= 0 && col < columnsInRow(row)) {
        neighbors.push({ row, col });
      }
    }
  }
  return neighbors;
}

export function createLevelBoard(levelId: number): Bubble[] {
  const level = getLevel(levelId);
  const palette = ALL_COLORS.slice(0, level.colors);
  const curseCells = new Set<string>();
  for (let index = 0; index < level.curses; index += 1) {
    const row = 1 + ((index * 2) % Math.max(level.rows - 1, 1));
    const col = (index * 3 + 1) % columnsInRow(row);
    curseCells.add(`${row}:${col}`);
  }

  const board: Bubble[] = [];
  for (let row = 0; row < level.rows; row += 1) {
    for (let col = 0; col < columnsInRow(row); col += 1) {
      const color = palette[(Math.floor(col / 2) + row) % palette.length];
      board.push({
        id: `level-${level.id}-${row}-${col}`,
        row,
        col,
        color,
        kind: curseCells.has(`${row}:${col}`) ? "cursed" : "normal",
      });
    }
  }
  return board;
}

export function randomColor(colorCount: number): BubbleColor {
  const available = ALL_COLORS.slice(0, Math.max(1, Math.min(colorCount, 4)));
  return available[Math.floor(Math.random() * available.length)];
}

function cellKey(cell: Cell): string {
  return `${cell.row}:${cell.col}`;
}

function connectedGroup(
  bubbles: Bubble[],
  start: Cell,
  color: BubbleColor,
): Bubble[] {
  const byCell = new Map(bubbles.map((bubble) => [cellKey(bubble), bubble]));
  const first = byCell.get(cellKey(start));
  if (!first || first.color !== color) return [];

  const queue: Cell[] = [start];
  const visited = new Set<string>([cellKey(start)]);
  const group: Bubble[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const bubble = byCell.get(cellKey(current));
    if (!bubble || bubble.color !== color) continue;
    group.push(bubble);
    for (const next of neighborsOf(current)) {
      const key = cellKey(next);
      if (visited.has(key)) continue;
      const neighbor = byCell.get(key);
      if (neighbor?.color === color) {
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
  const byCell = new Map(bubbles.map((bubble) => [cellKey(bubble), bubble]));
  const supported = new Set<string>();
  const queue: Cell[] = bubbles
    .filter((bubble) => bubble.row === 0)
    .map((bubble) => ({ row: bubble.row, col: bubble.col }));

  while (queue.length > 0) {
    const current = queue.shift()!;
    const key = cellKey(current);
    if (supported.has(key) || !byCell.has(key)) continue;
    supported.add(key);
    for (const next of neighborsOf(current)) {
      const nextKey = cellKey(next);
      if (byCell.has(nextKey) && !supported.has(nextKey)) queue.push(next);
    }
  }

  const kept = bubbles.filter((bubble) => supported.has(cellKey(bubble)));
  const dropped = bubbles.filter((bubble) => !supported.has(cellKey(bubble)));
  return { kept, dropped };
}

function chooseWildColor(bubbles: Bubble[], landing: Cell): BubbleColor {
  const byCell = new Map(bubbles.map((bubble) => [cellKey(bubble), bubble]));
  const counts = new Map<BubbleColor, number>();
  for (const cell of neighborsOf(landing)) {
    const bubble = byCell.get(cellKey(cell));
    if (bubble) counts.set(bubble.color, (counts.get(bubble.color) ?? 0) + 1);
  }
  if (counts.size === 0) {
    for (const bubble of bubbles) {
      counts.set(bubble.color, (counts.get(bubble.color) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort((first, second) => second[1] - first[1])[0]
    ?.[0] ?? ALL_COLORS[0];
}

export interface ShotResult {
  bubbles: Bubble[];
  matched: boolean;
  removed: Bubble[];
  dropped: Bubble[];
  clearedCurses: number;
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
    return { bubbles, matched: false, removed: [], dropped: [], clearedCurses: 0 };
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
      bubbles: attached,
      matched: false,
      removed: [],
      dropped: [],
      clearedCurses: 0,
    };
  }

  const groupIds = new Set(group.map((bubble) => bubble.id));
  const remaining = attached.filter((bubble) => !groupIds.has(bubble.id));
  const { kept, dropped } = dropUnsupported(remaining);
  const removed = [...group, ...dropped];
  return {
    bubbles: kept,
    matched: true,
    removed,
    dropped,
    clearedCurses: removed.filter((bubble) => bubble.kind === "cursed").length,
  };
}

export function removeLowestRow(bubbles: Bubble[]): ShotResult {
  if (bubbles.length === 0) {
    return { bubbles, matched: false, removed: [], dropped: [], clearedCurses: 0 };
  }
  const lowestRow = Math.max(...bubbles.map((bubble) => bubble.row));
  const removed = bubbles.filter((bubble) => bubble.row === lowestRow);
  const remaining = bubbles.filter((bubble) => bubble.row !== lowestRow);
  const { kept, dropped } = dropUnsupported(remaining);
  const allRemoved = [...removed, ...dropped];
  return {
    bubbles: kept,
    matched: true,
    removed: allRemoved,
    dropped,
    clearedCurses: allRemoved.filter((bubble) => bubble.kind === "cursed").length,
  };
}

export function blastLargestCluster(bubbles: Bubble[]): ShotResult {
  let largest: Bubble[] = [];
  const visited = new Set<string>();
  for (const bubble of bubbles) {
    if (visited.has(bubble.id)) continue;
    const group = connectedGroup(
      bubbles,
      { row: bubble.row, col: bubble.col },
      bubble.color,
    );
    for (const member of group) visited.add(member.id);
    if (group.length > largest.length) largest = group;
  }
  if (largest.length === 0) {
    return { bubbles, matched: false, removed: [], dropped: [], clearedCurses: 0 };
  }

  const ids = new Set(largest.map((bubble) => bubble.id));
  const remaining = bubbles.filter((bubble) => !ids.has(bubble.id));
  const { kept, dropped } = dropUnsupported(remaining);
  const allRemoved = [...largest, ...dropped];
  return {
    bubbles: kept,
    matched: true,
    removed: allRemoved,
    dropped,
    clearedCurses: allRemoved.filter((bubble) => bubble.kind === "cursed").length,
  };
}

export interface AimResult {
  path: Point[];
  landing: Cell | null;
}

function nearestOpenCell(
  bubbles: Bubble[],
  candidates: Cell[],
  point: Point,
  width: number,
  diameter: number,
): Cell | null {
  const occupied = new Set(bubbles.map((bubble) => cellKey(bubble)));
  const open = candidates.filter(
    (cell) => cell.row < MAX_ROWS && !occupied.has(cellKey(cell)),
  );
  if (open.length === 0) return null;
  return open.sort((first, second) => {
    const firstPoint = cellCenter(first, width, diameter);
    const secondPoint = cellCenter(second, width, diameter);
    return (
      Math.hypot(firstPoint.x - point.x, firstPoint.y - point.y) -
      Math.hypot(secondPoint.x - point.x, secondPoint.y - point.y)
    );
  })[0];
}

function cellCandidatesAround(bubble: Bubble): Cell[] {
  const candidates = neighborsOf({ row: bubble.row, col: bubble.col });
  for (let row = bubble.row + 1; row < Math.min(bubble.row + 4, MAX_ROWS); row += 1) {
    for (let col = 0; col < columnsInRow(row); col += 1) {
      candidates.push({ row, col });
    }
  }
  return candidates;
}

export function traceAim(
  bubbles: Bubble[],
  width: number,
  height: number,
  diameter: number,
  target: Point,
): AimResult {
  const radius = diameter / 2;
  const origin = { x: width / 2, y: height - radius * 1.25 };
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

  for (let index = 1; index <= 1600; index += 1) {
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
      const candidates = Array.from({ length: columnsInRow(0) }, (_, col) => ({
        row: 0,
        col,
      }));
      const landing = nearestOpenCell(
        bubbles,
        candidates,
        { x, y: radius },
        width,
        diameter,
      );
      return { path: [...path, { x, y: radius }], landing };
    }

    const hit = bubbles.find((bubble) => {
      const center = cellCenter(bubble, width, diameter);
      return Math.hypot(center.x - x, center.y - y) < diameter * 0.91;
    });
    if (hit) {
      const landing = nearestOpenCell(
        bubbles,
        cellCandidatesAround(hit),
        { x, y },
        width,
        diameter,
      );
      return { path: [...path, { x, y }], landing };
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
): number {
  if (level.goal === "pop") return Math.min(poppedCount, level.target);
  if (level.goal === "curses") return Math.min(clearedCurses, level.target);
  return Math.max(0, level.target === 0 ? bubbles.length : level.target);
}

export function isGoalComplete(
  level: Level,
  bubbles: Bubble[],
  poppedCount: number,
  clearedCurses: number,
): boolean {
  if (level.goal === "pop") return poppedCount >= level.target;
  if (level.goal === "curses") return clearedCurses >= level.target;
  return bubbles.length === 0;
}
