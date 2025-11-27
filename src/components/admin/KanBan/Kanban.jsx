  import React, { useState, useEffect, act } from "react";
  import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
  import { Button } from "@/components/ui/button";
  import { FilterIcon, Loader2, MoreVertical, Plus, PlusCircle, Settings, ShieldCheck, User } from "lucide-react";
  import { Link, useParams } from "react-router-dom";
  import { supabase } from "@/lib/customSupabaseClient";
  import { useNavigate } from "react-router-dom";
  import {useToast} from "@/components/ui/use-toast"
  import ShareDropdown from "./components/ShareDropdown";
  import KanbanCardModal from "./KanbanCardModal";
  import { useDashboard } from '@/contexts/DashboardContext';
import KanbanCard from "./KanbanCard";
import FilterIconDropdownKanban from "./components/FilterIconDropdownKanban";
import CalendarioRangeDropdown from "./components/CalendarioRangeDropdown";
import KanbanRe from "./components/KanbanFluxes";

  const Modal = ({ isOpen, onClose, title, children, size='4xl' }) => {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 transition-opacity">
        <div className= {`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-2xl w-full max-w-${size} space-y-6 transform transition-all duration-300 scale-100 motion-safe:animate-fadeIn`}>
          <h2 className="text-2xl font-bold  text-gray-900 dark:text-white">{title}</h2>
          {children}
          
        </div>
      </div>
    );
  };

  export default function Kanban() {
    const { kanban_id } = useParams();
    const { refreshSidebar } = useDashboard();
    const {toast} = useToast()
    const [canEdit, setCanEdit] = useState(false)
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [kanban, setKanban] = useState({})
    const [kanbanCreator, setKanbanCreator] = useState({})
    const [usuarios, setUsuarios] = useState([])
    const [steps, setSteps] = useState([]);
    const [cardsData, setCardsData] = useState({});
    const [columnsData, setColumnsData] = useState({ columns: {}, columnOrder: [] });
    const [showModal, setShowModal] = useState(false);
    const [currentStep, setCurrentStep] = useState(null);
    const [formData, setFormData] = useState({});
    const [submodules, setSubmodules] = useState([])
    const [modulesUser, setModulesUser] = useState([])
    const [stepsPerms, setStepsPerms] = useState([]);
    const [usuarioComSubmodules, setUsuariosComSubmodules] = useState([])
    const [fields, setFields] = useState([])
    const [record, setRecord] = useState([])
    const [companies, setCompanies] = useState([])
    const [subFields, setSubFields] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submoduleName, setSubmoduleName] = useState('')
    const [onlyView, setOnlyView] = useState(false)
    const [openCreateStepKanban, setOpenCreateStepKanban] = useState(false)
    const [newKanbanName, setNewKanbanName] = useState('')
    const [periodo, setPeriodo] = useState({ start: null, end: null });
    const [activeFilter, setActiveFilter] = useState([])
    function toDateOnlyString(date) {
      return new Date(date).toISOString().split("T")[0];
    }

    
    // ------------------- FETCH -------------------
    const fetchData = async () => {
    try {
      setLoading(true)
      // Usuário logado
      const { data: userData } = await supabase.auth.getUser();
      setUser(userData.user);

      const { data: usersDb } = await supabase
      .from("users")
      .select("*")
      const { data: kanban } = await supabase
      .from("submodules")
      .select("*")
      .eq('id', kanban_id)
      .single()
      const { data: kanbanModuleCreator } = await supabase
      .from("modules")
      .select("*")
      .eq('id', kanban.module_id)
      .single()
      const { data: companiesDb } = await supabase
      .from("companies")
      .select("*")
      // Etapas do kanban
      const { data: stepsData } = await supabase
        .from("kanban_steps")
        .select("*")
        .eq("kanban_id", kanban_id)
        .order("position", { ascending: true }) || [];

      const { data: permsData } = await supabase
        .from("kanban_steps_permissions")
        .select("*")
        .in("step_id", stepsData.map(s => s.id))
        || [];
      // Cards do kanban
      const { data: cards } = await supabase
        .from("kanban_cards")
        .select("*")
        .in("step_id", stepsData.map(s => s.id)) || [];

      // ✅ Agora só permissões do usuário logado


      // Submódulos desses módulos
      const { data: submodules } = await supabase
        .from("submodules")
        .select("*")

      // Configurações de permissão do usuário para este kanban
      const { data: submodsconfig } = await supabase
        .from("user_permissions_kanban")
        .select("*")
        .eq("kanban_id", kanban_id)
        .eq("user_id", userData.user.id);

      const { data: fieldsData, error: fieldsError } = await supabase
        .from('submodule_fields')
        .select('*')

      const { data: subFieldsData, error: subError } = await supabase
          .from('submodule_field_subfields')
          .select('*')
          .in('field_id', fieldsData.map((field)=> field.id))
      const submodulesDoUsuario = submodsconfig.map((perm) => {

        const sub = submodules.find((s) => s.id === perm.submodule_id);

        const permissionsByStep = stepsData.map(step => {
          // ✅ Agora não precisa mais verificar user_id, já veio filtrado
          const permsDoStep = permsData.find(
            p => p.submodule_id === perm.submodule_id && p.step_id === step.id
          ) || {};

          return {
            step_id: step.id,
            move: permsDoStep.move ?? false,
            edit: permsDoStep.edit ?? false,
            view: permsDoStep.view ?? false,
            create: permsDoStep.create ?? false,
            delete: permsDoStep.delete ?? false
          };
        });

        return {
          submodule_id: perm.submodule_id,
          name: sub?.name ?? "sem nome",
        };
      });

      const usuarioComSubmodules = {
        user_id: userData.user.id,
        email: userData.user.email ?? "sem email",
        submodules: submodulesDoUsuario,
      };

      // Monta colunas e cardIds
      const columns = {};
      const columnOrder = [];
      stepsData.forEach(step => {
        columns[step.id] = { id: step.id, title: step.name, cardIds: [], color:step.color };
        columnOrder.push(step.id);
      });

      const cardsMap = {};
      cards.forEach(c => {
        if (!cardsMap[c.id]) {
          cardsMap[c.id] = c;
          columns[c.step_id].cardIds.push(c.id);
        }
      });

      
      setUsuarios(usersDb)
      setKanbanCreator(kanbanModuleCreator)
      setSubmodules(submodules)
      setKanban(kanban)
      setCompanies(companiesDb)
      setFields(fieldsData)
      setSubFields(subFieldsData)
      setSteps(stepsData);
      setCardsData(cardsMap);
      setColumnsData({ columns, columnOrder });
      setStepsPerms(permsData);
      setUsuariosComSubmodules(usuarioComSubmodules)
      await fetchKanbansUserCanAccess(userData.user.id);

      

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false) 
    }
  };
 
  const [kanbansUserCanAccess, setKanbansUserCanAccess] = useState([]);

  const fetchKanbansUserCanAccess = async (user_id) => {
    // Pega todos kanbans compartilhados ou do usuário
    const { data: allKanbans } = await supabase
      .from("submodules")
      .select("*")
      .eq("kanban", true);

    if (!allKanbans) return;

    // Steps desses kanbans
    const { data: allSteps } = await supabase
      .from("kanban_steps")
      .select("*")
      .in("kanban_id", allKanbans.map(k => k.id));

    // Permissões nesses steps
    const { data: allPerms } = await supabase
      .from("kanban_steps_permissions")
      .select("*")
      .eq("user_id", user_id);

    // Filtra só kanbans onde o usuário é dono ou tem permissão de alguma etapa
    const available = allKanbans.filter(k => {
      const isOwner = k.user_id === user_id;
      const stepIDs = allSteps.filter(s => s.kanban_id === k.id).map(s => s.id);
      const hasPerm = allPerms.some(p => stepIDs.includes(p.step_id));
      return isOwner || hasPerm;
    });

    setKanbansUserCanAccess(available);
  };


    const loadKanbanBasic = async (kanban_id, setSteps, setCardsData, setColumnsData) => {
      try {

        // Buscar Steps
        const { data: stepsData } = await supabase
          .from("kanban_steps")
          .select("*")
          .eq("kanban_id", kanban_id)
          .order("position", { ascending: true });

        if (!stepsData) return;

        // Buscar Cards
        const { data: cards } = await supabase
          .from("kanban_cards")
          .select("*")
          .in("step_id", stepsData.map(s => s.id));

        // Montar estrutura de colunas
        const columns = {};
        const columnOrder = [];

        stepsData.forEach(step => {
          columns[step.id] = { id: step.id, title: step.name, cardIds: [], color: step.color  };
          columnOrder.push(step.id);
        });

        // Montar cardsData e distribuir nos steps
        const cardsMap = {};
        cards?.forEach(card => {
          if (!cardsMap[card.id]) {
            cardsMap[card.id] = card;
            columns[card.step_id]?.cardIds.push(card.id);
          }
        });

        // Atualizar estados do Kanban
        setSteps(stepsData);
        setCardsData(cardsMap);
        setColumnsData({ columns, columnOrder });

      } catch (err) {
        console.error("Erro ao carregar kanban:", err);
      }
    };

    const handleReloadKanban = () => {
      loadKanbanBasic(kanban_id, setSteps, setCardsData, setColumnsData);
    };


    //fetch principal
    useEffect(() => {
      fetchData();
    }, [kanban_id]);
    //escutar mudanças no db
    useEffect(() => {
      const subscription = supabase
        .channel('public:kanban_cards')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'kanban_cards' },
          (payload) => {
            // Apenas recarrega sempre que houver alteração
            console.log('Change received!', payload);
            handleReloadKanban();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }, [kanban_id]);


    // ------------------- DRAG & DROP -------------------
    const onDragEnd = async(result) => {
      const { destination, source, draggableId } = result;
      if (!destination) return;
      if (destination.droppableId === source.droppableId && destination.index === source.index) return;

      const start = columnsData.columns[source.droppableId];
      const finish = columnsData.columns[destination.droppableId];

      if (start === finish) {
        const newCardIds = Array.from(start.cardIds);
        newCardIds.splice(source.index, 1);
        newCardIds.splice(destination.index, 0, draggableId);
        const newColumn = { ...start, cardIds: newCardIds };
        setColumnsData(prev => ({ ...prev, columns: { ...prev.columns, [newColumn.id]: newColumn } }));
        return;
      }

      const newStartCardIds = Array.from(start.cardIds);
      newStartCardIds.splice(source.index, 1);
      const newStart = { ...start, cardIds: newStartCardIds };

      const newFinishCardIds = Array.from(finish.cardIds);
      newFinishCardIds.splice(destination.index, 0, draggableId);
      const newFinish = { ...finish, cardIds: newFinishCardIds };

      setColumnsData(prev => ({
        ...prev,
        columns: { ...prev.columns, [newStart.id]: newStart, [newFinish.id]: newFinish }
      }));
      // ------------------- ATUALIZA NO BANCO -------------------
      try {
        const { error } = await supabase
          .from("kanban_cards")
          .update({ step_id: finish.id })
          .eq("id", draggableId);

        if (error) console.error("Erro ao mover card:", error);
      } catch (err) {
        console.error(err);
      }
      // Salva 1 por 1 (Supabase não suporta batch nativo)
        for (const item of updates) {
          await supabase
            .from("kanban_cards")
            .update({ position: item.position })
            .eq("id", item.id);
        }

    };

    


    // ------------------- TOGGLE PERMISSÕES -------------------

    const [openSubmoduleDropdown, setOpenSubmoduleDropdown] = useState(false)
    const [openRecordModal, setOpenRecordModal] = useState(false)
    const [submoduleId, setSubmoduleId]  = useState('')
    const [selectFields,setSelectFields] = useState([])
    const [selectSubFields,setSelectSubFields] = useState([])
    const [stepSelect, setStepSelect] = useState('')
    const [openMenuCardId, setOpenMenuCardId] = useState(null);

    const selectSubmodule = (submodule, step_id) => {
        // 1. Fields desse submódulo
        const selectFields = fields.filter(field => field.submodule_id === submodule.submodule_id);

        // 2. IDs desses fields
        const fieldIDs = selectFields.map(f => f.id);

        // 3. Subfields cujo field_id está entre esses IDs
        const selectSubFields = subFields.filter(sub => fieldIDs.includes(sub.field_id));

        setSubmoduleId(submodule.submodule_id)
        setStepSelect(step_id)
        setSelectFields(selectFields)
        setSelectSubFields(selectSubFields)
        setSubmoduleName(submodule.name)
        setOpenRecordModal(true)
    };
    const selectSubmoduleButton = (sub, step_id) => {
      const selectFields = fields.filter(field => field.submodule_id === sub.id);

      // 2. IDs desses fields
      const fieldIDs = selectFields.map(f => f.id);

      // 3. Subfields cujo field_id está entre esses IDs
      const selectSubFields = subFields.filter(sub => fieldIDs.includes(sub.field_id));
        
        // 1. Fields desse submódulo

        setSubmoduleId(sub.id)
        setStepSelect(step_id)
        setSelectFields(selectFields)
        setSelectSubFields(selectSubFields)
        setSubmoduleName(sub.name)
        setOpenRecordModal(true)
    };


