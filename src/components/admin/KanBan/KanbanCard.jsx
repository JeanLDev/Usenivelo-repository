import { MoreVertical, User } from "lucide-react";
import { Draggable } from "react-beautiful-dnd";
import { useEffect, useRef } from "react";

export default function KanbanCard({
  card,
  index,
  canMoveStep,
  usuarios,
  companies,
  submodules,
  step,
  canView,
  canEdit,
  canDelete,
  openMenuCardId,
  setOpenMenuCardId,
  selectSubmoduleButton,
  setRecord,
  setCanEdit,
  setOnlyView,
  handleReloadKanban,
  supabase,
}) {
  const d = card.data || {};
  const title = d.title;
  const subtitle = d.description;

  const creatorCard = usuarios.find((user) => user.id === card.created_by);
  const CompanieCreator = companies.find((c) => c.id === creatorCard?.company_id);
  const avatar = CompanieCreator?.logo;
  const cardRef = useRef(null);

  // Fechar menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (cardRef.current && !cardRef.current.contains(e.target)) {
        if (openMenuCardId === card.id) setOpenMenuCardId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [card.id, openMenuCardId, setOpenMenuCardId]);

  return (
    <Draggable
      key={card.id}
      draggableId={card.id}
      index={index}
      isDragDisabled={!canMoveStep}
    >
      {(provided) => (
        <div
          ref={(el) => {
            provided.innerRef(el);
            cardRef.current = el;
          }}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className="group relative p-3 rounded-lg border border-gray-300 bg-white shadow-md hover:shadow-md 
            transition cursor-pointer select-none flex flex-col justify-between space-y-2 ml-2 mr-2 border border-gray-200 mb-4"
          onClick={() =>
            setOpenMenuCardId((prev) => (prev === card.id ? null : card.id))
          }
        >
          {/* Top: avatar */}
          <div className="flex justify-between items-center">
            <div>
              {avatar ? (
                <img
                  src={avatar}
                  className="w-10 h-10 border border-gray-300 rounded-full object-cover"
                />
              ) : (
                <div className="w-6 h-6 border border-gray-200 rounded-full">
                  <User />
                </div>
              )}
            </div>
            <div className="flex flex-col space-y-3 flex-1 min-w-0 ml-3">
              <div className="text-sm font-bold text-gray-800 whitespace-nowrap overflow-hidden text-ellipsis w-full mt-3">
                {title}
              </div>

              {subtitle && (
                <div className="text-xs text-gray-500 truncate max-w-[200px] overflow-hidden whitespace-nowrap">
                  {subtitle}
                </div>
              )}
            </div>

            {/* Menu */}
            {openMenuCardId === card.id && (
              <div
                className="absolute right-0 mt-10 w-28 bg-white border border-gray-200 shadow-lg rounded-md z-50"
                onClick={(e) => e.stopPropagation()} // previne fechar ao clicar dentro
              >
                {canView && (
                  <button
                    className="text-left w-full px-3 py-2 hover:bg-gray-100"
                    onClick={() => {
                      const sub = submodules.find((i) => i.id === card.submodule_id);
                      selectSubmoduleButton(sub ? sub : "main", step.id);
                      setRecord({ data: card.data, ...card });
                      setOpenMenuCardId(null);
                      setOnlyView(true);
                    }}
                  >
                    Ver
                  </button>
                )}

                {canEdit && (
                <button
                  className="text-left w-full px-3 py-2 hover:bg-gray-100"
                  onClick={() => {
                    // Procura o submodule, se não existir cria um "placeholder"
                    const sub = submodules.find((i) => i.id === card.submodule_id) || { id: null, name: "Novo Submódulo" };

                    // Chama a função passando o submodule encontrado ou placeholder
                    selectSubmoduleButton(sub, step.id);
                    // Atualiza o record e estado de edição
                    setRecord({ data: card.data, ...card });
                    setCanEdit(true);
                    setOpenMenuCardId(null);
                    setOnlyView(false);
                  }}
                >
                  Editar
                </button>
              )}


                {canDelete && (
                  <button
                    className="text-left w-full px-3 py-2 hover:bg-gray-100 text-red-500"
                    onClick={async () => {
                      try {
                        await supabase.from("kanban_cards").delete().eq("id", card.id);

                        if (card.record_id) {
                          await supabase
                            .from("submodule_records")
                            .delete()
                            .eq("id", card.record_id);
                        }

                        setOpenMenuCardId(null);
                        handleReloadKanban();
                      } catch (err) {
                        console.error("Erro deletando card:", err);
                        alert("Erro ao deletar");
                      }
                    }}
                  >
                    Deletar
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Título / subtítulo */}
          <div className="flex flex-col w-full space-y-2">
            

            {/* Rodapé */}
            <div className="flex items-center pt-0.5 border-t space-x-1 mt-0.5">
              <div className="flex items-center gap-2 mt-2 text-xs text-gray-600">
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  💬 {card.data?.comments?.length || 0}
                </div>
                <div className="flex text-xs text-gray-600">
                  ✅ {card.data?.checklist?.filter((i) => i.done).length || 0}/
                  {card.data?.checklist?.length || 0}
                </div>
              </div>
            </div>

            {/* Labels */}
            <div className="flex gap-1 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {card.data?.labels?.map((label, idx) => (
                <span
                  key={idx}
                  className="text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
                  style={{ backgroundColor: label.color, color: "#fff" }}
                >
                  {label.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}
