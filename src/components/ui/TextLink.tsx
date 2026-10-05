import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * The only action style on the site: an underlined mono label with an optional icon that nudges on
 * hover. No boxed buttons (UI-SPEC §8).
 */
export const textLinkClass = (accent = false) =>
  cn(
    "relative inline-flex cursor-pointer items-center gap-2.5 py-1.5 font-mono text-xs tracking-[.12em] uppercase",
    "after:absolute after:inset-x-0 after:bottom-0 after:h-px after:origin-left after:bg-current after:opacity-35",
    "after:transition-[opacity,transform] after:duration-500 hover:after:scale-x-[1.04] hover:after:opacity-100",
    "[&_svg]:size-3.5 [&_svg]:transition-transform [&_svg]:duration-300 hover:[&_svg]:translate-x-1",
    accent ? "text-acc" : "text-fg",
  );

type Common = { accent?: boolean; icon?: ReactNode; children: ReactNode };

type AsButton = Common & { href?: never } & ButtonHTMLAttributes<HTMLButtonElement>;
type AsAnchor = Common & { href: string } & AnchorHTMLAttributes<HTMLAnchorElement>;

export function TextLink(props: AsButton | AsAnchor) {
  if (props.href !== undefined) {
    const { accent, icon, children, className, ...rest } = props;
    return (
      <a className={cn(textLinkClass(accent), className)} {...rest}>
        {children}
        {icon}
      </a>
    );
  }
  const { accent, icon, children, className, type = "button", ...rest } = props;
  return (
    <button type={type} className={cn(textLinkClass(accent), className)} {...rest}>
      {children}
      {icon}
    </button>
  );
}
