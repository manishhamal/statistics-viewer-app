"use client";
import { Moon, Sun } from "lucide-react";
import { THEME_KEY } from "./ThemeScript";

// The icon is chosen by CSS (dark: variant), so server and client render the same HTML.
export default function ThemeToggle({ title }: { title: string }) {
  function toggle() {
    const dark = document.documentElement.classList.toggle("dark");
    try {
      localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={title}
      aria-label={title}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/25 text-white hover:border-lime hover:text-lime"
    >
      <Moon className="h-4 w-4 dark:hidden" aria-hidden />
      <Sun className="hidden h-4 w-4 dark:block" aria-hidden />
    </button>
  );
}
