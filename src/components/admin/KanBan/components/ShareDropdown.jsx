import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Copy, Check, ExternalLink, X } from "lucide-react";

export default function ShareDropdown({
  shared = false,
  onToggleShare,
  shareUrl = window.location.href,
  className = ""
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [openToLeft, setOpenToLeft] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const rootRef = useRef(null);

  // detecta mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // fecha clicando fora ou Esc
  useEffect(() => {
    const handleDoc = (e) => {
      if (!rootRef.current) return;
      if (e.type === "keydown" && e.key === "Escape") setOpen(false);
      if (e.type === "mousedown" && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleDoc);
    document.addEventListener("keydown", handleDoc);
    return () => {
      document.removeEventListener("mousedown", handleDoc);
      document.removeEventListener("keydown", handleDoc);
    };
  }, []);

  // calcula direção quando abre (desktop)
  useEffect(() => {
    if (!open || isMobile) return;
    if (rootRef.current) {
      const rect = rootRef.current.getBoundingClientRect();
      const dropdownWidth = 240;
      const spaceRight = window.innerWidth - rect.right;
      setOpenToLeft(spaceRight > dropdownWidth);
    }
  }, [open, isMobile]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      setOpen(false);
    } catch {
      window.prompt("Copie o link:", shareUrl);
    }
  };

  const handleOpenLink = () => {
    window.open(shareUrl, "_blank", "noopener,noreferrer");
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={`relative inline-block text-left ${className}`}>
      <Button
        variant="outline"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2"
      >
        <Share2 className="w-4 h-4" />
      </Button>

      {open && (
        <div
          className={`
            bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50
            ${isMobile 
              ? "fixed left-1/2 top-24 -translate-x-1/2 w-[90%] max-w-sm p-3"
              : `absolute mt-2 w-60 p-2 ${openToLeft ? "left-0" : "right-0"}`
            }
          `}
        >
          <div className="py-2 space-y-1">

            {/* Toggle compartilhamento */}
            <label className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
              <input
                type="checkbox"
                checked={shared}
                onChange={(e) => onToggleShare(e.target.checked)}
                className="cursor-pointer"
              />
              <span className="text-sm">Compartilhar publicamente</span>
            </label>

            {/* Copiar link */}
            <button
              onClick={handleCopy}
              className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              <span className="text-sm">{copied ? "Copiado!" : "Copiar link"}</span>
            </button>

            {/* Abrir link */}
            <button
              onClick={handleOpenLink}
              className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="text-sm">Abrir link</span>
            </button>
          </div>

          {/* Preview */}
          <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 truncate">
            {shareUrl}
          </div>
        </div>
      )}
    </div>
  );
}
