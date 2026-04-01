// Unified theme management (dark/light mode)
const STORAGE_KEY = "ksss-user-theme";

export function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    const icon = document.getElementById("theme-icon");
    if (icon) icon.textContent = theme === "dark" ? "☀️" : "🌙";
}

export function initTheme() {
    const saved = localStorage.getItem(STORAGE_KEY);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = saved || (prefersDark ? "dark" : "light");
    applyTheme(theme);
    return theme;
}

export function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme") || "light";
    const next = current === "dark" ? "light" : "dark";
    applyTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
}

export function setupThemeToggle(buttonId = "theme-toggle") {
    const btn = document.getElementById(buttonId);
    if (btn) btn.addEventListener("click", toggleTheme);
}