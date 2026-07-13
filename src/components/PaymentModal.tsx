import React, { useState } from "react";
import { X, CreditCard, LockKey, CheckCircle, SpinnerGap, CurrencyEur } from "@phosphor-icons/react";

interface PaymentModalProps {
  total: number;
  carName: string;
  onSuccess: () => void;
  onClose: () => void;
}

type CardForm = {
  number: string;
  name: string;
  expiry: string;
  cvv: string;
};

export default function PaymentModal({ total, carName, onSuccess, onClose }: PaymentModalProps) {
  const [method, setMethod] = useState<"card" | "cash">("card");
  const [form, setForm] = useState<CardForm>({ number: "", name: "", expiry: "", cvv: "" });
  const [errors, setErrors] = useState<Partial<CardForm>>({});
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState<"form" | "processing" | "success">("form");

  const formatCardNumber = (val: string) => {
    return val.replace(/\D/g, "").replace(/(.{4})/g, "$1 ").trim().slice(0, 19);
  };

  const formatExpiry = (val: string) => {
    const clean = val.replace(/\D/g, "");
    if (clean.length >= 2) return `${clean.slice(0, 2)}/${clean.slice(2, 4)}`;
    return clean;
  };

  const getCardType = (num: string) => {
    const clean = num.replace(/\s/g, "");
    if (clean.startsWith("4")) return "Visa";
    if (clean.startsWith("5")) return "Mastercard";
    if (clean.startsWith("37")) return "Amex";
    return null;
  };

  const validate = () => {
    if (method === "cash") return true;
    const errs: Partial<CardForm> = {};
    const cleanNum = form.number.replace(/\s/g, "");
    if (cleanNum.length < 16) errs.number = "Numri i kartës nuk është valid";
    if (!form.name.trim()) errs.name = "Emri mbi kartë është i detyrueshëm";
    if (!form.expiry.match(/^\d{2}\/\d{2}$/)) errs.expiry = "Formati: MM/VV";
    if (form.cvv.length < 3) errs.cvv = "CVV i pavlefshëm";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handlePay = async () => {
    if (!validate()) return;
    setStep("processing");
    setProcessing(true);
    await new Promise((r) => setTimeout(r, 2200));
    setStep("success");
    setProcessing(false);
    setTimeout(onSuccess, 1800);
  };

  const cardType = getCardType(form.number);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm" onClick={step === "form" ? onClose : undefined} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-primary p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-200">Rezervim i sigurt</p>
              <h2 className="text-xl font-semibold mt-0.5">Pagesa</h2>
            </div>
            {step === "form" && (
              <button onClick={onClose} className="p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer border-0 bg-transparent">
                <X size={18} />
              </button>
            )}
          </div>
          <div className="mt-4 flex items-center justify-between bg-white/10 rounded-xl px-4 py-3">
            <div>
              <p className="text-xs text-blue-200">Totali për pagesë</p>
              <p className="text-2xl font-bold mt-0.5 flex items-center gap-1">
                <span className="text-lg">€</span>{total}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-blue-200">Makina</p>
              <p className="text-sm font-medium mt-0.5">{carName}</p>
            </div>
          </div>
        </div>

        {/* Processing */}
        {step === "processing" && (
          <div className="p-10 flex flex-col items-center justify-center gap-4">
            <SpinnerGap size={48} className="animate-spin text-primary" />
            <p className="text-neutral-700 font-medium">Duke procesuar pagesën...</p>
            <p className="text-xs text-neutral-400">Ju lutemi prisni, po verifikojmë kartën</p>
          </div>
        )}

        {/* Success */}
        {step === "success" && (
          <div className="p-10 flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle size={40} weight="fill" className="text-success" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-neutral-900">Pagesa u krye!</p>
              <p className="text-sm text-neutral-500 mt-1">€{total} u paguan me sukses</p>
            </div>
          </div>
        )}

        {/* Payment Form */}
        {step === "form" && (
          <div className="p-5 space-y-4">
            {/* Method selector */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setMethod("card")}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-medium transition-all cursor-pointer ${method === "card" ? "border-primary bg-primary/5 text-primary" : "border-border text-neutral-600 hover:border-neutral-300"}`}
              >
                <CreditCard size={18} /> Kartë bankare
              </button>
              <button
                onClick={() => setMethod("cash")}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-medium transition-all cursor-pointer ${method === "cash" ? "border-primary bg-primary/5 text-primary" : "border-border text-neutral-600 hover:border-neutral-300"}`}
              >
                <CurrencyEur size={18} /> Para në dorë
              </button>
            </div>

            {method === "cash" ? (
              <div className="bg-accent/10 border border-accent/30 rounded-xl p-4 text-center">
                <p className="text-sm font-medium text-neutral-800">Pagesa me para në dorë</p>
                <p className="text-xs text-neutral-500 mt-1">Paguani <strong>€{total}</strong> kur të merrni makinën. Rezervimi do të konfirmohet menjëherë.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Card number */}
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1.5">Numri i kartës</label>
                  <div className="relative">
                    <CreditCard size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      type="text"
                      value={form.number}
                      onChange={(e) => setForm((f) => ({ ...f, number: formatCardNumber(e.target.value) }))}
                      placeholder="0000 0000 0000 0000"
                      maxLength={19}
                      className={`w-full pl-9 pr-16 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 ${errors.number ? "border-error" : "border-border"}`}
                    />
                    {cardType && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-primary">{cardType}</span>
                    )}
                  </div>
                  {errors.number && <p className="text-xs text-error mt-1">{errors.number}</p>}
                </div>

                {/* Cardholder name */}
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1.5">Emri mbi kartë</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value.toUpperCase() }))}
                    placeholder="ARTAN HOXHA"
                    className={`w-full px-3 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 ${errors.name ? "border-error" : "border-border"}`}
                  />
                  {errors.name && <p className="text-xs text-error mt-1">{errors.name}</p>}
                </div>

                {/* Expiry + CVV */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1.5">Data e skadimit</label>
                    <input
                      type="text"
                      value={form.expiry}
                      onChange={(e) => setForm((f) => ({ ...f, expiry: formatExpiry(e.target.value) }))}
                      placeholder="MM/VV"
                      maxLength={5}
                      className={`w-full px-3 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 ${errors.expiry ? "border-error" : "border-border"}`}
                    />
                    {errors.expiry && <p className="text-xs text-error mt-1">{errors.expiry}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1.5">CVV</label>
                    <input
                      type="password"
                      value={form.cvv}
                      onChange={(e) => setForm((f) => ({ ...f, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
                      placeholder="•••"
                      maxLength={4}
                      className={`w-full px-3 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 ${errors.cvv ? "border-error" : "border-border"}`}
                    />
                    {errors.cvv && <p className="text-xs text-error mt-1">{errors.cvv}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Security badge */}
            <div className="flex items-center gap-2 text-neutral-400 text-xs justify-center pt-1">
              <LockKey size={13} weight="fill" />
              <span>Pagesë e siguruar me enkriptim SSL 256-bit</span>
            </div>

            <button
              onClick={handlePay}
              disabled={processing}
              className="w-full py-3.5 rounded-xl text-sm font-semibold bg-gradient-primary text-white hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-60"
            >
              {method === "cash" ? `Konfirmo Rezervimin — €${total}` : `Paguaj €${total}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
