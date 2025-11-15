// RecordCreatorRelations.jsx
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Trash2, X } from "lucide-react";

export function RecordRelationField({ field, relatedRecords, formData, setFormData, canEdit, kanban, onlyView }) {
  const selectedForField = formData[field.id] || [];
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [showSearch, setShowSearch] = useState(true);

  const defaultConfig = field.relatedConfigs?.find(rc => rc.defaultValue);

  const hasPriceField =
    field.relatedConfigs?.[0]?.fieldNames?.some(fn =>
      ["preço", "valor", "total"].some(keyword =>
        fn.toLowerCase().includes(keyword)
      )
    ) || false;

  const handleAddItem = (rec) => {
    const current = selectedForField.filter(i => i.recordId !== rec.id);
    const newItem = { recordId: rec.id, quantity, data: rec.data };

    setSearchQuery("");
    setFormData(prev => ({
      ...prev,
      [field.id]: [...current, newItem],
      [field.name]: [...(prev[field.name] || []), newItem],
    }));
    setShowSearch(false);
  };

  const handleRemoveItem = (idx) => {
    setFormData(prev => {
      const updatedId = prev[field.id].filter((_, i) => i !== idx);
      const updatedName = prev[field.name].filter((_, i) => i !== idx);
      return {
        ...prev,
        [field.id]: updatedId,
        [field.name]: updatedName,
      };
    });

    // Se não sobrou nenhum item, reexibe input
    if (selectedForField.length === 1) {
      setShowSearch(true);
      setSearchQuery("");
    }
  };

  const handleCopyDefault = () => {
    if (!defaultConfig) return;
    const submoduleRecords = relatedRecords?.[field.id]?.[defaultConfig.submodule] || [];
    const rec = submoduleRecords.find(r =>
      defaultConfig.fieldNames.map(f => r.data[f]).join(" - ") === defaultConfig.defaultValue
    );
    if (rec) {
      const newItem = { recordId: rec.id, quantity: 1, data: rec.data };
      setFormData(prev => ({
        ...prev,
        [field.id]: [newItem],
        [field.name]: [newItem],
      }));
      toast({
        title: "Copiado",
        description: "Copiado com Sucesso!",
      });
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

  return (
    <div className={`space-y-2 w-full font-sans ${kanban && !canEdit  ||onlyView && 'pointer-events-none'}`}>
      <label className="font-semibold text-gray-800 text-base">{field.name}</label>

      {defaultConfig ? (
        <div className="flex justify-between items-center p-3 border border-gray-200 rounded-sm bg-gray-50">
          <input
            type="text"
            value={defaultConfig.defaultValue}
            readOnly
            className="px-2 py-1 border border-gray-300 rounded-sm text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-green-500"
          />
          <button
            className="text-green-600 text-sm px-3 py-1 border border-green-600 rounded-sm hover:bg-green-50 transition"
            onClick={handleCopyDefault}
          >
            Copiar
          </button>
        </div>
      ) : (
        <>
          {/* Input de busca */}
          {(!onlyView && showSearch || selectedForField.length === 0) && (
            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                placeholder="Buscar por nome ou ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 border border-gray-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
              />
              <input
                type="number"
                value={quantity}
                min={1}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-10 border border-gray-300 rounded-sm px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 transition"
              />
              {selectedForField.length >= 1 && (
                <button onClick={() => { setShowSearch(false); setSearchQuery(''); }}>
                  <X />
                </button>
              )}
            </div>
          )}

          {/* Primeiro item selecionado */}
          {selectedForField.length === 1 && !showSearch && (
            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                value={
                  selectedForField[0].data[
                    field.relatedConfigs?.[0]?.fieldNames[0]
                  ] || ""
                }
                readOnly
                className="flex-1 border border-gray-300 rounded-sm px-3 py-2 text-sm bg-gray-100 text-gray-700"
              />
              <button
                className="text-blue-500 text-sm px-2 py-1 hover:underline"
                onClick={() => setShowSearch(true)}
              >
                + Adicionar outro
              </button>
            </div>
          )}

          {/* Lista de resultados filtrados */}
          {searchQuery.trim() !== "" &&
            Array.isArray(field.relatedConfigs) &&
            field.relatedConfigs.length > 0 &&
            field.relatedConfigs.map((rc, idx) => {
              const filtered = filteredResults(rc);
              if (filtered.length === 0)
                return (
                  <p key={idx} className="text-sm text-gray-400">
                    Nenhum item encontrado em {rc.moduleName || "Módulo"} / {rc.submoduleName || "Submódulo"}
                  </p>
                );

              return (
                <div key={idx} className="mb-4">
                  <span className="text-sm text-gray-500 font-medium">
                    {rc.moduleName || "Módulo"} / {rc.submoduleName || "Submódulo"}
                  </span>

                  <div className="max-h-52 overflow-y-auto mt-2 border border-gray-200 p-2 space-y-2 bg-white">
                    {filtered.map((rec) => {
                      const nameKey = Object.keys(rec.data || {}).find((k) =>
                        ["nome", "name", "titulo", "descrição", "modelo", "model"].some((n) => k.toLowerCase().includes(n))
                      );
                      const displayName = nameKey ? rec.data[nameKey] : `Registro #${rec.id.slice(0, 6)}`;

                      const priceKey = Object.keys(rec.data || {}).find((k) =>
                        ["preço", "valor", "total", "price", "amount"].some((n) => k.toLowerCase().includes(n))
                      );
                      const displayPrice = priceKey ? Number(rec.data[priceKey]) : null;

                      return (
                        <div
                          key={rec.id}
                          className="flex justify-between items-center p-2 rounded-sm hover:bg-gray-50 transition cursor-pointer"
                        >
                          <div className="flex flex-col">
                            <span className="text-gray-800 font-medium truncate">{displayName}</span>
                            {displayPrice && (
                              <span className="text-green-600 text-sm font-semibold">R$ {displayPrice.toFixed(2)}</span>
                            )}
                          </div>

                          <button
                            className={`flex items-center gap-2 px-3 py-1 text-sm font-medium rounded-sm transition border ${
                              quantity
                                ? "text-green-600 border-green-600 hover:bg-green-50"
                                : "text-gray-300 border-gray-200 cursor-not-allowed"
                            }`}
                            disabled={!quantity}
                            onClick={() => handleAddItem(rec)}
                          >
                            + Adicionar
                            {quantity > 0 && (
                              <span className="bg-green-600 text-white rounded-full px-2 py-0.5 text-xs font-semibold">
                                {quantity}
                              </span>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

          {/* Lista de itens selecionados */}
          {selectedForField.length >= 1 && (
            <div className="mt-2 ">
              {selectedForField.map((item, idx) => {
                const priceField = field.relatedConfigs?.[0]?.fieldNames?.find((fn) =>
                  ["preço", "valor"].some((keyword) => fn.toLowerCase().includes(keyword))
                );
                const price = item.data?.[priceField] ?? 0;
                const subtotal = price * item.quantity;

                const nameKey = Object.keys(item.data || {}).find((k) =>
                  ["nome", "name", "titulo", "descrição", "placa", "modelo", "model"].some((n) => k.toLowerCase().includes(n))
                );
                const displayName = nameKey ? item.data[nameKey] : `Registro #${item.recordId}`;

                return (
                  <div
                    key={item.recordId + idx}
                    className="flex justify-between items-center p-3  transition rounded-sm"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-800">{displayName}</span>
                      {hasPriceField && (
                        <span className="text-xs text-gray-500">
                          Preço: R$ {price.toFixed(2)} | Subtotal: R$ {subtotal.toFixed(2)}
                        </span>
                      )}
                    </div>
                    {!onlyView && <button
                      className="text-red-600 font-bold hover:text-red-800 transition"
                      onClick={() => handleRemoveItem(idx)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
