import React, { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import dayjs from "dayjs";
import {
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  TrendingUp,
  PiggyBank,
  FileText,
  AlertTriangle,
  Settings2,
  ChevronDown,
  Settings,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/customSupabaseClient";
import TransactionModal from "./TransactionModal";
import CardDetailFinances from "./CardDetailFinances";
import FormConfigMyFinances from "./FormConfigMyFinances";
import RecordCreator from "./RecordCreator"
import AlertsWithInvoiceModal from "./AlertsWithInvoiceModal";
import Joyride from "react-joyride";
import MonthYearNavigator from "./FinancesComponents/MonthYearNavigator";


const MyFinancesPage = () => {
  const { toast } = useToast();
   const [refreshKey, setRefreshKey] = useState(0);

  // função para disparar refresh

  const handleClick = () => {
    toast({
      title: "🚧 Em breve",
      description: "Esta funcionalidade ainda está em desenvolvimento.",
    });
  };
  
  const [isCardFinances, setIsCardFinances] = useState(false)
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [expenseData, setExpenseData] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState("");
  const [fields, setFields] = useState([]);
  const [subfields, setSubFields] = useState([]);
  const [modules, setModules] = useState([]);
  const [subModules, setSubModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resultFormsConfigured,setResultFormsCondigured] = useState([])
  const [openDropdown, setOpenDropdown] = useState(false);
  const [initialSelectedState, setInitialSelectedState] = useState(false)
  const [initialSelectedStateValue, setInitialSelectedStateValue] = useState({})
  const [date, setDate] = useState(new Date())
  const [originTransactions, setOriginTransactions] = useState([])


  //Transações
  //fetch principal
  const fetchTransactions = async (selectedDate = date) => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return;

    const firstDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const lastDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);

    const format = (d) => d.toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .gte("data", format(firstDay))
      .lte("data", format(lastDay))
      .order("data", { ascending: false });

    if (error) throw error;

    setTransactions(data || []); // só o mês selecionado
  } catch (err) {
    console.error("Erro ao buscar transações:", err);
  }
};

  const fetchTransactionsOrigin = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) return;

      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id); // pega todas as transações

      if (error) throw error;

      setOriginTransactions(data || []); // salva todas
    } catch (err) {
      console.error("Erro ao buscar transações:", err);
    }
  };
  //manda para transations e calcula todas
  
