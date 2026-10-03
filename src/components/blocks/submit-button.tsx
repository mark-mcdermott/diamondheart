import type { ComponentProps, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SubmitButtonProps extends Omit<ComponentProps<typeof Button>, "type" | "children"> {
  children: ReactNode;
  /** What the button says while the form's action is running. */
  pendingLabel: ReactNode;
}

/**
 * A submit that reflects its form's own pending state. Rendered inside the
 * `<form>`, it sees the action start the moment the button is pressed. A
 * `useState` flipped inside the action does not: that update belongs to the
 * action's transition and only reaches the screen once the action resolves,
 * which left the sign-in form looking ignored for the whole round trip.
 */
export function SubmitButton({ children, pendingLabel, disabled, ...props }: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={disabled || pending} aria-busy={pending} {...props}>
      {pending ? (
        <>
          <Loader2 className="animate-spin" aria-hidden />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
