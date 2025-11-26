import { useState, useRef, useEffect } from "react";
import { Filter, X } from "lucide-react";

export default function FilterIconDropdownKanban({ columns = [], onApply }) {
  const [open, setOpen] = useState(false);
  const [openToLeft, setOpenToLeft] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [column, setColumn] = useState("");
  const [operator, setOperator] = useState("=");
  const [value, setValue] = useState("");

  const ref = useRef(null);
  const dropdownRef = useRef(null);

  // Detecta mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const handleApply = () => {
    if (!column) return;
    onApply?.({ column, operator, value });
    setOpen(false);
  };

  const handleClear = () => {
    setColumn("");
    setOperator("=");
    setValue("");
    onApply?.(null);
    setOpen(false);
  };

  // Fechar ao clicar fora
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Define direção APENAS em desktop
  useEffect(() => {
    if (!open || isMobile) return;

    if (ref.current) {
      const buttonRect = ref.current.getBoundingClientRect();
      const dropdownWidth = 260;

      const espaçoDireita = window.innerWidth - buttonRect.right;

      setOpenToLeft(espaçoDireita > dropdownWidth);
    }
  }, [open, isMobile]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="p-3 rounded-md border border-gray-300 bg-white flex items-center hover:opacity-80 transition-all duration-300"
      >
        <Filter className="w-4 h-4" />
      </button>

      {open && (
        <div
          ref={dropdownRef}
          className={`
            bg-white border border-gray-300 shadow-lg rounded-lg p-3 z-50 w-64 hover:opacity-90 transition-all duration-300

            ${isMobile 
              ? `
                fixed left-1/2 top-24 -translate-x-1/2 
                w-[90%] max-w-sm mx-auto
              `
              : `
                absolute mt-2 
                ${openToLeft ? "left-0" : "right-0"}
              `
            }
          `}
        >
          <div className="space-y-2">
            {/* Campo */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Campo</label>
              <select
                value={column}
                onChange={(e) => setColumn(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
              >
                <option value="">Selecione</option>
                {columns.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Operador */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Operador</label>
              <select
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
              >
                <option value="=">Igual</option>
                <option value="!=">Diferente</option>
                <option value=">">Maior que</option>
                <option value="<">Menor que</option>
                <option value="contains">Contém</option>
              </select>
            </div>

            {/* Valor */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Valor</label>
              <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                placeholder="Digite o valor"
              />
            </div>

            {/* Ações */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleApply}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md py-1.5 text-sm"
              >
                Aplicar
              </button>
              <button
                onClick={handleClear}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md py-1.5 text-sm flex items-center justify-center gap-1"
              >
                <X className="w-4 h-4" /> Limpar
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
