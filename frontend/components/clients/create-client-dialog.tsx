"use client";

import { useState, useCallback, useMemo } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, Mail, Plus } from "lucide-react";
import { useCreateClient, useExternalClients } from "@/hooks/use-clients";
import type { ExternalClientAccount } from "@/types/api";
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxTrigger,
  ComboboxEmpty,
  ComboboxList,
  ComboboxGroup,
  ComboboxItem,
} from "../kibo-ui/combobox";
import { Textarea } from "../ui";

/** Extract the actual backend error message from an Axios error response. */
function getErrorMessage(error: unknown): string {
  const axiosError = error as
    | {
        response?: {
          data?: {
            message?: string;
            error?: string;
            details?: string | string[];
          };
        };
      }
    | undefined;
  const data = axiosError?.response?.data;

  // The all-exceptions filter puts validation errors in .details
  if (Array.isArray(data?.details)) {
    return data.details.join(", ");
  }

  // Standard NestJS error or BadRequestException message
  if (data?.message) {
    return data.message;
  }

  return (error as Error)?.message ?? "Failed to create client.";
}

function ErrorAlert({ error }: { error: unknown }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2">
      <AlertCircle className="size-4 shrink-0 mt-0.5 text-destructive" />
      <p className="text-xs text-destructive">
        {getErrorMessage(error)}
      </p>
    </div>
  );
}

interface CreateClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateClientDialog({
  open,
  onOpenChange,
}: CreateClientDialogProps) {
  const [selected, setSelected] = useState<ExternalClientAccount | null>(null);
  const [remarks, setRemarks] = useState("");
  const [query, setQuery] = useState("")
  const debouncedQuery = useDebounce(query, 300);

  const { data: accounts = [], isLoading } = useExternalClients(debouncedQuery);
  const createClient = useCreateClient();

  const comboboxData = useMemo(
    () =>
      accounts.map((acct) => ({
        label: acct.client_name,
        value: acct.id,
      })),
    [accounts],
  );

  const reset = useCallback(() => {
    setSelected(null);
    setRemarks("");
  }, []);

  const handleOpenChange = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

  const handleSelect = useCallback(
    (id: string) => {
      const account = accounts.find((a) => a.id === id) ?? null;
      setSelected(account);
    },
    [accounts],
  );

  const handleSubmit = () => {
    if (!selected) return;


    createClient.mutate(
      {
        name: selected.client_name,
        external_id: String(selected.id),
        email: selected.email || undefined,
        is_active: true,
        remarks: remarks.trim() || undefined,
      },
      {
        onSuccess: () => {
          reset();
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="pt-4 pb-0">
          <DialogTitle>Create Client from Account</DialogTitle>
          <DialogDescription>
            {selected
              ? "Review and confirm to import this account."
              : "Search for an account to import as a client."}
          </DialogDescription>
        </DialogHeader>

        {/* ── Search / Select view ── */}
        {!selected && (
          <div className="pt-4 pb-4">
            <Combobox
              modal
              data={comboboxData}
              onValueChange={handleSelect}
              type="account"
              defaultOpen
            >
              <ComboboxTrigger className="w-full justify-between" />
              <ComboboxContent>
                <ComboboxInput onValueChange={(value) => setQuery(value)} />
                <ComboboxEmpty />
                <ComboboxList>
                  <ComboboxGroup>
                    {comboboxData.map((item) => (
                      <ComboboxItem key={item.value} value={item.value} keywords={[item.label]}>
                        {item.label}
                      </ComboboxItem>
                    ))}
                  </ComboboxGroup>
                </ComboboxList>
              </ComboboxContent>
            </Combobox>

            {isLoading && (
              <div className="flex items-center justify-center gap-2 mt-4 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading accounts...
              </div>
            )}
          </div>
        )}

        {/* ── Confirmation view ── */}
        {selected && (
          <div className="pt-4 pb-4 animate-in fade-in duration-200">
            <div className="space-y-4">
              {/* Account info */}
              <div className="rounded-lg border bg-card px-4 py-3">
                <p className="text-sm font-medium">
                  {selected.client_name}
                </p>
                {selected.email && (
                  <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
                    <Mail className="size-3 shrink-0" />
                    <span className="truncate">{selected.email}</span>
                  </div>
                )}
              </div>

              {/* Remarks */}
              <Textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Add remarks (optional)"
                rows={2}
                disabled={createClient.isPending}
              />

              {/* Error — show the actual backend message */}
              {createClient.isError && (
                <ErrorAlert error={createClient.error} />
              )}
            </div>
          </div>
        )}

        {/* ── Footer actions ── */}
        {selected && (
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelected(null);
                setRemarks("");
              }}
              disabled={createClient.isPending}
            >
              Back
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={createClient.isPending}
            >
              {createClient.isPending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin mr-1.5" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="size-3.5 mr-1.5" />
                  Create Client
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
