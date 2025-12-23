module.exports = {
  apps: [
    {
      name: "sovia-web",
      script: "pnpm",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: process.env.PORT || 3000,
      },
    },
  ],
};
