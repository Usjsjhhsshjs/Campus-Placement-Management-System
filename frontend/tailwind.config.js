/** Design tokens for CampusConnect. Blue is taken from the college logo. */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#16233B",        // headings, primary text
        campus: {              // brand blue
          50: "#EAF4F9", 100: "#CFE6F1", 500: "#0B6E99", 600: "#095B80", 700: "#074863",
        },
        paper: "#F6F8FA",      // page background
        line: "#DCE3EA",       // borders
        muted: "#5B6B7F",      // secondary text
        saffron: "#D98E04",    // used only for deadlines / attention
        moss: "#2C7A55",       // success, selected
        brick: "#B3402F",      // errors, rejected
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', "system-ui", "sans-serif"],
        sans: ['"Public Sans"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
