import React, { useState } from "react";
import { Star, CheckCircle, SmileyWink } from "@phosphor-icons/react";
import { useQuery, useMutation, useAuth } from "../hooks/useApi";
import { useTranslation } from "react-i18next";
import Footer from "../components/Footer";
import { useSEO, buildFAQSchema } from "../hooks/useSEO";

export default function ReviewsPage() {
  const { t } = useTranslation();

  useSEO({
    title: t("reviews.seo.title"),
    description: t("reviews.seo.description"),
    keywords: t("reviews.seo.keywords"),
    canonical: "/vleresime",
    structuredData: buildFAQSchema(
      t("reviews.faqSchema", { returnObjects: true }) as { question: string; answer: string }[]
    ),
  });

  const ASPECTS = [
    t("reviews.aspects.carCondition"),
    t("reviews.aspects.staffService"),
    t("reviews.aspects.valueForMoney"),
    t("reviews.aspects.bookingEase"),
  ];

  const { user, isAnonymous } = useAuth();
  const { data: reviews, isPending } = useQuery("Review", { orderBy: { createdAt: "desc" } });
  const { create } = useMutation("Review");

  const [form, setForm] = useState({ rating: 0, hover: 0, text: "", name: "", aspects: {} as Record<string, number> });
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const approvedReviews = (reviews ?? []).filter((r) => r.approved);
  const avgRating = approvedReviews.length > 0
    ? (approvedReviews.reduce((s, r) => s + (r.rating || 0), 0) / approvedReviews.length).toFixed(1)
    : "0.0";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.rating === 0 || !form.text.trim()) return;
    if (isAnonymous && !form.name.trim()) return;
    setSaving(true);
    try {
      await create({
        rating: form.rating,
        text: form.text.trim(),
        authorName: isAnonymous ? form.name.trim() : (user?.name ?? user?.email ?? "Anonim"),
        aspects: JSON.stringify(form.aspects),
        approved: false,
      });
      setSubmitted(true);
    } catch (e) { /* error handled by UI state */ } finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-white border-b border-border py-8 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-medium text-neutral-900">{t("reviews.title")}</h1>
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1">
              {[1,2,3,4,5].map((s) => (
                <Star key={s} size={20} weight={parseFloat(avgRating) >= s ? "fill" : "regular"} className="text-accent" />
              ))}
            </div>
            <span className="text-2xl font-semibold text-neutral-900">{avgRating}</span>
            <span className="text-neutral-500 text-sm">
              {isPending ? "..." : t("reviews.ratingCount", { count: approvedReviews.length })}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Write review */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-border p-6 sticky top-24">
            <h2 className="text-lg font-medium text-neutral-900 mb-4">{t("reviews.writeTitle")}</h2>
            {submitted ? (
              <div className="text-center py-6">
                <SmileyWink size={40} weight="duotone" className="text-primary mx-auto mb-3" />
                <p className="text-sm font-medium text-neutral-800">{t("reviews.thankYou")}</p>
                <p className="text-xs text-neutral-500 mt-1">{t("reviews.thankYouSub")}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-neutral-700 mb-2">{t("reviews.overallRating")}</p>
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map((s) => (
                      <button key={s} type="button"
                        onMouseEnter={() => setForm(f => ({ ...f, hover: s }))}
                        onMouseLeave={() => setForm(f => ({ ...f, hover: 0 }))}
                        onClick={() => setForm(f => ({ ...f, rating: s }))}
                        className="cursor-pointer bg-transparent border-0 p-0.5">
                        <Star size={28} weight={(form.hover || form.rating) >= s ? "fill" : "regular"} className={(form.hover || form.rating) >= s ? "text-accent" : "text-neutral-300"} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  {ASPECTS.map((asp) => (
                    <div key={asp} className="flex items-center justify-between">
                      <span className="text-xs text-neutral-600">{asp}</span>
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map((s) => (
                          <button key={s} type="button" onClick={() => setForm(f => ({ ...f, aspects: { ...f.aspects, [asp]: s } }))} className="cursor-pointer border-0 bg-transparent p-0">
                            <Star size={14} weight={(form.aspects[asp] ?? 0) >= s ? "fill" : "regular"} className={(form.aspects[asp] ?? 0) >= s ? "text-accent" : "text-neutral-200"} />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {isAnonymous && (
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">{t("reviews.yourName")}</label>
                    <input type="text" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder={t("reviews.namePlaceholder")} className="w-full px-3 py-2.5 rounded-md border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">{t("reviews.comment")}</label>
                  <textarea rows={4} value={form.text} onChange={(e) => setForm(f => ({ ...f, text: e.target.value }))} placeholder={t("reviews.commentPlaceholder")} className="w-full px-3 py-2.5 rounded-md border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
                </div>

                <button type="submit" disabled={saving || form.rating === 0 || !form.text.trim()} className="w-full py-3 rounded-full text-sm font-medium bg-gradient-primary text-white hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer">
                  {saving ? t("reviews.submitting") : t("reviews.submit")}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Reviews list */}
        <div className="lg:col-span-2 space-y-4">
          {isPending ? (
            <div className="text-center text-neutral-400 py-20">{t("reviews.loading")}</div>
          ) : approvedReviews.length === 0 ? (
            <div className="text-center bg-white rounded-xl border border-border py-16">
              <Star size={40} weight="light" className="text-neutral-300 mx-auto mb-3" />
              <p className="text-neutral-500 text-sm">{t("reviews.noReviews")}</p>
              <p className="text-neutral-400 text-xs mt-1">{t("reviews.beFirst")}</p>
            </div>
          ) : (
            approvedReviews.map((r) => (
              <div key={r.id} className="bg-white rounded-xl border border-border p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
                      <span className="text-sm font-semibold text-white">{(r.authorName ?? "A")[0].toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-neutral-900">{r.authorName ?? "Anonim"}</p>
                      <p className="text-xs text-neutral-400">{new Date(r.createdAt).toLocaleDateString("sq-AL")}</p>
                    </div>
                  </div>
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map((s) => (
                      <Star key={s} size={14} weight={r.rating >= s ? "fill" : "regular"} className={r.rating >= s ? "text-accent" : "text-neutral-200"} />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-neutral-700 leading-relaxed">{r.text}</p>
                {r.aspects && (() => {
                  try {
                    const parsed = JSON.parse(r.aspects);
                    const keys = Object.keys(parsed);
                    if (keys.length === 0) return null;
                    return (
                      <div className="grid grid-cols-2 gap-1 mt-3 pt-3 border-t border-border">
                        {keys.map((k) => (
                          <div key={k} className="flex items-center justify-between text-xs">
                            <span className="text-neutral-500">{k}</span>
                            <div className="flex gap-0.5">
                              {[1,2,3,4,5].map((s) => <Star key={s} size={10} weight={parsed[k] >= s ? "fill" : "regular"} className={parsed[k] >= s ? "text-accent" : "text-neutral-200"} />)}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  } catch { return null; }
                })()}
              </div>
            ))
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
