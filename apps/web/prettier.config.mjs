/** @type {import("prettier").Config} */
const config = {
  // This codebase is written at 120 columns; Prettier's 80-column default disagreed
  // with every file in it, which made `format:check` fail on a clean checkout.
  printWidth: 120,
  plugins: ["prettier-plugin-tailwindcss"],
};

export default config;
