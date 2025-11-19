import { useState, useEffect } from "react";
import { supabase } from "@/lib/customSupabaseClient";
import { Button } from "@/components/ui/button";
import { useNavigate, useParams } from "react-router-dom";
import RecordCreator from "../admin/RecordCreator";
import RecordShared from "./RecordShared";


export default function SharedServiceView() {
  const { module_id, sub_id } = useParams();

  const [validated, setValidated] = useState(false);
  const [submodule, setSubmodule] = useState(null);
  const [company, setCompany] = useState(null);
  const [user, setUser] = useState([])
  const [fields, setFields] = useState([]);
  const [subFields, setSubFields] = useState([]);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [limiteAtingido, setLimiteAtingido] = useState(false)
  const [logoUrl, setLogoUrl] = useState(null);
  const [userFieldsData, setuserFieldsData] = useState([])
  const [companyFieldsData, setcompanyFieldsData] = useState([])
  const [formConfig, setFormConfig] = useState({})
  const [form_type, setForm_type] = useState('')
  const [kanbanSelect, setKanbanSelect] = useState('')
  const [stepSelect, setStepSelect] = useState('')
  const [sendForKanban, setSendForKanban] = useState(false)
  const [userLogado, setUserLogado] = useState({})
    

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError("");
        const { data: userData } = await supabase.auth.getUser();
        setUserLogado(userData.user);
        // 🔹 Buscar módulo
        const { data: moduleData, error: moduleError } = await supabase
          .from("modules")
          .select("*")
          .eq("id", module_id)
          .single();
          
        if (moduleError || !moduleData) throw new Error("Módulo não encontrado.");
        // 🔹 Buscar submódulo
        const { data: sub, error: subError } = await supabase
          .from("submodules")
          .select("*")
          .eq("id", sub_id)
          .single();

        const { data: recordsData, error: recordsDataError } = await supabase
        .from("submodule_records")
        .select("*")
        .eq("submodule_id", sub_id)
        // 🔹 Buscar campos
        const { data: fieldsData } = await supabase
          .from("submodule_fields")
          .select("*")
          .eq("submodule_id", sub.id);
        
        // 🔹 Buscar subcampos
        const { data: subFieldsData } = await supabase
          .from("submodule_field_subfields")
          .select("*")
          .in("field_id", (fieldsData || []).map(f => f.id));

        const { data: userDb } = await supabase
          .from("users")
          .select("*")
          .eq('id', moduleData.user_id)
          .single()

        

          const { data: companieData } = await supabase
          .from("companies")
          .select("*")
          .eq('id',userDb.company_id)
          .single()
          

          // ⚙️ Campos visíveis no submódulo
          const { data: configs } = await supabase
            .from("user_submodule_fields")
            .select("*")
            .eq("submodule_id", sub.id)
            .eq("visible",true);

          const { data: formsConfigData, error: formsConfigError } = await supabase
            .from('user_submodule_form_config')
            .select('*')
            .eq("user_id", userDb.id)
            .eq("submodule_id", sub_id)
            .single()
          if (formsConfigError) throw subError;




          // 🧩 Campo de logo
          const logoFieldUser = configs?.find(
            (f) => f.field_origin === "user" && f.field_name.toLowerCase() === "logo"
          );
          const logoFieldCompany = configs?.find(
            (f) => f.field_origin === "company" && f.field_name.toLowerCase() === "logo"
          );
    
          
          let logo = null;
          if (logoFieldCompany && companieData) logo = companieData[logoFieldCompany.field_name];
          else if (logoFieldUser && userDb) logo = userDb[logoFieldUser.field_name];
    
          let userFieldsData = configs.filter((f) => f.field_origin === "user");
          let companyFieldsData = configs.filter((f) => f.field_origin === "company");
          
          
          

    

        if (recordsData.length >= sub.limit) setLimiteAtingido(true) 
        if (subError || !sub) throw new Error("Submódulo não encontrado.");
        if (sub.module_id !== moduleData.id) throw new Error("Submódulo não pertence ao módulo informado.");
        if (!sub.share) throw new Error("Submódulo não permite compartilhamento.");



        setLogoUrl(logo || null);
        setcompanyFieldsData(companyFieldsData || [])
        setuserFieldsData(userFieldsData || [])
        
        //saber se é para enviar para kanban
        if(formConfig.step_selected && formConfig.kanban_selected) {
          setSendForKanban(true)
        }
        setStepSelect(formConfig.step_selected)
        setKanbanSelect(formConfig.kanban_selected)
        setUser(userDb)
        setCompany(companieData);
        setSubmodule(sub);
        setSubFields(subFieldsData || []);
        setFields(fieldsData || []);
        setValidated(true);
        setFormConfig(formsConfigData)
        setForm_type(formsConfigData.length && formsConfigData.form_type)
      } catch (err) {
        console.error(err);
        setError(err.message || "Erro inesperado ao carregar dados.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-600 dark:text-gray-300">
        Carregando informações...
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-20 p-6 bg-white dark:bg-gray-900 rounded-xl shadow-md text-center">
        <p className="text-red-500 font-semibold">{error}</p>
      </div>
    );
  }


  if (!validated) return null;
  return (
    <div>
      <RecordShared  fields={fields} subFields={subFields} submodule_id={submodule.id} isOpen={true} onClose={ ()=>navigate("/")} shared={true} limiteAtingido={limiteAtingido} creating={false} logoUrl={logoUrl}  userFieldsData={userFieldsData} companyFieldsData={companyFieldsData} user={user} company={company} form_type={form_type} formConfig={formConfig} sendForKanban={sendForKanban} kanbanSelect={kanbanSelect} stepSelect={stepSelect} userLogado={userLogado}/>
    </div>
  );
}
