import React, { useRef, useEffect, useState, useCallback } from "react";
import { ArrowCounterClockwise, CheckCircle, PenNib } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";

interface SignaturePadProps {
  onSign: (dataUrl: string) => void;
  onClear: () => void;
  signed: boolean;
}

export default function SignaturePad({ onSign, onClear, signed }: SignaturePadProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasStrokes, setHasStrokes] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const getCtx = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    return ctx;
  };

  const getPos = (e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = useCallback((e: MouseEvent | TouchEvent) => {
    if (signed) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsDrawing(true);
    lastPos.current = getPos(e, canvas);
  }, [signed]);

  const draw = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDrawing || signed) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (!canvas || !ctx || !lastPos.current) return;
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
    setHasStrokes(true);
  }, [isDrawing, signed]);

  const endDraw = useCallback(() => {
    setIsDrawing(false);
    lastPos.current = null;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener("mousedown", startDraw);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", endDraw);
    canvas.addEventListener("mouseleave", endDraw);
    canvas.addEventListener("touchstart", startDraw, { passive: false });
    canvas.addEventListener("touchmove", draw, { passive: false });
    canvas.addEventListener("touchend", endDraw);
    return () => {
      canvas.removeEventListener("mousedown", startDraw);
      canvas.removeEventListener("mousemove", draw);
      canvas.removeEventListener("mouseup", endDraw);
      canvas.removeEventListener("mouseleave", endDraw);
      canvas.removeEventListener("touchstart", startDraw);
      canvas.removeEventListener("touchmove", draw);
      canvas.removeEventListener("touchend", endDraw);
    };
  }, [startDraw, draw, endDraw]);

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasStrokes(false);
    onClear();
  };

  const handleConfirm = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasStrokes) return;
    onSign(canvas.toDataURL("image/png"));
  };

  return (
    <div className="space-y-3">
      <div
        className={`relative rounded-lg border-2 overflow-hidden transition-colors ${
          signed
            ? "border-success bg-success/5"
            : "border-dashed border-primary/40 bg-neutral-50 hover:border-primary/70"
        }`}
        style={{ touchAction: "none" }}
      >
        {signed && (
          <div className="absolute inset-0 flex items-center justify-center bg-success/10 z-10 pointer-events-none">
            <div className="flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm border border-success/30">
              <CheckCircle size={18} weight="fill" className="text-success" />
              <span className="text-sm font-medium text-success">{t("booking.signature.signed", "Kontrata u nënshkrua")}</span>
            </div>
          </div>
        )}
        {!hasStrokes && !signed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-2">
            <PenNib size={28} weight="regular" className="text-neutral-300" />
            <p className="text-xs text-neutral-400">{t("booking.signature.hint", "Firmos këtu me mouse ose gisht")}</p>
          </div>
        )}
        <canvas
          ref={canvasRef}
          width={600}
          height={160}
          className="w-full block cursor-crosshair"
          style={{ height: "160px" }}
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleClear}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-md transition-colors"
        >
          <ArrowCounterClockwise size={14} weight="regular" />
          {t("booking.signature.clear", "Fshi dhe rifirmos")}
        </button>
        {!signed && (
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!hasStrokes}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-primary hover:bg-primary/90 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <CheckCircle size={14} weight="regular" />
            {t("booking.signature.confirm", "Konfirmo firmën")}
          </button>
        )}
      </div>
    </div>
  );
}
