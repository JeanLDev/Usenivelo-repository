// RecordCreatorRelations.jsx
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Trash2, X } from "lucide-react";
import PixCopyCard from "./PixCopyCard";

export function RecordRelationField({
  field,
  relatedRecords,
  formData,
  setFormData,
  canEdit,
  kanban,
  onlyView,
}) {
  const selectedForField = formData[field.name] || [];
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [showSearch, setShowSearch] = useState(true);
  const [openRelations, setOpenRelations] = useState(false)

  // SELEÇÃO MÚLTIPLA
  const [selectedBatch, setSelectedBatch] = useState({}); // rec.id -> true/false

  const defaultConfig = field.relatedConfigs?.find((rc) => rc.defaultValue);


  const hasPriceField =
    field.relatedConfigs?.[0]?.fieldNames?.some((fn) =>
      ["preço", "valor", "total"].some((keyword) => fn.toLowerCase().includes(keyword))
    ) || false;

  const toggleBatch = (rec) => {
    setSelectedBatch((prev) => ({
      ...prev,
      [rec.id]: !prev[rec.id],
    }));
  };

  const handleAddBatch = () => {
    const idsToAdd = Object.keys(selectedBatch).filter((id) => selectedBatch[id]);

    if (idsToAdd.length === 0) return;

    const allRecords = Object.values(relatedRecords[field.id] || {}).flat();
    const items = idsToAdd.map((id) => {
      const rec = allRecords.find((r) => r.id === id);
      return { recordId: id, quantity, data: rec.data };
    });

    const current = selectedForField.filter(
      (i) => !idsToAdd.includes(i.recordId)
    );

    const newList = [...current, ...items];

    setFormData((prev) => ({
      ...prev,
      [field.name]: newList,
    }));

    setSelectedBatch({});
    setSearchQuery("");

    toast({
      title: "Adicionado",
      description: `${idsToAdd.length} registro(s) adicionados.`,
    });
  };

  const handleAddItem = (rec) => {
    const current = selectedForField.filter((i) => i.recordId !== rec.id);
    const newItem = { recordId: rec.id, quantity, data: rec.data };

    setSearchQuery("");
    setFormData((prev) => ({
      ...prev,
      [field.name]: [...(prev[field.name] || []), newItem],
    }));
  };

  const handleRemoveItem = (idx) => {
    setFormData((prev) => {
      const updatedName = prev[field.name].filter((_, i) => i !== idx);
      return {
        ...prev,
        [field.name]: updatedName,
      };
    });

    if (selectedForField.length === 1) {
      setShowSearch(true);
      setSearchQuery("");
    }
  };

  const filteredResults = (rc) => {
    const records = relatedRecords?.[field.id]?.[rc.submodule] ?? [];
    return records.filter((rec) => {
      if (!rec?.data) return false;

      const searchableValues = Object.values(rec.data)
        .filter((v) => typeof v === "string" || typeof v === "number")
        .map((v) => String(v).toLowerCase());

      return (
        searchableValues.some((v) => v.includes(searchQuery.toLowerCase())) ||
        rec.id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  };
  if (defaultConfig && defaultConfig.defaultValue) {
    return (
      <div>
        <PixCopyCard pixCode={defaultConfig.defaultValue} title={field.name}/>
      </div>
    )
  }

  return (
    <div
      className={`space-y-2 w-full font-sans`}
    >
      <label className="font-semibold text-gray-800 text-base">{field.name}</label>

      {/* CAIXA DE BUSCA */}
      {(!onlyView && showSearch) || selectedForField.length === 0 ? (
        <div className="flex items-center gap-2 mt-2">
          <input
            type="text"
            placeholder="Buscar por nome ou ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 border border-gray-300 rounded-sm px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400"
          />
          <input
            type="number"
            value={quantity}
            min={1}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="w-12 border border-gray-300 rounded-sm px-2 py-2 text-sm focus:ring-2 focus:ring-green-400"
          />
          
        </div>
      ) : null}

      {/* RESULTADOS */}
      {searchQuery.trim() !== "" &&
        field.relatedConfigs?.map((rc, idx) => {
          const filtered = filteredResults(rc);

          if (filtered.length === 0)
            return (
              <p key={idx} className="text-sm text-gray-400">
                Nenhum item encontrado em {rc.moduleName} / {rc.submoduleName}
              </p>
            );

          return (
            <div key={idx} className="mb-4">
              <span className="text-sm font-medium text-gray-600">
                {rc.moduleName} / {rc.submoduleName}
              </span>

              <div className="max-h-52 overflow-y-auto mt-2 border border-gray-200 p-2 space-y-2 bg-white">
                {filtered.map((rec) => {
                  const nameKey = Object.keys(rec.data || {}).find((k) =>
                    ["nome", "name", "titulo", "modelo"].some((n) =>
                      k.toLowerCase().includes(n)
                    )
                  );
                  const displayName = nameKey
                    ? rec.data[nameKey]
                    : `Registro #${rec.id.slice(0, 6)}`;

                  return (
                    <label
                      key={rec.id}
                      className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={!!selectedBatch[rec.id]}
                        onChange={() => toggleBatch(rec)}
                        className="w-4 h-4"
                      />

                      <div className="flex flex-col">
                        <span className="text-gray-800 font-medium truncate">
                          {displayName}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}

      {/* BOTÃO "ADICIONAR SELECIONADOS" */}
      {Object.values(selectedBatch).some((v) => v) && (
        <button
          className="w-full bg-green-600 text-white py-2 rounded-sm font-medium hover:bg-green-700 transition"
          onClick={handleAddBatch}
        >
          Adicionar Selecionados ({Object.values(selectedBatch).filter(Boolean).length})
        </button>
      )}

      {/* LISTA DE SELECIONADOS */}
      {selectedForField.length >= 1 && (
        <div className="mt-2">
          {selectedForField.map((item, idx) => {
            const nameKey = Object.keys(item.data || {}).find((k) =>
              ["nome", "name", "titulo", "modelo", "placa"].some((n) =>
                k.toLowerCase().includes(n)
              )
            );
            const displayName = nameKey ? item.data[nameKey] : item.recordId;

            return (
              <div
            key={item.recordId}
            className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden"
          >
            <button
              onClick={() =>
                setOpenRelations((prev) => ({
                  ...prev,
                  [item.recordId]: !prev[item.recordId],
                }))
              }
              className="w-full flex justify-between items-center px-4 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            >
              <span className="font-medium text-gray-700 dark:text-gray-200 truncate sm:max-w-[140px] md:max-w-[200px]">
                {displayName}
              </span>

              <span className="text-gray-500 dark:text-gray-300">
                {openRelations[item.recordId] ? "▲" : "▼"}
              </span>
            </button>

            {openRelations[item.recordId] && (
              <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                {Object.entries(item.data || {}).map(([k, v]) => {
                  if (k.startsWith("__")) return null;

                  return (
                    <div
                      key={k}
                      className="flex justify-between items-center p-3 border-b border-gray-100 dark:border-gray-800"
                    >
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        {k}
                      </span>

                      <span className="text-gray-600 dark:text-gray-300">
                        {String(v) === "0" ? "não" : String(v)}
                      </span>
                    </div>
                  );
                })}

                {item.quantity !== undefined && (
                  <div className="flex justify-between items-center p-3 border-b border-gray-100 dark:border-gray-800">
                    <span className="font-medium text-gray-800 dark:text-gray-200">
                      Quantidade
                    </span>
                    <span className="text-gray-600 dark:text-gray-300">
                      {item.quantity}
                    </span>
                  </div>
                )}

                {!onlyView && (
                  <div className="flex justify-end p-3">
                    <button
                      className="text-red-600 hover:text-red-800"
                      onClick={() => handleRemoveItem(idx)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
