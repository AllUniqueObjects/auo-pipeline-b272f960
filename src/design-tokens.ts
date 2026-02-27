// src/design-tokens.ts
// Single source of truth for AUO design system

export const colors = {
  // Backgrounds
  bg: {
    dark: "#0A0A0A",
    light: "#FFFFFF",
    surface: "#F5F5F5",
    card: {
      dark: "#1A1A1A",
      light: "#FFFFFF",
    },
  },

  // Text
  text: {
    primary: {
      dark: "#FFFFFF",
      light: "#111111",
    },
    secondary: {
      dark: "rgba(255,255,255,0.6)",
      light: "#666666",
    },
    muted: {
      dark: "rgba(255,255,255,0.35)",
      light: "#999999",
    },
  },

  // Urgency tones
  tone: {
    breaking: {
      bg: "rgba(220,38,38,0.9)",
      text: "#FFFFFF",
      border: "rgba(220,38,38,0.4)",
      overlay: "rgba(180,0,0,0.25)",
    },
    actNow: {
      bg: "rgba(220,38,38,0.85)",
      text: "#FFFFFF",
    },
    watch: {
      bg: "rgba(217,119,6,0.85)",
      text: "#FFFFFF",
    },
  },

  // Accents
  accent: {
    amber: "#D97706",
    amberLight: "rgba(217,119,6,0.12)",
    amberHover: "rgba(217,119,6,0.25)",
  },

  evidence: {
    strong: "#22C55E",
    moderate: "#D97706",
    weak: "#EF4444",
  },

  // Borders
  border: {
    dark: "rgba(255,255,255,0.08)",
    light: "rgba(0,0,0,0.08)",
    medium: "rgba(0,0,0,0.15)",
  },
} as const;

export const typography = {
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",

  size: {
    xs: "11px",
    sm: "12px",
    base: "13px",
    md: "14px",
    lg: "16px",
    xl: "20px",
    "2xl": "24px",
    "3xl": "28px",
    "4xl": "36px",
  },

  weight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.65,
    loose: 1.75,
  },

  letterSpacing: {
    tight: "-0.02em",
    normal: "0em",
    wide: "0.06em",
    wider: "0.08em",
  },
} as const;

export const spacing = {
  "1": "4px",
  "2": "8px",
  "3": "12px",
  "4": "16px",
  "5": "20px",
  "6": "24px",
  "8": "32px",
  "10": "40px",
  "12": "48px",
} as const;

export const radius = {
  sm: "6px",
  md: "10px",
  lg: "14px",
  xl: "20px",
  full: "9999px",
} as const;

export const transition = {
  fast: "all 0.12s ease",
  base: "all 0.18s ease",
  slow: "all 0.25s ease",
} as const;

export const shadow = {
  sm: "0 1px 3px rgba(0,0,0,0.08)",
  md: "0 4px 12px rgba(0,0,0,0.1)",
  lg: "0 8px 24px rgba(0,0,0,0.12)",
} as const;

export const pillStyle = (active: boolean, hovered: boolean) => ({
  padding: "6px 14px",
  borderRadius: radius.full,
  border: "1px solid",
  borderColor: active
    ? "transparent"
    : hovered
    ? "rgba(0,0,0,0.2)"
    : colors.border.medium,
  background: active ? "#111" : hovered ? "rgba(0,0,0,0.04)" : "transparent",
  color: active ? "#fff" : hovered ? "#333" : "#555",
  fontSize: typography.size.base,
  fontWeight: typography.weight.medium,
  cursor: "pointer" as const,
  transition: transition.base,
  fontFamily: typography.fontFamily,
});
