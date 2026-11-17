import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { emailBoxFocusAction } from "@/lib/emailBoxFocus";

type EmailClearInputProps = Omit<React.ComponentProps<typeof Input>, "value" | "onChange"> & {
  value: string;
  onValueChange: (value: string) => void;
};

/**
 * Email entry box for sign-in screens. Clicking or tapping into a box that
 * already holds an address clears it and lights the box up, so a new address can
 * be typed or pasted in clean. Tabbing into the box with the keyboard leaves the
 * address there.
 */
export const EmailClearInput = React.forwardRef<HTMLInputElement, EmailClearInputProps>(
  ({ value, onValueChange, className, onFocus, onBlur, ...props }, ref) => {
    const [active, setActive] = React.useState(false);
    const pointerIn = React.useRef(false);

    return (
      <Input
        ref={ref}
        {...props}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        onPointerDown={() => {
          // A press inside a box that is already focused is the cursor moving,
          // not a request to start again, so it must not clear anything.
          pointerIn.current = !active;
        }}
        onFocus={(e) => {
          const action = emailBoxFocusAction({
            hasValue: value.length > 0,
            fromPointer: pointerIn.current,
          });
          pointerIn.current = false;
          setActive(true);
          if (action === "clear") onValueChange("");
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setActive(false);
          onBlur?.(e);
        }}
        className={cn(
          "transition-colors",
          active && "border-ring bg-primary/5 ring-2 ring-ring ring-offset-2",
          className
        )}
      />
    );
  }
);
EmailClearInput.displayName = "EmailClearInput";
