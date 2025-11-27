import { useState, useRef } from "react";

export default function ArrastaeSolta() {
  const [columns, setColumns] = useState({
    todo: [{ id: 1, text: "Tarefa 1" }, { id: 2, text: "Tarefa 2" }],
    doing: [{ id: 3, text: "Tarefa 3" }],
    done: [{ id: 4, text: "Tarefa 4" }],
  });

  const dragItem = useRef(null); // { col, index }

  function handleDragStart(col, index) {
    dragItem.current = { col, index };
  }

  function handleDrop(col) {
    const from = dragItem.current;
    if (!from) return;

    const card = columns[from.col][from.index];

    // remover do antigo
    const newFromCol = [...columns[from.col]];
    newFromCol.splice(from.index, 1);

    // adicionar no novo
    const newToCol = [...columns[col], card];

    setColumns(prev => ({
      ...prev,
      [from.col]: newFromCol,
      [col]: newToCol
    }));

    dragItem.current = null;
  }

  return (
    <div style={{ display: "flex", gap: 20, padding: 20 }}>
      {Object.keys(columns).map(col => (
        <div
          key={col}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop(col)}
          style={{
            width: 250,
            minHeight: 200,
            padding: 10,
            background: "#f0f0f0",
            borderRadius: 8,
          }}
        >
          <h3 style={{ textTransform: "uppercase" }}>{col}</h3>

          {columns[col].map((card, index) => (
            <div
              key={card.id}
              draggable
              onDragStart={() => handleDragStart(col, index)}
              style={{
                background: "white",
                padding: 10,
                marginBottom: 8,
                borderRadius: 6,
                cursor: "grab",
                border: "1px solid #ddd",
              }}
            >
              {card.text}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
