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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from "@/components/ui/b-combobox";
import type { Contact as ContactType } from "@/types/api";

export function CreateAssetForm({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  types,
  contacts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    name: string;
    type: string;
    primary_url?: string;
    primary_contact_name?: string;
    primary_contact_email?: string;
    notes?: string;
  }) => void;
  isPending: boolean;
  types: Array<{ value: string; label: string }>;
  contacts: ContactType[];
}) {
  const assetSchema = z.object({
    name: z.string().min(1, "Asset name is required"),
    type: z.string().min(1, "Asset type is required"),
    primary_url: z.string().optional(),
    primary_contact_name: z.string().optional(),
    primary_contact_email: z.string().optional(),
    notes: z.string().optional(),
  });
  type AssetFormValues = z.infer<typeof assetSchema>;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<AssetFormValues>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      name: "",
      type: "",
      primary_url: "",
      primary_contact_name: "",
      primary_contact_email: "",
      notes: "",
    },
  });

  // Reset form whenever drawer opens
  useEffect(() => {
    if (open) reset()
  }, [open, reset])

  const selectedType = types.find((t) => t.value === watch("type")) ?? null;
  const selectedContact = contacts.find(
    (c) => c.name === watch("primary_contact_name") && c.email === watch("primary_contact_email")
  ) ?? null;

  const onFormSubmit = (data: AssetFormValues) => {
    onSubmit({
      name: data.name.trim(),
      type: data.type,
      primary_url: data.primary_url?.trim() || undefined,
      primary_contact_name: data.primary_contact_name?.trim() || undefined,
      primary_contact_email: data.primary_contact_email?.trim() || undefined,
      notes: data.notes?.trim() || undefined,
    });
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="w-full sm:max-w-md overflow-y-auto">
        <DrawerHeader>
          <DrawerTitle>Create Asset</DrawerTitle>
          <DrawerDescription>
            Add a new asset for this client.
          </DrawerDescription>
        </DrawerHeader>

        <form
          onSubmit={handleSubmit(onFormSubmit)}
          className="flex flex-col gap-5 mt-6 px-4 pb-4"
        >
          {/* Asset Name */}
          <div className="space-y-2">
            <Label htmlFor="asset-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="asset-name"
              {...register("name")}
              placeholder="e.g., Client Website, Mobile App, etc."
              autoFocus
            />
            {errors.name?.message && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Asset Type */}
          <div className="space-y-2">
            <Label htmlFor="asset-type">
              Type <span className="text-destructive">*</span>
            </Label>
            <Combobox
              items={types}
              itemToStringLabel={(item: { value: string; label: string }) => item.label}
              itemToStringValue={(item: { value: string; label: string }) => item.value}
              value={selectedType}
              onValueChange={(item: { value: string; label: string } | null) =>
                setValue("type", item?.value ?? "", {
                  shouldValidate: true,
                })
              }
            >
              <ComboboxInput placeholder="Select asset type..." showTrigger />
              <ComboboxContent>
                <ComboboxList>
                  {types.map((type, index) => (
                    <ComboboxItem key={type.value} index={index} value={type}>
                      {type.label}
                    </ComboboxItem>
                  ))}
                </ComboboxList>
                <ComboboxEmpty>No type found.</ComboboxEmpty>
              </ComboboxContent>
            </Combobox>
            {errors.type?.message && (
              <p className="text-xs text-destructive">
                {errors.type.message}
              </p>
            )}
          </div>

          {/* Primary URL */}
          <div className="space-y-2">
            <Label htmlFor="asset-url">Primary URL</Label>
            <Input
              id="asset-url"
              type="url"
              {...register("primary_url")}
              placeholder="https://example.com"
            />
          </div>

          {/* Primary Contact */}
          <div className="space-y-2">
            <Label>Primary Contact</Label>
            <Combobox
              items={contacts}
              itemToStringLabel={(item: ContactType) => item.name}
              itemToStringValue={(item: ContactType) => item.id}
              value={selectedContact}
              onValueChange={(item: ContactType | null) => {
                setValue("primary_contact_name", item?.name ?? "")
                setValue("primary_contact_email", item?.email ?? "")
              }}
            >
              <ComboboxInput placeholder="Select a contact..." showTrigger />
              <ComboboxContent>
                <ComboboxList>
                  {contacts.length === 0 ? (
                    <ComboboxEmpty>No contacts available.</ComboboxEmpty>
                  ) : (
                    contacts.map((contact, index) => (
                      <ComboboxItem key={contact.id} index={index} value={contact}>
                        <div className="flex flex-col">
                          <span>{contact.name}</span>
                          {contact.email && (
                            <span className="text-xs text-muted-foreground">{contact.email}</span>
                          )}
                        </div>
                      </ComboboxItem>
                    ))
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="asset-notes">Notes</Label>
            <textarea
              id="asset-notes"
              {...register("notes")}
              placeholder="Additional notes about this asset..."
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <DrawerFooter className="mt-6 px-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPending ? "Creating..." : "Create Asset"}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
