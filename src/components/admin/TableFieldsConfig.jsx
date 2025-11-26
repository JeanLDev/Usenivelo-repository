import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, Save, GripVertical } from "lucide-react";
import { supabase } from "@/lib/customSupabaseClient";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { useParams } from "react-router-dom";

export default function TableFieldsConfig() {
  const [fields, setFields] = useState([]);
  const { submoduleId } = useParams();
  const [visibleFields, setVisibleFields] = useState({});
  const [loading, setLoading] = useState(true);

  // --- CARREGAR FIELDS ---
  useEffect(() => {
    const fetchFields = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("submodule_fields")
        .select("*")
        .eq("submodule_id", submoduleId)
        .order("order", { ascending: true });

      if (error) console.error(error);
      else {
        let ordered = data;

        // Se algum não tiver order → gerar order automaticamente
        if (data.some((f) => f.order === null || f.order === undefined)) {
          ordered = data
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((f, idx) => ({ ...f, order: idx + 1 }));

          // Atualiza no DB
          for (const f of ordered) {
            await supabase
              .from("submodule_fields")
              .update({ order: f.order })
              .eq("id", f.id);
          }
        }

        setFields(ordered);

        const saved = ordered.reduce((acc, f) => {
          acc[f.id] = f.show_in_table || false;
          return acc;
        }, {});
        setVisibleFields(saved);
      }

      setLoading(false);
    };

    fetchFields();
  }, [submoduleId]);

  // --- DRAG & DROP ---
  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const reordered = Array.from(fields);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);

    // Reatribuir ordem sequencial
    const updated = reordered.map((f, idx) => ({
      ...f,
      order: idx + 1,
    }));

    setFields(updated);
  };

  const handleToggle = (fieldId, checked) => {
    setVisibleFields((prev) => ({
      ...prev,
      [fieldId]: checked,
    }));
  };

  // --- SALVAR ---
  const handleSave = async () => {
    setLoading(true);
    

    // Atualiza visibilidade e ordem
    for (const f of fields) {
      await supabase
        .from("submodule_fields")
        .update({
          show_in_table: visibleFields[f.id],
          order: f.order,
        })
        .eq("id", f.id);
    }

    setLoading(false);
  };

  if (loading)
    return (
      <div className="text-center text-muted-foreground py-10">
        Carregando...
      </div>
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-blue-500" />
          Configurar Colunas da Tabela
        </CardTitle>
      </CardHeader>

      <Separator />

      <CardContent className="space-y-4 mt-4">
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="fields">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps}>
                {fields.map((field, index) => (
                  <Draggable
                    key={field.id}
                    draggableId={String(field.id)}
                    index={index}
                  >
                    
                    {(provided) => (
                      <div
                        className="flex items-center justify-between p-2 border rounded-md mb-2 bg-white"
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                      >
                        <div className="flex items-center gap-3">
                          {/* Ícone de arrastar */}
                          <div
                            {...provided.dragHandleProps}
                            className="cursor-grab text-gray-400 hover:text-gray-600"
                          >
                            <GripVertical className="w-5 h-5" />
                          </div>

                          {/* Nome + ID */}
                          <Label className="font-semibold">
                            {field.name}
                          </Label>
                        </div>

                        <div className="flex items-center gap-2">
                          <Switch
                            checked={visibleFields[field.id] || false}
                            onChange={(checked) =>
                              handleToggle(field.id, checked)
                            }
                          />

                          {visibleFields[field.id] ? (
                            <Eye className="w-4 h-4 text-green-500" />
                          ) : (
                            <EyeOff className="w-4 h-4 text-gray-400" />
                          )}
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

        <Separator className="my-4" />

        <Button
          onClick={handleSave}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          Salvar Configuração
        </Button>
      </CardContent>
    </Card>
  );
}
