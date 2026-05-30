import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { LANGUAGES } from "@/i18n";
import { Languages, ChevronDown } from "lucide-react";

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = LANGUAGES.find(l => l.code === i18n.language) ?? LANGUAGES[0];

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const change = (code: string) => {
    i18n.changeLanguage(code);
    const lang = LANGUAGES.find(l => l.code === code);
    document.documentElement.dir = lang?.dir ?? "ltr";
    document.documentElement.lang = code;
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: "relative", padding: "0 10px", marginBottom: 4 }}>
      <button
        onClick={() => setOpen(o => !o)}
        title={t("label_language")}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 6,
          padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)",
          background: "var(--bg-hover)", cursor: "pointer", color: "var(--text-secondary)",
        }}
      >
        <Languages style={{ width: 13, height: 13, flexShrink: 0 }} />
        <span style={{ fontSize: 11, flex: 1, textAlign: "left", fontWeight: 500 }}>
          {current.flag} {current.native}
        </span>
        <ChevronDown style={{ width: 11, height: 11, transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0)" }} />
      </button>

      {open && (
        <div style={{
          position: "absolute", left: 10, right: 10, bottom: "calc(100% + 4px)",
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: 10, padding: "6px 4px", zIndex: 100,
          boxShadow: "0 -12px 40px var(--shadow)",
          maxHeight: 280, overflowY: "auto",
        }}>
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => change(lang.code)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 8,
                padding: "6px 8px", borderRadius: 6, border: "none", cursor: "pointer",
                background: lang.code === current.code ? "rgba(99,102,241,0.12)" : "transparent",
                color: lang.code === current.code ? "#818cf8" : "var(--text-secondary)",
                fontSize: 12, textAlign: "left",
              }}
            >
              <span style={{ fontSize: 14 }}>{lang.flag}</span>
              <span style={{ flex: 1, fontWeight: 500 }}>{lang.native}</span>
              <span style={{ fontSize: 10, color: "var(--text-ghost)" }}>{lang.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
