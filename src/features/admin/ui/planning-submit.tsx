"use client";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function PlanningSubmit({
  children,
  next = false,
  disabled = false,
}: {
  children: React.ReactNode;
  next?: boolean;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      className="h-auto min-h-9 max-w-full whitespace-normal text-left"
      disabled={pending || disabled}
      name={next ? "next" : undefined}
      value={next ? "on" : undefined}
      variant={next ? "outline" : "default"}
    >
      {pending ? "Saving…" : children}
    </Button>
  );
}
