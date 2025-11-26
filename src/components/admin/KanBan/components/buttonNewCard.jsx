import { useState, useRef, useEffect } from "react";
import { ChevronDown, PlusCircle } from "lucide-react";

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
   <div className="w-full">
  <div className="relative inline-flex font-sans mb-4 w-full" ref={dropdownRef}>
    {/* Botão principal com tons neutros */}
    <button
      onClick={onMainClick}
      className={`bg-white/50 border-b border-l border-r border-gray-300  text-gray-800 px-3 py-1 font-medium shadow-sm hover:bg-[lightgreen] hover:text-white transition-all duration-200 w-full
        ${options.length > 0 ? "rounded-bl-md" : "rounded-md"}`}
    >
      <span className="flex justify-center items-center"><PlusCircle className="mr-1 w-4 h-4"/> {mainLabel}</span>
    </button>

    {/* Botão de dropdown */}
    {options.length > 0 && (
      <button
        onClick={() => setOpen(!open)}
        className="bg-white/50 px-2 py-2 rounded-br-md border border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center"
      >
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
    )}

    {/* Menu dropdown */}
    {open && (
      <div className="absolute right-0 mt-1 bg-white border border-gray-200 rounded-b-lg shadow-lg z-50 w-44 overflow-hidden animate-in fade-in slide-in-from-top-2">
        {options.map((opt, i) => (
          <button
            key={i}
            onClick={() => {
              setOpen(false);
              if (onSelect) onSelect(opt);
            }}
            className="block w-full text-left px-4 py-2 text-sm text-gray-800 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-150"
          >
            {opt.label}
          </button>
        ))}
      </div>
    )}
  </div>
</div>


  );
}
