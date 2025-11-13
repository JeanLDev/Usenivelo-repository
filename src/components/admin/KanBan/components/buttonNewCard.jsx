import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

export function SplitButton({ mainLabel, onMainClick, options, onSelect }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-flex" ref={dropdownRef}>
      {/* Botão principal com estilo gradiente */}
      <button
        onClick={onMainClick}
        className={`bg-gradient-to-r from-purple-500 to-purple-700 text-white px-2 py-1 rounded-l-lg 
          ${!options.length > 0 &&  "rounded-r-lg"} font-medium shadow-md hover:from-purple-600 hover:to-purple-800 transition-all duration-200`}
      >
        {mainLabel}
      </button>

      {/* Botão de dropdown */}
      {options.length > 0 && <button
        onClick={() => setOpen(!open)}
        className="bg-gradient-to-r from-purple-500 to-purple-700 text-white px-1 py-1 rounded-r-lg border-l border-white/20 hover:from-purple-600 hover:to-purple-800 transition-all duration-200 shadow-md flex items-center justify-center"
      >
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>}

      {/* Menu dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-44 overflow-hidden animate-in fade-in slide-in-from-top-2">
          {options.map((opt, i) => (
            <button
              key={i}
              onClick={() => {
                setOpen(false);
                if (onSelect) onSelect(opt);
              }}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-100 hover:text-purple-700 transition-colors duration-150"
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
