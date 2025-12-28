import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BackpackIcon, Bot, BotIcon, ChevronLeft, ChevronRight, FoldHorizontalIcon, LogOutIcon, SendHorizonalIcon, Sparkles, SparklesIcon } from "lucide-react";

export default function Chat({user}) {

/**
 * Converte quebras de linha literais (\n) em tags <br> para exibição em HTML.
 * @param {string} texto - A string de entrada com quebras de linha.
 * @returns {string} - A string formatada para HTML.
 */
function formatarParaHTML(texto) {
  if (!texto) return '';
  // Usa uma Expressão Regular global (/g) para substituir todas as ocorrências de \n
  return texto.replace(/\n/g, '<br>');
}

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [open, setOpen] = useState(false);
  const [typing, setTyping] = useState(false);

 const [sessionId, setSessionId] = useState(""); // Novo state
 

// Efeito para carregar/gerar o Session ID
useEffect(() => {
    let id = localStorage.getItem("chatSessionId");
    if (!id) {
    // Gera um ID simples (UUID ou timestamp complexo seria melhor)
    id = "user" + Date.now(); 
    localStorage.setItem("chatSessionId", id);
    }
    setSessionId(id);
}, []); // Executa apenas uma vez




  async function sendMessage() {
    if (!input) return;

    setInput("");
    const userMessage = { sender: "user", text: input };
    setMessages(prev => [...prev, userMessage]);
    setTyping(true);

   
    try {
      const response = await fetch(
        "https://webhook.servidornivelo.shop/webhook/3af16412-eeb1-49ee-ace2-8d2863468770",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            message: input,
            sessionId: sessionId,
            user_id:user.id
         })
        }
      );

      const data = await response.json();

      setTimeout(() => {
        const botMessage = { sender: "bot", text: data.output };
        setMessages(prev => [...prev, botMessage]);
        setTyping(false);
      }, 800);
    } catch (err) {
      console.error(err);
      setTyping(false);
    }

    
  }
  

  return (
    <>
      {/* BOTÃO FLUTUANTE */}
      <button
        onClick={() => setOpen(o => !o)}
        className="
          fixed bottom-6 right-6
          bg-primary text-white 
          rounded-full shadow-xl
          flex items-center justify-center 
          text-lg
          p-2
          transition-all
        "
      >
        <span className="flex items-center"><SparklesIcon className="mr-2"/> Fale com a Jade</span>
      </button>

      {/* CHAT */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 40 }}
            transition={{ duration: 0.25 }}
            className="
              fixed right-0
              w-[90%] sm:w-[50%] md:w-[40%] h-full
              bg-white rounded-lg shadow-2xl
              border border-gray-200
              flex flex-col overflow-hidden
            "
          >
            {/* TOPO */}
            <div className=" p-4 font-semibold text-lg flex items-center gap-2 justify-between">
               <ChevronRight onClick={()=> setOpen(false)} className="cursor-pointer"/>
            </div>

            {/* LISTA DE MENSAGENS */}
            <div className="flex-1 p-4 overflow-y-auto bg-gray-50 space-y-3">
              {messages.length > 0 ? messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: msg.sender === "user" ? 50 : -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`flex ${
                    msg.sender === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[75%] px-4 py-2 rounded-xl text-sm shadow 
                      ${
                        msg.sender === "user"
                          ? "bg-purple-500 text-white"
                          : "bg-white border border-gray-300 text-gray-800"
                      }
                    `}
                    dangerouslySetInnerHTML={{ __html: formatarParaHTML(msg.text) }}
                  >
                  </div>
                </motion.div>
              ))
              : 
              (
                <div className="flex justify-center mt-20">
                    <div className="text-center ">
                        <Sparkles className="mx-auto mb-5 text-primary"/>
                        <h5>Olá, me chamo Jade</h5>
                        <h5>Como posso te ajudar com suas finanças?</h5>
                    </div>
                </div>
              )
              }


              {/* DIGITANDO... */}
              {typing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 text-gray-500"
                >
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-300" />
                </motion.div>
              )}
            </div>

            {/* INPUT */}
            <div className="p-3 border-t flex gap-2 bg-white flex flex-col border border-primary m-2 rounded-lg">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={typing}
                onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();  // impede quebra de linha
                    sendMessage();       // chama sua função
                    }
                }}
                placeholder="Digite sua mensagem..."
                className="
                  flex-1
                  px-3 
                  py-2
                  pb-4
                  focus:outline-none focus:ring-0
                  overflow-y-auto
                  resize-none
                "
              />

              <div className="flex justify-end w-full">
                  <button
                    onClick={sendMessage}
                    className="
                    px-2 py-2 rounded-xl
                    bg-white
                    border
                    border-primary
                    text-white
                    transition
                    flex
                    flex-start
                    w-10
                    justify-end
                    "
                    disabled={typing}
                  >
                    <SendHorizonalIcon className="text-primary "/>
                  </button>
              </div>
            </div>
            
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
