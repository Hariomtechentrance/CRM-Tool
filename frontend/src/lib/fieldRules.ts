// Shared field validation: keyboard input filters + regex patterns.
// Import the filters you need and attach them to onKeyDown on <input> elements.
// Auto-uppercase helper (regUpper) is for react-hook-form controlled inputs.

import type React from "react";

// ── Regex patterns ───────────────────────────────────────────
export const FIELD_REGEX = {
  GSTIN:    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/,
  PAN:      /^[A-Z]{5}[0-9]{4}[A-Z]$/,
  IFSC:     /^[A-Z]{4}0[A-Z0-9]{6}$/,
  IEC:      /^[A-Z0-9]{10}$/,
  PHONE:    /^\+?[\d\s\-()]{7,15}$/,
  PINCODE:  /^[0-9]{6}$/,
  BANK_AC:  /^[0-9]{9,18}$/,
  HSN:      /^[0-9]{4,8}$/,
};

// ── Zod-compatible optional validators ──────────────────────
// Use inside .refine() — returns true for empty/undefined (optional field)
export const isOptGSTIN = (v: string | undefined) => !v || FIELD_REGEX.GSTIN.test(v);
export const isOptPAN   = (v: string | undefined) => !v || FIELD_REGEX.PAN.test(v);
export const isOptIFSC  = (v: string | undefined) => !v || FIELD_REGEX.IFSC.test(v);
export const isOptIEC   = (v: string | undefined) => !v || FIELD_REGEX.IEC.test(v);
export const isOptPhone = (v: string | undefined) => !v || FIELD_REGEX.PHONE.test(v);
export const isOptPIN   = (v: string | undefined) => !v || FIELD_REGEX.PINCODE.test(v);
export const isOptBankAC= (v: string | undefined) => !v || FIELD_REGEX.BANK_AC.test(v);

// ── Keyboard input filter helpers ────────────────────────────
const SYS = ["Backspace","Delete","Tab","Enter","ArrowLeft","ArrowRight","Home","End"];
const ctrl = (e: React.KeyboardEvent) => e.ctrlKey || e.metaKey;

/** Only digits 0-9 — pincode, bank account, HSN, integer quantities */
export const kDigits = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (SYS.includes(e.key) || ctrl(e)) return;
  if (!/^[0-9]$/.test(e.key)) e.preventDefault();
};

/** Digits + single decimal point — price, salary, decimal quantities */
export const kDecimal = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (SYS.includes(e.key) || ctrl(e)) return;
  if (e.key === "." && !e.currentTarget.value.includes(".")) return;
  if (!/^[0-9]$/.test(e.key)) e.preventDefault();
};

/** Alphanumeric only (no spaces) — GSTIN, PAN, IFSC, IEC, barcode, employee code */
export const kAlphaNum = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (SYS.includes(e.key) || ctrl(e)) return;
  if (!/^[a-zA-Z0-9]$/.test(e.key)) e.preventDefault();
};

/** Letters, spaces, and common name punctuation . - & ' , / () — party/product names */
export const kName = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (SYS.includes(e.key) || e.key === " " || ctrl(e)) return;
  if (!/^[a-zA-Z0-9.\-&',\/()]$/.test(e.key)) e.preventDefault();
};

/** Letters, spaces, hyphens — city, state, bank branch */
export const kAlpha = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (SYS.includes(e.key) || e.key === " " || ctrl(e)) return;
  if (!/^[a-zA-Z\-.]$/.test(e.key)) e.preventDefault();
};

/** Phone characters: digits, +, -, space, parentheses */
export const kPhone = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (SYS.includes(e.key) || e.key === " " || ctrl(e)) return;
  if (!/^[0-9+\-()]$/.test(e.key)) e.preventDefault();
};

// ── Auto-uppercase helper for react-hook-form ────────────────
// Usage:
//   const { ref, onChange: gstinOnChange, ...gstinRest } = register("gstin");
//   <Input ref={ref} {...gstinRest} {...upperReg(gstinOnChange)} onKeyDown={kAlphaNum} maxLength={15} />
export function upperReg(
  rhfOnChange: React.ChangeEventHandler<HTMLInputElement>
): { onChange: React.ChangeEventHandler<HTMLInputElement> } {
  return {
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      e.target.value = e.target.value.toUpperCase();
      rhfOnChange(e);
    },
  };
}
