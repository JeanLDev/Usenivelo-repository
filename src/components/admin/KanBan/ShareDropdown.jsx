import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Copy, Check, ExternalLink } from "lucide-react";

export default function ShareDropdown({
  shared = false,
  onToggleShare,
  shareUrl = window.location.href,
  className = ""
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const rootRef = useRef(null);

  // fecha clicando fora
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
        <div className="absolute right-0 mt-2 w-60 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
          <div className="py-2 space-y-1">

            {/* Toggle compartilhamento */}
            <label
              className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
            >
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
