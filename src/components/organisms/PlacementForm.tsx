"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreatePlacement } from "@/features/placements/hooks/useCreatePlacement";
import { useUpdatePlacement } from "@/features/placements/hooks/useUpdatePlacement";
import { useItfOffices } from "@/features/placements/hooks/useItfOffices";
import { getMinEndDate, getPlacementDateError } from "@/features/placements/lib/dates";
import { NIGERIAN_STATES, stateLabel } from "@/features/placements/lib/states";
import type { Placement } from "@/features/placements/types";
import { getErrorMessage } from "@/lib/api-client";

const optionalUrl = z
  .string()
  .trim()
  .refine((value) => !value || /^https?:\/\/\S+$/.test(value), "Enter a full link starting with https://");

const placementSchema = z.object({
  organization_name: z.string().trim().min(2, "Enter the organization name"),
  organization_address: z.string().trim().min(5, "Enter the organization address"),
  organization_state: z.string().min(1, "Choose the state your organization is in"),
  start_date: z.string().min(1, "Choose a start date"),
  end_date: z.string().min(1, "Choose an end date"),
  acceptance_letter_url: optionalUrl,
});

/** Date rules only apply when creating: an existing placement's dates are fixed. */
const createPlacementSchema = placementSchema.superRefine((values, ctx) => {
  if (!values.start_date || !values.end_date) return;
  const dateError = getPlacementDateError(values.start_date, values.end_date);
  if (dateError) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [dateError.field], message: dateError.message });
});

type PlacementValues = z.infer<typeof placementSchema>;

interface PlacementFormProps {
  /** When provided the form edits this placement; dates are fixed once created. */
  placement?: Placement;
  submitLabel?: string;
  onSuccess?: (placement: Placement) => void;
  onCancel?: () => void;
}

export function PlacementForm({ placement, submitLabel, onSuccess, onCancel }: PlacementFormProps) {
  const isEdit = Boolean(placement);
  const create = useCreatePlacement();
  const update = useUpdatePlacement(placement?.id ?? "");
  const mutation = isEdit ? update : create;

  const form = useForm<PlacementValues>({
    resolver: zodResolver(isEdit ? placementSchema : createPlacementSchema),
    defaultValues: {
      organization_name: placement?.organization_name ?? "",
      organization_address: placement?.organization_address ?? "",
      organization_state: placement?.organization_state ?? "",
      start_date: placement?.start_date ?? "",
      end_date: placement?.end_date ?? "",
      acceptance_letter_url: placement?.acceptance_letter_url ?? "",
    },
  });

  function onSubmit(values: PlacementValues) {
    const acceptance_letter_url = values.acceptance_letter_url || undefined;
    if (isEdit) {
      update.mutate(
        {
          organization_name: values.organization_name,
          organization_address: values.organization_address,
          organization_state: values.organization_state,
          acceptance_letter_url: acceptance_letter_url ?? null,
        },
        { onSuccess }
      );
    } else {
      create.mutate({ ...values, acceptance_letter_url }, { onSuccess });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {mutation.isError && (
          <Alert variant="destructive" className="rounded-xl">
            <AlertDescription>{getErrorMessage(mutation.error)}</AlertDescription>
          </Alert>
        )}
        <FormField
          control={form.control}
          name="organization_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Organization name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Dangote Refinery" autoComplete="organization" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="organization_address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Organization address</FormLabel>
              <FormControl>
                <Textarea placeholder="Street, city, state" className="min-h-[4.5rem]" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="organization_state"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Organization state</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a state" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="max-h-72">
                  {NIGERIAN_STATES.map((state) => (
                    <SelectItem key={state} value={state}>
                      {stateLabel(state)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription className="text-xs">
                <ItfOfficeHint state={form.watch("organization_state")} />
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="start_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>SIWES start date</FormLabel>
                <FormControl>
                  <Input type="date" disabled={isEdit} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="end_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>SIWES end date</FormLabel>
                <FormControl>
                  <Input type="date" disabled={isEdit} min={isEdit ? undefined : getMinEndDate(form.watch("start_date"))} {...field} />
                </FormControl>
                {!isEdit && <FormDescription className="text-xs">At least 4 weeks after the start date.</FormDescription>}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="acceptance_letter_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Acceptance letter link (optional)</FormLabel>
              <FormControl>
                <Input type="url" placeholder="https://drive.google.com/…" {...field} />
              </FormControl>
              <FormDescription className="text-xs">A shareable link to your letter of acceptance.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          {onCancel && (
            <Button type="button" variant="secondary" size="lg" onClick={onCancel} disabled={mutation.isPending}>
              Cancel
            </Button>
          )}
          <Button type="submit" size="lg" className={onCancel ? undefined : "w-full"} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="animate-spin" />}
            {submitLabel ?? (isEdit ? "Save changes" : "Create placement")}
          </Button>
        </div>
      </form>
    </Form>
  );
}

/** Shows which ITF office the placement will be routed to (the area office for the organization's state). */
function ItfOfficeHint({ state }: { state: string }) {
  const { data: offices } = useItfOffices();
  const office = offices?.find((o) => o.state === state);
  if (!state) return <>Your SCAF and logbook go to the ITF office for this state.</>;
  return <>{office ? `Routed to ${office.name}, ${office.city}.` : "Your SCAF and logbook go to the ITF office for this state."}</>;
}
