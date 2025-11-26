import BooleanFieldsSection from './FieldGroupBase/BooleanFieldsSection';
import FieldSection from './FieldGroupBase/FieldGroupBase';
import RelationFieldsSection from './FieldGroupBase/RelationFieldsSection';
import EtapasFieldsSection from './FieldGroupBase/EtapasFieldsSection';
import FormulaFieldsSection from './FieldGroupBase/FormulasFieldsSection';
import SelectFieldsSection from './FieldGroupBase/SelectFieldsSection';
import {useToast} from "@/components/ui/use-toast"
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useParams } from 'react-router-dom';
import CreatenewField from "./CreateNewField"
import {Button} from "@/components/ui/button"
import CreateNewField from './CreateNewField';
import { ListOrdered, Loader2, Plus } from 'lucide-react';
import MultiSelectFieldsSection from './FieldGroupBase/MultiSelectFieldsSection';
import FieldsDragDrop from './SubmoduleCRUDconfig/FieldsDragDrop';
import UpdateLimitInput from './SubmoduleCRUDconfig/UpdateLimitButton';

export default function SubModulesCamps ()  {
    const {submoduleId} = useParams()
    const [data, setData] = useState({})
    const { toast } = useToast();
    const [fields, setFields] = useState([]);
    const [subFields, setSubFields] = useState([]);
    const [records, setRecords] = useState([]);
    const [selectSubCamp, setSelectSubCamp] = useState()
    const [fieldModalOpen, setFieldModalOpen] = useState(false);
    const [submodule, setSubmodule] = useState([])

  const [selectedField, setSelectedField] = useState(null);
  const [newField, setNewField] = useState({
    name: '', field_type: '', hasFunction: false, subFields: [], operation: null, selectedSubFields: [],formula:'',limit:1
  });
  const [searchFields, setSearchFields] = useState({});
  const [loading, setLoading] = useState(true);

  // Fetch Fields
  const fetchFields = async () => {
    setFields([]);
    setSubFields([]);
    try {

      const { data: fieldsData, error: fieldsError } = await supabase
        .from('submodule_fields')
        .select('*')
        .eq('submodule_id', submoduleId);
      if (fieldsError) throw fieldsError;

      const { data: subFieldsData, error: subError } = await supabase
        .from('submodule_field_subfields')
        .select('*')
        .in('field_id', fieldsData.map(f => f.id));
      if (subError) throw subError;

       const { data: submoduleData, error: submoduleError } = await supabase
        .from('submodules')
        .select('*')
        .eq('id', submoduleId);
      if (submoduleError) throw fieldsError;

      setSubmodule(submoduleData)
      setFields(fieldsData);
      setSubFields(subFieldsData || []);
    } catch (err) {
      console.error('Erro ao carregar campos:', err.message);
    }
  };
  // Fetch Records
  const fetchRecords = async () => {
    if (!submoduleId) return;
    const { data, error } = await supabase
      .from('submodule_records')
      .select('*')
      .eq('submodule_id', submoduleId)
      .order('id', { ascending: false });
    if (!error) setRecords(data);
  };
  const[isMobile, setIsMobile] = useState(false)



  useEffect(() => {
    const loadFields = async () => {
        setLoading(true);
        await fetchFields();
        setLoading(false);
      };
    loadFields();
    fetchRecords();
    const handleResize = () => setIsMobile(window.innerWidth < 640); // < sm breakpoint
    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);


//filtros
const [activeFilter, setActiveFilter] = useState(null);
const [filteredRecords, setFilteredRecords] = useState(records);

useEffect(() => {
  if (!activeFilter) {
    setFilteredRecords(records);
    return;
  }

  const { column, operator, value } = activeFilter;

  const filtered = records.filter((rec) => {
    const recordValue = String(rec.data?.[column] ?? "").toLowerCase();
    const filterValue = String(value).toLowerCase();

    switch (operator) {
      case "=":
        return recordValue === filterValue;
      case "!=":
        return recordValue !== filterValue;
      case ">":
        return parseFloat(recordValue) > parseFloat(filterValue);
      case "<":
        return parseFloat(recordValue) < parseFloat(filterValue);
      case "ilike":
        return recordValue.includes(filterValue);
      default:
        return true;
    }
  });

  setFilteredRecords(filtered);
}, [activeFilter, records]);

const handleUpdateRelatedConfigs = (campoId, updatedConfigs) => {
  setFields((prevFields) =>
    prevFields.map((campo) =>
      campo.id === campoId ? { ...campo, relatedConfigs: updatedConfigs } : campo
    )
  );
  };
const handleDefaultChange = async (campo, idx, value) => {
  try {
    const updatedConfigs = campo.relatedConfigs.map((rc, i) =>
      i === idx ? { ...rc, defaultValue: value } : rc
    );
    // Atualiza o state local
    handleUpdateRelatedConfigs(campo.id, updatedConfigs);

    // Garante que seja um array JSON válido
    const { data, error } = await supabase
      .from('submodule_fields')
      .update({ relatedConfigs: updatedConfigs })
      .eq('id', campo.id)
      .select()
      .single();

    if (error) {
      console.error("Erro ao salvar no Supabase:", error);
    } else {
      console.log("Salvo com sucesso:", data);
    }
  } catch (err) {
    console.error("Erro ao atualizar valor padrão:", err);
  }
};



  // Save Field
  const handleSaveField = async () => {
  if (!newField.name?.trim()) {
    toast({ title: 'Erro', description: 'Nome do campo é obrigatório.' });
    return;
  }

  setLoading(true);

  try {
    let fieldId;

    // ============================
    // 1) Criar ou atualizar field
    // ============================
    if (selectedField) {
      const { data: updatedData, error: updateError } = await supabase
        .from("submodule_fields")
        .update({
          name: newField.name,
          field_type: newField.field_type,
          operation: newField.operation,
          formula: newField.formula,
          limit: newField.limit
        })
        .eq("id", selectedField.id)
        .select()
        .single();

      if (updateError) throw updateError;
      fieldId = updatedData.id;

      // ---- Atualizar subfields da fórmula, se houver ----
      if (newField.editFormula) {
        const { data: subFieldsData } = await supabase
          .from("submodule_field_subfields")
          .select("*")
          .eq("field_id", selectedField.id);

        const parsed = parseFormula(newField.formula)?.subFields || [];

        // Atualiza ou cria novos
        for (let i = 0; i < parsed.length; i++) {
          const sf = parsed[i];
          const existing = subFieldsData?.[i];

          if (existing) {
            await supabase
              .from("submodule_field_subfields")
              .update({ name: sf.name, field_type: "number" })
              .eq("id", existing.id);
          } else {
            await supabase
              .from("submodule_field_subfields")
              .insert({
                field_id: selectedField.id,
                name: sf.name,
                field_type: "number"
              });
          }
        }

        // Remove excedentes
        const excess = subFieldsData?.slice(parsed.length) || [];
        if (excess.length)
          await supabase
            .from("submodule_field_subfields")
            .delete()
            .in("id", excess.map(e => e.id));
      }
    } else {
      // Criar novo campo
      const { data: fieldData, error: insertError } = await supabase
        .from("submodule_fields")
        .insert([{
          submodule_id: submoduleId,
          name: newField.name,
          field_type: newField.field_type,
          formula: newField.formula,
          operation: newField.operation,
        }])
        .select()
        .single();

      if (insertError) throw insertError;
      fieldId = fieldData.id;
    }

    // ============================
    // 2) Criar subfields iniciais
    // ============================
    const shouldCreateSubs =
      (newField.field_type === "formula" || newField.field_type === "etapas") &&
      Array.isArray(newField.subFields) &&
      newField.subFields.length;

    if (shouldCreateSubs) {
      const rows = newField.subFields.map(sf => ({
        field_id: fieldId,
        name: sf.name,
        field_type: newField.field_type === "etapas" ? "boolean" : "number",
      }));

      const { error: subfieldError } = await supabase
        .from("submodule_field_subfields")
        .insert(rows);

      if (subfieldError) throw subfieldError;
    }

    toast({ title: "Campo salvo", description: `Campo "${newField.name}" salvo com sucesso.` });

    setCreatingFieldType(null);
    setEditingFieldId(null);

    // ============================
    // 3) Atualizar records existentes
    // ============================
    const { data: records } = await supabase
      .from("submodule_records")
      .select("*")
      .eq("submodule_id", submoduleId);

    if (records?.length) {
      const renaming = selectedField && selectedField.name !== newField.name;
      const oldKey = selectedField?.name;
      const newKey = newField.name;

      for (const record of records) {
        const updatedData = { ...record.data };

        // Renomear chave
        if (renaming && oldKey in updatedData) {
          updatedData[newKey] = updatedData[oldKey];
          delete updatedData[oldKey];
        }

        // Garantir campo base
        if (!(newKey in updatedData)) {
          updatedData[newKey] =
            newField.field_type === "number" || newField.hasFunction
              ? 0
              : newField.field_type === "etapas"
              ? false
              : "";
        }

        // Garantir subfields
        if ((newField.hasFunction || newField.field_type === "etapas") && newField.subFields) {
          newField.subFields.forEach(sf => {
            if (!(sf.name in updatedData)) {
              updatedData[sf.name] =
                newField.field_type === "etapas"
                  ? false
                  : 0;
            }
          });
        }

        await supabase
          .from("submodule_records")
          .update({ data: updatedData })
          .eq("id", record.id);
      }
    }

    // ============================
    // 4) Reset final
    // ============================
    setFieldModalOpen(false);
    setSelectedField(null);
    setNewField({
      name: "",
      field_type: "text",
      hasFunction: false,
      subFields: [],
      operation: "",
      selectedSubFields: []
    });

    await fetchFields();
    await fetchRecords();

  } catch (err) {
    console.error(err);
    toast({ title: "Erro ao salvar campo", description: err.message });
  } finally {
    setLoading(false);
  }
};



  const handleSaveSubField = async (field,subfield) => {
    if (!newField.name || !newField.name.trim()) {
      toast({ title: 'Erro', description: 'Nome do campo é obrigatório.' });
      return;
    }
    try {
      let fieldId;
      if (selectedField) {
        // Atualizar campo existente
        const { data: updatedData, error: updateError } = await supabase
        .from('submodule_field_subfields')
        .update({
            name: newField.name, 
            field_type: newField.field_type,
          })
          .eq('id', subfield.id)
          .select()
          .single();
          
          if (updateError) throw updateError;
          fieldId = updatedData.id;
          
          } else {
        // Inserir novo campo
        const { data: fieldData, error: insertError } = await supabase
          .from('submodule_field_subfields')
          .insert([{
            field_id: field.id, // UUID do submodule
            name: newField.name,
            field_type: newField.field_type,
          }])
          .select()
          .single();

        if (insertError) throw insertError;
        fieldId = fieldData.id; // UUID correto
      } 
      handleCloseClick()
      setNewField({
        name: '',
        field_type: 'text',
        hasFunction: false,
        subFields: [],
        operation: '',
        selectedSubFields: []
      });
      await fetchFields()
    }catch(err) {
      throw err
    }
  }


  const parseFormula = (formula) => {
    const operators = /[\+\-\*\/\(\)]/g;
    const tokens = formula.split(operators).map(t => t.trim()).filter(t => t);
    const uniqueTokens = [...new Set(tokens)]; // remove duplicados
    const subFields = uniqueTokens.map(name => ({ name, field_type: 'text' }));

    // Mantemos os operadores em ordem para cálculo futuro
    const ops = formula.match(operators) || [];

    return { subFields, ops };
  };


  const handleDeleteField = async (field) => {
    await supabase.from('submodule_fields').delete().eq('id', field.id);
    fetchFields();
  };
  const handleDeleteSubField = async (field) => {
    await supabase.from('submodule_field_subfields').delete().eq('id', field.id);
    fetchFields();
  };

  // Filtro dinâmico por campo

//Novas funcionalidades
const [editingFieldId, setEditingFieldId] = useState(null);
const [editingValue, setEditingValue] = useState('');
const [creatingFieldType, setCreatingFieldType] = useState(null);
const [newValue, setNewValue] = useState('');
const [isCreatingNewField, setIsCreatingNewField] = useState(false);

function handleEditClick(campo, alter) {
  setEditingFieldId(campo.id);

  // Se for fórmula, pega fórmula, senão pega nome
  setEditingValue(campo.editFormula ? campo.formula : campo.name);

  // Atualiza newField com todos os dados do campo
  setNewField({
    ...newField,
    name: campo.name,
    field_type: campo.field_type,
    limit: campo.limit ?? 1,
    subFields: campo.subFields || [],
    formula: campo.formula || '',
    operation: campo.operation || null
  });

  setCreatingFieldType(null);
  setSelectedField(campo);
}

function handleCloseClick() {
  setCreatingFieldType(null);
  setNewValue('');
  setEditingFieldId(null);

  // Reset completo de newField
  setNewField({
    name: '',
    field_type: 'text',
    hasFunction: false,
    subFields: [],
    operation: null,
    selectedSubFields: [],
    formula: '',
    limit: 1
  });
}

function handleNewClick(type) {
  setCreatingFieldType(type);
  setNewValue('');
  setEditingFieldId(null);
}
    const [showMenu, setShowMenu] = React.useState(false);

const camposPorTipo = fields.reduce((acc, campo) => {
  if (!acc[campo.field_type]) acc[campo.field_type] = [];

  acc[campo.field_type].push(campo);
  
  return acc;
},{ formula: [] });

const [editOrderCamps, setEditOrderCamps] = useState(false)


    return (
        <>
        {loading ? (
  <div className="flex justify-center items-center py-10">
    <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
    <span className="ml-2 text-gray-600"></span>
  </div>
) : (!fields || fields.length === 0 || isCreatingNewField) ? (
  <CreateNewField
    submoduleId={submoduleId}
    setCreateNewField={() => setIsCreatingNewField(!isCreatingNewField)}
    fetchFields={fetchFields}
    fields={fields}
    type="text"
  />
        ) : (
          <div className='space-y-3'>
            <UpdateLimitInput submoduleId={submoduleId} currentLimit={submodule.length > 0 && submodule[0].limit || 20} />
           <div className='flex items-center'>
             <button
              onClick={() => setIsCreatingNewField(true)}
              className="flex items-center gap-2 px-4 py-2 mb-5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-md hover:shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 active:scale-95 mr-2"
                       >
              <Plus className="w-4 h-4" />
              Novo Campo
              </button>
              <button
              onClick={() => setEditOrderCamps(!editOrderCamps)}
              className="flex items-center gap-2 px-4 py-2 mb-5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-md hover:shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 active:scale-95"
                       >
              <ListOrdered className="w-4 h-4" />
              Ordenar
              </button>
           </div>

           {!editOrderCamps?
           ( <div className='space-y-3'>
              {Object.keys(camposPorTipo)
                .filter(
                  (tipo) =>
                    tipo !== 'boolean' &&
                    tipo !== 'formula' &&
                    tipo !== 'multiselect' &&
                    tipo !== 'etapas' &&
                    tipo !== 'relation' &&
                    tipo !== 'select'
                )
                .map((tipo) => (
                  <FieldSection
                    key={tipo}
                    tipo={tipo}
                    camposPorTipo={camposPorTipo}
                    editingFieldId={editingFieldId}
                    newField={newField}
                    creatingFieldType={creatingFieldType}
                    setNewField={setNewField}
                    setSelectedField={setSelectedField}
                    handleSaveField={handleSaveField}
                    handleDeleteField={handleDeleteField}
                    handleEditClick={handleEditClick}
                    handleCloseClick={handleCloseClick}
                    handleNewClick={handleNewClick}
                  />
                ))}
              {/* Relation */}
              {camposPorTipo.relation && (
              <RelationFieldsSection
                camposPorTipo={camposPorTipo}
                editingFieldId={editingFieldId}
                newField={newField}
                creatingFieldType={creatingFieldType}
                setNewField={setNewField}
                setCreateNewField={setIsCreatingNewField}
                setSelectedField={setSelectedField}
                handleSaveField={handleSaveField}
                handleDeleteField={handleDeleteField}
                handleEditClick={handleEditClick}
                handleCloseClick={handleCloseClick}
                handleNewClick={handleNewClick}
                handleUpdateRelatedConfigs={handleUpdateRelatedConfigs} // ✅ Adicionar aqui
                handleDefaultChange={handleDefaultChange}
              />
                        )}
              {/* Boolean */}
              {camposPorTipo.boolean && (
                <BooleanFieldsSection
                  camposPorTipo={camposPorTipo}
                  editingFieldId={editingFieldId}
                  newField={newField}
                  creatingFieldType={creatingFieldType}
                  setNewField={setNewField}
                  setSelectedField={setSelectedField}
                  handleSaveField={handleSaveField}
                  handleDeleteField={handleDeleteField}
                  handleEditClick={handleEditClick}
                  handleCloseClick={handleCloseClick}
                  handleNewClick={handleNewClick}
                />
              )}
              {/* Etapas */}
              {camposPorTipo.etapas && (
                <EtapasFieldsSection
                  camposPorTipo={camposPorTipo}
                  editingFieldId={editingFieldId}
                  subFields={subFields}
                  newField={newField}
                  creatingFieldType={creatingFieldType}
                  setCreateNewField={setIsCreatingNewField}
                  setNewField={setNewField}
                  handleDeleteSubField={handleDeleteSubField}
                  setSelectSubCamp={setSelectSubCamp}
                  selectSubCamp={selectSubCamp}
                  handleSaveSubField={handleSaveSubField}
                  setSelectedField={setSelectedField}
                  handleSaveField={handleSaveField}
                  handleDeleteField={handleDeleteField}
                  handleEditClick={handleEditClick}
                  handleCloseClick={handleCloseClick}
                  handleNewClick={handleNewClick}
                />
              )}
              {/* Formula */}
              {camposPorTipo.formula?.length > 0 && (
                <FormulaFieldsSection
                  camposPorTipo={camposPorTipo}
                  editingFieldId={editingFieldId}
                  newField={newField}
                  creatingFieldType={creatingFieldType}
                  setNewField={setNewField}
                  setSelectedField={setSelectedField}
                  handleSaveField={handleSaveField}
                  handleDeleteField={handleDeleteField}
                  handleEditClick={handleEditClick}
                  handleCloseClick={handleCloseClick}
                  handleNewClick={handleNewClick}
                  showMenu={showMenu}
                  setShowMenu={setShowMenu}
                  editingValue={editingValue}
                  parseFormula={parseFormula}
                />
              )}
              {/* Select */}
              {camposPorTipo.select && (
                <SelectFieldsSection
                  camposPorTipo={camposPorTipo}
                  editingFieldId={editingFieldId}
                  newField={newField}
                  subFields={subFields}
                  selectSubCamp={selectSubCamp}
                  setSelectSubCamp={setSelectSubCamp}
                  setCreateNewField={setIsCreatingNewField}
                  handleSaveSubField={handleSaveSubField}
                  handleDeleteSubField={handleDeleteSubField}
                  creatingFieldType={creatingFieldType}
                  setNewField={setNewField}
                  setSelectedField={setSelectedField}
                  handleSaveField={handleSaveField}
                  handleDeleteField={handleDeleteField}
                  handleEditClick={handleEditClick}
                  handleCloseClick={handleCloseClick}
                  handleNewClick={handleNewClick}
                />
              )}
              {/* Multiselect */}
              {camposPorTipo.multiselect && (
                <MultiSelectFieldsSection
                  camposPorTipo={camposPorTipo}
                  editingFieldId={editingFieldId}
                  newField={newField}
                  subFields={subFields}
                  selectSubCamp={selectSubCamp}
                  setSelectSubCamp={setSelectSubCamp}
                  setCreateNewField={setIsCreatingNewField}
                  handleSaveSubField={handleSaveSubField}
                  handleDeleteSubField={handleDeleteSubField}
                  creatingFieldType={creatingFieldType}
                  setNewField={setNewField}
                  setSelectedField={setSelectedField}
                  handleSaveField={handleSaveField}
                  handleDeleteField={handleDeleteField}
                  handleEditClick={handleEditClick}
                  handleCloseClick={handleCloseClick}
                  handleNewClick={handleNewClick}
                  setEditingFieldId={setEditingFieldId}
                />
              )}
            </div>):
            (
             <FieldsDragDrop
                fields={fields}
                setFields={setFields}
                submoduleId={submoduleId}
              />
            )
            }

          </div>
        )}
        
        

        </>
    )
}