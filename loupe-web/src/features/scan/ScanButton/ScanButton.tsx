import { type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ScanLine } from "lucide-react";
import { Button, type ButtonProps } from "@/components";
import { useAuth } from "@/auth/AuthProvider";

export interface ScanButtonProps {
  label?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  block?: boolean;
  icon?: ReactNode;
}

/**
 * "Scan a card" entry point — opens THE scanner (the full-screen camera
 * viewfinder at /scan), the same one everywhere. Scanning requires an
 * account, so signed-out users are sent to log in (and back).
 */
export function ScanButton({ label = "Scan a card", variant = "primary", size = "md", block, icon }: ScanButtonProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <Button
      variant={variant}
      size={size}
      block={block}
      leadingIcon={icon ?? <ScanLine size={16} />}
      onClick={() => navigate(user ? "/scan" : "/login")}
    >
      {label}
    </Button>
  );
}
