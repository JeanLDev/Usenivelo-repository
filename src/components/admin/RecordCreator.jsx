import { useState, useEffect } from "react";
import { supabase } from "@/lib/customSupabaseClient";
import { Button } from "@/components/ui/button";
import { AlertCircle, AlignLeft, Calculator, CheckSquare, FileText, Layers, Loader2, Tag, Upload, UserPlus, X } from "lucide-react";
import { useToast } from '@/components/ui/use-toast';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectItem, SelectTrigger, SelectContent, SelectValue } from "@/components/ui/select";
import { RecordRelationField } from "./Tabs/RecordCreatorRelations";
import {uploadFileToSupabase} from "@/lib/uploadFile"
import SubmoduleUserCompanyFooter from "./SubmoduleUserCompanyFooter";
import ConfirmationTemplate from "./SubmoduleCRUDconfig/templates/ConfirmationTemplate";
import FileInput from "./Inputs/FileInput";
import LimitReachedFullScreen from "./SubmoduleCRUDconfig/templates/LimitReachedFullScreen";

// --- Funções utilitárias --- //



// --- Componente principal --- //
export default function RecordCreator({ fields = [], subFields = [], submodule_id , record=[],fetchRecords, onClose, isOpen,page, shared, creating, limiteAtingido , submoduleName,kanban,created_by,position,step_id, handleReloadKanban}) {
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

  const sortedFields = [...fields].sort((a, b) => {
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
    const init = { ...(record?.data || {}), ...localCache, ...prev };

    fields.forEach(f => {
      if (init[f.name] === undefined) {
        if (f.field_type === "number") init[f.name] = ""; // ❌ não 0
        else if (f.field_type === "formula") init[f.name] = 0; // mantém fórmula como 0
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
  }, []);
  // Recalcula fórmulas dinamicamente e salva valores no cache (fórmulas + subfields)
  useEffect(() => {
    if (!fields?.length || !submodule_id) return;

    
    fetchRelated()
    setLoading(false)
  }, [fields, subFields, submodule_id]);
  useEffect(() => {
      setIsFormValid(checkRequiredFields());
    }, [formData, fields]);
    useEffect(() => {
    if (!creating && formConfig[0]?.form_type === 'confirmation') {
      const saved = localStorage.getItem(CONFIRMATION_KEY);
      setAlreadySubmitted(saved === "true"); // converte string para boolean
    }
  }, [submodule_id, formConfig]);




  // Atualiza valor
  const handleChange = (name, value) => {
    setFormData(prev => {
    const nextFormData = { ...prev, [name]: value };

    // Atualiza previewData com todos os campos atuais
    const updatedPreview = { ...nextFormData };

    // Recalcula fórmulas automaticamente
    const formulaFields = fields.filter(f => f.field_type === "formula");
    formulaFields.forEach(f => {
      updatedPreview[f.name] = calculateField(f, updatedPreview) ?? 0;
    });

    setPreviewData(updatedPreview);
    return nextFormData;
  });
};

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
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500"
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
                  className={`w-6 h-6 rounded-full border-2 cursor-pointer mt-1 flex items-center justify-center transition-colors ${
                    etapaVal ? "bg-green-500 border-green-500" : "bg-white border-gray-300 dark:bg-gray-800"
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

  // ========== SELECT ==========
  if (field.field_type === "select") {
    const options = subFields.filter(sf => sf.field_id === field.id);

    return (
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{field.name}</label>
        <Select value={value ?? ""} onValueChange={(v) => handleChange(field.name, v)}>
          <SelectTrigger className="w-full h-10" />
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
      const limit = field.limit || options.length;
      let res = selected.includes(name)
        ? selected.filter(v => v !== name)
        : (selected.length < limit ? [...selected, name] : selected);
      handleChange(field.name, res);
    };

    return (
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{field.name}</label>

        <div className="border border-gray-300 dark:border-gray-700 rounded-md p-2 bg-white dark:bg-gray-800">
          {options.map(op => {
            const active = selected.includes(op.name);
            return (
              <label key={op.id} className="flex items-center gap-2 py-1 cursor-pointer text-sm">
                <input type="checkbox" checked={active} onChange={() => toggle(op.name)} className="accent-green-600" />
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
      <label className="flex items-center justify-between py-1 cursor-pointer text-sm">
        <span className="text-gray-700 dark:text-gray-300">{field.name}</span>
        <div className="relative">
          <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => handleChange(field.name, e.target.checked)} />
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
        <FileInput field={field} value={value} onChange={(val) => handleChange(field.name, val)} />
      </div>
    );
  }
   if (field.field_type === "relation") {
    return (
      <div className="space-y-1">
        <RecordRelationField 
        field={field}
        relatedRecords ={relatedRecords}
        formData={formData}
        setFormData={setFormData}
        />
      </div>
    );
  }

  // ========== INPUTS NORMAIS ==========
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{field.name}</label>
      <Input
        type={field.field_type}
        value={formData[field.name] ?? ""} // sempre string se vazio
        onChange={(e) =>
          handleChange(
            field.name,
            field.field_type === "number"
              ? e.target.value === "" ? "" : Number(e.target.value)
              : e.target.value
          )
        }
        className="w-full"
      />

    </div>
  );
};

  useEffect(() => {
    if (record?.data) {
      setPreviewData(record.data); // garante que ao salvar, previewData já tem tudo
    }
  }, [record]);


  // Salvar registro
  const handleSave = async () => {
  setLoading(true);
  try {
    // previewData já contém todos os valores do formulário
    const payload = { data: previewData };

    if (record?.id) {
      // Atualiza registro existente
      const { error } = await supabase
        .from("submodule_records")
        .update({
          ...payload,
          updated_at: new Date().toISOString(),
        })
        .eq("id", record.id);

      if (error) throw error;

      toast({
        title: 'Registro Atualizado',
        description: 'Registro atualizado com sucesso!',
      });

      setRecordsData(prev => ({ ...prev, data: { ...prev.data, ...previewData } }));
    } else {
       
      const { error } = await supabase
        .from("submodule_records")
        .insert([
          {
            submodule_id,
            ...payload,
            created_at: new Date().toISOString(),
          },
        ]);

      if (error) throw error;

      toast({
        title: 'Registro Criado',
        description: 'Registro salvo com sucesso!',
      });
    }

    // Atualiza lista local
    await fetchRecords && fetchRecords();

    // Limpa formulário se não for lembrar
    

    if (!creating && formConfig[0].form_type === 'confirmation') {
      localStorage.setItem(CONFIRMATION_KEY, "true");
      setAlreadySubmitted(true);
    }
    if(kanban) {
      const { error } = await supabase
      .from("kanban_cards")
      .insert([
        {
          step_id,
          ...payload,
          created_by,
          position,
        },
      ]);
      handleReloadKanban()
    }
    

  } catch (err) {
    console.error(err);
    toast({ title: 'Erro', description: err.message || 'Não foi possível salvar' });
  } finally {
    setLoading(false);
  }
};

  
  const [enabled, setEnabled] = useState(()=>{
    const saved = localStorage.getItem(ENABLE_KEY);
    return saved ? JSON.parse(saved) : true; // padrão: ligado
  });

  

  const [alreadySubmitted, setAlreadySubmitted] = useState(false);





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
  className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
  onClick={onClose}
>
  <div
    onClick={(e) => e.stopPropagation()}
    className="relative w-full max-w-5xl bg-white dark:bg-gray-900 rounded-lg shadow-2xl flex flex-col md:flex-row overflow-hidden animate-fadeIn"
  >
    {/* COLUNA PRINCIPAL (ESQUERDA) */}
    <div className="flex-1 px-6 py-6 overflow-y-auto max-h-[90vh]">

      {/* Título */}
      <div className="flex items-center justify-between border-b pb-4 mb-4">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          {submoduleName}
          {loading && <Loader2 className="w-5 h-5 animate-spin text-gray-500" />}
        </h2>
      </div>

      {/* FORM / CAMPOS / SEÇÕES (aqui entra seu conteúdo já existente) */}
      <div className="space-y-6">
        { /* 🔥 COLE AQUI SEU CÓDIGO DE RENDERIZAÇÃO DE CAMPOS */ }
        <div className="space-y-6">
          {sortedFields.map((field) => (
            <div key={field.id}>
              {renderInput(field)}
            </div>
          ))}
        </div>
      </div>
        {/* FOOTER - BOTÕES */}
      <div className="mt-8 flex items-center justify-end gap-3 border-t pt-4">
        <Button
          variant="ghost"
          onClick={onClose}
          className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white flex items-center gap-1"
        >
          <X size={18} />
          Fechar
        </Button>

        <Button
          onClick={handleSave}
          disabled={loading || !isFormValid}
          className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 px-5"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckSquare size={18} />}
          Salvar
        </Button>
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
