import { useState, useEffect } from "react";

// Delays updating the returned value until `delay` ms after the last change.
// Use for search inputs to avoid firing an API request on every keystroke.
export function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
