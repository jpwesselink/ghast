import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import type { ReactNode } from "react";

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

type Side = "top" | "bottom" | "left" | "right";

export function TooltipContent({
  children,
  side = "top",
  sideOffset = 4,
}: {
  children: ReactNode;
  side?: Side;
  sideOffset?: number;
}) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        side={side}
        sideOffset={sideOffset}
        className={"tooltip-content"}
      >
        {children}
        <TooltipPrimitive.Arrow className={"tooltip-arrow"} />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}
