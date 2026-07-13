module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', "system-ui", "sans-serif"],
        heading: ['"Poppins"', '"Inter"', "sans-serif"],
        mono: ['"Roboto Mono"', "monospace"],
      },
      colors: {
        // Rent Ride brand: Vivid Orange (#ff531b) + Warm Amber + Warm Charcoal neutrals
        primary: {
          DEFAULT: "hsl(15, 100%, 55%)",
          foreground: "hsl(0, 0%, 100%)",
          hover: "hsl(15, 88%, 48%)",
          active: "hsl(15, 82%, 41%)",
        },
        secondary: {
          DEFAULT: "hsl(20, 100%, 95%)",
          foreground: "hsl(15, 75%, 38%)",
          hover: "hsl(22, 90%, 91%)",
          active: "hsl(24, 85%, 86%)",
        },
        tertiary: {
          DEFAULT: "hsl(0, 0%, 100%)",
          foreground: "hsl(24, 20%, 18%)",
        },
        accent: {
          DEFAULT: "hsl(38, 100%, 55%)",
          foreground: "hsl(24, 40%, 15%)",
          hover: "hsl(36, 95%, 50%)",
          active: "hsl(34, 90%, 45%)",
        },
        background: "hsl(30, 30%, 97%)",
        foreground: "hsl(24, 18%, 16%)",
        border: "hsl(28, 22%, 88%)",
        input: "hsl(28, 22%, 88%)",
        ring: "hsl(15, 100%, 55%)",
        card: {
          DEFAULT: "hsl(0, 0%, 100%)",
          foreground: "hsl(24, 18%, 16%)",
        },
        muted: {
          DEFAULT: "hsl(30, 20%, 94%)",
          foreground: "hsl(28, 8%, 45%)",
        },
        destructive: {
          DEFAULT: "hsl(0, 74%, 51%)",
          foreground: "hsl(0, 0%, 100%)",
        },
        success: {
          DEFAULT: "hsl(150, 60%, 39%)",
          foreground: "hsl(0, 0%, 100%)",
        },
        warning: {
          DEFAULT: "hsl(42, 96%, 53%)",
          foreground: "hsl(24, 40%, 13%)",
        },
        error: {
          DEFAULT: "hsl(0, 74%, 51%)",
          foreground: "hsl(0, 0%, 100%)",
        },
        info: {
          DEFAULT: "hsl(210, 80%, 52%)",
          foreground: "hsl(0, 0%, 100%)",
        },
        neutral: {
          50: "hsl(30, 30%, 98%)",
          100: "hsl(30, 22%, 95%)",
          200: "hsl(30, 16%, 89%)",
          300: "hsl(28, 13%, 79%)",
          400: "hsl(28, 10%, 63%)",
          500: "hsl(26, 9%, 48%)",
          600: "hsl(26, 11%, 38%)",
          700: "hsl(25, 14%, 28%)",
          800: "hsl(24, 18%, 19%)",
          900: "hsl(24, 22%, 12%)",
        },
        // Brand navy — site header & footer background (Rent Ride)
        navy: {
          DEFAULT: "hsl(220, 65%, 17%)",
          dark: "hsl(220, 68%, 12%)",
          light: "hsl(219, 42%, 27%)",
        },
        // Soft light-blue — section / card backgrounds that pair with navy
        azure: {
          DEFAULT: "hsl(210, 68%, 94%)",
          hover: "hsl(210, 60%, 89%)",
          dark: "hsl(210, 45%, 80%)",
        },
        "admin-sidebar": "hsl(24, 22%, 13%)",
        "admin-sidebar-foreground": "hsl(0, 0%, 100%)",
        "admin-sidebar-active": "hsl(15, 100%, 55%)",
        "admin-sidebar-hover": "hsl(24, 18%, 20%)",
      },
      backgroundImage: {
        "gradient-primary":
          "linear-gradient(135deg, hsl(15, 100%, 55%) 0%, hsl(8, 85%, 46%) 100%)",
        "gradient-secondary":
          "linear-gradient(135deg, hsl(20, 100%, 95%) 0%, hsl(30, 30%, 96%) 100%)",
        "gradient-accent":
          "linear-gradient(90deg, hsl(38, 100%, 55%) 0%, hsl(24, 95%, 52%) 100%)",
        "gradient-sunset":
          "linear-gradient(120deg, hsl(15, 100%, 55%) 0%, hsl(38, 100%, 55%) 100%)",
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "22px",
        "2xl": "28px",
        full: "9999px",
        DEFAULT: "12px",
      },
      boxShadow: {
        sm: "0 1px 3px hsl(24 30% 20% / 0.05)",
        md: "0 4px 12px hsl(24 30% 20% / 0.08)",
        lg: "0 8px 24px hsl(24 30% 20% / 0.10)",
        xl: "0 16px 40px hsl(24 30% 20% / 0.13)",
        "card-hover": "0 10px 28px hsl(24 30% 25% / 0.14)",
        "btn-primary": "0 6px 16px hsl(15 100% 50% / 0.32)",
      },
      transitionTimingFunction: {
        "ease-in": "cubic-bezier(0.4, 0, 1, 1)",
        "ease-out": "cubic-bezier(0, 0, 0.2, 1)",
        "ease-in-out": "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      transitionDuration: {
        fast: "150ms",
        normal: "250ms",
        slow: "400ms",
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out forwards",
        "slide-in": "slideIn 0.3s ease-out forwards",
        "count-up": "countUp 1s ease-out forwards",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideIn: {
          "0%": { opacity: "0", transform: "translateX(-12px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
};
