const eslint = "eslint --fix";
const prettier = "prettier --write";

module.exports = {
  "*.{js,mjs,cjs,jsx,ts,tsx,vue}": [prettier, eslint],
  "*.{md,css,scss,json,yml,yaml,graphql}": [prettier],
};
