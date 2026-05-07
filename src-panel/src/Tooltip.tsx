import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import type { ReactNode } from "react";

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

type Variant = "default" | "blackmetal";
type Side = "top" | "bottom" | "left" | "right";

export function TooltipContent({
  children,
  variant = "default",
  side = "top",
  sideOffset = 4,
}: {
  children: ReactNode;
  variant?: Variant;
  side?: Side;
  sideOffset?: number;
}) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        side={side}
        sideOffset={sideOffset}
        className={`tooltip-content tooltip-content--${variant}`}
      >
        {children}
        <TooltipPrimitive.Arrow className={`tooltip-arrow tooltip-arrow--${variant}`} />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}
