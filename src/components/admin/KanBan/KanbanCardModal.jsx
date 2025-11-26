import { useState, useEffect } from "react";
import { supabase } from "@/lib/customSupabaseClient";
import { Button } from "@/components/ui/button";
import { AlertCircle, AlignLeft, Calculator, CheckSquare, FileText, Layers, Loader2, Plus, PlusCircle, Tag, Trash2, Upload, UserPlus, X } from "lucide-react";
import { useToast } from '@/components/ui/use-toast';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectItem, SelectTrigger, SelectContent, SelectValue } from "@/components/ui/select";
import ConfirmationTemplate from "../SubmoduleCRUDconfig/templates/ConfirmationTemplate";
import FileInput from "../Inputs/FileInput";
import LimitReachedFullScreen from "../SubmoduleCRUDconfig/templates/LimitReachedFullScreen";
import { RecordRelationField } from "../Tabs/RecordCreatorRelations";
import ExtraFields from "./components/LocalFieldsEditor";

// --- Funções utilitárias --- //



// --- Componente principal --- //
export default function KanbanCardModal({ fields = [], subFields = [], submodule_id , record=[],fetchRecords, onClose, isOpen,page, shared, creating, limiteAtingido , submoduleName,kanban,created_by,position,step_id, handleReloadKanban,onlyView, usuarios,companies,canEdit}) {
    const { toast } = useToast();
    const LOCAL_CACHE_KEY = `formulaCache_${submodule_id || "default"}`;
    const ENABLE_KEY = `formulaCacheEnabled_${submodule_id || "default"}`;
    const [formData, setFormData] = useState({});
    const [previewData, setPreviewData] = useState(record);
    const [loading, setLoading] = useState(true);
    const [calculating, setCalculating] = useState(false);
    const [submodule, setSubmodule]= useState({})
    const [recordData, setRecordsData] = useState(record)
    const [tipo, setTipo] = useState('entrada')
    const [relatedRecords, setRelatedRecords] = useState({});
    const [formConfig, setFormConfig] = useState([])
    const CONFIRMATION_KEY = `confirmation_submodule_${submodule_id}`;
    const [logoUrl, setLogoUrl] = useState(null);
    const [userFieldsData, setuserFieldsData] = useState([])
    const [companyFieldsData, setcompanyFieldsData] = useState([])
    const [user, setUser] = useState(null);
    const [company, setCompany] = useState(null);
    const [newLabelColor, setNewLabelColor] = useState("#3498db");

    const [cardExtras, setCardExtras] = useState({
    members: [],
    labels: [],
    checklist: [],
    comments:[]
    });

   useEffect(() => {
    if (record) {
      setRecordsData(record); // atualiza recordData com o record atual
      setPreviewData({
        ...record.data,
        title: record.data?.title || "",
        description: record.data?.description || "",
      });
      setCardExtras(prev => ({
        ...prev,
        labels: record.data?.labels || [],
        checklist: record.data?.checklist || [],
        comments: record.data?.comments || [],
      }));
    }
  }, [record]);





    const [openMenu, setOpenMenu] = useState(null); // 'members' | 'labels' | 'checklist' | null
    const [newLabel, setNewLabel] = useState('');
    const [newChecklistItem, setNewChecklistItem] = useState('');

    const addLabel = () => {
      if (newLabel.trim() === '') return;

      setCardExtras(prev => ({
        ...prev,
        labels: [...prev.labels, { name: newLabel.trim(), color: newLabelColor }]
      }));

      setNewLabel('');
    };


    const addChecklistItem = () => {
    if (newChecklistItem.trim() === '') return;
    setCardExtras(prev => ({
        ...prev,
        checklist: [...prev.checklist, { name: newChecklistItem.trim(), done: false }]
    }));
    setNewChecklistItem('');
    };

    const toggleChecklistDone = (index) => {
      setCardExtras(prev => ({
        ...prev,
        checklist: prev.checklist.map((item, i) =>
          i === index ? { ...item, done: !item.done } : item
        )
      }));
    };
  const [newComment, setNewComment] = useState("");

  const addComment = async () => {
    if (!newComment.trim()) return;

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;

    setCardExtras(prev => ({
      ...prev,
      comments: [
        {
          id: user?.id,
          name: user?.user_metadata?.full_name || "Usuário",
          message: newComment.trim(),
          created_at: new Date().toISOString()
        },
        ...prev.comments
      ]
    }));

    setNewComment("");
  };







const fetchFormConfig = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();

      const { data: formsConfigData, error: formsConfigError } = await supabase
        .from('user_submodule_form_config')
        .select('*')
        .eq("user_id", user.id)
        .eq("submodule_id", submodule_id)
      if (formsConfigError) throw subError;

      setFormConfig(formsConfigData)
    } catch (err) {
      console.error('Erro ao carregar campos:', err.message);
    }
  };

