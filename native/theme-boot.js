/* The same boot as the web layout's inline script (src/lib/theme.ts), applied before first paint. */
(function () {
  try {
    var s = localStorage.getItem("theme");
    var d = s === "dark" || (s !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
    var c = document.documentElement.classList;
    c.toggle("dark", d);
    c.toggle("light", !d);
    document.documentElement.style.colorScheme = d ? "dark" : "light";
  } catch {
    /* no storage: the system scheme applies */
  }
})();
