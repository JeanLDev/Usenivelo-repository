import { useState, useMemo, useRef, useEffect } from "react";
import { ChevronDown, ChevronUp, Edit, MoreVertical, Trash2, X ,Eye} from "lucide-react";
import { format, parseISO, isAfter, isBefore, isSameMonth } from "date-fns";
import RecordCreator from "./RecordCreator";
import { useToast } from '@/components/ui/use-toast';
import {supabase} from "@/lib/customSupabaseClient"
import RecordViewModal from "./RecordViewModal"
import DateFilterDropdown from "./DropDowns/DateFilterDropdown";

export default function RecordsTable({ records = [], fields = [] , subFields=[] , fetchRecords}) {
  const [sortOrder, setSortOrder] = useState("desc");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const {toast} = useToast();

  // --- Ordenação ---
  const sortedRecords = useMemo(() => {
  return [...records].sort((a, b) => {
    // Ordena primeiro pelo position
    const posA = a.position ?? 0; // caso position seja null/undefined
    const posB = b.position ?? 0;

    if (posA !== posB) {
      return sortOrder === "asc" ? posA - posB : posB - posA;
    }

    // Se positions forem iguais, ordena por created_at
    const dateA = new Date(a.data?.created_at || a.created_at);
    const dateB = new Date(b.data?.created_at || b.created_at);
    return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
  });
}, [records, sortOrder]);


  // --- Filtros ---
  const filteredRecords = useMemo(() => {
    return sortedRecords.filter(r => {
      const recordDate = r.data?.created_at ? parseISO(r.data.created_at) : new Date();
      if (filterFrom && isBefore(recordDate, parseISO(filterFrom))) return false;
      if (filterTo && isAfter(recordDate, parseISO(filterTo))) return false;
      if (filterMonth) {
        const [year, month] = filterMonth.split("-").map(Number);
        if (!isSameMonth(recordDate, new Date(year, month - 1))) return false;
      }
      if (filterDate && format(recordDate, "yyyy-MM-dd") !== filterDate) return false;
      return true;
    });
  }, [sortedRecords, filterFrom, filterTo, filterMonth, filterDate]);

    const [showMenu, setShowMenu] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [action, setAction] = useState('')
  const menuRef = useRef(null);

  // Fecha o menu se clicar fora
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        !e.target.closest(".menu-trigger")
      ) {
        setShowMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMenuClick = (e, record) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPosition({ x: rect.right - 160, y: rect.bottom + 4 });
    setShowMenu(showMenu === record.id ? null : record.id);
  };

  const handleEditClick = (record) => {
    setSelectedRecord(record);
    setShowMenu(null);
    setAction('editar')
  };
  const handleViewClick = (record) => {
    setSelectedRecord(record);
    setShowMenu(null);
    setAction('view')
  };

  const handleDeleteClick = (record) => {
    setSelectedRecord(record);
    setShowMenu(null);
    setAction('excluir')
  };

  const confirmDelete = async() => {
    setSelectedRecord(null);
    if (!selectedRecord) return;
    try {
    await supabase
      .from('submodule_records')
      .delete()
      .eq('id', selectedRecord.id);
      await fetchRecords()
      toast({ title: 'Registro excluído', description: 'O registro foi removido com sucesso.' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro', description: err.message || String(err) });
    }
  };


  return (
    <div className="max-w-full overflow-x-auto mt-4 min-h-[100vh]">
     {/* --- Filtros --- */}
    <DateFilterDropdown
      onApply={(filters) => {
        setFilterFrom(filters.from);
        setFilterTo(filters.to);
        setFilterMonth(filters.month);
        setFilterDate(filters.date);
        setSortOrder(filters.sortOrder);
      }}
      onClear={() => {
        setFilterFrom("");
        setFilterTo("");
        setFilterMonth("");
        setFilterDate("");
        setSortOrder("desc");
      }}
      defaultFilters={{
        from: filterFrom,
        to: filterTo,
        month: filterMonth,
        date: filterDate,
        sortOrder,
      }}
    />


      {/* --- Tabela Responsiva --- */}
      <div className="relative mt-6 w-full overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full text-sm text-gray-700">
          <thead className="bg-gray-50">
            <tr>
              
              {fields
                .filter(field => field.show_in_table)
                .map((field) => (
                  <th
                    key={field.id}
                    className="px-4 py-3 text-left text-gray-600 whitespace-nowrap border-b"
                  >
                    {field.name}
                  </th>
                ))}
              <th className="px-4 py-3 text-right text-gray-600 whitespace-nowrap border-b">
                Ações
              </th>
            </tr>
          </thead>

          <tbody>
            {filteredRecords.length === 0 ? (
              <tr>
                <td
                  colSpan={fields.length + 2}
                  className="text-center text-gray-500 py-8"
                >
                  Nenhum registro encontrado
                </td>
              </tr>
            ) : (
              filteredRecords.map((record, idx) => (
                <tr
                  key={record.id || idx}
                  className="hover:bg-gray-50 transition-colors"
                >
                {fields
                  .filter(field => field.show_in_table)
                  .map((field) => {
                    const value = record.data?.[field.name];
                    // 🧩 Caso o campo seja uma relação
                    if (field.field_type === "relation") {
                      const relatedItems = Array.isArray(value) ? value : [];
                      const relConfig = field.relatedConfigs?.[0];
                      let displayValue = "-";

                      if (relatedItems.length > 0) {
                        const firstItem = relatedItems[0];
                        const data = firstItem?.data || {};

                        // 🔍 tenta achar um campo com "nome" (prioritário)
                        const nomeKey = Object.keys(data).find(
                          k => k.toLowerCase().includes("nome")
                        );

                        // 🧭 se não tiver "nome", usa o primeiro da configuração ou o primeiro disponível
                        const mainFieldName =
                          nomeKey || relConfig?.fieldNames?.[0] || Object.keys(data)[0];

                        const firstValue = data?.[mainFieldName] ?? "-";

                        displayValue =
                          relatedItems.length > 1 ? `${firstValue}…` : String(firstValue);
                      }

                      return (
                        <td
                          key={field.id}
                          className="px-4 py-3 border-b max-w-[250px] truncate"
                          title={displayValue}
                        >
                          {displayValue}
                        </td>
                      );
                    }

                    // 🧮 Campos normais (texto, número, fórmula, etc)
                    const displayValue =
                      typeof value === "number"
                        ? value.toFixed(0)
                        : String(value ?? "-");

                    return (
                      <td
                        key={field.id}
                        className="px-4 py-3 border-b max-w-[200px] truncate"
                        title={displayValue}
                      >
                        {displayValue}
                      </td>
                    );
                  })}




                  <td className="px-4 py-3 border-b text-right whitespace-nowrap">
                    <button
                      onClick={(e) => handleMenuClick(e, record)}
                      className="p-1.5 rounded-md hover:bg-gray-100 transition"
                    >
                      <MoreVertical className="w-5 h-5 text-gray-600" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* --- Menu Flutuante --- */}
        {showMenu && (
          <div
            ref={menuRef}
            className="fixed z-[10000] bg-white border border-gray-200 rounded-lg shadow-lg w-40"
            style={{
              top: `${menuPosition.y}px`,
              left: `${menuPosition.x}px`,
            }}
          >
            <button
              onClick={() =>
                handleViewClick(filteredRecords.find((r) => r.id === showMenu))
              }
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-blue-600 hover:bg-gray-50"
            >
              <Eye className="w-4 h-4" />
              Ver
            </button>
            <button
              onClick={() =>
                handleEditClick(filteredRecords.find((r) => r.id === showMenu))
              }
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-blue-600 hover:bg-gray-50"
            >
              <Edit className="w-4 h-4" />
              Editar
            </button>
            <button
              onClick={() =>
                handleDeleteClick(filteredRecords.find((r) => r.id === showMenu))
              }
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-gray-50"
            >
              <Trash2 className="w-4 h-4" />
              Excluir
            </button>
          </div>
        )}

        {/* --- Modal de Exclusão --- */}
        {selectedRecord && action === "excluir" && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[10000]">
            <div className="bg-white rounded-xl p-6 shadow-lg w-[90%] max-w-sm relative">
              <button
                onClick={() => setSelectedRecord(null)}
                className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                Confirmar exclusão
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.
              </p>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="px-4 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-500 transition"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- Modal de Edição --- */}
        {selectedRecord && action === "editar" && (
          <RecordCreator
            fields={fields}
            subFields={subFields}
            record={selectedRecord}
            submodule_id={selectedRecord.submodule_id}
            fetchRecords={fetchRecords}
            isOpen={action}
            onClose={() => setAction("")}
            creating={true}
          />
        )}
        {selectedRecord && action === "view" && (
          <RecordViewModal
            fields={fields}
            subFields={subFields}
            record={selectedRecord}
            fetchRecords={fetchRecords}
            isOpen={action}
            onClose={() => setAction("")}
          />
        )}
      </div>

    </div>
  );
}
