import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export const THEME_KEY = "elora.theme";

/** Script inline (roda antes da hidratação) para não piscar tela clara. */
export const themeInitScript = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t!=="light"){document.documentElement.classList.add("dark");}}catch(e){document.documentElement.classList.add("dark");}})();`;

function aplicar(tema: "dark" | "light") {
  const root = document.documentElement;
  root.classList.toggle("dark", tema === "dark");
  try {
    window.localStorage.setItem(THEME_KEY, tema);
  } catch {
    /* ignore */
  }
}

export function ThemeToggle() {
  const [tema, setTema] = useState<"dark" | "light">("dark");

  useEffect(() => {
    let salvo: string | null = null;
    try {
      salvo = window.localStorage.getItem(THEME_KEY);
    } catch {
      /* ignore */
    }
    const inicial = salvo === "light" ? "light" : "dark";
    setTema(inicial);
    aplicar(inicial);
  }, []);

  const alternar = () => {
    const proximo = tema === "dark" ? "light" : "dark";
    setTema(proximo);
    aplicar(proximo);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={alternar}
      aria-label={tema === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
      title={tema === "dark" ? "Modo claro" : "Modo escuro"}
    >
      {tema === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
