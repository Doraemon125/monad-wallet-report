import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

/**
 * Round button that rotates the sun/moon icon with a smooth transition.
 * Lives in the header and preserves the gold-accented look of the redesign.
 */
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const { t } = useI18n();
  const isDark = theme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={isDark ? t("header.theme.light") : t("header.theme.dark")}
      className="relative h-9 w-9 rounded-full border border-[hsl(var(--gold-border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--gold-hover))] transition-all duration-300 hover:scale-110"
    >
      <Sun
        className={`h-4 w-4 text-[hsl(var(--gold))] absolute transition-all duration-500 ${
          isDark ? "opacity-0 rotate-90 scale-0" : "opacity-100 rotate-0 scale-100"
        }`}
      />
      <Moon
        className={`h-4 w-4 text-[hsl(var(--gold))] absolute transition-all duration-500 ${
          isDark ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-0"
        }`}
      />
    </Button>
  );
}
