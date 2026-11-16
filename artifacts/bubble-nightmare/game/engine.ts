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
  x: number;
  y: number;
  size: number;
  color: BubbleColor;
  kind: BubbleKind;
}

export interface Point {
  x: number;
  y: number;
}

const firstWave: Array<{ x: number; y: number; color: BubbleColor }> = [
  { x: 0.12, y: 58, color: "ember" },
  { x: 0.31, y: 58, color: "ember" },
  { x: 0.5, y: 58, color: "ember" },
  { x: 0.69, y: 58, color: "moss" },
  { x: 0.88, y: 58, color: "moss" },
  { x: 0.12, y: 126, color: "lilac" },
  { x: 0.31, y: 126, color: "lilac" },
  { x: 0.5, y: 126, color: "lilac" },
  { x: 0.69, y: 126, color: "rose" },
  { x: 0.88, y: 126, color: "rose" },
];

export function createFirstWave(width: number): Bubble[] {
  return firstWave.map((bubble, index) => ({
    id: `bubble-${index}`,
    x: width * bubble.x,
    y: bubble.y,
    size: 52,
    color: bubble.color,
    kind: "normal",
  }));
}

export function createFallingBubble(
  width: number,
  sequence: number,
  wave: number,
): Bubble {
  const palette = Object.keys(BUBBLE_COLORS) as BubbleColor[];
  const cursed = Math.random() < Math.min(0.12 + wave * 0.015, 0.24);
  const padding = 32;

  return {
    id: `bubble-${sequence}`,
    x: padding + Math.random() * Math.max(width - padding * 2, 1),
    y: 22,
    size: cursed ? 48 : 52,
    color: palette[Math.floor(Math.random() * palette.length)],
    kind: cursed ? "cursed" : "normal",
  };
}

function distanceToSegment(point: Point, start: Point, end: Point): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (dx === 0 && dy === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }

  const progress = Math.max(
    0,
    Math.min(
      1,
      ((point.x - start.x) * dx + (point.y - start.y) * dy) /
        (dx * dx + dy * dy),
    ),
  );
  return Math.hypot(
    point.x - (start.x + progress * dx),
    point.y - (start.y + progress * dy),
  );
}

export function bubblesTouchedBySwipe(
  bubbles: Bubble[],
  start: Point,
  end: Point,
): string[] {
  return bubbles
    .filter(
      (bubble) =>
        distanceToSegment({ x: bubble.x, y: bubble.y }, start, end) <=
        bubble.size * 0.58,
    )
    .map((bubble) => bubble.id);
}

export function matchingBubblesFromSwipe(
  bubbles: Bubble[],
  touchedIds: string[],
): { poppedIds: string[]; cursedHit: boolean } {
  const touched = bubbles.filter((bubble) => touchedIds.includes(bubble.id));
  const cursed = touched.filter((bubble) => bubble.kind === "cursed");
  if (cursed.length > 0) {
    return { poppedIds: cursed.map((bubble) => bubble.id), cursedHit: true };
  }

  const groups = new Map<BubbleColor, string[]>();
  for (const bubble of touched) {
    const group = groups.get(bubble.color) ?? [];
    group.push(bubble.id);
    groups.set(bubble.color, group);
  }

  const poppedIds = [...groups.values()]
    .filter((group) => group.length >= 3)
    .flat();
  return { poppedIds, cursedHit: false };
}

export function closestBubbles(bubbles: Bubble[], count: number): Bubble[] {
  return [...bubbles]
    .sort((first, second) => second.y - first.y)
    .slice(0, count);
}
