import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function CardRastreio({ card, etapa, user, onAddComment }) {
  const [newComment, setNewComment] = useState("");

  const title = card.data?.title;
  const comments = card.data?.comments || [];

  function formatDateTimeShort(input, tzHours = -3) {
  const d = (input instanceof Date) ? input : new Date(input);
  const ms = d.getTime();
  if (isNaN(ms)) return "";

  // Ajusta para o timezone desejado
  const target = new Date(ms + tzHours * 3600 * 1000);

  const day = String(target.getUTCDate()).padStart(2, "0");
  const month = String(target.getUTCMonth() + 1).padStart(2, "0");
  const year = String(target.getUTCFullYear())

  const hours = String(target.getUTCHours()).padStart(2, "0");
  const minutes = String(target.getUTCMinutes()).padStart(2, "0");

  return `${day}/${month}/${year} - ${hours}:${minutes}`;
}





  // Formatador de labels bonitinhos
  const formatLabel = (text) => {
    return text
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <div className="p-5 border rounded-xl bg-card shadow-sm hover:shadow-md transition-all duration-200">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-lg text-foreground">
            {title || "Sem título"}
          </h2>
          <p className="text-xs text-muted-foreground mt--.5">Criado: {formatDateTimeShort(card.created_at,-3)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            ID: {card.id}
          </p>
        </div>

        <span className="px-2.5 py-1 rounded-full text-sm font-sans font-bold bg-primary text-white border border-gray-300">
          {etapa?.name ?? "Sem etapa"}
        </span>
      </div>

      <div className="h-px bg-border mb-4" />

      {/* CONTENT */}
     <div className="space-y-5">
  {Object.entries(card.data)
    .filter(([key, value]) => 
      key !== "title" &&
      key !== "submodule_id" &&
      key !== "submodules" &&
      key !== "comments" &&
      key !== "labels" &&
      !key.startsWith("_") &&
      // ❌ filtra valores "vazios"
      value !== 0 && 
      value !== "" &&
      value !== null &&
      value !== undefined &&
      !(Array.isArray(value) && value.length === 0)
    )
    .map(([key, value]) => {
      const label = formatLabel(key);

      // 🔵 CHECKLIST
      if (
        Array.isArray(value) &&
        value.length > 0 &&
        typeof value[0] === "object" &&
        "checked" in value[0]
      ) {
        return (
          <div key={key} className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              {label}
            </h3>

            <div className="space-y-1">
              {value.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input type="checkbox" className="h-4 w-4" checked={item.checked} readOnly />
                  <span className="text-sm">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        );
      }

      // 🔵 ARRAY (nested items)
      if (Array.isArray(value)) {
        return (
          <div key={key} className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">{label}</h3>
            <div className="space-y-3">
              {value.map((item, index) => (
                <div
                  key={item.recordId || index}
                  className="border rounded-lg p-3 bg-muted/40 hover:bg-muted/60 transition-colors"
                >
                  <p className="text-xs p-3">
                    <strong>ID:</strong> {item.recordId || index}
                  </p>
                  <div className="pl-3 border-l border-border space-y-1">
                    {Object.entries(item.data || {})
                      .filter(([k, v]) => 
                        ["nome", "name", "titulo", "modelo"].includes(k.toLowerCase()) &&
                        v !== 0 && v !== "" && v !== null && v !== undefined
                      )
                      .map(([k, v]) => (
                        <p key={k} className="text-xs">
                          <strong>{formatLabel(k)}:</strong> {String(v)}
                        </p>
                      ))}
                    {item.quantity !== undefined && item.quantity !== 0 && (
                      <p className="text-xs font-medium mt-2">
                        Quantidade: {item.quantity}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      // 🔵 VALOR SIMPLES — com label
      return (
        <div key={key}>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-sm">{String(value)}</p>
        </div>
      );
    })}
</div>


      {/* ---------------------- COMMENTS ---------------------- */}

      <div className="h-px bg-border my-4" />

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">
          Comentários
        </h3>

        {/* lista de comentários */}
        {comments.map((c, index) => (
          <div
            key={index}
            className="p-3 bg-muted/40 rounded-lg border text-sm"
          >
            <p className="font-medium">{c.name}</p>
            <p className="mt-1">{c.message}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(c.created_at).toLocaleString()}
            </p>
          </div>
        ))}

        {/* adicionar comentário */}
        <div className="mt-4 space-y-2">
          <Textarea
            placeholder="Adicionar comentário..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
          />

          <Button
            className="w-full"
            disabled={!newComment.trim()}
            onClick={async () => {
              if (!newComment.trim()) return;

              let userData = user;
              
              // Se não estiver vindo do prop, busca no supabase
              if (!userData) {
                const { data: authData } = await supabase.auth.getUser();
                userData = authData?.user;
              }

              const newEntry = {
                id: userData?.id,
                name: userData?.user_metadata?.email || "Usuário",
                message: newComment.trim(),
                created_at: new Date().toISOString(),
              };

              // Passa pro handler do pai (onde você pode salvar no banco ou apenas atualizar local)
              onAddComment(newEntry);

              // Limpa textarea
              setNewComment("");
            }}
          >
            Enviar comentário
          </Button>

        </div>
      </div>

    </div>
  );
}
