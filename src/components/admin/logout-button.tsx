"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LogoutButton({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const [isSigningOut, setIsSigningOut] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      size={compact ? "icon-lg" : "lg"}
      className={cn(
        "border-admin-border bg-admin-surface text-admin-text hover:bg-admin-background",
        className,
      )}
      disabled={isSigningOut}
      onClick={() => {
        setIsSigningOut(true);
        void signOut({ callbackUrl: "/admin/login" });
      }}
    >
      <LogOut />
      {compact ? (
        <span className="sr-only">
          {isSigningOut ? "Signing out..." : "Sign out"}
        </span>
      ) : isSigningOut ? (
        "Signing out..."
      ) : (
        "Sign out"
      )}
    </Button>
  );
}
