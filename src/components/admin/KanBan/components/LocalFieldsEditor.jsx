import { PlusCircle, Trash2, X } from "lucide-react";
import { useState } from "react";

export default function ExtraFields({ formData, setFormData, renderInput, onlyView }) {
    const [extraFields, setExtraFields] = useState([]);
    const [newFieldName, setNewFieldName] = useState("");
    const [newFieldType, setNewFieldType] = useState("text");
    const FIELD_TYPES = ['text', 'phone','number', 'date', 'boolean', 'email', 'textarea', 'link','file','time'];
    const [AddNewCamp, setAddNewCamp] = useState(false)
    const addField = () => {
        if (!newFieldName.trim()) return;

        const field = {
        id: Date.now(),
        name: newFieldName.trim(),
        field_type: newFieldType,
        };

        setExtraFields((prev) => [...prev, field]);
        // Inicializa no formData
        setFormData((prev) => ({
        ...prev,
        [field.name]: field.field_type === "boolean" ? false : "",
        }));

        setNewFieldName("");
        setNewFieldType("text");
    };

    const removeField = (id) => {
        const field = extraFields.find(f => f.id === id);
        setExtraFields((prev) => prev.filter(f => f.id !== id));
        setFormData((prev) => {
        const copy = { ...prev };
        delete copy[field.name];
        return copy;
        });
    };

  return (
    <div >
        {/* Lista de campos extras */}
        <div className="space-y-2 mt-2 mb-3">
            {extraFields.map((field) => (
            <div key={field.id} className="flex items-end gap-2 relative">
                <div className="flex-1">
                {renderInput(field)}
                </div>
                {!onlyView && (
                <button
                    onClick={() => removeField(field.id)}
                    className="text-red-600 hover:text-red-800 mt-1"
                >
                    <Trash2/>
                </button>
                )}
            </div>
            ))}
        </div>
        {/**Botão de Adicionar */}
        {AddNewCamp ? 
        <div className="space-y-4 p-2 border rounded-md bg-gray-50 dark:bg-gray-800">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Novo campo:
            </h4>
            {/* Adicionar novo campo */}
            <div className="flex gap-2 items-center">
                <input
                type="text"
                placeholder="Nome do campo"
                value={newFieldName}
                onChange={(e) => setNewFieldName(e.target.value)}
                className="px-2 py-1 border rounded text-sm flex-1 dark:bg-gray-700 w-[85%] w-max-[85%]"
                disabled={onlyView}
                />
                <select
                value={newFieldType}
                onChange={(e) => setNewFieldType(e.target.value)}
                className="px-2 py-1 border rounded text-sm dark:bg-gray-700 w-[15%] w-max-[15%]"
                disabled={onlyView}
                >
                {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
               
                <button
                onClick={addField}
                className="px-1 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                disabled={onlyView}
                >
                <PlusCircle/>
                </button>
                 <X
                 className="cursor-pointer"
                 onClick={()=> setAddNewCamp(false)}
                 />
            </div>
        </div>:
         <div className="w-full bg-gray-100 rounded-b-xl">
          <h3 className="flex justify-center items-center p-3 w-full text-green-600 cursor-pointer hover:text-green-400"
          onClick={()=> setAddNewCamp(true)}
          >
            <PlusCircle className="mr-2" /> Novo Campo
          </h3>
        </div>
        }
        
    </div>
  );
}
