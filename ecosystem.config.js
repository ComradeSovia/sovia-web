module.exports = {
  apps: [
    {
      name: "sovia-web",
      script: "bash",
      args: '-lc "set -a && source .env.production && pnpm start"',
    },
  ],
};
