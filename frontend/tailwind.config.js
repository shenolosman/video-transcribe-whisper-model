/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Use CSS variables for scalable theming
        primary: 'var(--color-primary)',
        secondary: 'var(--color-secondary)',
        background: 'var(--color-bg)',
        foreground: 'var(--color-fg)',
      },
    },
  },
  safelist: [
    'bg-background',
    'text-foreground',
    'bg-primary',
    'bg-secondary',
    'hover:bg-secondary/20',
    'dark:hover:bg-secondary/40',
  ],
  plugins: [],
};
