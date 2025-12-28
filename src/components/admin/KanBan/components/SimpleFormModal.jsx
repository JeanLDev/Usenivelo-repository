import { useState, useEffect } from "react";
import { supabase } from "@/lib/customSupabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectItem, SelectTrigger, SelectContent } from "@/components/ui/select";
import FileInput from "../../Inputs/FileInput";
import { RecordRelationField } from "../../Tabs/RecordCreatorRelations";

export default function SimpleFormModal({ 
  fields = [], 
  subFields = [], 
  submodule_id, 
  record = {}, 
  onClose, 
  isOpen, 
  fetchRecords, 
  relatedRecords = {}, 
  onlyView = false, 
  kanban, 
  canEdit 
}) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({});

  useEffect(() => {
    const initialData = {};
    fields.forEach(f => {
      initialData[f.name] = record.data?.[f.name] ?? (f.field_type === "number" ? 0 : "");
    });
    setFormData(initialData);
  }, [fields, record]);

  const handleChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const renderInput = (field) => {
    const value = formData[field.name] ?? "";

    // ================= FORMULA =================
    if (field.field_type === "formula") {
      const relatedSubs = subFields.filter(sf => sf.field_id === field.id);
      const result = parseFloat(formData[field.name] ?? 0) || 0;

      return (
        <div className="space-y-4">
          {relatedSubs.length > 0 && (
            <div className="grid sm:grid-cols-2 gap-3">
              {relatedSubs.map(sf => {
                const subVal = formData[sf.name] ?? 0;
                return (
                  <div key={sf.id}>
                    <Label>{sf.name}</Label>
                    <Input
                      type="number"
                      step="any"
                      value={subVal}
                      onChange={(e) => handleChange(sf.name, parseFloat(e.target.value) || 0)}
                      disabled={onlyView}
                    />
                  </div>
                );
              })}
            </div>
          )}
          <div>
            <Label>Resultado</Label>
            <Input readOnly value={String(result.toFixed(2))} />
            {field.formula && <p className="text-xs text-gray-500 italic">{field.formula}</p>}
          </div>
        </div>
      );
    }

    // ================= ETAPAS =================
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
          <Label>{field.name}</Label>
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
                      etapaVal ? "bg-green-500 border-green-500 cursor-pointer" : "bg-white border-gray-300 cursor-pointer"
                    }`}
                  />
                  <span className="text-sm mt-1">{etapa.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // ================= TEXTAREA =================
    if (field.field_type === "textarea") {
      return (
        <div className="space-y-1">
          <Label>{field.name}</Label>
          <textarea
            value={value}
            onChange={(e) => handleChange(field.name, e.target.value)}
            className="w-full p-2 border rounded"
            disabled={onlyView}
          />
        </div>
      );
    }

    // ================= SELECT =================
    if (field.field_type === "select") {
      const options = subFields.filter(sf => sf.field_id === field.id);
      return (
        <div className="space-y-1">
          <Label>{field.name}</Label>
          <Select value={value} onValueChange={(v) => handleChange(field.name, v)} disabled={onlyView}>
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

    // ================= MULTISELECT =================
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
          <Label>{field.name}</Label>
          <div className="border rounded p-2 bg-white dark:bg-gray-800">
            {options.map(op => {
              const active = selected.includes(op.name);
              return (
                <label key={op.id} className="flex items-center gap-2 py-1 cursor-pointer">
                  <input type="checkbox" checked={active} onChange={() => toggle(op.name)} disabled={onlyView} />
                  {op.name}
                </label>
              );
            })}
          </div>
          {field.limit && <p className="text-xs text-gray-500">Selecionados: {selected.length}/{field.limit}</p>}
        </div>
      );
    }

    // ================= BOOLEAN =================
    if (field.field_type === "boolean") {
      return (
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={!!value} onChange={(e) => handleChange(field.name, e.target.checked)} disabled={onlyView} />
          {field.name}
        </label>
      );
    }

    // ================= FILE =================
    if (field.field_type === "file") {
      return (
        <div className="space-y-1">
          <Label>{field.name}</Label>
          <FileInput field={field} value={value} onChange={(val) => handleChange(field.name, val)} disabled={onlyView} />
        </div>
      );
    }

    // ================= RELATION =================
    if (field.field_type === "relation") {
      return (
        <RecordRelationField
          field={field}
          relatedRecords={relatedRecords}
          handleChange={handleChange}
          formData={formData}
          setFormData={setFormData}
          kanban={kanban}
          canEdit={canEdit}
          onlyView={onlyView}
        />
      );
    }

    // ================= INPUT PADRÃO =================
    return (
      <div className="space-y-1">
        <Label>{field.name}</Label>
        <Input
          type={field.field_type === "number" ? "number" : "text"}
          value={value ?? ""}
          onChange={(e) => handleChange(field.name, field.field_type === "number" ? Number(e.target.value) : e.target.value)}
          disabled={onlyView}
        />
      </div>
    );
  };

  const handleSave = async () => {
    try {
      const payload = { data: formData, submodule_id };
      if (record.id) {
        const { error } = await supabase
          .from("submodule_records")
          .update(payload)
          .eq("id", record.id);
        if (error) throw error;
        toast({ title: "Registro atualizado com sucesso!" });
      } else {
        const { error } = await supabase
          .from("submodule_records")
          .insert([payload]);
        if (error) throw error;
        toast({ title: "Registro criado com sucesso!" });
      }
      fetchRecords?.();
      onClose?.();
    } catch (err) {
      console.error(err);
      toast({ title: "Erro ao salvar", description: err.message });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 w-full max-h-[90vh] overflow-y-auto max-w-3xl">
        <div className="space-y-4">
          {fields.map(field => (
            <div key={field.id}>{renderInput(field)}</div>
          ))}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button onClick={handleSave}>Salvar</Button>
          <Button variant="ghost" onClick={onClose}>Fechar</Button>
        </div>
      </div>
    </div>
  );
}
