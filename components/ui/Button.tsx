import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { buttonClasses, type ButtonSize, type ButtonVariant } from "./classes";

type Style = { variant?: ButtonVariant; size?: ButtonSize; icon?: LucideIcon; iconRight?: LucideIcon; children?: ReactNode };

function Content({ icon: Icon, iconRight: IconRight, children }: Pick<Style, "icon" | "iconRight" | "children">) {
  return (
    <>
      {Icon && <Icon aria-hidden size={18} strokeWidth={1.75} />}
      {children}
      {IconRight && <IconRight aria-hidden size={18} strokeWidth={1.75} />}
    </>
  );
}

/** Buttons (§3). Primary: one per screen section. */
export function Button({ variant, size, icon, iconRight, className, children, type = "button", ...rest }: Style & ComponentProps<"button">) {
  return (
    <button type={type} className={buttonClasses({ variant, size, className })} {...rest}>
      <Content icon={icon} iconRight={iconRight}>
        {children}
      </Content>
    </button>
  );
}

/** A link that looks like a button. */
export function ButtonLink({ variant, size, icon, iconRight, className, children, ...rest }: Style & ComponentProps<typeof Link>) {
  return (
    <Link className={buttonClasses({ variant, size, className })} {...rest}>
      <Content icon={icon} iconRight={iconRight}>
        {children}
      </Content>
    </Link>
  );
}
