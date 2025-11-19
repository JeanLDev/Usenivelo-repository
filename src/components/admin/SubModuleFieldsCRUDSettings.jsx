import { useContext, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Clipboard, Share2, Eye, Table2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/customSupabaseClient";
import { Link, useParams } from "react-router-dom";
import SubModulesCamps from "./SubModulesCamps";
import ShareAccess from "./ShareAccess";
import TableFieldsConfig from "./TableFieldsConfig";
import TableCompanySubmoduleConfig from "./TableCompanySubmoduleConfig";
import FormTypeConfig from "./SubmoduleCRUDconfig/FormTypeConfig";
import { useNavigate } from "react-router-dom";

export default function AccountSettings() {
    const { toast } = useToast();
    const {moduleId, submoduleId }= useParams();
    const [module, setModule] = useState([])
    const [submodule, setSubmodule] = useState([])
    const [activeTab, setActiveTab] = useState("confirm");
    const [loading, setLoading] = useState(false);
    const [fields, setFields] = useState([])
    const navigate = useNavigate();

  const fetchModules = async () => {
    try {
        const { data, error: userError } = await supabase.auth.getUser();
        const user = data?.user;
        if (userError || !user) return;

        const { data: dbUser, error: dbUserError } = await supabase
            .from("users")
            .select("*")
            .eq("id", user.id)
            .single();

        if (dbUserError) throw dbUserError;

        const { data: modulesData, error: modulesDataError } = await supabase
            .from("modules")
            .select("*")
            .eq("id", moduleId)
            .single();
        if (modulesDataError) throw dbUserError;

        const { data: submodulesData, error: submodulesDataError } = await supabase
        .from("submodules")
        .select("*")
        .eq("id", submoduleId)
        .single();

        if (submodulesDataError) throw dbUserError;

        const { data: fieldsData, error: fieldsDataError } = await supabase
        .from("submodule_fields")
        .select("*")
        .eq("submodule_id", submodulesData.id)

        if (fieldsDataError) throw dbUserError;

         const { data: submodule_field_subfields, error: subfieldsDataError } = await supabase
        .from("submodule_field_subfields")
        .select("*")

        if (subfieldsDataError) throw dbUserError;

        setModule(modulesData)
        setSubmodule(submodulesData)
        setFields(fieldsData)

    } catch (e) {
      console.error(e);
    } finally {
        setLoading(true)
    }
  };

  useEffect(() => {
    fetchModules();
  }, []);

  return (
    <>
    
      <div className="mb-6 flex items-start gap-3">
  {/* Botão de voltar */}
  <button
    onClick={() => navigate(-1)}
    className="flex items-center justify-center p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
    title="Voltar"
  >
    <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-200" />
  </button>
  {/* Título e subtítulo */}
  <div>
    <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
      {submodule.name}
    </h2>
    <p className="text-sm text-gray-500 dark:text-gray-400">
      Configure os campos e estruturas deste submódulo.
    </p>
  </div>
</div>
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col md:flex-row gap-6 mx-auto "
    >

      {/* Sidebar */}
      <Card className="md:w-1/4 h-fit shadow-sm rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Configurações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            variant={activeTab === "campos" ? "default" : "ghost"}
            onClick={() => setActiveTab("campos")}
            className="w-full justify-start gap-2"
          >
            <Table2 size={16} /> Campos
          </Button>
          <Button
            variant={activeTab === "vizualizar" ? "default" : "ghost"}
            onClick={() => setActiveTab("vizualizar")}
            className="w-full justify-start gap-2"
          >
            <Eye size={16} /> Ver Colunas
          </Button>
           <Button
            variant={activeTab === "view_form" ? "default" : "ghost"}
            onClick={() => setActiveTab("view_form")}
            className="w-full justify-start gap-2"
          >
            <Clipboard size={16} /> Ver no Formulario
          </Button>
          <Button
            variant={activeTab === "compartilhar" ? "default" : "ghost"}
            onClick={() => setActiveTab("compartilhar")}
            className="w-full justify-start gap-2"
          >
            <Share2 size={16} /> Compartilhar
          </Button>
          <Button
            variant={activeTab === "confirm" ? "default" : "ghost"}
            onClick={() => setActiveTab("confirm")}
            className="w-full justify-start gap-2"
          >
            <CheckCircle2 size={16} /> Confirmação
          </Button>
         
        </CardContent>
      </Card>

      {/* Content */}
      <Card className="flex-1 shadow-sm rounded-2xl">

        <CardContent>
          {activeTab === "campos" ? (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4 py-7"
            >
              
              {!loading ? 
              <div className="w-full flex items-center justify-center">
                <Loader2 className="w-25 h-25 animate-spin"/>
              </div>: 
              <SubModulesCamps/>}


            </motion.div>
          ):null}
        </CardContent>

        <CardContent>
          {activeTab === "compartilhar" ? (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              {!loading ? 
              <div className="w-full flex items-center justify-center">
                <Loader2 className="w-25 h-25 animate-spin"/>
              </div>: 
              <ShareAccess/>}
            </motion.div>
          ):null}
        </CardContent>

        <CardContent>
          {activeTab === "vizualizar" ? (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              {!loading ? 
              <div className="w-full flex items-center justify-center">
                <Loader2 className="w-25 h-25 animate-spin"/>
              </div>: 
              <TableFieldsConfig/>}
            </motion.div>
          ):null}
        </CardContent>
        <CardContent>
        {activeTab === "view_form" ? (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              {!loading ? 
              <div className="w-full flex items-center justify-center">
                <Loader2 className="w-25 h-25 animate-spin"/>
              </div>: 
              <TableCompanySubmoduleConfig/>}
            </motion.div>
          ):null}
        </CardContent>

        <CardContent>
        {activeTab === "confirm" ? (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              {!loading ? 
              <div className="w-full flex items-center justify-center">
                <Loader2 className="w-25 h-25 animate-spin"/>
              </div>: 
              <FormTypeConfig/>}
            </motion.div>
          ):null}
        </CardContent>

      </Card>
    </motion.div>
    </>
  );
}
