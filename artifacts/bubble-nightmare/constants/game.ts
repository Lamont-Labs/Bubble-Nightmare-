export const NIGHT_COLORS = {
  ink: "#101713",
  deep: "#17231c",
  field: "#1d3024",
  panel: "#24352a",
  border: "#40503c",
  paper: "#f3ead5",
  muted: "#a5b3a3",
  amber: "#f59a49",
  ember: "#d56f53",
  curse: "#30233c",
  success: "#69c49a",
  danger: "#e05c61",
} as const;

export const FAMILY = [
  {
    key: "dad",
    name: "Dad",
    role: "BULL CHARGE",
    power: "Clears the lowest bubbles",
    portrait: require("../assets/images/characters/dad.jpg"),
  },
  {
    key: "mom",
    name: "Mom",
    role: "STRAW STITCH",
    power: "Joins bubbles into a match",
    portrait: require("../assets/images/characters/mom.jpg"),
  },
  {
    key: "rabbit",
    name: "Rabbit",
    role: "NIGHT PAUSE",
    power: "Slows the nightmare",
    portrait: require("../assets/images/characters/rabbit-teen.jpg"),
  },
  {
    key: "pig",
    name: "Pig",
    role: "SNORT BLAST",
    power: "Bursts a bubble cluster",
    portrait: require("../assets/images/characters/pig-teen.jpg"),
  },
] as const;

export type FamilyKey = (typeof FAMILY)[number]["key"];
