export type Theme = "dark" | "light";
const KEY = "ms_theme";

export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const v = localStorage.getItem(KEY);
  return v === "light" ? "light" : "dark";
}

export function applyTheme(t: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (t === "light") root.classList.add("light");
  else root.classList.remove("light");
  try { localStorage.setItem(KEY, t); } catch {}
}

export const themeInitScript = `
(function(){try{var t=localStorage.getItem('ms_theme');if(t==='light')document.documentElement.classList.add('light');}catch(e){}})();
`;
