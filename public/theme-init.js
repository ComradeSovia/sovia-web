var theme;

try {
  theme = window.localStorage.getItem("sovia-theme");
  if (theme === "light" || theme === "dark") {
    document.documentElement.dataset.theme = theme;
  } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    document.documentElement.dataset.theme = "dark";
  } else {
    document.documentElement.dataset.theme = "light";
  }
} catch (_) {}
