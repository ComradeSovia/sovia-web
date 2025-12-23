module.exports = {
  apps: [
    {
      name: "sovia-web",
      script: "npm",
      args: "run start",
      env: {
        NODE_ENV: "production",
        PORT: process.env.PORT || 3000,
      },
    },
  ],
};