const [editingTitle, setEditingTitle] = useState(null);
const [editTitleValue, setEditTitleValue] = useState("");

const handleRenameStep = async (stepId) => {
  if (!editTitleValue.trim()) {
    setEditingTitle(null);
    return;
  }

  try {
    const { error } = await supabase
      .from("kanban_steps")
      .update({ name: editTitleValue })
      .eq("id", stepId);

    if (error) throw error;

    // Atualiza localmente (opcional)
    handleReloadKanban()
  } catch (err) {
    console.error(err);
  } finally {
    setEditingTitle(null);
  }
};

    


    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600 border-b-4 border-gray-200"></div>
        </div>
      );
    }
  // Verifica se o usuário é o dono do Kanban
  const isOwner = user?.id === kanban.user_id;

  // Verifica se o usuário pode acessar o Kanban
  const canAccessKanban = isOwner || kanban.share;

  // Se não puder acessar o Kanban
  if (!canAccessKanban) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-24 px-6">
        <ShieldCheck className="w-12 h-12 text-gray-400 mb-4" />
        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
          Kanban privado
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mt-1">
          O proprietário deste Kanban ainda não habilitou o compartilhamento.
        </p>
      </div>
    );
  }
const cardIds = Object.keys(cardsData || {});

// junta todos os campos de todos os cards
let camposSet = new Set();

