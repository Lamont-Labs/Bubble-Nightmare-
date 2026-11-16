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
    text: "#F7E9D1",
    tint: "#F4A653",
    background: "#171B1B",
    foreground: "#F7E9D1",
    card: "#232A28",
    cardForeground: "#F7E9D1",
    primary: "#F4A653",
    primaryForeground: "#27180E",
    secondary: "#303A36",
    secondaryForeground: "#F7E9D1",
    muted: "#2A3431",
    mutedForeground: "#B2B8AA",
    accent: "#D87557",
    accentForeground: "#FFF2DE",
    destructive: "#E16B66",
    destructiveForeground: "#FFF7ED",
    border: "#485149",
    input: "#485149",
  },
  dark: {
    text: "#F7E9D1",
    tint: "#F4A653",
    background: "#171B1B",
    foreground: "#F7E9D1",
    card: "#232A28",
    cardForeground: "#F7E9D1",
    primary: "#F4A653",
    primaryForeground: "#27180E",
    secondary: "#303A36",
    secondaryForeground: "#F7E9D1",
    muted: "#2A3431",
    mutedForeground: "#B2B8AA",
    accent: "#D87557",
    accentForeground: "#FFF2DE",
    destructive: "#E16B66",
    destructiveForeground: "#FFF7ED",
    border: "#485149",
    input: "#485149",
  },

  radius: 20,
};

export default colors;
