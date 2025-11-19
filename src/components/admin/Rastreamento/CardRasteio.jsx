import React from "react";
import { Button } from "@/components/ui/button";

export default function CardRastreio({ card, etapa }) {
  const title = card.data?.title;

  return (
   <div className="p-4 border border-card-border rounded-lg shadow-sm bg-card hover:shadow-md transition-all duration-200">
  {/* Header with title and stage */}
  <div className="flex items-center gap-3 mb-3">
    <h2 className="font-semibold text-lg text-foreground">{title}</h2>
    <div className="h-4 w-px bg-divider" />
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
      {etapa?.name ?? "—"}
    </span>
  </div>

  <div className="h-px bg-divider mb-4" />

  {/* Data fields */}
  <div className="space-y-4">
    {Object.entries(card.data)
      .filter(([key]) => key !== "title" && !key.startsWith("_"))
      .map(([key, value]) => {
        // 🔸 Array (relations)
        if (Array.isArray(value)) {
          return (
            <div key={key} className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground capitalize">
                {key}
              </label>

              {value.length === 0 ? (
                <p className="text-sm text-muted-foreground italic pl-3">
                  Nenhum item
                </p>
              ) : (
                <div className="space-y-2">
                  {value.map((item, index) => (
                    <div
                      key={item.recordId || index}
                      className="border border-nested-border rounded-md p-3 bg-nested-item hover:bg-muted/50 transition-colors"
                    >
                      {/* Item title */}
                      
                      <p className="font-medium text-sm text-foreground mb-2">
                        {item.data?.nome ||
                          item.data?.name ||
                          item.data?.titulo ||
                          item.data?.modelo ||
                          `Item ${index + 1}`}
                      </p>

                      {/* Item fields */}
                      <div className="space-y-1.5 pl-2 border-l-2 border-divider">
                        {Object.entries(item.data || {}).map(([k, v]) => {
                          if (k.startsWith("__")) return null;
                          return (
                            <div key={k} className="flex items-baseline gap-2">
                              <span className="text-xs font-medium text-muted-foreground capitalize min-w-[80px]">
                                {k}:
                              </span>
                              <span className="text-xs text-foreground">
                                {String(v)}
                              </span>
                            </div>
                          );
                        })}

                        {/* Quantity badge */}
                        {item.quantity !== undefined && (
                          <div className="flex items-baseline gap-2 mt-2 pt-2 border-t border-divider">
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-accent text-accent-foreground">
                              Quantidade: {item.quantity}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        }

        // 🔸 Simple value
        return (
          <div key={key} className="flex items-baseline gap-3">
            <span className="text-sm font-medium text-muted-foreground capitalize min-w-[100px]">
              {key}:
            </span>
            <span className="text-sm text-foreground">{String(value)}</span>
          </div>
        );
      })}
  </div>
</div>

  );
}
