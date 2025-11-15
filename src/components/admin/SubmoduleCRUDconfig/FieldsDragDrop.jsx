// FieldsDragDrop.jsx
import React from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';

export default function FieldsDragDrop({ fields, setFields, submoduleId }) {
  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const newFields = Array.from(fields);
    const [movedField] = newFields.splice(result.source.index, 1);
    newFields.splice(result.destination.index, 0, movedField);

    setFields(newFields);
  };

  const saveOrder = async () => {
  try {
    // Mapeia a ordem atual
    const updatedFields = fields.map((field, index) => ({
      id: field.id,
      order: index + 1,
    }));

    // Atualiza todas as posições com um único loop usando upsert
    const { error } = await supabase
      .from("submodule_fields")
      .upsert(updatedFields, { onConflict: "id" }); // garante que atualiza pelo id

    if (error) throw error;

    alert("Ordem salva com sucesso!");
  } catch (err) {
    console.error(err);
    alert("Erro ao salvar ordem");
  }
};


  const saveRequired = async(field) => {
    const newFields = Array.from(fields);
    field.required = !field.required
    setFields(newFields);
    await supabase
    .from('submodule_fields')
    .update({ required: field.required })
    .eq('id', field.id);
  }
  const sortedFields = [...fields].sort((a, b) => {
      if (a.order == null && b.order == null) return 0;
      if (a.order == null) return 1;
      if (b.order == null) return -1;
      return a.order - b.order;
    });
    console.log(sortedFields)

  return (
    <div className="bg-white p-4 rounded-xl shadow-md border border-gray-200">
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="fields-droppable">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
              {sortedFields.map((field, index) => (
                <Draggable key={field.id} draggableId={field.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        snapshot.isDragging ? 'bg-gray-100 shadow-md' : 'bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 justify-between w-full">
                        <div className="flex items-center gap-2 justify-between">
                          <GripVertical className="w-5 h-5 text-gray-400 cursor-grab" />
                          <span className="font-medium text-gray-800 truncate max-w-[120px]">{field.name}</span>
                          <span className="text-sm text-gray-500 ml-2">{field.field_type}</span>
                        </div>
                        <button className="text-sm text-gray-500 ml-2"
                        onClick={()=> {
                          saveRequired(field)
                        }}
                        >
                          <span
                          className={`text-xs font-medium px-2 py-1 rounded-full ${
                            field.required ? "bg-green-500 text-white" : "bg-gray-300 text-gray-700"
                          }`}
                        >
                          required
                        </span>


                        </button>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <Button className="mt-4 w-full" onClick={saveOrder}>
        Salvar Ordem
      </Button>
    </div>
  );
}
