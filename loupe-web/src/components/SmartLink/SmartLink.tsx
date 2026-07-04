import { type AnchorHTMLAttributes, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useLoupeNavigation } from "@/hooks/useLoupeNavigation";
import { hasScheme } from "@/lib/url";

export interface SmartLinkProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  /** In-app route (`/cards/123`) OR an external URL (`https://…`, `mailto:`). */
  to: string;
  children: ReactNode;
}

/**
 * One link primitive for internal + external destinations:
 *  - route paths use client-side routing (react-router `<Link>`),
 *  - external URLs open in a new tab, and marketplace/listing links first show
 *    the "you're leaving Loupe" interstitial (see useLoupeNavigation).
 */
export function SmartLink({ to, children, ...rest }: SmartLinkProps) {
  const { openExternal } = useLoupeNavigation();

  if (!hasScheme(to)) {
    return (
      <Link to={to} viewTransition {...rest}>
        {children}
      </Link>
    );
  }

  return (
    <a
      href={to}
      onClick={(e) => {
        e.preventDefault();
        void openExternal(to);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}
