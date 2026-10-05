"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { SectionCard } from "@/components/molecules/SectionCard";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAssignSupervisors } from "@/features/placements/hooks/useAssignSupervisors";
import type { AssignSupervisorsPayload, PlacementWithPeople } from "@/features/placements/types";
import { getErrorMessage } from "@/lib/api-client";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const supervisorId = z
  .string()
  .trim()
  .refine((value) => !value || UUID.test(value), "Paste the full supervisor ID from their dashboard");

const schema = z.object({ workplace_supervisor_id: supervisorId, academic_supervisor_id: supervisorId });
type Values = z.infer<typeof schema>;

/**
 * The API assigns supervisors by user ID and has no user directory endpoint,
 * so supervisors share the ID shown on their dashboard.
 */
export function AssignSupervisorsCard({ placement }: { placement: PlacementWithPeople }) {
  const assign = useAssignSupervisors(placement.id);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    values: {
      workplace_supervisor_id: placement.workplace_supervisor_id ?? "",
      academic_supervisor_id: placement.academic_supervisor_id ?? "",
    },
  });

  function onSubmit(values: Values) {
    const payload: AssignSupervisorsPayload = {};
    if (values.workplace_supervisor_id !== (placement.workplace_supervisor_id ?? "")) {
      payload.workplace_supervisor_id = values.workplace_supervisor_id || null;
    }
    if (values.academic_supervisor_id !== (placement.academic_supervisor_id ?? "")) {
      payload.academic_supervisor_id = values.academic_supervisor_id || null;
    }
    assign.mutate(payload, {
      onSuccess: () => toast.success("Supervisors updated"),
      onError: (error) =>
        toast.error(
          /foreign key/i.test(getErrorMessage(error))
            ? "No account matches that supervisor ID. Ask your supervisor to copy it from their dashboard."
            : getErrorMessage(error)
        ),
    });
  }

  return (
    <SectionCard title="Supervisors" description="Supervisors find their ID on their Inter.log dashboard.">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormField
            control={form.control}
            name="workplace_supervisor_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Workplace supervisor ID</FormLabel>
                <FormControl>
                  <Input placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" spellCheck={false} className="font-mono text-xs md:text-xs" {...field} />
                </FormControl>
                <FormDescription className="text-xs">
                  {placement.workplace_supervisor ? `Currently ${placement.workplace_supervisor.full_name}` : "Reviews and signs your weekly entries."}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="academic_supervisor_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Academic supervisor ID</FormLabel>
                <FormControl>
                  <Input placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" spellCheck={false} className="font-mono text-xs md:text-xs" {...field} />
                </FormControl>
                <FormDescription className="text-xs">
                  {placement.academic_supervisor ? `Currently ${placement.academic_supervisor.full_name}` : "Monitors your progress for your institution."}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={assign.isPending || !form.formState.isDirty}>
              {assign.isPending && <Loader2 className="animate-spin" />}
              Save supervisors
            </Button>
          </div>
        </form>
      </Form>
    </SectionCard>
  );
}
