import { Bell, Clock3, Grid2X2, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

const navigation = [
  { href: "/account", label: "Overview", icon: Grid2X2 },
  { href: "/account/profile", label: "Profile", icon: UserRound },
  { href: "/account/activity", label: "Activity", icon: Clock3 },
  { href: "/account/notifications", label: "Notifications", icon: Bell },
  { href: "/account/security", label: "Security", icon: ShieldCheck },
];

export function AccountNavigation({ mobile = false, activeHref = "/account" }: { mobile?: boolean; activeHref?: string }) {
  return <nav aria-label="Account navigation" className={mobile ? "flex min-w-max gap-1" : "grid gap-1"}>{navigation.map(({ href, label, icon: Icon }) => <Link key={label} href={href} aria-current={href === activeHref ? "page" : undefined} className={cn("inline-flex min-h-11 items-center gap-3 rounded-[var(--public-radius)] px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-public-primary", href === activeHref ? "bg-public-primary-soft text-public-primary" : "text-public-muted-text hover:bg-public-primary-soft hover:text-public-primary", mobile && "border-b-2 border-transparent rounded-none px-3", mobile && href === activeHref && "border-public-primary bg-transparent") }><Icon className="size-4" aria-hidden="true" />{label}</Link>)}</nav>;
}
