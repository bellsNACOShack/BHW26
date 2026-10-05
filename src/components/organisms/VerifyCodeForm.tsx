"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const schema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^ITL-[0-9A-F]{8}$/, "Codes look like ITL-1A2B3C4D"),
});

type Values = z.infer<typeof schema>;

export function VerifyCodeForm({ defaultCode = "" }: { defaultCode?: string }) {
  const router = useRouter();
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { code: defaultCode } });

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(({ code }) => router.push(`/verify/${encodeURIComponent(code)}`))}
        className="flex flex-col gap-3 sm:flex-row sm:items-start"
      >
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel className="sr-only">Verification code</FormLabel>
              <FormControl>
                <Input placeholder="ITL-XXXXXXXX" autoCapitalize="characters" spellCheck={false} className="font-mono uppercase" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" size="lg">
          <Search /> Verify
        </Button>
      </form>
    </Form>
  );
}
