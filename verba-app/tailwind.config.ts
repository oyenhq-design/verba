import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: "#FFFFFF",
          secondary: "#FAFAFA",
          editor: "#1A1A24",
          pale: "#F0F7FF", // Pale section blue
        },
        surface: {
          DEFAULT: "#FFFFFF",
          secondary: "#F3F4F6",
          editor: "#2A2A35",
          document: "#FFFFFF",
        },
        border: {
          DEFAULT: "#E4E7EC", // Border
          light: "#EAECF0", // Subtle border
          editor: "#3F3F4E",
        },
        foreground: {
          DEFAULT: "#111827", // Primary text
          secondary: "#475467", // Secondary text, slightly darker
          muted: "#98A2B3", // Muted
        },
        accent: {
          DEFAULT: "#1677FF", // Primary blue
          hover: "#0B6BEB", // Blue hover
          light: "#EAF3FF", // Soft blue
          veryLight: "#F3F8FF", // Very soft blue
          strong: "#0B6BFF", // Strong blue
        },
        ink: {
          DEFAULT: "#101828", // Dark button / Strong heading
          secondary: "#1F2937",
        },
        status: {
          success: "#12B76A", // Green
          successLight: "#ECFDF3", // Soft green
          info: "#1677FF",
          warning: "#FFF0C2", // Warm highlight
          error: "#EF4444"
        }
      },
    },
  },
  plugins: [],
};
export default config;
