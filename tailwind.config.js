/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './layout/**/*.liquid',
    './sections/**/*.liquid',
    './snippets/**/*.liquid',
    './templates/**/*.liquid',
    './src/**/*.{js,ts,vue}',
  ],
  important: true,
  theme: {
    extend: {},
  },
  plugins: [],
};
