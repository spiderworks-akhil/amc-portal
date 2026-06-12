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

export function CreateAssetForm({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  types,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    name: string;
    type_id: string;
    primary_url?: string;
    primary_contact_name?: string;
    primary_contact_email?: string;
    notes?: string;
  }) => void;
  isPending: boolean;
  types: Array<{ id: string; name: string }>;
}) {
  const assetSchema = z.object({
    name: z.string().min(1, "Asset name is required"),
    type_id: z.string().min(1, "Asset type is required"),
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
      type_id: "",
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

  const selectedType = types.find((t) => t.id === watch("type_id")) ?? null;

  const onFormSubmit = (data: AssetFormValues) => {
    onSubmit({
      name: data.name.trim(),
      type_id: data.type_id,
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
              itemToStringLabel={(item: { id: string; name: string }) => item.name}
              itemToStringValue={(item: { id: string; name: string }) => item.id}
              value={selectedType}
              onValueChange={(item: { id: string; name: string } | null) =>
                setValue("type_id", item?.id ?? "", {
                  shouldValidate: true,
                })
              }
            >
              <ComboboxInput placeholder="Select asset type..." showTrigger />
              <ComboboxContent>
                <ComboboxList>
                  {types.map((type, index) => (
                    <ComboboxItem key={type.id} index={index} value={type}>
                      {type.name}
                    </ComboboxItem>
                  ))}
                </ComboboxList>
                <ComboboxEmpty>No type found.</ComboboxEmpty>
              </ComboboxContent>
            </Combobox>
            {errors.type_id?.message && (
              <p className="text-xs text-destructive">
                {errors.type_id.message}
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

          {/* Contact Name */}
          <div className="space-y-2">
            <Label htmlFor="asset-contact-name">Contact Name</Label>
            <Input
              id="asset-contact-name"
              {...register("primary_contact_name")}
              placeholder="John Doe"
            />
          </div>

          {/* Contact Email */}
          <div className="space-y-2">
            <Label htmlFor="asset-contact-email">Contact Email</Label>
            <Input
              id="asset-contact-email"
              type="email"
              {...register("primary_contact_email")}
              placeholder="john@example.com"
            />
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
