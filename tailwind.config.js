module.exports = {
  purge: [
    './src/**/*.ts',
    './public/index.html',
  ],
  darkMode: false,
  theme: {
    extend: {
      fontFamily: {
        blocky: ['vtks morning rain', 'SFMono-Regular', 'monospace'],
      },
    },
  },
  variants: {
    extend: {
      opacity: ['disabled'],
    },
  },
  plugins: [],
};
