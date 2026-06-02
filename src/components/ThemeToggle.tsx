import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const [dark, setDark] = useState(
    () => typeof localStorage !== "undefined" && localStorage.getItem("theme") === "dark",
  );
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);
  return (
    <Button variant="ghost" size="sm" onClick={() => setDark((d) => !d)}>
      {dark ? "☀ Light" : "☾ Dark"}
    </Button>
  );
}
