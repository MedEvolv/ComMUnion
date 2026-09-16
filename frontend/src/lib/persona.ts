import { useCallback, useEffect, useState } from "react";
import type { Person } from "@/lib/types";

const KEY = "mu-hangs-persona";

function read(): Person | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Person) : null;
  } catch {
    return null;
  }
}

export function usePersona() {
  const [persona, setPersonaState] = useState<Person | null>(() => read());

  useEffect(() => {
    const sync = () => setPersonaState(read());
    window.addEventListener("mu-persona-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("mu-persona-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const setPersona = useCallback((p: Person | null) => {
    if (p) localStorage.setItem(KEY, JSON.stringify(p));
    else localStorage.removeItem(KEY);
    window.dispatchEvent(new Event("mu-persona-change"));
  }, []);

  return { persona, setPersona };
}
