import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import ModuleCustomization from '@/components/admin/ModuleCustomization';
import { supabase } from '@/lib/customSupabaseClient';
import { LayoutDashboard, Boxes } from 'lucide-react';
import SubmodulePage from './SubmodulePage';
import CalendarNotionStyle from '@/components/admin/CalendarModule';
import Reminders from '../components/admin/Reminders';
import AdminOverview from '../components/admin/AdminOverview';

import { DashboardProvider } from '@/contexts/DashboardContext';
import FinancialOverview from '../components/admin/FinancialOverview';
import ReportsPage from '../components/admin/ReportsPage';
import MyFinancesPage from '../components/admin/MyFinancesPage';
import AccountSettings from '../components/admin/AccountSettings';
import Kanban from '../components/admin/KanBan/Kanban';
import SubmoduleSettings from '../components/admin/SubModuleFieldsCRUDSettings';
import KanbanConfig from '../components/admin/KanBan/KanbanConfig';
import Rastreamento from '../components/admin/Rastreamento/Rastreamento';

const AdminDashboard = () => {
  const [menuItems, setMenuItems] = useState([]);

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

    

    // Itens fixos
    const fixedItems = [
      {
        id: "dashboard-fixed",
        label: "Dashboard",
        path: "/admin/dashboard",
        icon: <Boxes className="w-5 h-5" />,
        submodules: [],
      },
    ];

    // Mapear os módulos do banco
    const dynamicItems = (modules || []).map((m) => ({
      id: m.id,
      label: m.name,
      path: `/admin/modules/${m.id}`,
      icon: <Boxes className="w-5 h-5" />,
      submodules:
        m.submodules?.map((s) => ({
          id: s.id,
          label: s.name,
          path: s.path,
        })) || [],
    }));


    // Atualiza o estado
    setMenuItems([...fixedItems, ...dynamicItems]);
  } catch (err) {
    console.error("Erro ao carregar menu:", err);
  }
};


  useEffect(() => {
    fetchMenuItems();

  }, []);
  
  return (
    <>
      <DashboardProvider>


        <Helmet>
          <title>Painel Admin - Nivelo</title>
        </Helmet>
        <DashboardLayout menuItems={menuItems} userRole="admin">
          <Routes>
            <Route index element={<Navigate to="financeiro/financas" replace />} />
            <Route path="modules/:moduleId/sub/:submoduleId" element={<SubmodulePage />} />
            <Route path="modules/:moduleId/sub/:submoduleId/settings" element={<SubmoduleSettings/>} />
            <Route path="Módulos" element={<ModuleCustomization />} />
            <Route path="minhaconta" element={<AccountSettings />} />
            <Route path="KanBan/:kanban_id" element={<Kanban/>} />
            <Route path="KanBan/:kanban_id/settings" element={<KanbanConfig/>} />
            <Route path="Dashboard" element={<AdminOverview />} />
            <Route path="agenda/calendário" element={<CalendarNotionStyle />} />
            <Route path="agenda/lembretes" element={<Reminders />} />
            <Route path="financeiro/visao-geral" element={<FinancialOverview />} />
            <Route path="financeiro/relatorios" element={<ReportsPage />} />
            <Route path="financeiro/financas" element={<MyFinancesPage />} />
            <Route path="financeiro/financas" element={<MyFinancesPage />} />
            <Route path="Rastreamento" element={<Rastreamento/>} />
          </Routes>
        </DashboardLayout>
      </DashboardProvider>
    </>
  );
};

export default AdminDashboard;
