import { createContext, useContext, useEffect, useState, ReactNode } from "react";

/**
 * ThemeProvider — light / dark toggle persistido en localStorage.
 * Aplica la clase `dark` al <html> y `theme-transitioning` durante los cambios
 * para animar suavemente colores de fondo, texto y bordes.
 */
type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "monad_hub_theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "dark";
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
    return "dark"; // default: mantiene el aspecto de la maqueta
  });

  useEffect(() => {
    const html = document.documentElement;
    // Añadimos clase de transición para animar el swap durante ~350ms
    html.classList.add("theme-transitioning");
    if (theme === "dark") html.classList.add("dark");
    else html.classList.remove("dark");
    html.style.colorScheme = theme;

    window.localStorage.setItem(STORAGE_KEY, theme);

    const t = setTimeout(() => html.classList.remove("theme-transitioning"), 400);
    return () => clearTimeout(t);
  }, [theme]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggle: () => setThemeState((t) => (t === "dark" ? "light" : "dark")),
        setTheme: setThemeState,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
