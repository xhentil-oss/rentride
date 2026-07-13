import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { LockKey, CheckCircle, Warning } from "@phosphor-icons/react";

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { setError("Fjalëkalimet nuk përputhen."); return; }
    if (newPassword.length < 8) { setError("Fjalëkalimi duhet të ketë minimum 8 karaktere."); return; }

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Gabim gjatë rivendosjes."); return; }
      setSuccess(true);
      setTimeout(() => navigate("/"), 3000);
    } catch {
      setError("Gabim gjatë lidhjes me serverin.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6">
        <div className="bg-white rounded-2xl border border-border p-10 max-w-sm w-full text-center shadow-md">
          <Warning size={40} weight="duotone" className="text-error mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-neutral-900 mb-2">Link i pavlefshëm</h1>
          <p className="text-sm text-neutral-500">Linku për rivendosjen e fjalëkalimit mungon ose është i pavlefshëm.</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6">
        <div className="bg-white rounded-2xl border border-border p-10 max-w-sm w-full text-center shadow-md">
          <CheckCircle size={40} weight="duotone" className="text-success mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-neutral-900 mb-2">Fjalëkalimi u rivendos!</h1>
          <p className="text-sm text-neutral-500">Po ju ridrejtojmë në faqe kryesore...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="bg-white rounded-2xl border border-border p-10 max-w-sm w-full shadow-md">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <LockKey size={28} weight="duotone" className="text-primary" />
        </div>
        <h1 className="text-xl font-semibold text-neutral-900 mb-2 text-center">Rivendos Fjalëkalimin</h1>
        <p className="text-sm text-neutral-500 mb-6 text-center">Shkruani fjalëkalimin tuaj të ri.</p>

        {error && (
          <p className="text-sm text-error bg-red-50 rounded-md px-3 py-2 mb-4 text-center">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="password"
            placeholder="Fjalëkalimi i ri (min 8 karaktere)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
            className="w-full px-4 py-3 text-sm border border-border rounded-md outline-none focus:border-primary transition-colors"
          />
          <input
            type="password"
            placeholder="Konfirmo fjalëkalimin"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full px-4 py-3 text-sm border border-border rounded-md outline-none focus:border-primary transition-colors"
          />
          <button
            type="submit"
            disabled={loading || !newPassword || !confirmPassword}
            className="w-full py-3 rounded-full text-sm font-semibold text-white bg-primary hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer border-0 mt-1"
          >
            {loading ? "Duke rivendosur..." : "Rivendos Fjalëkalimin"}
          </button>
        </form>
      </div>
    </div>
  );
}