// sempre incluir o id
camposSet.add("id");

cardIds.forEach((id) => {
  const card = cardsData[id];
  if (!card || typeof card.data !== "object" || card.data === null) return;

  Object.entries(card.data).forEach(([key, value]) => {
    // ignorar chave especial
    if (key === "__submoduleName") return;

    // aceitar apenas valores primitivos (string, number, boolean)
    if (["string", "number", "boolean"].includes(typeof value)) {
      camposSet.add(key);
    }
  });
});

// converte o Set para array final
const camposDoCard = Array.from(camposSet);




  // Filtra as etapas que o usuário tem permissão ou que ele é dono
  const stepsDoUsuario = steps.filter(step =>
    stepsPerms.some(p => p.step_id === step.id || p.user_id === user?.id)
  );


  // Se o usuário não possui permissão em nenhuma etapa e não for o dono
  
  if (!stepsDoUsuario.length && user?.id != kanban.user_id) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="p-6 text-center text-gray-500 italic border border-gray-300 rounded-md bg-gray-50 dark:bg-gray-900">
          Você não possui permissões para acessar nenhuma etapa deste Kanban.
        </div>
      </div>
    );
  }

  // Se chegou aqui, o usuário pode acessar e há etapas visíveis


    // ------------------- RENDER -------------------
    return (
      <div className=" space-y-4 p-1">
        {/* CABEÇALHO */}
        <div className="p-3 flex flex-col sm:flex-row justify-between items-start sm:items-center rounded-sm 
                        bg-gradient-to-r from-[#7928CA] to-[#007CF0] shadow-md gap-2 sm:gap-0">
          
          <div className="flex items-center">
            {/* Select do Kanban */}
            <select
              className="p-2 rounded-sm bg-white border border-gray-300 w-full sm:w-auto font-sans cursor-pointer"
              value={kanban_id}
              onChange={(e) => navigate(`/admin/KanBan/${e.target.value}`)}
            >
              {kanbansUserCanAccess.map(k => (
                <option key={k.id} value={k.id}>
                  {k.name}
                </option>
              ))}
            </select>
          
          <Button
            className="ml-2"
            onClick={()=> {
              setOpenCreateStepKanban(true)
            }}
            >
              <PlusCircle className="mr-2"/> Etapa
            </Button>
          </div>
          {/* Botões do proprietário */}
          
            <div className="flex items-center mt-2 sm:mt-0 space-x-2 flex-wrap">

              <CalendarioRangeDropdown
                initialRange={periodo}
                onChange={(r) => {
                  setPeriodo(r);
                  // aqui você pode refazer consulta ao supabase filtrando por data
                }}
              />

              <FilterIconDropdownKanban
                columns={camposDoCard} 
                onApply={(filter) => {
                  // aqui você aplica o filtro no Kanban
                  setActiveFilter(filter);
                }}
              />
            {user.id === kanban.user_id && ( 
              <>
              <ShareDropdown
                shared={kanban.share}
                onOpenShareModal={() => setShareModalOpen(true)}
                onToggleShare={async (newValue) => {
                  const { error } = await supabase
                    .from("submodules")
                    .update({ share: newValue })
                    .eq("id", kanban.id);
                  if (error) console.error(error);
                  setKanban(prev => ({ ...prev, share: newValue }));
                }}
              />
              <Link
                to={`/admin/KanBan/${kanban_id}/settings`}
                className="bg-white p-3 rounded-md border border-gray-300 hover:bg-gray-100"
              >
                <Settings className="w-4 h-4" />
              </Link>
              </>
            )}
            </div>
          
        </div>


        {/* KANBAN */}
        {/**<FluxKanban steps={steps} cards={cardsData}/>*/}
        <KanbanRe
        steps={steps}     
        kanban={kanban}           // Array de etapas do Kanban
        cards={cardsData}            // Objeto de cards { cardId: cardData, ... }
        stepsPerms={stepsPerms}      // Permissões do usuário por step
        usuarios={usuarios}          // Lista de usuários
        companies={companies}        // Lista de empresas
        usuarioComSubmodules={usuarioComSubmodules} // Submodules do usuário
        activeFilter={activeFilter}  // Filtros ativos
        periodo={periodo}    
        selectSubmodule={selectSubmodule}        
        selectSubmoduleButton={selectSubmoduleButton} // Função de seleção de submodule
        handleReloadKanban={handleReloadKanban}       // Função para recarregar o kanban
        submodules={submodules}      // Lista de submodules
        setRecord={setRecord}        // Para abrir modal de card
        setCanEdit={setCanEdit}      // Para controlar edição no modal
        setOnlyView={setOnlyView}    // Para modal apenas leitura
        user={user}  
        openMenuCardId={openMenuCardId}
        setOpenMenuCardId={setOpenMenuCardId}
        formData={formData}
        setFormData={setFormData}
        />

        {/* Modal de visualização: renderizado só uma vez */}
        <Modal
          isOpen={openRecordModal}
          onClose={() => setOpenRecordModal(false)}
          title=""
        >
          <KanbanCardModal fields={selectFields} subFields={selectSubFields} submodule_id={submoduleId} onClose={() => setOpenRecordModal(false)} isOpen={openRecordModal} creating={true} submoduleName={submoduleName} 
          kanban={true} created_by={user.id} position={1} step_id={stepSelect} handleReloadKanban={handleReloadKanban} record={record} canEdit={canEdit} onlyView={onlyView} usuarios={usuarios} companies={companies}/>
        </Modal>
        {/**Open Create Step */}
        <Modal
        isOpen={openCreateStepKanban}
        onClose={()=> setOpenCreateStepKanban(false)}
        size='md'
        >
          <div className=" dark:bg-gray-800 rounded mt-2">
              <h2 className="text-center mb-2 font-semibold text-lg">Nova Etapa</h2>
              <input
                type="text"
                placeholder="Nome da etapa"
                value={newKanbanName}
                onChange={(e) => setNewKanbanName(e.target.value)}
                className="w-full px-3 py-2 rounded border dark:border-gray-600 dark:bg-gray-700"
              />
              <Button
                className="mt-2 px-4 py-2 text-white rounded w-full font-semibold text-md"
                onClick={async () => {
                  const { data:dataUser, error: userError } = await supabase.auth.getUser();
                  
                  const user = dataUser?.user;
            
                  if (userError || !user) return;
                  
                  //step_id mesma coisa que submodule_id
                  const { data: step, error } = await supabase
                  .from('kanban_steps')
                  .insert({
                    kanban_id: kanban_id,
                    name:newKanbanName,
                    position:steps.length,
                    user_id:user?.id
                  })
                  
                if (error) {
                  console.error(error);
                  toast({ title: 'Erro', description: 'Não foi possível criar o Kanban' });
                  return;
                }
          
          
                // Opcional: atualizar sidebar ou redirecionar
                toast({ title: 'Etapa criada!', description: newKanbanName });
                //para atualizar
                fetchData()
                setOpenCreateStepKanban(false)
                }}
              >
                Criar
              </Button>
              <button
              className="text-center bg-gray-200 w-full mt-2 p-2 rounded-sm"
              onClick={()=> setOpenCreateStepKanban(false)}
              >Fechar</button>
            </div>
        </Modal>
      </div>
    );
  }
