"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRegister } from "@/features/auth/hooks/useRegister";
import { ROLE_LABELS } from "@/features/auth/permissions";
import { useItfOffices } from "@/features/placements/hooks/useItfOffices";
import type { RegisterPayload, SelfRegisterRole, User } from "@/features/auth/types";
import { getErrorMessage } from "@/lib/api-client";

const SELF_REGISTER_ROLES: SelfRegisterRole[] = [
  "student",
  "workplace_supervisor",
  "academic_supervisor",
  "itf_verifier",
  "departmental_coordinator",
];
const STUDENT_FIELDS = ["matric_number", "institution", "department", "program"] as const;

const signupSchema = z
  .object({
    role: z.enum(["student", "workplace_supervisor", "academic_supervisor", "itf_verifier", "departmental_coordinator"]),
    full_name: z.string().trim().min(2, "Enter your full name"),
    email: z.string().trim().min(1, "Enter your email").email("Enter a valid email address"),
    matric_number: z.string().trim(),
    institution: z.string().trim(),
    department: z.string().trim(),
    program: z.string().trim(),
    itf_office_id: z.string(),
    password: z.string().min(8, "Use at least 8 characters"),
    confirm_password: z.string(),
  })
  .superRefine((values, ctx) => {
    if (values.password !== values.confirm_password) {
      ctx.addIssue({ code: "custom", path: ["confirm_password"], message: "Passwords do not match" });
    }
    if (values.role === "student") {
      for (const field of STUDENT_FIELDS) {
        if (!values[field]) ctx.addIssue({ code: "custom", path: [field], message: "Required for students" });
      }
    }
    if (values.role === "departmental_coordinator") {
      for (const field of ["institution", "department"] as const) {
        if (!values[field]) ctx.addIssue({ code: "custom", path: [field], message: "Required for coordinators" });
      }
    }
    if (values.role === "itf_verifier" && !values.itf_office_id) {
      ctx.addIssue({ code: "custom", path: ["itf_office_id"], message: "Choose the ITF office you work at" });
    }
  });

type SignupValues = z.infer<typeof signupSchema>;

function toPayload(values: SignupValues): RegisterPayload {
  const base = { email: values.email, password: values.password, full_name: values.full_name, role: values.role };
  if (values.role === "itf_verifier") return { ...base, itf_office_id: values.itf_office_id };
  if (values.role === "departmental_coordinator") {
    return { ...base, institution: values.institution, department: values.department };
  }
  if (values.role !== "student") return base;
  return {
    ...base,
    matric_number: values.matric_number,
    institution: values.institution,
    department: values.department,
    program: values.program,
  };
}

interface SignupProfileFormProps {
  /** Called before the session is stored so the page can keep the user on the sign-up flow. */
  onBeforeRegister?: () => void;
  onRegistered: (user: User) => void;
}

export function SignupProfileForm({ onBeforeRegister, onRegistered }: SignupProfileFormProps) {
  const register = useRegister();
  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      role: "student",
      full_name: "",
      email: "",
      matric_number: "",
      institution: "",
      department: "",
      program: "",
      itf_office_id: "",
      password: "",
      confirm_password: "",
    },
  });
  const role = form.watch("role");
  const isStudent = role === "student";
  const offices = useItfOffices();

  function onSubmit(values: SignupValues) {
    onBeforeRegister?.();
    register.mutate(toPayload(values), { onSuccess: ({ user }) => onRegistered(user) });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {register.isError && (
          <Alert variant="destructive" className="rounded-xl">
            <AlertDescription>{getErrorMessage(register.error)}</AlertDescription>
          </Alert>
        )}
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>I am joining as</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {SELF_REGISTER_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <TextField form={form} name="full_name" label="Full name" placeholder="e.g. John Doe" autoComplete="name" />
        <TextField
          form={form}
          name="email"
          label="Email"
          type="email"
          placeholder="e.g. john@gmail.com"
          autoComplete="email"
        />
        {isStudent && (
          <>
            <TextField form={form} name="matric_number" label="Matric number" placeholder="e.g. 2025/000000" />
            <TextField
              form={form}
              name="institution"
              label="Institution"
              placeholder="e.g. Bells University of Technology"
              autoComplete="organization"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField form={form} name="department" label="Department" placeholder="e.g. Computer science" />
              <TextField form={form} name="program" label="Program" placeholder="e.g. BTech" />
            </div>
          </>
        )}
        {role === "departmental_coordinator" && (
          <>
            <TextField
              form={form}
              name="institution"
              label="Institution"
              placeholder="e.g. Bells University of Technology"
              autoComplete="organization"
            />
            <TextField form={form} name="department" label="Department" placeholder="e.g. Computer science" />
            <p className="text-xs text-muted-foreground">
              Use the same institution and department names your students register with.
            </p>
          </>
        )}
        {role === "itf_verifier" && (
          <FormField
            control={form.control}
            name="itf_office_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ITF office</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={offices.isLoading ? "Loading offices…" : "Choose your ITF office"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="max-h-72">
                    {(offices.data ?? []).map((office) => (
                      <SelectItem key={office.id} value={office.id}>
                        {office.name} · {office.city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <TextField
          form={form}
          name="password"
          label="Password"
          type="password"
          placeholder="Min. 8 characters"
          autoComplete="new-password"
        />
        <TextField
          form={form}
          name="confirm_password"
          label="Confirm password"
          type="password"
          placeholder="Re-enter password"
          autoComplete="new-password"
        />
        <Button type="submit" size="lg" className="!mt-6 w-full" disabled={register.isPending}>
          {register.isPending && <Loader2 className="animate-spin" />}
          {isStudent ? "Continue" : "Create account"}
        </Button>
      </form>
    </Form>
  );
}

interface TextFieldProps {
  form: UseFormReturn<SignupValues>;
  name: Exclude<keyof SignupValues, "role">;
  label: string;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
}

function TextField({ form, name, label, placeholder, type = "text", autoComplete }: TextFieldProps) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input type={type} placeholder={placeholder} autoComplete={autoComplete} {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
