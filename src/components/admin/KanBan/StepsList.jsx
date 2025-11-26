import React, { useState, useEffect } from "react";
import { Trash2, Plus, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/customSupabaseClient";
import PermissionCard from "./PermissionCard";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

export default function StepsList() {
  const { kanban_id } = useParams();
  const [kanban, setKanban] = useState({});
  const [steps, setSteps] = useState([]);
  const [newStep, setNewStep] = useState("");
  const [editingIndex, setEditingIndex] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [users, setUsers] = useState([]);
  const [userPerms, setUserPerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openUser, setOpenUser] = useState({});
  const [newPermission, setNewPermission] = useState(false);
  const [step, setStep] = useState();

  // Normaliza posições e protege nulls
  const normalizedSteps = steps
    .map((s, index) => ({ ...s, position: s.position != null ? s.position : index }))
    .sort((a, b) => a.position - b.position);

  const fetchSteps = async () => {
    try {
      const { data: kanbanData, error: errKanban } = await supabase
        .from("submodules")
        .select("*")
        .eq("id", kanban_id)
        .single();
      if (errKanban) throw errKanban;

      const { data: stepsData, error: stepsError } = await supabase
        .from("kanban_steps")
        .select("*")
        .eq("kanban_id", kanban_id)
        .order("position", { ascending: true });
      if (stepsError) throw stepsError;

      const { data: permsData, error: permsError } = await supabase
        .from("kanban_steps_permissions")
        .select("*")
        .in("step_id", stepsData.map((s) => s.id));
      if (permsError) throw permsError;

      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("*")
        .in("id", permsData.map((p) => p.user_id));
      if (usersError) throw usersError;

      setKanban(kanbanData || {});
      setSteps(stepsData || []);
      setUserPerms(permsData || []);
      setUsers(usersData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSteps();
  }, []);

  const addStep = async () => {
    if (!newStep.trim()) return;
    const { data: inserted, error } = await supabase
      .from("kanban_steps")
      .insert([{ kanban_id, name: newStep, position: normalizedSteps.length }])
      .select()
      .single();
    if (error) return console.error(error);
    setNewStep("");
    fetchSteps();
  };

  const handleRenameStep = async (stepId) => {
    if (!editValue.trim()) {
      setEditingIndex(null);
      return;
    }
    try {
      const { error } = await supabase
        .from("kanban_steps")
        .update({ name: editValue })
        .eq("id", stepId);
      if (error) throw error;
      fetchSteps();
    } catch (err) {
      console.error(err);
    } finally {
      setEditingIndex(null);
    }
  };

  const handleDragEnd = async (result) => {
  if (!result.destination) return;

  const sourceIndex = result.source.index;
  const destIndex = result.destination.index;

  // usa normalizedSteps (já ordenado) como fonte de verdade para a UI
  const current = Array.from(normalizedSteps);

  // segurança: índices válidos
  if (sourceIndex < 0 || sourceIndex >= current.length) return;
  if (destIndex < 0 || destIndex > current.length) return;

  // remove e insere na nova posição
  const [moved] = current.splice(sourceIndex, 1);
  current.splice(destIndex, 0, moved);

  // cria array com novas posições (0-based, igual ao que você já usa)
  const updated = current.map((s, idx) => ({ ...s, position: idx }));

  // Atualiza UI de forma otimista
  setSteps(updated);

  // Salva sequencialmente no banco — evita condições de corrida
  try {
    for (let i = 0; i < updated.length; i++) {
      const step = updated[i];
      const { error } = await supabase
        .from("kanban_steps")
        .update({ position: step.position })
        .eq("id", step.id);
      if (error) throw error;
    }

    // Recarrega do DB para garantir consistência (opcional, mas seguro)
    await fetchSteps();
  } catch (err) {
    console.error("Erro ao salvar posições das etapas:", err);
    // Se algo deu errado, recarrega do banco para restaurar estado consistente
    await fetchSteps();
  }
};


  const etapasComUsuarios = normalizedSteps.map((etapa) => {
    const permsDaEtapa = userPerms.filter((perm) => perm.step_id === etapa.id) || [];
    const usuariosComDados = permsDaEtapa.map((perm) => {
      const usuario = users.find((u) => u.id === perm.user_id);
      return {
        perm_id: perm.id,
        user_id: perm.user_id,
        email: usuario?.email ?? "sem email",
        move: perm.move,
        edit: perm.edit,
        view: perm.view,
        create: perm.create,
        delete: perm.delete,
        step_id: perm.step_id,
      };
    });
    return { ...etapa, usuarios: usuariosComDados };
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600 border-b-4 border-gray-200"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Adicionar Etapa */}
      <div className="flex items-center gap-3">
        <input
          value={newStep}
          onChange={(e) => setNewStep(e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          placeholder="Nome da nova etapa"
        />
        <Button onClick={addStep} className="gap-1">
          <Plus className="w-4 h-4" />
          Adicionar
        </Button>
      </div>

      {/* Lista de etapas */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="steps">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
              {etapasComUsuarios.map((etapa, index) => (
                <Draggable key={etapa.id} draggableId={String(etapa.id)} index={index}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm hover:shadow-md transition-shadow"
                    >
                      {/* Header da etapa */}
                      <div className="flex justify-between items-center mb-3">
                        <div>
                          {editingIndex === etapa.id ? (
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => handleRenameStep(etapa.id)}
                              onKeyDown={(e) => e.key === "Enter" && handleRenameStep(etapa.id)}
                              className="font-bold border-b border-gray-300 focus:outline-none focus:border-purple-500 bg-transparent w-full"
                            />
                          ) : (
                            <h2
                              className="font-bold cursor-pointer hover:underline"
                              onClick={() => {
                                setEditingIndex(etapa.id);
                                setEditValue(etapa.name);
                              }}
                            >
                              {etapa.name}
                            </h2>
                          )}
                          <input
                            type="checkbox"
                            className="mr-2"
                            defaultChecked={etapa.public}
                            onChange={async (e) => {
                              try {
                                const { error } = await supabase
                                  .from("kanban_steps")
                                  .update({ public: e.target.checked })
                                  .eq("id", etapa.id);
                                if (error) throw error;
                              } catch (err) {
                                console.error(err);
                              }
                            }}
                          />
                          <span>Pública</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Trash2
                            className="w-4 h-4 cursor-pointer text-red-500"
                            onClick={async () => {
                              if (!confirm(`Deseja realmente apagar a etapa "${etapa.name}"?`)) return;
                              await supabase.from("kanban_steps_permissions").delete().eq("step_id", etapa.id);
                              await supabase.from("kanban_steps").delete().eq("id", etapa.id);
                              fetchSteps();
                            }}
                          />

                          <input
                            type="color"
                            className="w-5 h-5"
                            defaultValue={etapa.color || "#ffffff"}
                            onChange={async (e) => {
                              try {
                                const { error } = await supabase
                                  .from("kanban_steps")
                                  .update({ color: e.target.value })
                                  .eq("id", etapa.id);
                                if (error) throw error;
                              } catch (err) {
                                console.error(err);
                              }
                            }}
                          />

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setStep(etapa);
                              setNewPermission(etapa.id);
                            }}
                            className="flex items-center gap-1 text-sm"
                          >
                            <Plus className="w-4 h-4" /> Usuário
                          </Button>
                        </div>
                      </div>

                      {/* Permissões */}
                      {newPermission && step?.id === etapa.id && (
                        <PermissionCard
                          setNewPermission={() => setNewPermission(false)}
                          fetchSteps={fetchSteps}
                          step={step}
                        />
                      )}

                      {/* Lista de usuários */}
                      {etapa.usuarios?.length > 0 && (
                        <ul className="space-y-1 text-sm">
                          {etapa.usuarios
                            .filter((u) => u.user_id !== kanban.user_id)
                            .map((user, idx) => (
                              <li
                                key={user.perm_id}
                                className="flex justify-between items-center border-b border-gray-200 dark:border-gray-800 pb-1 last:border-0"
                              >
                                <span>{user.email}</span>

                                <div className="flex items-center gap-2">
                                  {/* Menu de permissões */}
                                  <div className="relative">
                                    <button
                                      onClick={() =>
                                        setOpenUser((prev) => ({
                                          ...prev,
                                          [etapa.id]: prev[etapa.id] === user.user_id ? null : user.user_id,
                                        }))
                                      }
                                      className="px-2 py-1 border rounded bg-gray-100 dark:bg-gray-800 text-sm"
                                    >
                                      <Settings />
                                    </button>

                                    {openUser[etapa.id] === user.user_id && (
                                      <div className="absolute right-0 mt-1 w-44 p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded shadow-lg space-y-2 z-10">
                                        {["move", "edit", "view", "create", "delete"].map((permKey) => (
                                          <label key={permKey} className="flex items-center gap-2 text-sm">
                                            <input
                                              type="checkbox"
                                              checked={user[permKey]}
                                              onChange={async () => {
                                                const newValue = !user[permKey];
                                                etapa.usuarios[idx][permKey] = newValue;
                                                await supabase
                                                  .from("kanban_steps_permissions")
                                                  .update({ [permKey]: newValue })
                                                  .eq("step_id", user.step_id)
                                                  .eq("user_id", user.user_id);
                                                setRefresh((r) => r + 1);
                                              }}
                                              className="h-4 w-4 rounded border-gray-400"
                                            />
                                            {permKey.charAt(0).toUpperCase() + permKey.slice(1)}
                                          </label>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={async () => {
                                      if (!confirm(`Deseja realmente remover ${user.email} da etapa ${etapa.name}?`)) return;
                                      await supabase
                                        .from("kanban_steps_permissions")
                                        .delete()
                                        .eq("step_id", user.step_id)
                                        .eq("user_id", user.user_id);
                                      fetchSteps();
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </li>
                            ))}
                        </ul>
                      )}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}
