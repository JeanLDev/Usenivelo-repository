import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Image, FileText, CheckCircle2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/customSupabaseClient";
import { uploadFileToSupabase } from "@/lib/uploadFile";
import { useParams } from "react-router-dom";
import ConfirmationTemplate from "./templates/ConfirmationTemplate";

// Componente RadioItem
function RadioItem({ value, id, groupName, selectedValue, onValueChange, children }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="radio"
        id={id}
        name={groupName}
        value={value}
        checked={selectedValue === value}
        onChange={() => onValueChange(value)}
        className="w-4 h-4"
      />
      {children}
    </label>
  );
}

export default function FormTypeConfig() {
  const { submoduleId } = useParams();
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [formType, setFormType] = useState("normal");
  const [confirmationMode, setConfirmationMode] = useState("image");
  const [imageURL, setImageURL] = useState("");

  const [kanbans, setKanbans] = useState([])
  const [steps, setSteps] = useState([])

  const [submoduloSelect, setSubmoduleSelect] = useState({})
  const [kanbanSelect, setKanbanSelect] = useState({})
  const [stepSelect, setStepSelect] = useState({})

  const [templateData, setTemplateData] = useState({
    title: "Inscrição Confirmada!",
    subtitle: "Parabéns!",
    message: "Sua inscrição foi realizada com sucesso."
  });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Carrega usuário
  useEffect(() => {
    async function fetchUser() {
      const { data: { user: currentUser }, error } = await supabase.auth.getUser();
      if (error) console.error(error);
      else setUser(currentUser);
    }
    fetchUser();
  }, []);

  // Carrega ou cria configuração inicial
  useEffect(() => {
    if (!user || !submoduleId) return;

    async function fetchOrCreateConfig() {
      try {
        let { data: kanbans, error: errKanban } = await supabase
          .from("submodules")
          .select("*")
          .eq("user_id", user.id)

        let { data: steps, error: errSteps } = await supabase
        .from("kanban_steps")
        .select("*")
        .eq("user_id", user.id)


        if(errKanban) throw errKanban
        if(errSteps)throw errSteps

        let { data, error } = await supabase
          .from("user_submodule_form_config")
          .select("*")
          .eq("user_id", user.id)
          .eq("submodule_id", submoduleId)
          .single();

        if (error && error.code !== "PGRST116") {
          console.error(error);
          return;
        }
        setKanbans(kanbans)
        setSteps(steps)
        if (!data) {
          const initialConfig = {
            user_id: user.id,
            submodule_id:submoduleId,
            form_type: formType,
            confirmation_mode: confirmationMode,
            image_url: imageURL,
            template_data: templateData,
          };

          const { data: insertedData, error: insertError } = await supabase
            .from("user_submodule_form_config")
            .insert(initialConfig)
            .select()
            .single();

          if (insertError) console.error(insertError);
          else {
            setFormType(insertedData.form_type);
            setConfirmationMode(insertedData.confirmation_mode);
            setImageURL(insertedData.image_url || "");
            setTemplateData(insertedData.template_data);
          }
        } else {
          
          setFormType(data.form_type || "normal");
          setConfirmationMode(data.confirmation_mode || "image");
          setImageURL(data.image_url || "");
          setTemplateData(data.template_data || templateData);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchOrCreateConfig();
  }, [user, submoduleId]);

  // Salvar configuração
  const handleSave = async () => {
    if (!user || !submoduleId) return;
    setLoading(true);
    try {
      const upsertData = {
        user_id: user.id,
        submodule_id:submoduleId,
        form_type:formType,
        confirmation_mode: formType === "confirmation" ? confirmationMode : null,
        image_url: formType === "confirmation" && confirmationMode === "image" ? imageURL : null,
        template_data: formType === "confirmation" && confirmationMode === "template" ? templateData : null,
      };

      const { error } = await supabase
        .from("user_submodule_form_config")
        .upsert(upsertData, { onConflict: "user_id,submodule_id" });

      if (error) throw error;

      toast({
        title: "Configuração salva!",
        description:
          formType === "confirmation"
            ? "Formulário de confirmação configurado."
            : "Formulário normal definido.",
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a configuração.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Upload de imagem
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const url = await uploadFileToSupabase(file);
    if (url) setImageURL(url);
    setUploading(false);
  };

  if (loading) return <div className="text-center py-10">Carregando...</div>;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-blue-500" />
          Tipo de Formulário
        </CardTitle>
      </CardHeader>

      <Separator />

      <CardContent className="space-y-6 mt-4">
        <div className="space-y-2">
          <Label>Selecione o tipo de formulário:</Label>
          <div className="flex flex-col space-y-2 mt-2">
            <RadioItem value="normal" id="normal" groupName="formType" selectedValue={formType} onValueChange={setFormType}>
              Normal
            </RadioItem>
            <RadioItem value="confirmation" id="confirmation" groupName="formType" selectedValue={formType} onValueChange={setFormType}>
              Confirmação
            </RadioItem>
            <RadioItem value="send_kanban" id="send_kanban" groupName="formType" selectedValue={formType} onValueChange={setFormType}>
              Enviar p/ Kanban
            </RadioItem>
          </div>
        </div>

{console.log(kanbans)}
        {formType === "confirmation" && (
          <div className="mt-4 space-y-4">
            <Separator />
            <Label>Modo de confirmação:</Label>
            <div className="flex flex-col space-y-2 mt-2">
              <RadioItem value="image" id="image" groupName="confirmationMode" selectedValue={confirmationMode} onValueChange={setConfirmationMode}>
                <div className="flex items-center gap-2">
                  <Image className="w-4 h-4 text-blue-400" /> Mostrar imagem
                </div>
              </RadioItem>
              <RadioItem value="template" id="template" groupName="confirmationMode" selectedValue={confirmationMode} onValueChange={setConfirmationMode}>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-400" /> Usar template de confirmação
                </div>
              </RadioItem>
            </div>

            {confirmationMode === "image" && (
              <div className="space-y-2 mt-3">
                <Label>Imagem:</Label>
                <Input type="file" onChange={handleFileChange} disabled={uploading} />
                {imageURL && <img src={imageURL} className="w-full max-h-48 object-contain rounded-lg border mt-2" />}
              </div>
            )}

            {confirmationMode === "template" && (
              <div className="space-y-2 mt-3 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                <Label>Título:</Label>
                <Input
                  placeholder="Título da confirmação"
                  value={templateData?.title || ""}
                  onChange={(e) => setTemplateData({ ...templateData, title: e.target.value })}
                />
                <Label>Subtítulo:</Label>
                <Input
                  placeholder="Subtítulo da confirmação"
                  value={templateData?.subtitle || ""}
                  onChange={(e) => setTemplateData({ ...templateData, subtitle: e.target.value })}
                />
                <Label>Mensagem:</Label>
                <Input
                  placeholder="Mensagem da confirmação"
                  value={templateData?.message || ""}
                  onChange={(e) => setTemplateData({ ...templateData, message: e.target.value })}
                />

                {/* Preview */}
                <div className="mt-2">
                  <ConfirmationTemplate
                    title={templateData?.title}
                    subtitle={templateData?.subtitle}
                    message={templateData?.message}
                    submoduleId={submoduleId}
                    fixed={false}
                    demo={true}
                  />
                </div>
              </div>
            )}
          </div>
        )}
        {formType === "send_kanban" && (
          <div className="mt-4 space-y-4">
            <Separator />
            {/**selecionar o formulário (submodule) */}
            <div>
              <Label>Selecione o submódulo:</Label>
              <div className="flex flex-col space-y-2 mt-2">
                <select
                  className="bg-white shadow-md p-2"
                  value={submoduloSelect?.id ?? ""}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    const selectedObj = kanbans.find(k => k.id === selectedId);
                    setSubmoduleSelect(selectedObj);
                  }}
                >
                  <option value="" disabled>Selecione...</option>
                  {kanbans
                  .map((kan) => (
                    <option key={kan.id} value={kan.id}>
                      {kan.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {/**selecionar kanban */}
            <div>
              <Label>Selecione o kanban:</Label>
              <div className="flex flex-col space-y-2 mt-2">
                <select
                  className="bg-white shadow-md p-2"
                  value={kanbanSelect?.id ?? ""}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    const selectedObj = kanbans.find(k => k.id === selectedId);
                    setKanbanSelect(selectedObj);
                  }}
                >
                  <option value="">Selecione...</option>
                  {kanbans
                  .filter((kan)=> kan.kanban)
                  .map((kan) => (
                    <option key={kan.id} value={kan.id}>
                      {kan.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/**selecionar etapa */}
            <div>
              <Label>Selecione a etapa:</Label>
               <select
                className="bg-white shadow-md p-2 w-full"
                value={stepSelect?.id ?? ""}
                onChange={(e) => {
                  const selectedId = e.target.value;

                  const selectedObj = steps.find(k => k.id === selectedId);
                  setStepSelect(selectedObj);
                }}
              >
                <option value="">Selecione...</option>

                {steps
                .filter((step)=> step.kanban_id === kanbanSelect.id)
                .map((kan) => (
                  <option key={kan.id} value={kan.id}>
                    {kan.name}
                  </option>
                ))}
              </select>
            </div>
            

          </div>
        )}

        <Separator />

        <Button onClick={handleSave} className="w-full" disabled={loading || uploading}>
          Salvar Configuração
        </Button>
      </CardContent>
    </Card>
  );
}
