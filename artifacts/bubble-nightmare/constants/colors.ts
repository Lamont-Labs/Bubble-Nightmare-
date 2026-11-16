/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    text: "#f3ead5",
    tint: "#f59a49",
    background: "#101713",
    foreground: "#f3ead5",
    card: "#1c2821",
    cardForeground: "#f3ead5",
    primary: "#f59a49",
    primaryForeground: "#17100b",
    secondary: "#28362d",
    secondaryForeground: "#f3ead5",
    muted: "#26342b",
    mutedForeground: "#a5b3a3",
    accent: "#d56f53",
    accentForeground: "#fff4df",
    destructive: "#e05c61",
    destructiveForeground: "#fff7ed",
    border: "#35453a",
    input: "#35453a",
  },
  dark: {
    text: "#f3ead5",
    tint: "#f59a49",
    background: "#101713",
    foreground: "#f3ead5",
    card: "#1c2821",
    cardForeground: "#f3ead5",
    primary: "#f59a49",
    primaryForeground: "#17100b",
    secondary: "#28362d",
    secondaryForeground: "#f3ead5",
    muted: "#26342b",
    mutedForeground: "#a5b3a3",
    accent: "#d56f53",
    accentForeground: "#fff4df",
    destructive: "#e05c61",
    destructiveForeground: "#fff7ed",
    border: "#35453a",
    input: "#35453a",
  },

  radius: 18,
};

export default colors;
