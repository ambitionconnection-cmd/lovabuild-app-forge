import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type TableName = "shops" | "brands" | "drops";

/**
 * Shows a success toast with an "Undo" action button.
 * For deletes: re-inserts the record. For status changes: reverts to previous values.
 * Keeps at most the data for the current toast — no persistent memory cost.
 */
export function showUndoToast(options: {
  message: string;
  table: TableName;
  undoData: Record<string, any> | Record<string, any>[];
  undoType: "reinsert" | "update";
  updateColumn?: string;
  onUndo: () => void;
}) {
  const { message, table, undoData, undoType, updateColumn, onUndo } = options;

  toast.success(message, {
    duration: 8000,
    action: {
      label: "Undo",
      onClick: async () => {
        try {
          if (undoType === "reinsert") {
            // Re-insert deleted record(s)
            const records = Array.isArray(undoData) ? undoData : [undoData];
            const { error } = await supabase.from(table).insert(records as any);
            if (error) throw error;
          } else if (undoType === "update" && updateColumn) {
            // Revert each record's column to its previous value
            const records = Array.isArray(undoData) ? undoData : [undoData];
            for (const record of records) {
              const { error } = await supabase
                .from(table)
                .update({ [updateColumn]: record[updateColumn] } as any)
                .eq("id", record.id);
              if (error) throw error;
            }
          }
          toast.success("Action undone");
          onUndo();
        } catch (error: any) {
          console.error("Undo failed:", error);
          toast.error("Undo failed: " + (error.message || "Unknown error"));
        }
      },
    },
  });
}
