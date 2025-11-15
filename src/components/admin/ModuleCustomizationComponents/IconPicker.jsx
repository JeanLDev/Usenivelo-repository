// IconPicker.jsx
import React, { useState, useMemo } from "react";
import { icons } from "lucide-react";

const IconPicker = ({ selectedIcon, onChange }) => {
  const [activeIcon, setActiveIcon] = useState(selectedIcon || "");
  const [search, setSearch] = useState("");

  // Filtra só os nomes de ícones válidos
  const iconNames = useMemo(() => {
    return Object.keys(icons)
      .filter((name) => name.toLowerCase().includes(search.toLowerCase()))
      .sort();
  }, [search]);

  return (
    <div className="w-full">
      {/* Input de busca */}
      <input
        type="text"
        placeholder="Buscar ícone..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full mb-2 px-3 py-2 border rounded dark:bg-gray-700 dark:text-white"
      />

      <div className="grid grid-cols-4 gap-2 max-h-44 overflow-y-auto">
        {iconNames.map((name) => {
          const IconComponent = icons[name];
          return (
            <button
              key={name}
              type="button"
              onClick={() => {
                setActiveIcon(name);
                onChange?.(name); // envia o valor para o pai
              }}
              className={`p-2 rounded-lg border flex items-center justify-center transition ${
                activeIcon === name
                  ? "border-blue-500 bg-blue-100"
                  : "border-gray-300 dark:border-gray-600"
              }`}
            >
              <IconComponent className="w-5 h-5" />
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default IconPicker;
