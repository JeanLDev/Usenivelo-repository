import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, Settings, LayoutDashboard,
  Users,
  Calendar,
  DollarSign,
  CheckSquare,
  Bell,
  Boxes,
  Zap,
  PlusIcon} from 'lucide-react';
  
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { useDashboard } from '@/contexts/DashboardContext';
import Joyride from "react-joyride";
import { Link } from 'react-router-dom';
import IconPicker from './ModuleCustomizationComponents/IconPicker';

// 🔹 Modal simples
const Modal = ({ isOpen, onClose, title, children,showClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 w-full max-w-md"
      >
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">{title}</h2>
        {children}
        {!showClose && <div className="mt-4 text-right">
          <Button variant="outline" onClick={onClose} className='w-full'>Fechar</Button>
        </div>}
      </motion.div>
    </div>
  );
};

const ModuleCustomization = () => {

  const { refreshSidebar } = useDashboard();

  const iconsMap = {
    LayoutDashboard: <LayoutDashboard className="w-5 h-5" />,
    Users: <Users className="w-5 h-5" />,
    Calendar: <Calendar className="w-5 h-5" />,
    DollarSign: <DollarSign className="w-5 h-5" />,
    CheckSquare: <CheckSquare className="w-5 h-5" />,
    Bell: <Bell className="w-5 h-5" />,
    Boxes: <Boxes className="w-5 h-5" />
  };
  
  const [selectedIcon, setSelectedIcon] = useState('LayoutDashboard');
  const { toast } = useToast();
  const { user } = useAuth();
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  // Modais
  const [createModuleModal, setCreateModuleModal] = useState(false);
  const [editModuleModal, setEditModuleModal] = useState(false);
  const [deleteModuleModal, setDeleteModuleModal] = useState(false);

  const [createSubModuleModal, setCreateSubModuleModal] = useState(false);
  const [editSubModuleModal, setEditSubModuleModal] = useState(false);
  const [deleteSubModuleModal, setDeleteSubModuleModal] = useState(false);

  // Seleção atual
  const [selectedModule, setSelectedModule] = useState(null);
  const [selectedSubModule, setSelectedSubModule] = useState(null);

  const [newModuleName, setNewModuleName] = useState('');
  const [newSubModuleName, setNewSubModuleName] = useState('');

  
  // 🔹 Fetch módulos e submódulos
  const fetchMenuItems = async () => {
    try {
      // 1️⃣ Pega usuário logado
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error("Usuário não autenticado:", userError);
        return;
      }
  
      // 2️⃣ Busca dados completos do usuário (pra pegar o company_id)
      const { data: dbUser, error: dbUserError } = await supabase
        .from("users")
        .select("id, company_id")
        .eq("id", user.id)
        .single();
  
      if (dbUserError) throw dbUserError;
  
  
      // 3️⃣ Buscar módulos da empresa do usuário logado
      const { data: modules, error: modulesError } = await supabase
        .from("modules")
        .select(`
          id,
          name,
          icon,
          type,
          customizable,
          submodules (
            id,
            name,
            path
          )
        `)
        .eq("company_id", dbUser.company_id) // 🔑 agora é por empresa
        .order("name");
  
      if (modulesError) throw modulesError;
  
  
      // Mapear os módulos do banco
      const dynamicItems = (modules || []).map((m) => ({
        id: m.id,
        label: m.name,
        path: `/admin/modules/${m.id}`,
        icon: <Boxes className="w-5 h-5" />,
        customizable: m.customizable,
        submodules:
          m.submodules?.map((s) => ({
            id: s.id,
            label: s.name,
            path: s.path,
            customizable: s.customizable
          })) || [],
      }));
  
  
      // Atualiza o estado
      setModules([...dynamicItems]);
      refreshSidebar();
      setLoading(false)
    } catch (err) {
      console.error("Erro ao carregar menu:", err);
    }
  };
  const [runTutorial, setRunTutorial] = useState(false);

  useEffect(() => {
    if(loading) {
      fetchMenuItems();
    }
  }, [user,modules]);

  useEffect(() => {
    const tutorialKey = "hasSeenModuleTutorial";

    // se ainda não viu o tutorial
    if (!localStorage.getItem(tutorialKey)) {
      setRunTutorial(true);
      localStorage.setItem(tutorialKey, "true");
    } else {
      setRunTutorial(false);
    }
  }, []);




  // -----------------------
  // 🔹 CRUD Módulos
  // -----------------------

  const handleCreateModule = async () => {
  if (!newModuleName.trim()) return;
  setLoading(true);

  try {

    // 1️⃣ Pega usuário logado
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw userError;

    // 2️⃣ Busca o company_id do usuário
    const { data: dbUser, error: dbUserError } = await supabase
      .from("users")
      .select("company_id")
      .eq("id", user.id)
      .single();
    if (dbUserError) throw dbUserError;

    
    // 1️⃣ Criar módulo customizado
    const { data: moduleData, error: moduleError } = await supabase
      .from('modules')
      .insert([{
        name: newModuleName,
        type: 'Customizado',
        customizable: true,
        icon: selectedIcon,
        user_id: user.id ,
        company_id: dbUser.company_id, // 🔑 agora sempre com empresa
      }])
      .select()
      .single();
    if (moduleError) throw moduleError;

    // 2️⃣ Verificar se submódulo "Campos" já existe para este módulo
    const { data: existingSubmodule } = await supabase
      .from('submodules')
      .select('*')
      .eq('module_id', moduleData.id)
      .eq('name', 'Campos')
      .single();

    // 3️⃣ Criar submódulo "Geral" somente se não existir
    if (!existingSubmodule) {
      const { data: submoduleData, error: submoduleError } = await supabase
        .from('submodules')
        .insert([{
          module_id: moduleData.id,
          name: 'Geral',
          type: 'Customizado',
          path: `/admin/modules/${moduleData.label}/sub/Geral`
        }])
        .select()
        .single();
      if (submoduleError) throw submoduleError;
    }

    // 5️⃣ Feedback e reset de estado
    toast({ title: 'Módulo criado', description: `"${newModuleName}" adicionado.` });
    setNewModuleName('');
    setSelectedIcon('LayoutDashboard');
    setCreateModuleModal(false);

    // 6️⃣ Atualizar lista de módulos
    fetchMenuItems();

  } catch (err) {
    console.error(err);
    toast({ title: 'Erro ao criar módulo', description: err.message });
  }

  setLoading(false);
};

  const handleEditModule = async () => {
    if (!selectedModule || !newModuleName.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('modules')
        .update({ name: newModuleName })
        .eq('id', selectedModule.id);
      if (error) throw error;
      toast({ title: 'Módulo atualizado', description: `"${newModuleName}" salvo.` });
      setEditModuleModal(false);
      fetchMenuItems();
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro ao editar módulo', description: err.message });
    }
    setLoading(false);
  };

  const handleDeleteModule = async () => {
    if (!selectedModule) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('modules')
        .delete()
        .eq('id', selectedModule.id);
      if (error) throw error;
      toast({ title: 'Módulo excluído', description: `"${selectedModule.name}" removido.` });
      setDeleteModuleModal(false);
      fetchMenuItems();
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro ao excluir módulo', description: err.message });
    }
    setLoading(false);
  };

  // -----------------------
  // 🔹 CRUD Submódulos
  // -----------------------
  const handleCreateSubModule = async () => {
    if (!newSubModuleName.trim() || !selectedModule) return;
    setLoading(true);
    try {
      // Apenas criar submódulo normalmente
      const { data, error } = await supabase
        .from('submodules')
        .insert([{
          module_id: selectedModule.id, 
          name: newSubModuleName,
          type:'Customizado',
          path: `/admin/modules/${selectedModule.label}/sub/${newSubModuleName}`
          }])
        .select()
        .single();
      if (error) throw error;

      toast({ title: 'Submódulo criado', description: `"${newSubModuleName}" adicionado.` });
      setNewSubModuleName('');
      setCreateSubModuleModal(false);
      fetchMenuItems();
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro', description: err.message });
    }
    setLoading(false);
  };

  const handleEditSubModule = async () => {
    if (!selectedSubModule || !newSubModuleName.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('submodules')
        .update({ name: newSubModuleName })
        .eq('id', selectedSubModule.id);
      if (error) throw error;

      toast({ title: 'Submódulo atualizado', description: `"${newSubModuleName}" salvo.` });
      setEditSubModuleModal(false);
      fetchMenuItems();
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro', description: err.message });
    }
    setLoading(false);
  };

  const handleDeleteSubModule = async () => {
    if (!selectedSubModule) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('submodules')
        .delete()
        .eq('id', selectedSubModule.id);
      if (error) throw error;

      toast({ title: 'Submódulo excluído', description: `"${selectedSubModule.name}" removido.` });
      setDeleteSubModuleModal(false);
      fetchMenuItems();
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro', description: err.message });
    }
    setLoading(false);
  };

  // -----------------------
  // 🔹 Drag & Drop Módulos
  // -----------------------
  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    const updatedModules = Array.from(modules);
    const [moved] = updatedModules.splice(result.source.index, 1);
    updatedModules.splice(result.destination.index, 0, moved);
    setModules(updatedModules);

    setLoading(true);
    try {
      for (let i = 0; i < updatedModules.length; i++) {
        if (updatedModules[i].userModuleId) {
          await supabase
            .from('user_modules')
            .update({ position: i })
            .eq('id', updatedModules[i].userModuleId);
        }
      }
      toast({ title: 'Ordem salva', description: 'A ordem dos módulos foi atualizada.' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro', description: 'Não foi possível salvar a ordem.' });
    }
    setLoading(false);
  };

 

const steps = [
  {
    target: ".btn_novo_modulo",
    content: "Clique aqui para criar seu primeiro módulo! ✨",
    disableBeacon: true,
    placement: "bottom",
  },
  {
    target: ".module_card",
    content: "Aqui aparecem os módulos que você criou.",
  },
  {
    target: ".btn_adicionar_submodulo",
    content: "Adicione submódulos dentro dos módulos, para detalhar melhor seus dados.",
  },
];



   if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600 border-b-4 border-gray-200"></div>
      </div>
    );
  }
  
  
  return (
    <>
    {!modules.length ?
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-semibold text-gray-700">Crie seu Primeiro Módulo</h1>
          <p className="text-gray-400">Adicione um módulo para começar a organizar seus dados.</p>

          <button
            onClick={() => setCreateModuleModal(true)} // substitua por sua função real
            className="w-16 h-16 bg-blue-600 hover:bg-blue-700 text-white text-3xl font-bold rounded-xl shadow-md transition-all duration-200 flex items-center justify-center mx-auto btn_novo_modulo"
          >
            <PlusIcon/>
          </button>
        </div>
      </div>
      :
      <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Meus Módulos
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Crie módulos e submódulos para adaptar o sistema ao seu negócio
          </p>
        </div>
        <Button
          onClick={() => setCreateModuleModal(true)}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 mt-4 md:mt-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Módulo
        </Button>
      </motion.div>
      <div className="h-px bg-gray-300 my-2 " />
      <div className="module_card">
        {/* Drag & Drop Módulos */}
<DragDropContext onDragEnd={handleDragEnd}>
  <Droppable droppableId="modules">
    {(provided) => (
      <div
        {...provided.droppableProps}
        ref={provided.innerRef}
        className="flex flex-wrap gap-8 items-start"
      >
        {modules
          .filter((module) => module.customizable)
          .map((module, index) => (
            <Draggable key={module.id} draggableId={module.id.toString()} index={index}>
              {(provided) => (
                <motion.div
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  {...provided.dragHandleProps}
                  className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700
                  shadow-md flex flex-col overflow-hidden transition-all duration-300 ease-out
                  hover:-translate-y-1 hover:scale-[1.01] hover:shadow-xl hover:shadow-purple-200/60"
                >
                  {/* Cabeçalho */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300">
                        <LayoutDashboard className="w-5 h-5" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate max-w-[180px]">
                          {module.label}
                        </h3>
                        <span className="text-xs text-gray-400 truncate max-w-[180px]">Módulo</span>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full truncate max-w-[80px] ${
                        module.type === "Padrão"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-purple-100 text-purple-800"
                      }`}
                    >
                      {module.type}
                    </span>
                  </div>

                  <div className="h-px bg-gray-300 my-2" />

                  {/* Submódulos */}
                  <div className="p-4 flex-1">
                    <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-3">
                      Submódulos
                    </h4>
                    <div className="space-y-2">
                      {module.submodules?.map((sub) => (
                        <div
                          key={sub.id}
                          className="flex justify-between items-center bg-gray-50 dark:bg-gray-600 hover:bg-gray-100 dark:hover:bg-gray-500 transition rounded-lg px-3 py-2 shadow-sm"
                        >
                          <Link to={`/admin/modules/${module.id}/sub/${sub.id}`} className="flex-1 min-w-0">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-800 dark:text-white truncate max-w-[160px]">
                                {sub.label}
                              </p>
                              <span className="text-xs text-gray-400 truncate max-w-[160px]">Submódulo</span>
                            </div>
                          </Link>

                          <div className="flex space-x-1">
                            <Button variant="ghost" size="icon" onClick={() => {
                              setSelectedSubModule(sub);
                              setEditSubModuleModal(true);
                              setNewSubModuleName(sub.label);
                            }}>
                              <Edit className="w-4 h-4 text-green-600" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => {
                              setSelectedSubModule(sub);
                              setDeleteSubModuleModal(true);
                            }}>
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {module.customizable && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 w-full justify-center border-dashed btn_adicionar_submodulo"
                        onClick={() => {
                          setSelectedModule(module);
                          setCreateSubModuleModal(true);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-1" /> Adicionar Submódulo
                      </Button>
                    )}
                  </div>

                  {/* Rodapé */}
                  {module.customizable && (
                    <div className="flex justify-end gap-2 p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                      <Button variant="ghost" size="icon" onClick={() => {
                        setSelectedModule(module);
                        setEditModuleModal(true);
                        setNewModuleName(module.name);
                      }}>
                        <Edit className="w-4 h-4 text-green-600" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => {
                        setSelectedModule(module);
                        setDeleteModuleModal(true);
                      }}>
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  )}
                </motion.div>
              )}
            </Draggable>
          ))}
        {provided.placeholder}
      </div>
    )}
  </Droppable>
</DragDropContext>

      </div>
    </div>}


     {/* Modais Módulos */}
     
      <Modal isOpen={createModuleModal} onClose={() => setCreateModuleModal(false)} title="Criar Novo Módulo">
        <input
          type="text"
          className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white mb-4"
          placeholder="Nome do módulo"
          value={newModuleName}
          onChange={e => setNewModuleName(e.target.value)}
        />

        {/* Grade de ícones */}
        <p className="text-sm text-gray-500 dark:text-gray-300 mb-2">Escolha um ícone:</p>

        <div className="w-full">
           <IconPicker
              selectedIcon={selectedIcon}
              onChange={(iconName) => setSelectedIcon(iconName)}
            />
        </div>

        <div className="mt-4 text-right w-full">
          <Button onClick={handleCreateModule} disabled={loading} className='w-full'>Criar</Button>
        </div>
      </Modal>

      <Modal isOpen={editModuleModal} onClose={() => setEditModuleModal(false)} title="Editar Módulo">
        <input type="text" className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white" value={newModuleName} onChange={e => setNewModuleName(e.target.value)} />
        <div className="mt-4 text-right 2-full">
          <Button onClick={handleEditModule} disabled={loading} className='w-full'>Salvar</Button>
        </div>
      </Modal>

      <Modal isOpen={deleteModuleModal} onClose={() => setDeleteModuleModal(false)} title="Excluir Módulo" showClose={true}>
        <p>Deseja realmente excluir o módulo "{selectedModule?.name}"?</p>
        <div className="mt-4 flex justify-end space-x-2">
          <Button variant="outline" onClick={() => setDeleteModuleModal(false)}>Cancelar</Button>
          <Button variant="destructive" onClick={handleDeleteModule} disabled={loading}>Excluir</Button>
        </div>
      </Modal>

      {/* Modais Submódulos */}
      <Modal isOpen={createSubModuleModal} onClose={() => setCreateSubModuleModal(false)} title="Criar Submódulo">
        <input type="text" className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white" placeholder="Nome do submódulo" value={newSubModuleName} onChange={e => setNewSubModuleName(e.target.value)} />
        <div className="mt-4 text-right">
          <Button onClick={handleCreateSubModule} disabled={loading} className='w-full'>Criar</Button>
        </div>
      </Modal>

      <Modal isOpen={editSubModuleModal} onClose={() => setEditSubModuleModal(false)} title="Editar Submódulo">
        <input type="text" className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white" value={newSubModuleName} onChange={e => setNewSubModuleName(e.target.value)} />
        <div className="mt-4 text-right">
          <Button onClick={handleEditSubModule} disabled={loading} className='w-full'>Salvar</Button>
        </div>
      </Modal>

      <Modal isOpen={deleteSubModuleModal} onClose={() => setDeleteSubModuleModal(false)} title="Excluir Submódulo" showClose={true}>
        <p>Deseja realmente excluir o submódulo "{selectedSubModule?.label}"?</p>
        <div className="mt-4 flex justify-end space-x-2">
          <Button variant="outline" onClick={() => setDeleteSubModuleModal(false)}>Cancelar</Button>
          <Button variant="destructive" onClick={handleDeleteSubModule} disabled={loading}>Excluir</Button>
        </div>
      </Modal>
      <Joyride
        steps={steps}
        run={runTutorial}
        continuous
        showProgress
        showSkipButton
        locale={{
          back: "",           // remove o texto "Back"
          close: "Fechar",
          last: "Concluir",
          next: "Próximo",
          skip: "Pular",
        }}
        styles={{
          options: {
            primaryColor: "#4F46E5",
            textColor: "#333",
            zIndex: 10000,
          },
        }}
      />

    </>
  );
};

export default ModuleCustomization;
