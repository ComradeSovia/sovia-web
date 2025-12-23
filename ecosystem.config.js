module.exports = {
  apps: [
    {
      name: "sovia-web",
      script: "npm",
      args: "run start",
      env_file: ".env.production",
    },
  ],
};
