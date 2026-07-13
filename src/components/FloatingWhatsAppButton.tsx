import { WhatsappLogo } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import { trackEvent } from "../lib/track";

const WA_NUMBER = "355698145803";

export default function FloatingWhatsAppButton() {
  const { t } = useTranslation();
  const msg = t("home.cta.whatsappMsg", "Përshëndetje! Dëshiroj të rezervoj një makinë.");
  const href = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackEvent("whatsapp_click")}
      aria-label="Kontaktoni në WhatsApp"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[#25D366] text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 no-underline group px-4 py-3"
    >
      <WhatsappLogo size={22} weight="fill" />
      <span className="text-sm font-medium max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap">
        Na kontaktoni
      </span>
    </a>
  );
}