const computeStatsAndCharts = (dataList) => {
  if (!dataList || !Array.isArray(dataList)) return;

  const now = date;
  const currentMonth = now.getMonth(); // 0-based
  const currentYear = now.getFullYear();

  let saldoAtual = 0;
  const metaEconomia = 10000;
  const monthlyMap = {}; // ex: { "2025-11": { entrada: 0, saida: 0 } }
  const countedKeys = new Set(); // evita duplicação: "transactionId-YYYY-MM"

  const parseOnlyDate = (s) => {
    if (!s) return null;
    const datePart = String(s).split("T")[0];
    const [y, m, d] = datePart.split("-").map(Number);
    return new Date(y, m - 1, d);
  };

  const addToMonth = (ano, mesZeroBased, tipo, valor, txKey) => {
    const key = `${ano}-${mesZeroBased + 1}`;
    if (!monthlyMap[key]) monthlyMap[key] = { entrada: 0, saida: 0 };
    monthlyMap[key][tipo] += valor;

    // atualiza saldo se o mês já ocorreu ou é o atual
    if (ano < currentYear || (ano === currentYear && mesZeroBased <= currentMonth)) {
      saldoAtual += tipo === "entrada" ? valor : -valor;
    }

    // marca como contado (chave de transação única por mês)
    if (txKey) countedKeys.add(txKey);
  };

  // pega todas as transações (origem + novas)
  const allTx = [...originTransactions, ...dataList];

  // Para cada transação, montamos os "eventos mensais" que devem acontecer
  allTx.forEach((t) => {
    const baseValor = Number(t.valor) || 0;
    if (!baseValor && (!Array.isArray(t.parcelas_detalhes) || t.parcelas_detalhes.length === 0)) return;

    // pega data base (registro) - usado quando não há parcelas
    const dataBase = parseOnlyDate(t.data) || parseOnlyDate(t.created_at);
    const baseAno = dataBase ? dataBase.getFullYear() : null;
    const baseMes = dataBase ? dataBase.getMonth() : null;

    // Função auxiliar pra tentar adicionar um evento (apenas se ainda não contado)
    const tryAdd = (txId, ano, mesZero, tipo, valor) => {
      const txKey = `${txId}-${ano}-${mesZero}`;
      if (countedKeys.has(txKey)) return; // já contado => evita duplicação
      addToMonth(ano, mesZero, tipo, valor, txKey);
    };

    // 1) Se houver parcelas detalhadas, cada parcela é um evento no mês dela
    if (Array.isArray(t.parcelas_detalhes) && t.parcelas_detalhes.length > 0) {
      t.parcelas_detalhes.forEach((p) => {
        const pDate = parseOnlyDate(p.data);
        if (!pDate) return;
        const anoP = pDate.getFullYear();
        const mesP = pDate.getMonth();
        const valorP = Number(p.valor) || 0;

        // chave: usa id da transação (não usa número da parcela) pra evitar conflito com fixa
        tryAdd(t.id, anoP, mesP, t.tipo, valorP);
      });

      // importante: NÃO retorna aqui. Não retornamos porque pode haver casos
      // onde há parcelas e também se quer contabilizar fixa (mas o tracker evita duplicação).
      // Se você quiser que parcelas substituam a fixa por completo, poderia dar `return` aqui.
    }

    // 2) Se for fixa: repetir para cada mês desde a criação até o mês atual
    if (t.fixa && baseAno !== null && baseMes !== null) {
      for (let y = baseAno; y <= currentYear; y++) {
        const startM = y === baseAno ? baseMes : 0;
        const endM = y === currentYear ? currentMonth : 11;

        for (let m = startM; m <= endM; m++) {
          // tenta adicionar (será ignorado se já houver parcela com mesma chave)
          tryAdd(t.id, y, m, t.tipo, Number(t.valor) || 0);
        }
      }
      // não retornamos: já que tryAdd impede duplicação, fica seguro
      return; // volta: transação fixa já tratada (parcelas já adicionadas se existiam)
    }

    // 3) Caso padrão: transação única (não fixa, sem parcelas) — conta apenas no mês do registro
    if (!t.fixa && baseAno !== null && baseMes !== null) {
      tryAdd(t.id, baseAno, baseMes, t.tipo, Number(t.valor) || 0);
    }
  });

  // Depois de popular monthlyMap e saldoAtual, extrai valores do mês atual
  const currentKey = `${currentYear}-${currentMonth + 1}`;
  const entradasMes = monthlyMap[currentKey]?.entrada || 0;
  const saidasMes = monthlyMap[currentKey]?.saida || 0;

  // Monta expenseMap (gastos por categoria) apenas considerando os lançamentos do mês atual
  const expenseMap = {};
  allTx.forEach((t) => {
    if (t.tipo !== "saida" || !t.categoria) return;

    // contar valor principal se cair no mês atual (e se não for parcelado — ou se tiver parcela no mês)
    const dataBase = parseOnlyDate(t.data) || parseOnlyDate(t.created_at);
    if (dataBase) {
      const ano = dataBase.getFullYear();
      const mes = dataBase.getMonth();
      if (ano === currentYear && mes === currentMonth) {
        expenseMap[t.categoria] = (expenseMap[t.categoria] || 0) + Number(t.valor || 0);
      }
    }

    // contar parcelas que caem no mês atual
    if (Array.isArray(t.parcelas_detalhes)) {
      t.parcelas_detalhes.forEach((p) => {
        const pDate = parseOnlyDate(p.data);
        if (!pDate) return;
        if (pDate.getFullYear() === currentYear && pDate.getMonth() === currentMonth) {
          expenseMap[t.categoria] = (expenseMap[t.categoria] || 0) + Number(p.valor || 0);
        }
      });
    }
  });

  // Monta cards e gráficos
  const formatBR = (v) =>
    Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  setStats([
    { title: "Saldo Atual", value: `R$ ${formatBR(saldoAtual)}`, change: "+0%", icon: Wallet, color: "from-green-500 to-emerald-600", cardKey: "entrada" },
    { title: "Entradas do Mês", value: `R$ ${formatBR(entradasMes)}`, change: "+0%", icon: ArrowUpCircle, color: "from-blue-500 to-blue-600", cardKey: "entrada" },
    { title: "Despesas do Mês", value: `R$ ${formatBR(saidasMes)}`, change: "-0%", icon: ArrowDownCircle, color: "from-red-500 to-red-600", cardKey: "saida" },
    { title: "Meta de Economia", value: `R$ ${formatBR(metaEconomia)}`, change: `${Math.floor((saldoAtual / metaEconomia) * 100)}% atingido`, icon: PiggyBank, color: "from-purple-500 to-indigo-600", cardKey: "entrada" },
  ]);

  const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  const monthlyArr = Array.from({ length: 12 }, (_, i) => ({
    month: months[i],
    entrada: monthlyMap[`${currentYear}-${i + 1}`]?.entrada || 0,
    saida: monthlyMap[`${currentYear}-${i + 1}`]?.saida || 0,
  }));
  setMonthlyData(monthlyArr);

  const expenseArr = Object.entries(expenseMap).map(([name, value]) => ({ name, value }));
  setExpenseData(expenseArr);
};





  const getConfiguredFormDetails = (selectedOrInitial) => {
  if (!selectedOrInitial || Object.keys(selectedOrInitial).length === 0) return [];

  const configuredSubmoduleIds = Object.keys(selectedOrInitial).filter(id => selectedOrInitial[id]);
  if (configuredSubmoduleIds.length === 0) return [];

  const configuredData = configuredSubmoduleIds.map(submoduleId => {
    const submodule = subModules.find(s => String(s.id) === String(submoduleId));
    if (!submodule) return null;

    const module = modules.find(m => m.id === submodule.module_id);
    const submoduleFields = fields.filter(f => f.submodule_id === submoduleId);
    const submoduleSubfields = subfields.filter(sf =>
      submoduleFields.some(f => f.id === sf.field_id)
    );

    return {
      submodule_id: submodule.id,
      submodule_name: submodule.name,
      module_id: module?.id || null,
      module_name: module?.name || "Sem módulo",
      fields: submoduleFields.map(f => {
        let parsedConfigs = [];

        try {
          if (f.field_type === "relation" && f.relatedConfigs) {
            if (typeof f.relatedConfigs === "string") {
              parsedConfigs = JSON.parse(f.relatedConfigs);
            } else if (Array.isArray(f.relatedConfigs)) {
              parsedConfigs = f.relatedConfigs;
            } else if (typeof f.relatedConfigs === "object") {
              parsedConfigs = [f.relatedConfigs];
            }
          }
        } catch (e) {
          console.warn("Erro ao parsear related_configs:", f.relatedConfigs, e);
          parsedConfigs = [];
        }

        return {
          ...f,
          subfields: submoduleSubfields.filter(sf => sf.field_id === f.id),
          relatedConfigs: Array.isArray(parsedConfigs) ? parsedConfigs : [],
        };
      }),
    };
  }).filter(Boolean);
  
  return configuredData;
  };

