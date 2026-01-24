import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Forvis Mazars color palette
        forvis: {
          blue: {
            50: '#EBF2FA',
            100: '#D6E4F5',
            200: '#ADC9EB',
            300: '#84AEE1',
            400: '#5B93D7',
            500: '#2E5AAC', // Primary Forvis Mazars Blue
            600: '#25488A',
            700: '#1C3667',
            800: '#132445',
            900: '#0A1222',
          },
          gray: {
            50: '#F8F9FA',
            100: '#F1F3F5',
            200: '#E9ECEF',
            300: '#DEE2E6',
            400: '#CED4DA',
            500: '#ADB5BD',
            600: '#6C757D',
            700: '#495057',
            800: '#343A40',
            900: '#212529',
          },
          success: {
            50: '#E8F3F1',
            100: '#C8E3DF',
            200: '#A0CFC8',
            300: '#71B5AA',
            400: '#4E9B8E',
            500: '#3A7F73', // Base success teal (darker, more saturated)
            600: '#2F6A5F',
            700: '#27574F',
            800: '#1F4540',
            900: '#163530',
          },
          error: {
            50: '#F7EBF0',
            100: '#EDCED9',
            200: '#DFA8B8',
            300: '#CD7B91',
            400: '#B8546E',
            500: '#9F3B56', // Base error burgundy (darker, more saturated)
            600: '#872F48',
            700: '#6F263B',
            800: '#581E2F',
            900: '#421624',
          },
          warning: {
            50: '#F8F3E8',
            100: '#EFE3C8',
            200: '#E3CFA0',
            300: '#D4B571',
            400: '#C09B4E',
            500: '#A8803A', // Base warning amber (darker, more saturated)
            600: '#8F6A2F',
            700: '#765727',
            800: '#5E451F',
            900: '#473418',
          },
          dataViz: {
            primary: '#2E5AAC',    // Forvis Blue (main data series)
            secondary: '#3F74C6',  // Refined mid-blue (secondary series)
            tertiary: '#2C5A8A',   // Slate-blue (tertiary series)
            success: '#2F6A5F',    // Success Teal (positive metrics) - updated to match success-600
            warning: '#A8803A',    // Warning Amber (caution metrics) - updated to match warning-500
            error: '#872F48',      // Error Burgundy (negative metrics) - updated to match error-600
            purple: '#5E5AAE',     // Muted violet (additional series)
            teal: '#2E7C7A',       // Muted teal (additional series)
            orange: '#B56A3B',     // Muted copper (additional series)
          },
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        'corporate': '0 1px 3px 0 rgba(46, 90, 172, 0.1), 0 1px 2px 0 rgba(46, 90, 172, 0.06)',
        'corporate-md': '0 4px 6px -1px rgba(46, 90, 172, 0.1), 0 2px 4px -1px rgba(46, 90, 172, 0.06)',
        'corporate-lg': '0 10px 15px -3px rgba(46, 90, 172, 0.1), 0 4px 6px -2px rgba(46, 90, 172, 0.05)',
      },
    },
  },
  plugins: [],
} satisfies Config;
