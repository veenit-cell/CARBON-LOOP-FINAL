import nextVitals from "eslint-config-next/core-web-vitals";

export default [
  ...nextVitals,
  {
    ignores: [
      ".next/**",
      ".npm-cache/**",
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
];