// assume que você tem: const [initialSelectedState, setInitialSelectedState] = useState({});
const fetchFormsUser = async () => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return;

    const { data: configuredForms, error } = await supabase
      .from("user_configured_forms")
      .select("submodule_id")
      .eq("user_id", user.id);

    if (error) return;

    const initialSelected = {};
    (configuredForms || [])
      .filter(cf => cf.submodule_id != null)
      .forEach(cf => {
        initialSelected[String(cf.submodule_id)] = true;
      });

    // Salva no estado — NÃO chama getConfiguredFormDetails aqui
    setInitialSelectedState(true);
    setInitialSelectedStateValue(initialSelected)
  } catch (err) {
    console.error("Erro em fetchFormsUser:", err);
    setResultFormsCondigured([]);
    setLoading(false);
  }
};

const fetchFields = async () => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("Usuário não autenticado:", userError);
      return;
    }

    const { data: modulesData, error: modulesError } = await supabase
      .from("modules")
      .select("*")
      .eq("user_id", user.id)
      .eq("customizable", true);
    if (modulesError) throw modulesError;
    if (!modulesData?.length) return;

    const { data: subModuleData, error: subModuleError } = await supabase
      .from("submodules")
      .select("*")
      .in("module_id", modulesData.map(m => m.id));
    if (subModuleError) throw subModuleError;

    const { data: fieldsData, error: fieldsError } = await supabase
      .from("submodule_fields")
      .select("*")
      .in("submodule_id", subModuleData.map(s => s.id));
    if (fieldsError) throw fieldsError;

    const { data: subFieldsData, error: subFieldsError } = await supabase
      .from("submodule_field_subfields")
      .select("*")
      .in("field_id", fieldsData.map(f => f.id));
    if (subFieldsError) throw subFieldsError;

    setModules(modulesData);
    setSubModules(subModuleData);
    setFields(fieldsData);
    setSubFields(subFieldsData);
  } catch (err) {
    console.error("Erro ao carregar campos:", err.message);
  }
};

    useEffect(() => {
    const tutorialKey = "hasSeenFinancesTutorial";

    // se ainda não viu o tutorial
    if (!localStorage.getItem(tutorialKey)) {
      setRunTutorial(true);
      localStorage.setItem(tutorialKey, "true");
    } else {
      setRunTutorial(false);
    }
  }, []);

    useEffect(() => {
      fetchTransactionsOrigin()
      fetchFormsUser();
      fetchFields();
      fetchTransactions();
    }, []);
  useEffect(() => {
      computeStatsAndCharts(transactions);
  }, [transactions]);
  
  useEffect(()=> {
    fetchTransactions()
  },[date])
  //função de calcular
    

    useEffect(() => {
      // só roda quando houver seleção e os dados necessários
      if (
        initialSelectedState
      ) {
        try {
          const resultForms = getConfiguredFormDetails(initialSelectedStateValue);
          setResultFormsCondigured(resultForms);
        } finally {
          setLoading(false);
        }
      }
    }, [initialSelectedState, initialSelectedStateValue]);


   const openCardModal = (cardKey) => {
    setSelectedCard(cardKey);
    setIsCardFinances(true);
  };

  const [openSettings, setOpenSettings] = useState(false)
  const [FormDataDelect, setFormDataSelect] = useState({})
  const [selectedSubfields, setSelectedSubfields] = useState([]);
  const [viewRecordModal, setViewRecordModal] = useState(false)
  const [page, setPage] = useState("")
  const [runTutorial, setRunTutorial] = useState(true);
  // Recebe o form completo do resultFormsConfigured

    const extractAllSubfields = (form) => {
      if (!form?.fields) return [];

      // Mapeia todos os subfields de todos os fields do form
      const allSubfields = form.fields.flatMap((f) =>
        f.subfields?.map((sf) => ({
          ...sf,
          parent_field_name: f.name, // opcional, pra referência
          parent_field_id: f.id,
        })) || []
      );

      return allSubfields;
    };
    const steps = [
      {
        target: ".btn_new_transaction",
        content: "Insira entradas ou saidas",
        disableBeacon: true,
        placement: "bottom",
      },
      {
        target: ".configured_button",
        content: "Configure seus modulos personalizados",
      }
    ];
    const handleDateChange = (month, year, date) => {
      setDate(new Date(date))
    };


    if (loading ) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600 border-b-4 border-gray-200"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6" key={refreshKey}>
      {/* Cabeçalho */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Minhas Finanças
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Gerencie seus ganhos, gastos e acompanhe sua evolução financeira.
          </p>
        </div>
        <div className="flex items-center space-x-2 mt-4 md:mt-0">
          
          <Button onClick={handleClick} variant="outline">
            <FileText className="w-4 h-4 mr-2" />
            Exportar Extrato
          </Button>
          
          <div className="relative">
            <Button
              onClick={() => {
                setIsModalOpen(true);
              }}
              className={`btn_new_transaction bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 flex items-center justify-between gap-2`}
            >
              Nova 
            </Button>

          </div>
        </div>
      </motion.div>
     
      {!openSettings ?
      <>
       <div className="flex justify-start mt-6">
        <MonthYearNavigator onChange={handleDateChange} />
      </div>
     {/* Estatísticas */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-md sm:shadow-lg p-3 sm:p-4 lg:p-6 cursor-pointer card-hover transition-all hover:shadow-xl"
            onClick={() => openCardModal(stat.cardKey)}
          >
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <p className="text-[11px] sm:text-sm text-gray-600 dark:text-gray-400 truncate">
                  {stat.title}
                </p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white mt-1 sm:mt-2">
                  {stat.value}
                </p>
                <p
                  className={`text-[11px] sm:text-sm mt-1 ${
                    stat.change.startsWith("+")
                      ? "text-green-600 dark:text-green-400"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {stat.change}
                </p>
              </div>
              <div
                className={`w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r ${stat.color} rounded-lg flex items-center justify-center`}
              >
                <stat.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>


      {!isCardFinances &&
      <>
      
      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evolução Financeira */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Evolução Financeira (Mensal)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(v) => `R$ ${v.toLocaleString()}`} />
              <Line
                type="monotone"
                dataKey="entrada"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ fill: "#10b981", r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="saida"
                stroke="#ef4444"
                strokeWidth={3}
                dot={{ fill: "#ef4444", r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Distribuição de Despesas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Distribuição de Despesas
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={expenseData}
                dataKey="value"
                nameKey="name"
                outerRadius={100}
                label
              >
                {expenseData.map((_, i) => (
                  <Cell key={i} fill={["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6"][i % 5]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => `R$ ${v.toLocaleString()}`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Movimentações e Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Movimentações */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 overflow-x-auto"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Movimentações Recentes
          </h3>
          <table className="w-full text-sm text-left">
            <thead className="text-gray-600 dark:text-gray-300">
              <tr>
                <th className="py-2">Data</th>
                <th>Tipo</th>
                <th>Descrição</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody className="text-gray-800 dark:text-gray-100">
              {transactions.map((t, i) => (
                <tr
                  key={i}
                  className="border-t border-gray-200 dark:border-gray-700"
                >
                  <td className="py-2">{new Date(t.created_at).toLocaleDateString("pt-BR")}</td>
                  <td>{t.tipo === "entrada" ? "Entrada" : "Saída"}</td>
                  <td>{t.descricao && t.descricao.slice(0,10)}</td>
                  <td>R$ {Number(t.valor).toLocaleString("pt-BR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>

        {/* Alertas */}
        <AlertsWithInvoiceModal alerts={alerts} fetchTransactions={fetchTransactions}/>
      </div>
      </>
      }
      </>:
      
      <FormConfigMyFinances onClose={()=>setOpenSettings(false)} fetchFormsUser={fetchFormsUser} 
      fetchFields={fetchFields}/>
      }

      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        fetchTransactions={fetchTransactions}
        fetchTransactionsOrigin={fetchTransactionsOrigin}
      />
      
      <CardDetailFinances
        isOpen={isCardFinances}
        onClose={() => setIsCardFinances(false)}
        cardType={selectedCard}
        transactions={transactions} 
        fetchTransactions={fetchTransactions}    
        originTransactions={originTransactions} 
        fetchTransactionsOrigin={fetchTransactionsOrigin}
        date={date}
        />

      <RecordCreator isOpen={viewRecordModal} onClose={() => setViewRecordModal(false)} fields={FormDataDelect.fields} subFields={selectedSubfields} submodule_id={FormDataDelect.submodule_id} page={page} fetchTransactions={fetchTransactions} creating={true}/>
      <Joyride
          steps={steps}
          run={runTutorial}
          continuous
          showProgress
          showSkipButton={false}
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
    </div>
  );
};

export default MyFinancesPage;
