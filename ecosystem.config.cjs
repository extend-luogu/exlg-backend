module.exports = {
  apps: [
    {
      name: "exlg",
      script: "./dist/index.js",
      watch: ["dist"],
      env: {
        PORT: 3432,
        NODE_ENV: "development",
      },
      env_production: {
        PORT: 3432,
        NODE_ENV: "production",
      },
    },
  ],
};
