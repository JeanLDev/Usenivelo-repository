import { useState, useRef, useEffect } from "react";
import KanbanCardModal from "../KanbanCardModal";
import { createPortal } from "react-dom";
import SimpleFormModal from "./SimpleFormModal";



export default function FloatingMenuButton({ options, canEdit ,selectedSubmodule, fields, subFields,record }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [openRecordModal,setOpenRecordModal] = useState(false)
  const [selectFields, setSelectFields] = useState([])
  const [selectSubFields, setSelectSubFields] = useState([])
  const modalRef = useRef(null);
  
  
  const Modal = ({ isOpen, onClose, title, children, size='4xl' }) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 ">
      <div
        ref={modalRef} // <---- aqui é o que faltava
        className={`mt-4 bg-white dark:bg-gray-800 rounded-xl p-4 shadow-2xl w-full max-w-${size} space-y-6`}
      >
        {title && <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>}
        {children}
      </div>
    </div>,
    document.body
  );
};


  // Fecha o dropdown ao clicar fora

useEffect(() => {
  function handleClickOutside(event) {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
      setIsOpen(false);
    }
  }
  document.addEventListener("mousedown", handleClickOutside);
  return () => document.removeEventListener("mousedown", handleClickOutside);
}, []);



  const searchFields = (op) => {
    const OldCamps =  fields.filter((camp)=> camp.submodule_id == selectedSubmodule.id)
    const Newcampos = fields.filter((camp)=> camp.submodule_id == op.submodule_id)
    const form = [...OldCamps, ...Newcampos]
    // 2. IDs desses fields
    const fieldIDs = form.map(f => f.id);

    // 3. Subfields cujo field_id está entre esses IDs
    const selectSubFields = subFields.filter(sub => fieldIDs.includes(sub.field_id));

    setSelectFields(form)
    setSelectSubFields(selectSubFields)
    setOpenRecordModal(true)
  }

  return (
    <div>
      <div className="relative inline-block w-full" >
        <button
          className="py-2 rounded hover:bg-gray-100 w-full text-left pl-3"
          onClick={() => setIsOpen(prev => !prev)}
          disabled={!canEdit}
        >
          Abrir com
        </button>
        {isOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded shadow-lg z-50">
            {options.map(op => (
              <button
                key={op.id}
                className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                onClick={() => {
                  searchFields(op)
                }}
              >
                {op.name}
              </button>
            ))}
          </div>
        )}
      </div>
      <Modal
        isOpen={openRecordModal}
        onClose={() => setOpenRecordModal(false)}
        title=""
      >
        
      </Modal>

    </div>
  );
}
