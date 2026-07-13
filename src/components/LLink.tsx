import React from "react";
import { Link, type LinkProps } from "react-router-dom";
import { useLocale } from "../hooks/useLocale";

/**
 * Localized Link — automatically translates Albanian paths
 * to the current language equivalent.
 * Pass Albanian paths (e.g. "/flota") — they get translated to "/en/fleet" when in English.
 * Admin paths ("/admin/...") pass through unchanged.
 */
export default function LLink({ to, ...props }: LinkProps) {
  const { localePath } = useLocale();
  const translatedTo = typeof to === "string" ? localePath(to) : to;
  return <Link {...props} to={translatedTo} />;
}