function calculateField(field, recordData) {
  
    if (!field.formula) return recordData[field.name] ?? null;

    let formula = field.formula; // ex: "campo1+campo2"

    // Substitui cada campo pelo valor atual do registro (garantindo que seja número)
    Object.keys(recordData).forEach(key => {
        const value = Number(recordData[key] ?? 0); // converte para número
        formula = formula.replace(new RegExp(`\\b${key}\\b`, 'g'), value);
    });

    // Avalia a expressão
    try {
        return eval(formula);
    } catch (e) {
        console.error("Erro ao calcular fórmula:", e, "Formula:", formula);
        return null;
    }
    }

 const fetchRelated = async () => {
    for (const field of fields.filter(f => f.field_type === "relation")) {
      for (const rc of field.relatedConfigs) {
        const { data, error } = await supabase
          .from("submodule_records")
          .select("id, data")
          .eq("submodule_id", rc.submodule);

        if (error) {
          console.error("Erro ao buscar registros relacionados:", error);
          continue;
        }

        setRelatedRecords(prev => ({
          ...prev,
          [field.id]: {
            ...(prev[field.id] || {}),
            [rc.submodule]: data || []
          }
        }));
      }
    }
  }
  const deleteComment = async (index) => {
  const updated = cardExtras.comments.filter((_, i) => i !== index);

  // Salva no banco
  await supabase
    .from("kanban_cards")
    .update({ data: { ...cardExtras, comments: updated } })
    .eq("id", record.id);

  // Atualiza localmente
  setCardExtras(prev => ({ ...prev, comments: updated }));
};

  const [isFormValid, setIsFormValid] = useState(false);
  const checkRequiredFields = () => {
    if (!fields?.length) return false;

    // Verifica cada campo obrigatório
    return fields.every(f => {
      if (!f.required) return true; // ignora campos não obrigatórios
      const value = formData[f.name];
      // considera vazio se for null, undefined, "", [], false (para boolean não obrigatória pode ajustar)
      if (f.field_type === "boolean") return value === true; // boolean obrigatório precisa ser true
      if (f.field_type === "multiselect") return Array.isArray(value) && value.length > 0;
      return value !== undefined && value !== null && value !== "";
    });
  };

  // Campos a ignorar
    const ignoreFields = ["title", "checklist", "labels", "comments", "description"];

    // Se fields estiver vazio, pegar do record.data
    const baseFields = fields.length > 0 
      ? fields 
      : Object.keys(record?.data || {})
          .filter((key) => !ignoreFields.includes(key)) // ignora os campos indesejados
          .map((key, index) => ({
            id: `auto-${index}`,   // gerar um id temporário
            name: key,
            order: index,
            field_type: typeof record.data[key] === "number" ? "number" : "text", // inferir tipo básico
          }));

    const sortedFields = [...baseFields].sort((a, b) => {
      if (a.order == null && b.order == null) return 0;
      if (a.order == null) return 1;
      if (b.order == null) return -1;
      return a.order - b.order;
    });



  // Inicializa valores padrão
  useEffect(() => {
  if (!fields?.length) return;
  setFormData(prev => {
    const localCache =
    enabled
    ? JSON.parse(localStorage.getItem(LOCAL_CACHE_KEY)) || {}
    : {};
    // Evita sobrescrever o estado se nada mudou
   
    const init = { ...(record?.data || {}), ...localCache};


    fields.forEach(f => {
      if (init[f.name] === undefined) {
        if (["number", "formula"].includes(f.field_type)) init[f.name] = 0;
        else if (["boolean", "etapas"].includes(f.field_type)) init[f.name] = false;
        else init[f.name] = "";
      }
    });

    subFields.forEach(sf => {
      if (init[sf.name] === undefined) init[sf.name] = 0;
    });

    // Se o estado anterior for igual ao novo, não atualiza
    const changed = JSON.stringify(prev) !== JSON.stringify(init);
    return changed ? init : prev;
  });
  fetchFormConfig()
  setLoading(false)
  }, []);

  // Recalcula fórmulas dinamicamente e salva valores no cache (fórmulas + subfields)
  useEffect(() => {
    if (!fields?.length || !submodule_id) return;
    fetchRelated()
    setLoading(false)
  }, [fields, subFields, submodule_id]);
  useEffect(() => {
      setIsFormValid(checkRequiredFields());
      setLoading(false)
    }, [formData, fields]);
    useEffect(() => {
    if (!creating && formConfig[0]?.form_type === 'confirmation') {
      const saved = localStorage.getItem(CONFIRMATION_KEY);
      setAlreadySubmitted(saved === "true"); // converte string para boolean
    }
  }, [submodule_id, formConfig]);




  const handleChange = (name, value) => {
    setFormData(prev => {
      const nextFormData = { ...prev, [name]: value };

      setPreviewData(prevPreview => {
        const updatedPreview = {
          ...prevPreview, // mantém title/description/labels
          ...nextFormData // atualiza campos de formData
        };

        // recalcula fórmulas
        fields.filter(f => f.field_type === "formula").forEach(f => {
          updatedPreview[f.name] = calculateField(f, updatedPreview) ?? 0;
        });

        return updatedPreview;
      });

      return nextFormData;
    });
  };



