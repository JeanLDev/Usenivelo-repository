import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/customSupabaseClient";
import { Loader2, ArrowLeft, FormInputIcon, Settings, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useNavigate, useParams } from "react-router-dom";
import PermissionCardsList from "./PermissionCardsList";
import StepsList from "./StepsList";

export default function KanbanConfig() {
  const [activeTab, setActiveTab] = useState("steps");
  const {kanban_id} = useParams();
  const [kanban, setKanban] = useState()
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [steps, setSteps] = useState([]);
  const [stepsPerms, setStepsPerms] = useState([]);
  const navigate = useNavigate();

  // ------------------- FETCH -------------------
  const fetchData = async () => {
    try {
      // Usuário logado
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) throw new Error("Usuário não logado");
      setUser(userData.user);

      const {data:kanban, erro:kanbanErro} = await supabase
      .from("submodules")
      .select('*')
      .eq("id", kanban_id)
      .single()
      // Buscar etapas do kanban
      const { data: stepsData } = await supabase
        .from("kanban_steps")
        .select("*")
        .order("position", { ascending: true });

      // Buscar permissões do usuário para essas etapas
      const { data: permsData } = await supabase
        .from("kanban_steps_permissions")
        .select("*")
        .in("step_id", stepsData.map(s => s.id))
        .eq("user_id", userData.user.id);

      setSteps(stepsData || []);
      setStepsPerms(permsData || []);
      setKanban(kanban)
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ------------------- VERIFICA PERMISSÕES -------------------
  const stepsDoUsuario = steps.filter(step =>
    stepsPerms.some(p => p.step_id === step.id)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin w-12 h-12 text-blue-600" />
      </div>
    );
  }

  if (kanban.user_id != user?.id) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="p-6 text-center text-gray-500 italic border border-gray-300 rounded-md bg-gray-50 dark:bg-gray-900">
          <AlertCircle className="text-center w-full mb-6 text-blue-400"/>
          Você não possui permissões para acessar essa página.
        </div>
      </div>
    );
  }

  // ------------------- RENDER -------------------
  return (
    <div>
      {/* Botão de voltar */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center justify-center p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors mb-4"
        title="Voltar"
      >
        <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-200" />
      </button>

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
              variant={activeTab === "steps" ? "default" : "ghost"}
              onClick={() => setActiveTab("steps")}
              className="w-full justify-start gap-2"
            >
              <FormInputIcon size={16} /> Etapas
            </Button>
            <Button
              variant={activeTab === "submodules" ? "default" : "ghost"}
              onClick={() => setActiveTab("submodules")}
              className="w-full justify-start gap-2"
            >
              <Settings size={16} /> Submodules
            </Button>
            <Button
              variant={activeTab === "delete" ? "default" : "ghost"}
              onClick={() => setActiveTab("delete")}
              className="w-full justify-start gap-2"
            >
              <FormInputIcon size={16} /> Apagar
            </Button>
          </CardContent>
        </Card>

        <Card className="flex-1 shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">
              {activeTab === "submodules" && "Submodules"}
              {activeTab === "steps" && "Etapas"}
              {activeTab === "delete" && "Apagar Kanban"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeTab === "submodules" && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <PermissionCardsList />
              </motion.div>
            )}
            {activeTab === "steps" && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <StepsList />
              </motion.div>
            )}
            {activeTab === "delete" && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <Button
                className={`bg-red-500 hover:bg-red-700`}
                onClick={async()=> {
                  await supabase
                    .from("submodules")
                    .delete()
                    .eq("id", kanban_id);
                    
                    navigate('/admin')
                }
              }
                
                >Deletar Kanban</Button>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
