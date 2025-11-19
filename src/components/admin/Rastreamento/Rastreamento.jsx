import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/lib/customSupabaseClient";

// UI
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";

// Icons
import { ArrowLeft, FormInput as FormInputIcon, Settings } from "lucide-react";


export default function Rastreamento() {
  const navigate = useNavigate();
  const { kanban_id } = useParams();

  const [activeTab, setActiveTab] = useState("steps");
  const [activeSubmoduleId, setActiveSubmoduleId] = useState(null);
  const [title, setTitle] = useState('')

  const [user, setUser] = useState({})

  const [submodules, setSubmodules] = useState([])
  const [steps, setSteps] = useState([])
  const [cards, setCards] = useState([])
  const [cardsSelected, setCardsSelected] = useState([])
  
  const fetchData = async() => {
    const { data: userData } = await supabase.auth.getUser();
    setUser(userData.user);

   

    const {data:stepsData,erro:stepsEror} = await supabase
    .from('kanban_steps')
    .select()

    const {data:KanbanCards, error} = await supabase
    .from("kanban_cards")
    .select()
    .eq('created_by', userData.user.id)

    const stepsComCards = stepsData.filter(step =>
      KanbanCards.some(card => card.step_id === step.id)
    )
    const {data:submodulesData, erro:subError} = await supabase
    .from('submodules')
    .select()
    .in('id',stepsComCards.map((step)=> step.kanban_id))

    

    setSubmodules(submodulesData)
    setCards(KanbanCards)
    setSteps(stepsComCards)
  }

  useEffect(()=> {
    fetchData()
  },[])

  const handleSelectSubmodule = (sub) => {

    try{
      const stepsFilter = steps.filter((st) => st.kanban_id === sub.id);

      // Pega todos os cards de QUALQUER etapa daquele submodule
      const cardsFilter = cards.filter((card) =>
        stepsFilter.some((step) => step.id === card.step_id)
      );

      setCardsSelected(cardsFilter)
      setTitle(sub.name)
      console.log(stepsFilter)
    } catch (err) {
      throw err
    }
    
  }

  return (
    <div className="p-4">
      {/* Botão de voltar */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center justify-center p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors mb-4"
        title="Voltar"
      >
        <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-200" />
      </button>

      {/* Nome do Kanban */}
      <div className="mb-5">
        <h2 className="font-bold">Rastreamento</h2>
      </div>

      {/* Layout principal */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row gap-6 mx-auto"
      >
        {/* Sidebar */}
        <Card className="md:w-1/4 h-fit shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Itens</CardTitle>
          </CardHeader>

          <CardContent className="space-y-2">
          {submodules?.map((sub) => (
          <Button
            key={sub.id}
            variant={activeSubmoduleId === sub.id ? "default" : "ghost"}
            onClick={() => {
              setActiveSubmoduleId(sub.id);
              handleSelectSubmodule(sub);
            }}
            className="w-full justify-start gap-2"
          >
            {sub.name}
          </Button>
          ))}


            

          </CardContent>
        </Card>

        {/* Conteúdo principal */}
        <Card className="flex-1 shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">
              {title}
            </CardTitle>
          </CardHeader>

          <CardContent>

            {/* Aba: Submodules */}
            {activeTab === "steps" && (
              <motion.div
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
               {cardsSelected.length > 0 && cardsSelected.map((card)=> {
  const { title } = card.data;
  const etapa = steps.find(s => s.id === card.step_id);

  return (
    <div key={card.id}>
      <Button>
        <h2>{title}</h2>
      </Button>
      <h3>Etapa: {etapa?.name ?? "—"}</h3>
    </div>
  );
})}

              </motion.div>
            )}

          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
