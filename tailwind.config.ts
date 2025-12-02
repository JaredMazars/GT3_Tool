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
