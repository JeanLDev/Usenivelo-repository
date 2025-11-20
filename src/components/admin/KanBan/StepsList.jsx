  import React, { useState, useEffect } from "react";
  import { Trash2, ArrowUp, ArrowDown, Plus, Edit2, Check, Settings } from "lucide-react";
  import { Button } from "@/components/ui/button";
  import { useParams } from "react-router-dom";
  import { supabase } from "@/lib/customSupabaseClient";
  import PermissionCard from "./PermissionCard";
  import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";



  export default function StepsList() {
    const { kanban_id } = useParams();
    const [kanban, setKanban] = useState({})
    const [steps, setSteps] = useState([]);
    const [newStep, setNewStep] = useState("");
    const [editingIndex, setEditingIndex] = useState(null);
    const [editValue, setEditValue] = useState("");
    const [users, setUsers] = useState([]); // usuários com permissões no kanban
    const [userPerms, setUserPerms] = useState({}); // { stepId: [userId,...] }
    const [refresh, setRefresh] = useState(0)
    const [loading, setLoading] = useState(true)
    const [step, setStep] = useState()

    // Carregar etapas e permissões
    const fetchSteps = async () => {
      try { 
        //pegar kanban
        const {data:kanban, error:errKanban} = await supabase
        .from("submodules")
        .select('*')
        .eq('id',kanban_id)
        .single()

        if(errKanban) throw errKanban
        // 🔹 Pegar etapas
        const { data: stepsData, error: stepsError } = await supabase
          .from("kanban_steps")
          .select("*")
          .eq("kanban_id", kanban_id)
          .order("position", { ascending: true });

        if (stepsError) throw stepsError;
        // 🔹 Pegar usuários com permissões no kanban
        const { data: userPerms, error: userPermsError } = await supabase
          .from("kanban_steps_permissions")
          .select("*")
          .in('step_id', stepsData.map((u)=> u.id))

        const {data:users,error:userError} = await supabase
        .from("users")
        .select('*')
        .in('id', userPerms.map((u)=>u.user_id))

        if (errKanban) throw userPermsError;

        setUsers(users)
        setSteps(stepsData || []);
        setUserPerms(userPerms)
        setKanban(kanban)

        setLoading(false)
      } catch (err) {
        console.error(err);
      }
    };

    useEffect(() => {
      fetchSteps();
    }, []);

    // 🔹 Adicionar nova etapa
    const addStep = async () => {
      if (!newStep.trim()) return;
      const { data: inserted, error } = await supabase
        .from("kanban_steps")
        .insert([{ kanban_id, name: newStep, position: steps.length }])
        .select()
        .single();
      if (error) return console.error(error);

      setNewStep("");
      fetchSteps();
    };

  

  const [openUser, setOpenUser] = useState({});
  const [newPermission, setNewPermission] = useState(false)

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

    fetchSteps(); // Atualiza lista
  } catch (err) {
    console.error(err);
  } finally {
    setEditingIndex(null);
  }
};

  const handleDragEnd = async (result) => {
  if (!result.destination) return;

  const reordered = Array.from(steps);
  const [moved] = reordered.splice(result.source.index, 1);
  reordered.splice(result.destination.index, 0, moved);

  // ajusta as posições visualmente
  const updated = reordered.map((step, index) => ({
    ...step,
    position: index
  }));

  setSteps(updated);

  // 🔥 apenas 1 operação no banco
  await supabase
    .from("kanban_steps")
    .upsert(
      updated.map((s) => ({
        id: s.id,
        position: s.position
      })),
      { onConflict: "id" }
    );
};

 

  const etapasComUsuarios = steps.map((etapa) => {
  // Pega as permissões dessa etapa
  const permsDaEtapa = userPerms.filter((perm) => perm.step_id === etapa.id);

  // Para cada permissão, juntamos os dados do usuário
  const usuariosComDados = permsDaEtapa.map((perm) => {
    const usuario = users.find((u) => u.id === perm.user_id);
    return {
      perm_id: perm.id,
      user_id: perm.user_id,
      email: usuario?.email ?? "sem email",
      move: perm.move,
      edit: perm.edit,
      view: perm.view,
      create:perm.create,
      delete:perm.delete,
      step_id:perm.step_id
    };
  });

  return {
    ...etapa,
    usuarios: usuariosComDados,
  };


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
      <div
        className="space-y-4"
        ref={provided.innerRef}
        {...provided.droppableProps}
      >
        {etapasComUsuarios.map((etapa, index) => (
          <Draggable key={etapa.id} draggableId={String(etapa.id)} index={index}>
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.draggableProps}
                {...provided.dragHandleProps}
                className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                {/* ---- SEU COMPONENTE AQUI ---- */}

                {/* Header da etapa */}
                <div className="flex justify-between items-center mb-3">
                  <div>
                    {editingIndex === etapa.id ? (
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleRenameStep(etapa.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRenameStep(etapa.id);
                        }}
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
                            .update({ public: e.target.value })
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

                        await supabase
                          .from("kanban_steps_permissions")
                          .delete()
                          .eq("step_id", etapa.id);

                        await supabase
                          .from("kanban_steps")
                          .delete()
                          .eq("id", etapa.id);
                          fetchSteps()
                      }}
                    />

                    <input
                      type="color"
                      className="w-5 h-5"
                      defaultValue={etapa.color ? etapa.color : '#ffff'}
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
                        setStep(etapa)
                        setNewPermission(etapa.id)}}
                      className="flex items-center gap-1 text-sm"
                    >
                      <Plus className="w-4 h-4" /> Usuário
                    </Button>

                  </div>
                </div>

                {/* resto do conteúdo da etapa... */}
                {newPermission && step.id === etapa.id && 

                <PermissionCard setNewPermission={()=> setNewPermission(false)} fetchSteps={fetchSteps} step={step}/>}
                <div>
                  {etapa.usuarios.length > 0 && (
                  <ul className="space-y-1 text-sm">
                    {etapa.usuarios
                      .filter((step) => step.user_id != kanban.user_id)
                      .map((user, index) => {
                        return (
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
                                      [etapa.id]:
                                        prev[etapa.id] === user.user_id
                                          ? null
                                          : user.user_id,
                                    }))
                                  }
                                  className="px-2 py-1 border rounded bg-gray-100 dark:bg-gray-800 text-sm"
                                >
                                  <Settings />
                                </button>

                                {openUser[etapa.id] === user.user_id && (
                                  <div className="absolute right-0 mt-1 w-44 p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded shadow-lg space-y-2 z-10">
                                    {[
                                      "move",
                                      "edit",
                                      "view",
                                      "create",
                                      "delete",
                                    ].map((permKey) => (
                                      <label
                                        key={permKey}
                                        className="flex items-center gap-2 text-sm"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={user[permKey]}
                                          onChange={async () => {
                                            const newValue = !user[permKey];
                                            etapa.usuarios[index][permKey] =
                                              newValue;
                                            setRefresh((r) => r + 1);

                                            await supabase
                                              .from(
                                                "kanban_steps_permissions"
                                              )
                                              .update({ [permKey]: newValue })
                                              .eq("step_id", user.step_id)
                                              .eq("user_id", user.user_id);
                                          }}
                                          className="h-4 w-4 rounded border-gray-400"
                                        />
                                        {permKey
                                          .charAt(0)
                                          .toUpperCase() +
                                          permKey.slice(1)}
                                      </label>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Botão de apagar usuário */}
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={async () => {
                                  if (
                                    !confirm(
                                      `Deseja realmente remover ${user.email} da etapa ${etapa.name}?`
                                    )
                                  )
                                    return;

                                  await supabase
                                    .from("kanban_steps_permissions")
                                    .delete()
                                    .eq("step_id", user.step_id)
                                    .eq("user_id", user.user_id);

                                  fetchSteps()
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </li>
                        );
                      })}
                  </ul>
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


     

</div>

    );
  }
