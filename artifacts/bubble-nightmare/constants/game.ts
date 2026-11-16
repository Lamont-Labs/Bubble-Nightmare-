export const NIGHT_COLORS = {
  ink: "#171B1B",
  deep: "#1D2422",
  field: "#252D2A",
  panel: "#303A36",
  border: "#485149",
  paper: "#F7E9D1",
  muted: "#B2B8AA",
  amber: "#F4A653",
  ember: "#D87557",
  curse: "#362635",
  success: "#78BE9B",
  danger: "#E16B66",
} as const;

export const BUBBLE_GRADIENTS = {
  ember: ["#FFD27A", "#EA8446", "#9E3F33"],
  moss: ["#B2EDB9", "#65B884", "#28654F"],
  lilac: ["#E8C7FF", "#9B7DE2", "#5E4B9E"],
  rose: ["#FFC8BE", "#E87782", "#A43E53"],
} as const;

export const STONE_GRADIENT = ["#738078", NIGHT_COLORS.panel, "#19201E"] as const;
export const CURSE_GRADIENT = ["#82617E", NIGHT_COLORS.curse, "#211925"] as const;

export const FAMILY = [
  {
    key: "dad",
    name: "Dad",
    role: "BOTTOM ROW",
    power: "Clears the lowest row",
    portrait: require("../assets/images/characters/dad.jpg"),
  },
  {
    key: "mom",
    name: "Mom",
    role: "WILD SHOT",
    power: "Turns the next bubble wild",
    portrait: require("../assets/images/characters/mom.jpg"),
  },
  {
    key: "rabbit",
    name: "Rabbit",
    role: "THREE MORE MOVES",
    power: "Adds three moves",
    portrait: require("../assets/images/characters/rabbit-teen.jpg"),
  },
  {
    key: "pig",
    name: "Pig",
    role: "CLUSTER BLAST",
    power: "Blasts the largest cluster",
    portrait: require("../assets/images/characters/pig-teen.jpg"),
  },
] as const;

export type FamilyKey = (typeof FAMILY)[number]["key"];
