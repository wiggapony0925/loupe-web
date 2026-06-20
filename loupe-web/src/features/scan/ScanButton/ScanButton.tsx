import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ScanLine } from "lucide-react";
import { Button, type ButtonProps } from "@/components";
import { useAuth } from "@/auth/AuthProvider";
import { ScanModal } from "../ScanModal/ScanModal";

export interface ScanButtonProps {
  label?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  block?: boolean;
  icon?: ReactNode;
}

/**
 * "Scan a card" entry point. Scanning requires an account, so signed-out users
 * are sent to log in (and back); signed-in users get the scan modal.
 */
export function ScanButton({ label = "Scan a card", variant = "primary", size = "md", block, icon }: ScanButtonProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        block={block}
        leadingIcon={icon ?? <ScanLine size={16} />}
        onClick={() => (user ? setOpen(true) : navigate("/login"))}
      >
        {label}
      </Button>
      {user && <ScanModal open={open} onOpenChange={setOpen} />}
    </>
  );
}
