import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/customSupabaseClient";
import KanbanCard from "../KanbanCard";
import { SplitButton } from "./buttonNewCard";

export default function KanbanRe({
  steps,
  cards,
  kanban,
  stepsPerms,
  usuarios,
  companies,
  usuarioComSubmodules,
  activeFilter,
  periodo,
  selectSubmodule,
  selectSubmoduleButton,
  setFormData,
  handleReloadKanban,
  submodules,
  setRecord,
  setCanEdit,
  setOnlyView,
  openMenuCardId,
  setOpenMenuCardId,
  user,
  fields,
  subFields
}) {
  const [columns, setColumns] = useState({});
  const dragItem = useRef(null);
  const [editingTitle, setEditingTitle] = useState(null);
  const [editTitleValue, setEditTitleValue] = useState("");
  const [openSubmoduleDropdown, setOpenSubmoduleDropdown] = useState(null);
  const [currentStep, setCurrentStep] = useState(null);

  // ==========================
  // FORMATAR STEPS & CARDS
  // ==========================

  

  

  
  useEffect(() => {
    const formatted = {};
    steps.forEach(step => {
      formatted[step.id] = { ...step, cards: [] };
    });

    Object.values(cards).forEach(card => {
      if (!formatted[card.step_id]) return;
      formatted[card.step_id].cards.push({ ...card, ...card.data });
    });

    Object.keys(formatted).forEach(colId => {
      formatted[colId].cards.sort((a, b) => a.position - b.position);
    });

    setColumns(formatted);
  }, [steps, cards]);

  // ==========================
  // SAVE MOVEMENT
  // ==========================
  async function saveCardMovement(card) {
    try {
      const { data, error } = await supabase
        .from("kanban_cards")
        .update({ step_id: card.step_id, position: card.position })
        .eq("id", card.id)
        .select();

      if (error) console.log("Erro ao atualizar card:", error);
    } catch (err) {
      console.log("Erro inesperado:", err);
    }
  }
  // ==========================
  // DRAG & DROP NATIVO
  // ==========================
  function handleDragStart(colId, index, e, canMoveStep) {
    if (!canMoveStep) return;
    e.dataTransfer.setData("text/plain", "");
    dragItem.current = { colId, index };
  }

 function handleDrop(targetColId, toIndex = null) {
  const from = dragItem.current;
  if (!from) return;

  const sourceCol = columns[from.colId];
  const targetCol = columns[targetColId];
  const movedCard = sourceCol.cards[from.index];

  // Remove o card da coluna de origem
  const newSourceCards = [...sourceCol.cards];
  newSourceCards.splice(from.index, 1);

  // Insere na coluna de destino na posição correta
  const newTargetCards = [...targetCol.cards.filter(c => c.id !== movedCard.id)];
  const insertIndex = toIndex !== null ? toIndex : newTargetCards.length;
  newTargetCards.splice(insertIndex, 0, movedCard);

  // Atualiza posições localmente
  const updatedSource = newSourceCards.map((c, i) => ({ ...c, position: i }));
  const updatedTarget = newTargetCards.map((c, i) => ({ ...c, position: i }));

  setColumns(prev => ({
    ...prev,
    [from.colId]: { ...sourceCol, cards: updatedSource },
    [targetColId]: { ...targetCol, cards: updatedTarget }
  }));

  // Salva apenas o card que foi movido
  const updatedMovedCard = { ...movedCard, step_id: targetColId, position: insertIndex };
  saveCardMovement(updatedMovedCard);

  dragItem.current = null;
}


async function saveStepTitle(stepId, newTitle) {
  try {
    // Atualiza localmente
    setColumns(prev => ({
      ...prev,
      [stepId]: {
        ...prev[stepId],
        title: newTitle,
        name: newTitle, // caso você use 'name' no render
      },
    }));

    // Atualiza no banco
    const { data, error } = await supabase
      .from("kanban_steps") // sua tabela de steps
      .update({ name: newTitle })
      .eq("id", stepId)
      .select();

    if (error) console.log("Erro ao atualizar step:", error);
    else console.log("Step atualizado:", data);
  } catch (err) {
    console.log("Erro inesperado:", err);
  }
}



  // ==========================
  // RENDER
  // ==========================
  return (
    <div className="mx-0 sm:mx-0 md:mx-3 flex gap-4 overflow-x-auto min-h-[100vh] sm:mx-6 md:ml-0" >
      {steps.map(step => {
        const column = columns[step.id];
        if (!column) return null;

        const isOwner = user?.id === kanban.user_id;
        const isOwnerStep = user?.id === step.user_id


        const stepUsers = stepsPerms.filter(p => p.step_id === step.id && p.user_id === user?.id);

        // Define permissões
        const canMoveStep = isOwner ? true : stepUsers[0]?.move ?? false;
        const canCreate   = isOwner ? true : stepUsers[0]?.create ?? false;
        const canEdit     = isOwner ? true : stepUsers[0]?.edit ?? false;
        const canView     = isOwner ? true : stepUsers[0]?.view ?? false;
        const canDelete   = isOwner ? true : stepUsers[0]?.delete ?? false;

        // Só oculta se não for dono e não tiver permissão de visualização


        if (!isOwner && !canView && !isOwnerStep) return null;


        const permittedUsers = (stepsPerms || [])
          .filter(p => p.step_id === step.id)
          .map(p => (usuarios || []).find(u => u?.id === p.user_id))
          .filter(Boolean);

        const permittedCompanies = permittedUsers
          .map(u => (companies || []).find(c => c?.id === u.company_id))
          .filter(Boolean);



        return (
          <div
            key={step.id}
            className="flex-shrink-0 rounded-md w-72 sm:w-72 md:w-80 pb-5"
            style={{ backgroundColor: `${step.color}60` }}
            onDragOver={e => e.preventDefault()}
            onDrop={() => handleDrop(step.id)}

          >
            {/* HEADER */}
            <div className="flex justify-between items-center p-5 shadow-md border border-gray-300 rounded-sm z-20"
              style={{ backgroundColor: step.color }}>
              <div className="flex items-center gap-2">
                {editingTitle === step.id ? (
                  <input
                    type="text"
                    value={editTitleValue}
                    onChange={e => setEditTitleValue(e.target.value)}
                    onBlur={() => {
                      setEditingTitle(null);
                      saveStepTitle(step.id, editTitleValue);
                    }}
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        setEditingTitle(null);
                        saveStepTitle(step.id, editTitleValue);
                      }
                    }}
                    autoFocus
                    className="font-bold border-b border-gray-300 focus:outline-none focus:border-purple-500 bg-transparent w-full"
                  />

                ) : (
                  <h2
                    className="font-bold cursor-pointer hover:underline"
                    onClick={() => { setEditingTitle(step.id); setEditTitleValue(step.title); }}
                  >
                    {column.name}
                  </h2>
                )}
              </div>

              {/* Avatares */}
              <div className="flex -space-x-2">
                {permittedCompanies.map((comp, i) => (
                  <div key={i} className="relative group">
                    <img
                      src={comp.logo_url || comp.logo}
                      className="w-6 h-6 rounded-full border-2 border-white object-cover"
                    />
                    <div className="absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-100">
                      {comp.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Botão Novo Card */}
            {canCreate && (
              <SplitButton
                mainLabel="Novo Card"
                 onMainClick={() =>  {
                    selectSubmodule('main', step.id)
                    setRecord([]);
                    setOnlyView(false);
                    if(isOwner) setCanEdit(true)
                }}
                options={usuarioComSubmodules?.submodules
                  ?.filter((sub)=> sub.name != 'sem nome')
                  ?.map(sub => ({
                  label: sub.name,
                  submodule: sub
                }))}
                onSelect={({ submodule }) => {
                   setCanEdit(canEdit)
                    setOpenSubmoduleDropdown(null);
                    setCurrentStep(step);
                    setFormData(prev => ({ ...prev, _submodule_id: submodule.submodule_id }));
                    selectSubmodule(submodule, step.id);
                    setRecord([]);
                    setOnlyView(false);
                }}
              />
            )}

            {/* CARDS */}
            {column.cards
              .filter(card => {
                if (!card) return false;

                // FILTRO POR CAMPO
                if (activeFilter?.column && activeFilter?.value) {
                  const fieldValue = card[activeFilter.column]?.toString().toLowerCase() || "";
                  const filterVal = activeFilter.value.toLowerCase();

                  switch (activeFilter.operator) {
                    case "=": if (fieldValue !== filterVal) return false; break;
                    case "!=": if (fieldValue === filterVal) return false; break;
                    case "contains": if (!fieldValue.includes(filterVal)) return false; break;
                    case ">": if (Number(fieldValue) <= Number(filterVal)) return false; break;
                    case "<": if (Number(fieldValue) >= Number(filterVal)) return false; break;
                  }
                }

                // FILTRO POR PERÍODO
                const dataCard = new Date(card.created_at).toISOString().split("T")[0];
                const start = periodo.start ? new Date(periodo.start).toISOString().split("T")[0] : null;
                const end = periodo.end ? new Date(periodo.end).toISOString().split("T")[0] : null;

                if (start && !end) return dataCard === start;
                if (start && end) return dataCard >= start && dataCard <= end;
                return true;
              })
              .map((card, index) => (
                <div
                  key={card.id}
                  draggable={canMoveStep}
                  onDragStart={e => handleDragStart(step.id, index, e, canMoveStep)}
                  onDrop={() => handleDrop(step.id, index)}
                  className={`mb-3 ${canMoveStep ? "cursor-grab active:cursor-grabbing" : "cursor-not-allowed opacity-60"}`}
                >
                   <KanbanCard
                    card={card} // o card já veio do ma
                    canMoveStep={canMoveStep}
                    usuarios={usuarios}
                    companies={companies}
                    submodules={submodules}
                    step={step}
                    canView={canView}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    openMenuCardId={openMenuCardId}
                    setOpenMenuCardId={setOpenMenuCardId}
                    selectSubmoduleButton={selectSubmoduleButton}
                    setRecord={setRecord}
                    setCanEdit={setCanEdit}
                    setOnlyView={setOnlyView}
                    handleReloadKanban={handleReloadKanban}
                    supabase={supabase}
                    usuarioComSubmodules={usuarioComSubmodules}
                    fields={fields}
                    subFields={subFields}
                    />
                </div>
              ))}
          </div>
        );
      })}
    </div>
  );
}