const [bgColor, setBgColor] = useState("#ffffffff"); // padrão escuro
const [textColor, setTextColor] = useState("#000000ff");
  // Renderiza inputs personalizados
const renderInput = (field) => {
  const value = formData[field.name] ?? recordData?.data?.[field.name] ?? "";

  // ========== FORMULA ==========
  if (field.field_type === "formula") {
    const relatedSubs = subFields.filter(sf => sf.field_id === field.id);
    const result = parseFloat(previewData[field.name] ?? record?.data?.[field.name] ?? 0) || 0;

    return (
      <div className="space-y-4">
        {relatedSubs.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-3">
            {relatedSubs.map(sf => {
              const subVal = formData[sf.name] ?? record?.data?.[sf.name] ?? "";
              return (
                <div key={sf.id}>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                    {sf.name}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={subVal}
                    onChange={(e) => handleChange(sf.name, parseFloat(e.target.value) || 0)}
                    className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 ${
                      onlyView ? "opacity-60 pointer-events-none bg-gray-100 dark:bg-gray-900" : ""
                    }`}
                    disabled={onlyView}
                  />
                </div>
              );
            })}
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
            Resultado
          </label>
          <input
            readOnly
            value={String(result.toFixed(2))}
            className="w-full px-3 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-medium border border-green-300 dark:border-green-800 rounded-md"
          />

          {field.formula && (
            <p className="text-xs text-gray-500 mt-1 italic">{field.formula}</p>
          )}
        </div>
      </div>
    );
  }

  // ========== ETAPAS ==========
  if (field.field_type === "etapas") {
    const etapas = subFields.filter(sf => sf.field_id === field.id);

    const handleEtapaChange = (index, checked) => {
      if (onlyView) return;
      const updatedForm = { ...formData };
      if (checked) {
        for (let i = 0; i <= index; i++) updatedForm[etapas[i].name] = true;
      } else {
        for (let i = index; i < etapas.length; i++) updatedForm[etapas[i].name] = false;
      }
      Object.entries(updatedForm).forEach(([key, val]) => handleChange(key, val));
    };

    return (
      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{field.name}</label>
        <div className="flex flex-col gap-3 pl-1">
          {etapas.map((etapa, idx) => {
            const etapaVal = formData[etapa.name] ?? false;
            const isLast = idx === etapas.length - 1;

            return (
              <div key={etapa.id} className="flex items-start gap-3 relative">

                {!isLast && (
                  <div className={`absolute top-6 left-3 w-0.5 h-full ${etapaVal ? "bg-green-500" : "bg-gray-300"}`} />
                )}

                <div
                  onClick={() => handleEtapaChange(idx, !etapaVal)}
                  className={`w-6 h-6 rounded-full border-2 mt-1 flex items-center justify-center transition-colors ${
                    onlyView ? "pointer-events-none opacity-50" :
                    etapaVal ? "bg-green-500 border-green-500 cursor-pointer" : "bg-white border-gray-300 dark:bg-gray-800 cursor-pointer"
                  }`}
                />

                <span className="text-sm text-gray-700 dark:text-gray-300 mt-1">{etapa.name}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

    if (field.field_type === 'textarea') {
    return (
      <div className="space-y-2"
      disabled={onlyView}
      >
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{field.name}</label>
          
        </div>

      {/* Textarea personalizada */}
      <textarea
        value={value}
        onChange={(e) => {
          handleChange(field.name, field.field_type === "number" ? Number(e.target.value) : e.target.value)
        }}
        placeholder="Digite aqui..."
        style={{
          backgroundColor: bgColor,
          color: textColor,
        }}
        disabled={onlyView}
        spellCheck={false}
        className="
          w-full
          p-3
          rounded-md
          font-mono
          text-sm
          border
          border-gray-300
          focus:outline-none
          focus:ring-2
          focus:ring-purple-500
          resize-y
        "
      />
    </div>
    );
  }

  // ========== SELECT ==========
  if (field.field_type === "select") {
    const options = subFields.filter(sf => sf.field_id === field.id);
    const valueSelect = String(formData[field.name] ?? recordData?.data?.[field.name] ?? "");

    return (
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{field.name}</label>
        <Select value={valueSelect ?? ""} onValueChange={(v) => handleChange(field.name, v)} disabled={onlyView}>
          <SelectTrigger className={`w-full h-10 ${onlyView ? "opacity-60 pointer-events-none bg-gray-100 dark:bg-gray-900" : ""}`} disabled={onlyView} />
          <SelectContent>
            {options.map(op => (
              <SelectItem key={op.id} value={op.name}>{op.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  // ========== MULTISELECT ==========
  if (field.field_type === "multiselect") {
    const options = subFields.filter(sf => sf.field_id === field.id);
    const selected = formData[field.name] || [];

    const toggle = (name) => {
      if (onlyView) return;
      const limit = field.limit || options.length;
      let res = selected.includes(name)
        ? selected.filter(v => v !== name)
        : (selected.length < limit ? [...selected, name] : selected);
      handleChange(field.name, res);
    };

    return (
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{field.name}</label>

        <div className={`border border-gray-300 dark:border-gray-700 rounded-md p-2 bg-white dark:bg-gray-800 ${
          onlyView ? "opacity-70" : ""
        }`}>
          {options.map(op => {
            const active = selected.includes(op.name);
            return (
              <label key={op.id} className={`flex items-center gap-2 py-1 text-sm ${
                onlyView ? "cursor-default" : "cursor-pointer"
              }`}>
                <input type="checkbox" checked={active} onChange={() => toggle(op.name)} className="accent-green-600" disabled={onlyView} />
                {op.name}
              </label>
            );
          })}
        </div>

        {field.limit && (
          <p className="text-xs text-gray-500">Selecionados: {selected.length}/{field.limit}</p>
        )}
      </div>
    );
  }

  // ========== BOOLEAN ==========
  if (field.field_type === "boolean") {
    const checked = !!(formData[field.name] ?? record?.data?.[field.name]);
    return (
      <label className={`flex items-center justify-between py-1 text-sm ${
        onlyView ? "opacity-60 pointer-events-none" : "cursor-pointer"
      }`}>
        <span className="text-gray-700 dark:text-gray-300">{field.name}</span>

        <div className="relative">
          <input type="checkbox" className="sr-only" checked={checked} disabled={onlyView} onChange={(e) => handleChange(field.name, e.target.checked)} />
          <div className={`w-10 h-5 rounded-full ${checked ? "bg-green-500" : "bg-gray-300"} transition`} />
          <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-5" : ""}`} />
        </div>
      </label>
    );
  }

  // ========== FILE ==========
  if (field.field_type === "file") {
    return (
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{field.name}</label>
        <FileInput field={field} value={value} onChange={(val) => handleChange(field.name, val)} disabled={onlyView} />
      </div>
    );
  }
  if(field.field_type === 'relation') {
    return (
      <RecordRelationField
      field={field}
      relatedRecords ={relatedRecords}
      handleChange={handleChange}
      formData={formData}
      setFormData={setFormData} 
      kanban={kanban}
      canEdit={canEdit}
      onlyView={onlyView}
      />
    )
    
  }

  // ========== INPUT PADRÃO ==========
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{field.name}</label>
      <Input
        type={field.field_type}
        value={value ?? ""}
        onChange={(e) => handleChange(field.name, field.field_type === "number" ? Number(e.target.value) : e.target.value)}
        className={`w-full ${onlyView ? "opacity-60 pointer-events-none bg-gray-100 dark:bg-gray-900" : ""}`}
        disabled={onlyView}
      />
    </div>
  );
};

 useEffect(() => {
  if (record?.data) {
    setPreviewData({
      ...record.data,
      description: record.data.description || "",
      title: record.data.title || "",
      submodule_id:record.data.submodule_id
    });
    setDescription(record.data.description || "");
    setLoading(false)
  }
}, [record]);

const handleTitleChange = (value) => {
  setPreviewData(prev => ({ ...prev, title: value }));
};

const handleDescriptionChange = (value) => {
  setPreviewData(prev => ({ ...prev, description: value }));
  setDescription(value); // opcional, se ainda precisar do estado separado
};

  // Salvar registro
  const handleSave = async () => {
  setLoading(true);
  try {
    // Monta os dados principais do registro
    const payloadData = {
      ...previewData,
      title: previewData.title,
      description: previewData.description,
      labels: cardExtras.labels,
      checklist: cardExtras.checklist,
      comments: cardExtras.comments,
      ...(submodule_id ? { submodule_id } : {}), // só adiciona se tiver valor
    };

    const payload = { data: payloadData };

    if (record?.id) {
      // === ATUALIZAR REGISTRO EXISTENTE ===
      const updateData = {
        ...payload,
        updated_at: new Date().toISOString(),
        ...(submodule_id ? { submodule_id } : {}), // só adiciona se tiver valor
      };

      if(record.record_id) {
        const { error } = await supabase
          .from("submodule_records")
          .update(updateData)
          .eq("id", kanban ? record.record_id : record.id);
          
        if (error) throw error;
      }

      if (kanban) {
        const kanbanUpdate = {
          ...updateData,
          ...(submodule_id ? { submodule_id } : {}),
        };

        const { error: errKanban } = await supabase
          .from("kanban_cards")
          .update(kanbanUpdate)
          .eq("id", record.id);

        if (errKanban) throw errKanban;
      }


      toast({
        title: "Registro Atualizado",
        description: "Registro atualizado com sucesso!",
      });

      setRecordsData((prev) => ({
        ...prev,
        data: { ...prev.data, ...previewData },
      }));
    } else {
      // === CRIAR NOVO REGISTRO ===
      let recordResult = null;

      // Cria registro principal se houver submodule_id
      if (submodule_id) {
        const { data: newRecord, error } = await supabase
          .from("submodule_records")
          .insert([
            {
              ...payload,
              submodule_id, // só adiciona se tiver valor
              created_at: new Date().toISOString(),
            },
          ])
          .select()
          .single();

        if (error) throw error;
        recordResult = newRecord;
      }

      // Cria card do kanban
      if (kanban) {
        const kanbanPayload = {
          step_id,
          ...payload,
          created_by,
          position,
          ...(submodule_id ? { submodule_id } : {}), // só adiciona se tiver valor
          ...(recordResult?.id ? { record_id: recordResult.id } : {}), // só adiciona se tiver valor
        };

        const { data: dataCard, error } = await supabase
          .from("kanban_cards")
          .insert([kanbanPayload])
          .select();

        if (error) throw error;
        console.log("Kanban card criado:", dataCard);
      }

      toast({
        title: "Registro Criado",
        description: "Registro salvo com sucesso!",
      });
    }

    // Atualiza listas locais
    await fetchRecords?.();
    await handleReloadKanban?.();

    // Caso seja form de confirmação
    if (!creating && formConfig[0]?.form_type === "confirmation") {
      localStorage.setItem(CONFIRMATION_KEY, "true");
      setAlreadySubmitted(true);
    }
  } catch (err) {
    console.error(err);
    toast({
      title: "Erro",
      description: err.message || "Não foi possível salvar",
    });
  } finally {
    setLoading(false);
  }
};



  
  const [enabled, setEnabled] = useState(()=>{
    const saved = localStorage.getItem(ENABLE_KEY);
    return saved ? JSON.parse(saved) : true; // padrão: ligado
  });

  

  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  


 useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);


  if (!isOpen) return null

  const {title, subtitle, message} =  formConfig.length > 0 && formConfig[0].template_data
  // Ordena os fields pelo 'order', colocando null no final
    

 

  const [description, setDescription]= useState('')
  return (
    <>{!loading && !creating && alreadySubmitted ? (
    <ConfirmationTemplate
        title={title}
        subtitle={subtitle}
        message={message}
        submoduleId={submodule_id}
        fixed={true}
        companyFields={companyFieldsData} 
        userFields={userFieldsData}
        company={company}
        user={user}
      />)
      :
      !limiteAtingido ? (
     <div
  className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 backdrop-blur-sm font-sans"
  onClick={onClose}
>
  <div
    onClick={(e) => e.stopPropagation()}
    className="relative w-full max-w-5xl bg-white dark:bg-gray-900 rounded-lg shadow-2xl flex flex-col md:flex-row overflow-y-auto max-h-[95vh] md:overflow-hidden animate-fadeIn mx-1 mb-8 mt-0 pb-8"
  >
    {/* COLUNA PRINCIPAL (ESQUERDA) */}
    <div className="flex-1 px-3 sm:px-2 md:px-6 py-6 md:overflow-y-auto ">

      {/* Título */}
      <div className="flex items-center justify-between  pb-4 mb-4 w-full">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center w-full">
                <input
                value={previewData.title || ""} // valor default
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Título do card"
                className="border-b border-gray-300 dark:border-gray-600 w-full"
                disabled={onlyView}
                />
                {loading && <Loader2 className="w-5 h-5 animate-spin text-gray-500 ml-2" />}
            </h2>
        </div>

        <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
              <AlignLeft className="w-4 h-4" /> Descrição
            </h3>
            <textarea
            value={description}
            disabled={onlyView}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            placeholder="Adicione uma descrição..."
            className="w-full min-h-[80px] rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-800 px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-blue-500  w-full
            p-3
            rounded-md
            font-mono
            text-sm
            border
            border-gray-300
            focus:outline-none
            focus:ring-2
            focus:ring-purple-500
            resize-y"
            />
        </div>

      {/* FORM / CAMPOS / SEÇÕES (aqui entra seu conteúdo já existente) */}
      <div className="space-y-6">
        { /* 🔥 COLE AQUI SEU CÓDIGO DE RENDERIZAÇÃO DE CAMPOS */ }
        <div className="space-y-6">
          {sortedFields.map((field) => (
            <div key={field.id} className="border-b border-gray-400 pb-2">
              {renderInput(field)}
            </div>
          ))}
        </div>
      </div>
      
      {!submodule_id && <ExtraFields
      formData={formData}
      setFormData={setFormData}
      renderInput={renderInput}
      onlyView={onlyView}
      />}
      
      

    </div>

    {/* COLUNA LATERAL (DIREITA) */}
    <div className=" w-full md:w-80 border-l bg-gray-50 dark:bg-gray-800 flex flex-col">

      {/* ÁREA ROLÁVEL */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <h4 className="uppercase tracking-wide text-xs font-semibold text-gray-500">
          Adicionar ao card
        </h4>

        {/* LABELS */}
        <div>
          {canEdit && <button
            onClick={() => setOpenMenu(openMenu === 'labels' ? null : 'labels')}
            className="w-full flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border rounded-md text-sm"
          >
            <Tag className="w-4 h-4" /> Labels
          </button>}

          {openMenu === 'labels' && (
            <div className="mt-2 p-1 border rounded bg-gray-100 dark:bg-gray-700 space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Nome do label"
                  className="flex-1 px-2 py-2 border rounded text-sm dark:bg-gray-800 max-w-[120px]"
                />
                <input
                  type="color"
                  value={newLabelColor}
                  onChange={(e) => setNewLabelColor(e.target.value)}
                  className="w-8 h-8 rounded"
                />
                <button
                  onClick={addLabel}
                  className="p-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {canEdit && <div className="flex flex-wrap gap-2 mt-3">
            {cardExtras.labels.map((label, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1 px-2 py-1 text-xs text-white rounded-md"
                style={{ backgroundColor: label.color }}
              >
                {label.name}
                <button
                  onClick={() =>
                    setCardExtras(prev => ({
                      ...prev,
                      labels: prev.labels.filter((_, i) => i !== idx)
                    }))
                  }
                  className="text-white/70 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>}
        </div>

        {/* CHECKLIST */}
        <div>
          {canEdit && <button
            onClick={() => setOpenMenu(openMenu === 'checklist' ? null : 'checklist')}
            className="w-full flex items-center justify-between px-3 py-2 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border rounded-md text-sm"
          >
            <span className="flex items-center gap-2"><CheckSquare className="w-4 h-4" /> Checklist</span>
            <span className="text-xs text-gray-500">{cardExtras.checklist.filter(i => i.done).length}/{cardExtras.checklist.length}</span>
          </button>}

          {openMenu === 'checklist' && (
            <div className="mt-2 p-1 border rounded bg-gray-100 dark:bg-gray-700 space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  placeholder="Novo item"
                  className="flex-1 px-1 py-1 border rounded text-sm dark:bg-gray-800"
                />
                <button
                  onClick={addChecklistItem}
                  className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {canEdit &&<div className="mt-2 space-y-1">
            {cardExtras.checklist.map((item, idx) => (
              <div key={idx} className="group flex items-center justify-between p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => toggleChecklistDone(idx)}
                    className="w-4 h-4 accent-green-600"
                  />
                  <span className={`text-sm ${item.done ? "line-through text-gray-400" : "text-gray-800 dark:text-gray-200"}`}>
                    {item.name}
                  </span>
                </label>
                <button
                  onClick={() =>
                    setCardExtras(prev => ({
                      ...prev,
                      checklist: prev.checklist.filter((_, i) => i !== idx)
                    }))
                  }
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 transition"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>}
        </div>

        {/* COMENTÁRIOS */}
        <div>
          <button
            onClick={() => setOpenMenu(openMenu === 'comments' ? null : 'comments')}
            className="w-full flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border rounded-md text-sm"
          >
            💬 Comentários
          </button>

          {openMenu === 'comments' && (
            <div className="mt-2 p-3 border rounded bg-gray-100 dark:bg-gray-700 space-y-3">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Escreva um comentário..."
                className="w-full px-3 py-2 border rounded-md text-sm dark:bg-gray-800"
                rows={3}
              />
              <button
                onClick={addComment}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-500"
              >
                Comentar
              </button>
            </div>
          )}
        </div>
        <div className="mt-3 space-y-2">
    {cardExtras.comments.map((c, idx) => {
      const userData = usuarios.find(u => u.id === c.id);
      const name = userData?.full_name ?? "Usuário";
      const company = companies.find((comp) => comp.id === userData.company_id);
      const avatar = company?.logo;
      const isOwner = user?.id === kanban.user_id; // <-- Dono do kanban?

      return (
        <div
          key={idx}
          className="relative flex gap-2 p-2 border rounded bg-white dark:bg-gray-700"
        >
          {/* Botão APAGAR — só aparece para o dono do kanban */}
          {isOwner && (
            <button
              onClick={() => {
                deleteComment(idx)
              }}
              className="absolute top-1 right-1 text-gray-400 hover:text-red-500 text-xs"
              title="Remover comentário"
            >
              🗑️
            </button>
          )}

          {/* Avatar */}
          <div className="w-4 h-4 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center overflow-hidden">
            {avatar ? (
              <img src={avatar} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {name.slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>

          {/* Texto */}
          <div className="flex-1">
            <div className="text-xs gap-1">
              <p className="truncate max-w-[120px] group relative cursor-default">
                {name}
              </p>
              <span className="text-gray-500">
                {new Date(c.created_at).toLocaleString("pt-BR")}
              </span>
            </div>
            <div className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap mt-1">
              {c.message}
            </div>
          </div>
        </div>
      );
    })}
        </div>

      </div>

      {/* BOTÕES FIXOS */}
      <div className="border-t p-4 bg-gray-50 dark:bg-gray-800 sm:mb-8 md:mb-1">
        <Button
          onClick={handleSave}
          disabled={loading || calculating }
          className="w-full bg-blue-600 hover:bg-blue-500 text-white"
        >
          {loading ? "Salvando..." : "Salvar"}
        </Button>

        {!shared && (
          <button
            onClick={onClose}
            className="w-full mt-2 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white"
          >
            Fechar
          </button>
        )}
      </div>

    </div>

  </div>
</div>

      ):
      (
      <div>
        <LimitReachedFullScreen/>
      </div>
      )
        }
    </>
  );
}
