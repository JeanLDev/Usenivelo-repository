import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/customSupabaseClient";
import KanbanCard from "../KanbanCard";
import KanbanCardVisual from "./KanbanCardVisual";

export default function FluxKanban({ steps, cards }) {
  const [columns, setColumns] = useState({});
  const dragItem = useRef(null); // { colId, index }
  // ==========================
  //   FORMATAR STEPS & CARDS
  // ==========================
  useEffect(() => {
    const formatted = {};

    // 1) Criar colunas com base nos steps
    steps.forEach(step => {
      formatted[step.id] = {
        ...step,
        id: step.id,
        name: step.name,
        cards: []
      };
    });

    // 2) Cards veio como objeto → vira array
    const cardsArray = Object.values(cards);

    // 3) Encaixar cards dentro das colunas corretas
    cardsArray.forEach(card => {
      if (!formatted[card.step_id]) return;

      formatted[card.step_id].cards.push({
        id: card.id,
        title: card.data?.title || "Sem título",
        position: card.position ?? 0,
        step_id: card.step_id??0,
        ...card.data
      });
    });

    // Ordenar por posição
    Object.keys(formatted).forEach(colId => {
      formatted[colId].cards.sort((a, b) => a.position - b.position);
    });

    setColumns(formatted);
  }, [steps, cards]);


  async function saveCardMovement(card) {
    try {
        const { data, error } = await supabase
            .from("kanban_cards")
            .update({
                step_id: card.step_id,
                position: card.position
            })
            .eq("id", card.id)
            .select()

        if (error) {
            console.log("Erro ao atualizar card:", error);
        } else {
            console.log("Card atualizado:", data);
        }

    } catch (err) {
        console.log("Erro inesperado:", err);
    }
}



  // ==========================
  //         DRAG START
  // ==========================
  function handleDragStart(colId, index,e) {
    e.dataTransfer.setData("text/plain", ""); // NECESSÁRIO
    dragItem.current = { colId, index };
  }

  // ==========================
  //         DROP
  // ==========================
  function handleDrop(targetColId) {
  const from = dragItem.current;
  if (!from) return;

  const sourceCol = columns[from.colId];
  const targetCol = columns[targetColId];
  const movedCard = sourceCol.cards[from.index];

  const newSourceCards = [...sourceCol.cards];
  newSourceCards.splice(from.index, 1);

  const newTargetCards = [...targetCol.cards.filter(c => c.id !== movedCard.id), movedCard];

  // Atualiza posições corretamente
  const updatedSource = newSourceCards.map((c, i) => ({ ...c, position: i }));
  const updatedTarget = newTargetCards.map((c, i) => ({ ...c, position: i }));

  const updatedMovedCard = { ...movedCard, step_id: targetColId, position: updatedTarget.length - 1 };

  setColumns(prev => ({
    ...prev,
    [from.colId]: { ...sourceCol, cards: updatedSource },
    [targetColId]: { ...targetCol, cards: updatedTarget }
  }));

  // Salva todas as posições no banco
  [...updatedSource, ...updatedTarget].forEach(async card => {
    try {
      const { error } = await supabase
        .from("kanban_cards")
        .update({ step_id: card.step_id, position: card.position })
        .eq("id", card.id);

      if (error) console.log("Erro ao atualizar card:", error);
    } catch (err) {
      console.log("Erro inesperado:", err);
    }
  });

  dragItem.current = null;
}



  // ==========================
  //         RENDER
  // ==========================
  return (
    <div style={{ display: "flex", gap: 20 }}>
      {Object.keys(columns).map(colId => {
        const col = columns[colId];

        return (
          <div
            key={colId}
            className="column"
            onDragOver={e => e.preventDefault()}
            onDrop={() => handleDrop(colId)}
            style={{ backgroundColor: `${col.color}60` ,width: 310}}
          >
            <div className="text-sm font-semibold bg-white  p-7 rounded-md mb-3 shadow-md"
             style={{ backgroundColor: `${col.color}`}}
            >
                <h2>{col.name}</h2>
            </div>



           {col.cards.map((card, index) => {
            const doneItems = card?.checklist?.filter(item => item.done) || [];

            return (
              <div
                key={card.id}
                draggable
                onDragStart={(e) => handleDragStart(colId, index, e)}
                className="cursor-grab active:cursor-grabbing"
              >
                <KanbanCardVisual
                  title={card.title}
                  subtitle={card.description}
                  avatar="https://i.pravatar.cc/300"
                  comments={card?.comments?.length}
                  checklistDone={doneItems.length}
                  checklistTotal={card?.checklist?.length}
                  labels={card.labels}
                />
              </div>
            );
          })}

          </div>
        );
      })}
    </div>
  );
}
