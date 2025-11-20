import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/customSupabaseClient";
import { Save, User, FileText, ChevronDown, ChevronUp, ArrowLeftSquare, ArrowLeft, X } from "lucide-react";
import { useParams } from "react-router-dom";
import { Switch } from "@/components/ui/switch";
import {Label} from "@/components/ui/label"
import {useToast} from "@/components/ui/use-toast"

export default function PermissionCard({setNewPermission, fetchSteps, step}) {
  const [selectedUserEmail, setSelectedUserEmail] = useState("");
  const [submodules, setSubmodules] = useState([]);
  const [formPermissions, setFormPermissions] = useState({});
  const {toast} = useToast();
  const [move, setMove] = useState(false)
  const [edit, setEdit] = useState(false)
  const [view, setView] = useState(false)
  const [create, setCreate] = useState(false)
  const [del, setDel] = useState(false)

  // Buscar submodules quando muda o email
  useEffect(() => {
    const fetchModules = async () => {

      const { data, error: userError } = await supabase.auth.getUser();

      const user = data?.user;

      if (userError || !user) return;

      // Pegar user pelo email
      const { data: dbUser, error: dbUserError } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (dbUserError || !dbUser) {
        setSubmodules([]);
        setFormPermissions({});
        console.error("Usuário não encontrado:", dbUserError);
        return;
      }

      // Pegar módulos do usuário
      const { data: modulesData, error: modulesError } = await supabase
        .from("modules")
        .select("*")
        .eq("user_id", dbUser.id);

      if (modulesError) {
        console.error("Erro ao buscar modules:", modulesError);
        return;
      }


      // Pegar submodules dos módulos encontrados
      const moduleIds = modulesData.filter(m => m.type !== "Padrão").map(m => m.id);

      if (moduleIds.length === 0) {
        setSubmodules([]);
        setFormPermissions({});
        return;
      }

      const { data: submodulesData, error: submodulesError } = await supabase
        .from("submodules")
        .select("*")
        .in("module_id", moduleIds);

      if (submodulesError) {
        console.error("Erro ao buscar submodules:", submodulesError);
        return;
      }


      setSubmodules(submodulesData);

      // Inicializar permissões para cada submodule
      const basePermissions = {};
      submodulesData.forEach(f => {
        basePermissions[f.name] = { view: false, edit: false, create: false };
      });
      setFormPermissions(basePermissions);
      setUser(user)
    };

    fetchModules();
  }, []);


  const handleSave = async () => {
    if (!selectedUserEmail) return;


    const { data: userdB, error: userError } = await supabase
      .from("users")
      .select("email,id")
      .eq("email", selectedUserEmail)
      .single();

    if (userError || !userdB) {
       toast({ title: 'Erro', description: 'Usuário não encontrado' });
      return;
    }
    const payload = {
      step_id: step.id,
      user_id:userdB.id,
      move, 
      view,
      edit,
      create,
      delete:del
    };

    const { data, error } = await supabase
      .from("kanban_steps_permissions")
      .insert(payload);

    if (error) console.error("Erro ao salvar permissões:", error);

    else console.log("Permissões salvas:", data);
    toast({ title: 'Sucesso!', description: 'Usuário Adicionado!' });
    fetchSteps()
    setNewPermission()
  };



  return (
    <div>
      <div className="w-full bg-white dark:bg-gray-900 rounded-2xl shadow-md p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
            <User className="w-6 h-6 text-gray-700 dark:text-gray-200" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Atribuir permissões</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Escolha um usuário.</p>
          </div>
        </div>
        {/* Usuário */}
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Email do usuário</label>
        <input
          type="email"
          className="w-full rounded-lg p-2 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm mt-2 mb-4"
          value={selectedUserEmail}
          onChange={e => setSelectedUserEmail(e.target.value)}
          placeholder="Digite o email do usuário"
        />
        <div className="flex space-x-4">
            <div className="flex flex-col">
              <Label>Mover</Label>
              <Switch
              checked={move}
              onChange={()=>setMove(!move)}
              />
            </div>
            <div className="flex flex-col">
              <Label>Editar</Label>
              <Switch
                checked={edit}
                onChange={()=>setEdit(!edit)}
              />
            </div>
            <div className="flex flex-col">
              <Label>Ver</Label>
              <Switch
                checked={view}
                onChange={()=>setView(!view)}
              />
            </div>
            <div className="flex flex-col">
              <Label>Criar</Label>
              <Switch
                checked={create}
                onChange={()=>setCreate(!create)}
              />
            </div>
            <div className="flex flex-col">
              <Label>Del</Label>
              <Switch
                checked={del}
                onChange={()=>setDel(!del)}
              />
            </div>
        </div>

        
        
        {/* Botão Salvar */}
        <div className="flex justify-end mt-4">
          <button
            type="button"
            onClick={setNewPermission}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-gray-500 dark:bg-gray-50 text-white dark:text-gray-900 mr-2"
          >
            <X className="w-4 h-4" /> Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-green-700 dark:bg-gray-50 text-white dark:text-gray-900"
          >
            <Save className="w-4 h-4" /> Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
