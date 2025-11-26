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
import { SplitButton } from "./components/buttonNewCard";
import KanbanCard from "./KanbanCard";
import FilterIconDropdownKanban from "./components/FilterIconDropdownKanban";
import CalendarioRangeDropdown from "./components/CalendarioRangeDropdown";

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
  const onDragEnd = async (result) => {
  const { destination, source, draggableId } = result;
  if (!destination) return;
  if (
    destination.droppableId === source.droppableId &&
    destination.index === source.index
  ) return;

  // 1️⃣ Obtém colunas e cards atuais
  const start = columnsData.columns[source.droppableId];
  const finish = columnsData.columns[destination.droppableId];

  // 2️⃣ Filtra cards visíveis considerando filtros e período
  const filterVisibleCards = (cardIds) => {
    return cardIds
      .map(id => cardsData[id])
      .filter(Boolean)
      .filter(card => {
        // Filtro por activeFilter
        if (activeFilter?.column && activeFilter?.value) {
          const fieldValue = card.data?.[activeFilter.column];
          const values = Array.isArray(fieldValue) ? fieldValue.map(v => (v?.data?.nome || v?.nome || v)) : [fieldValue];
          const filterVal = activeFilter.value.toString().toLowerCase();
          const matches = values.some(v => {
            const fv = (v?.toString() || "").toLowerCase();
            switch (activeFilter.operator) {
              case "=": return fv === filterVal;
              case "!=": return fv !== filterVal;
              case "contains": return fv.includes(filterVal);
              case ">": return Number(fv) > Number(filterVal);
              case "<": return Number(fv) < Number(fv);
              default: return false;
            }
          });
          if (!matches) return false;
        }

        // Filtro por período
        const dataCard = toDateOnlyString(card.created_at);
        const startDate = periodo.start ? toDateOnlyString(periodo.start) : null;
        const endDate = periodo.end ? toDateOnlyString(periodo.end) : null;
        if (startDate && endDate) return dataCard >= startDate && dataCard <= endDate;
        if (startDate && !endDate) return dataCard === startDate;
        return true;
      });
  };

  // -------------------------------
  // MOVENDO NA MESMA COLUNA
  // -------------------------------
  if (start === finish) {
    const visibleCards = filterVisibleCards(start.cardIds);
    const newCardIds = Array.from(start.cardIds);

    // Reposiciona apenas o draggableId dentro da coluna
    const currentIndex = newCardIds.indexOf(draggableId);
    if (currentIndex === -1) return; // segurança
    newCardIds.splice(currentIndex, 1);
    newCardIds.splice(destination.index, 0, draggableId);

    const newColumn = { ...start, cardIds: newCardIds };
    setColumnsData(prev => ({
      ...prev,
      columns: { ...prev.columns, [newColumn.id]: newColumn }
    }));

    // Atualiza posição sequencial
    for (let i = 0; i < newCardIds.length; i++) {
      const cardId = newCardIds[i];
      setCardsData(prev => ({ ...prev, [cardId]: { ...prev[cardId], position: i + 1 } }));
      const { error } = await supabase
        .from("kanban_cards")
        .update({ position: i + 1 })
        .eq("id", cardId);
      if (error) console.error("Erro ao atualizar posição na mesma coluna:", error);
    }
    return;
  }

  // -------------------------------
  // MOVENDO ENTRE COLUNAS DIFERENTES
  // -------------------------------
  const newStartCardIds = Array.from(start.cardIds);
  newStartCardIds.splice(source.index, 1);
  const newFinishCardIds = Array.from(finish.cardIds);
  newFinishCardIds.splice(destination.index, 0, draggableId);

  const newStart = { ...start, cardIds: newStartCardIds };
  const newFinish = { ...finish, cardIds: newFinishCardIds };

  setColumnsData(prev => ({
    ...prev,
    columns: {
      ...prev.columns,
      [newStart.id]: newStart,
      [newFinish.id]: newFinish
    }
  }));

  // Atualiza cardsData local
  setCardsData(prev => ({
    ...prev,
    [draggableId]: { ...prev[draggableId], step_id: finish.id }
  }));

  try {
    // Atualiza step_id no Supabase
    const { error: moveError } = await supabase
      .from("kanban_cards")
      .update({ step_id: finish.id })
      .eq("id", draggableId);
    if (moveError) console.error("Erro ao mover card:", moveError);

    // Atualiza posições sequencialmente
    const updatePositions = async (cardIds) => {
      for (let i = 0; i < cardIds.length; i++) {
        const cardId = cardIds[i];
        setCardsData(prev => ({ ...prev, [cardId]: { ...prev[cardId], position: i + 1 } }));
        const { error } = await supabase
          .from("kanban_cards")
          .update({ position: i + 1 })
          .eq("id", cardId);
        if (error) console.error("Erro ao atualizar posição:", error);
      }
    };

    await updatePositions(newStartCardIds);
    await updatePositions(newFinishCardIds);

  } catch (err) {
    console.error("Erro ao atualizar cards entre colunas:", err);
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
function isCampoValido(key, value) {
  const ignorar = ["id", "submodule_id", "comments", "labels", "created_at", "updated_at","checklist"];
  return (
    !ignorar.includes(key) &&
    (["string", "number", "boolean"].includes(typeof value) || Array.isArray(value))
  );
}


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
    if (
      ["string", "number", "boolean"].includes(typeof value) ||
      Array.isArray(value)
    ) {
      if (isCampoValido(key, value)) camposSet.add(key);
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
<div className="p-3 flex flex-col sm:flex-row justify-between items-start sm:items-center rounded-xl
                bg-gradient-to-r from-[#7928CA] to-[#007CF0] gap-2 sm:gap-0 px-6">
  
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
        <DragDropContext onDragEnd={onDragEnd}>
          <div className={`mx-0 sm:mx-0 md:mx-3 flex gap-4 overflow-x-auto min-h-[100vh] sm:mx-6 md:ml-0`}>
            {columnsData.columnOrder.map(columnId => {
            const column = columnsData.columns[columnId];
            const step = steps.find(s => s.id === column.id);

            if (!step) return null;

            // 🟦 Verifica se o usuário logado é o dono do Kanban
            const isOwner = kanban.user_id === user?.id;

            // 🟦 Permissões do usuário nessa etapa
            const stepUsers = stepsPerms.filter(
              p => p.step_id === step.id && p.user_id === user?.id
            );

            // 🟥 Se NÃO for dono e NÃO tiver permissão, não renderiza a etapa
            if (!isOwner && stepUsers.length === 0) return null;

            // 🟩 Se for o DONO, ele tem todas as permissões automaticamente
            const canMoveStep   = isOwner ? true : (stepUsers[0]?.move   ?? false);
            const canCreate     = isOwner ? true : (stepUsers[0]?.create ?? false);
            const canEdit       = isOwner ? true : (stepUsers[0]?.edit   ?? false);
            const canView       = isOwner ? true : (stepUsers[0]?.view   ?? false);
            const canDelete     = isOwner ? true : (stepUsers[0]?.delete ?? false);

            // 🟦 Usuários permitidos no step
            const permittedUsers = stepsPerms
              .filter(p => p.step_id === step.id)
              .map(p => usuarios.find(u => u.id === p.user_id))
              .filter(Boolean);

            // 🟦 Empresas desses usuários
            const permittedCompanies = permittedUsers
              .map(u => companies.find(c => c.id === u.company_id))
              .filter(Boolean);

            const color = column.color

            return (
              <Droppable droppableId={column.id} key={column.id} isDropDisabled={!canMoveStep} >
                {provided => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className={`flex-shrink-0 
                   rounded-md w-72 sm:w-72 md:w-80  pb-5`}
                   style={{ backgroundColor: `${color}60` }}
                   >
                    <div className={`flex justify-between items-center   p-5 shadow-md border border-gray-300 rounded-sm z-20`}
                    style={{ backgroundColor: `${color}` }}
                    >
                     <div className="flex items-center gap-2">
                            {editingTitle === column.id ? (
                              <input
                                type="text"
                                value={editTitleValue}
                                onChange={(e) => setEditTitleValue(e.target.value)}
                                onBlur={() => handleRenameStep(column.id)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleRenameStep(column.id);
                                }}
                                autoFocus
                                className="font-bold border-b border-gray-300 focus:outline-none focus:border-purple-500 bg-transparent w-full"
                              />
                            ) : (
                              <h2
                                className="text-gray-900 font-semibold tracking-wide cursor-pointer hover:underline "
                                onClick={() => {
                                  setEditingTitle(column.id);
                                  setEditTitleValue(column.title);
                                }}
                              >
                                {column.title}
                              </h2>
                            )}
                      </div>

                      {canCreate && (
                      <div className="relative">
                        <div className="flex space-y-1 items-center">
                          <div className="flex -space-x-2">
                              {permittedCompanies.map((comp, i) => (
                                <div key={i} className="relative group">
                                  <img
                                    src={comp.logo_url || comp.logo}
                                    className="w-6 h-6 rounded-full border-2 border-white object-cover"
                                  />
                                  {/* Tooltip */}
                                  <div className="absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-100">
                                    {comp.name}
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>

                        {openSubmoduleDropdown === step.id && (
                          <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-300 rounded shadow z-50">
                            {usuarioComSubmodules?.submodules?.map(sub => (
                              <button
                                key={sub.submodule_id}
                                onClick={() => {
                                  setOpenSubmoduleDropdown(null);
                                  setCurrentStep(step);
                                  // setar qual submodule está criando
                                  setFormData(prev => ({
                                    ...prev,
                                    _submodule_id: sub.submodule_id
                                  }));
                                  selectSubmodule(sub, step.id)
                                  setRecord([])
                                }}
                                className="block w-full text-left px-3 py-2 hover:bg-gray"
                              >
                                {sub.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                        )}
                    </div>
                    {/**Botão de Novo Card */}
                    <SplitButton
                      mainLabel="Novo Card"
                      onMainClick={() =>  {
                        selectSubmodule('main', step.id)
                        setRecord([]);
                        setOnlyView(false);
                        if(isOwner) {setCanEdit(true)} else {setCanEdit(canEdit)}
                      }}
                      options={usuarioComSubmodules?.submodules?.map((sub) => ({
                        label: sub.name,
                        submodule: sub,
                      }))}
                      onSelect={({ submodule }) => {
                        // 🔁 exatamente o mesmo comportamento do MoreVertical
                        setCanEdit(canEdit)
                        setOpenSubmoduleDropdown(null);
                        setCurrentStep(step);
                        setFormData(prev => ({ ...prev, _submodule_id: submodule.submodule_id }));
                        selectSubmodule(submodule, step.id);
                        setRecord([]);
                        setOnlyView(false);
                      }}
                    />
                    <div>
  {column.cardIds
    .map(cardId => cardsData[cardId])
    .filter(Boolean)
    .filter((card) => {
      // ----------------------------------
      // FILTRO POR CAMPO (activeFilter)
      // ----------------------------------
      if (activeFilter?.column && activeFilter?.value) {
        if (activeFilter.column === "checklist") return true; // ignora checklist

        const fieldValue = card.data?.[activeFilter.column];

        // Normaliza para array de strings
        const values = Array.isArray(fieldValue)
          ? fieldValue
              .map(v => {
                if (v && typeof v === "object") {
                  const key = Object.keys(v.data || {}).find(k =>
                    k.toLowerCase().includes("nome") || k.toLowerCase().includes("modelo")
                  ) || Object.keys(v)[0];
                  return v[key] ?? "";
                }
                return v; // string/number/boolean
              })
              .filter(Boolean)
          : [fieldValue];

        const filterVal = activeFilter.value.toLowerCase();

        const matches = values.some(v => {
          const fv = v?.toString().toLowerCase() ?? "";
          switch (activeFilter.operator) {
            case "=": return fv === filterVal;
            case "!=": return fv !== filterVal;
            case "contains": return fv.includes(filterVal);
            case ">": return Number(fv) > Number(filterVal);
            case "<": return Number(fv) < Number(filterVal);
            default: return false;
          }
        });

        if (!matches) return false;
      }

      // ----------------------------------
      // FILTRO POR DATA (periodo)
      // ----------------------------------
      const dataCard = toDateOnlyString(card.created_at);
      const start = periodo.start ? toDateOnlyString(periodo.start) : null;
      const end = periodo.end ? toDateOnlyString(periodo.end) : null;

      if (!start && !end) return true;
      if (start && !end) return dataCard === start;
      if (start && end) return dataCard >= start && dataCard <= end;

      return true;
    })
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0)) // ✅ Ordena pelo position
    .map((card, index) => (
      <KanbanCard
        key={card.id}
        card={card}
        index={index}
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
      />
    ))}
  {provided.placeholder}
                    </div>




                  </div>
                )}
              </Droppable>
            );
          })}

          </div>
        </DragDropContext>

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
