"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

const clientSchema = z.object({
  notes: z.string().optional(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

interface ClientEditFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { notes?: string }) => void;
  isPending: boolean;
  client: {
    notes?: string | null;
  };
}

export function ClientEditForm({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  client,
}: ClientEditFormProps) {
  const { register, handleSubmit, reset } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        notes: client.notes ?? "",
      });
    }
  }, [open, client.notes, reset]);

  const onFormSubmit = (data: ClientFormValues) => {
    onSubmit({
      notes: data.notes?.trim() || undefined,
    });
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="flex h-full w-full flex-col sm:max-w-[458px]">
        <DrawerHeader>
          <DrawerTitle>Edit Client</DrawerTitle>
          <DrawerDescription>
            Update this client&apos;s information.
          </DrawerDescription>
        </DrawerHeader>

        <form
          onSubmit={handleSubmit(onFormSubmit)}
          className="flex flex-1 flex-col gap-5 p-4 pt-6"
        >
          <div className="space-y-2">
            <Label htmlFor="client-notes">Remarks</Label>

            <Textarea
              id="client-notes"
              {...register("notes")}
              placeholder="Additional notes about this client..."
              rows={4}
              className="resize-none"
            />
          </div>

          <DrawerFooter className="mt-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>

            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}