"use client";

import { Bell, ChevronDown, CircleUserRound, Clock3, HelpCircle, LogOut, ShieldCheck, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type AuthenticatedMemberMenuProps = { name: string; image?: string | null; unreadCount?: number };

function memberInitials(name: string) {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "A";
}

export function MemberAvatar({ name, image, className }: { name: string; image?: string | null; className?: string }) {
  if (image) return <Image src={image} alt={`${name} profile picture`} width={44} height={44} className={cn("size-11 rounded-full object-cover", className)} />;
  return <span aria-label={`${name} profile`} className={cn("inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-[#f7edde] font-editorial text-sm font-bold text-public-text", className)}>{memberInitials(name)}</span>;
}

function NotificationBadge({ count }: { count: number }) {
  return count > 0 ? <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-public-primary px-1.5 py-0.5 text-xs font-bold leading-none text-white">{count > 99 ? "99+" : count}</span> : null;
}

function MenuItems({ unreadCount, onNavigate }: { unreadCount: number; onNavigate: () => void }) {
  const items = [
    { href: "/account", label: "My account", icon: CircleUserRound },
    { href: "/account/notifications", label: "Notifications", icon: Bell, notification: true },
    { href: "/account/activity", label: "My activity", icon: Clock3 },
    { href: "/account/security", label: "Security", icon: ShieldCheck, dividerBefore: true },
    { href: "/contact", label: "Help & support", icon: HelpCircle },
  ];
  return <>{items.map(({ href, label, icon: Icon, notification, dividerBefore }) => <div key={label}>{dividerBefore ? <div className="my-2 border-t border-public-border" /> : null}<Link href={href} onClick={onNavigate} className="flex min-h-11 items-center gap-3 rounded-[var(--public-radius)] px-3 py-2 text-sm font-medium text-public-text transition-colors hover:bg-public-primary-soft hover:text-public-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-public-primary"><Icon className="size-4" aria-hidden="true" />{label}{notification ? <NotificationBadge count={unreadCount} /> : null}</Link></div>)}<div className="my-2 border-t border-public-border" /><button type="button" onClick={() => signOut({ callbackUrl: "/" })} className="flex min-h-11 w-full items-center gap-3 rounded-[var(--public-radius)] px-3 py-2 text-sm font-semibold text-public-primary transition-colors hover:bg-public-primary-soft focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-public-primary"><LogOut className="size-4" aria-hidden="true" />Sign out</button></>;
}

export function AuthenticatedMemberMenu({ name, image, unreadCount = 0 }: AuthenticatedMemberMenuProps) {
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const desktopMenuRef = useRef<HTMLDivElement>(null);
  const desktopTriggerRef = useRef<HTMLButtonElement>(null);
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);
  const desktopWasOpen = useRef(false);
  const mobileWasOpen = useRef(false);

  useEffect(() => {
    function closeOnOutside(event: MouseEvent) { if (desktopMenuRef.current && !desktopMenuRef.current.contains(event.target as Node) && !desktopTriggerRef.current?.contains(event.target as Node)) setOpen(false); }
    function closeOnEscape(event: KeyboardEvent) { if (event.key === "Escape") { setOpen(false); setMobileOpen(false); } }
    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => { document.removeEventListener("mousedown", closeOnOutside); document.removeEventListener("keydown", closeOnEscape); };
  }, []);

  useEffect(() => { if (desktopWasOpen.current && !open) desktopTriggerRef.current?.focus(); desktopWasOpen.current = open; }, [open]);
  useEffect(() => { if (mobileWasOpen.current && !mobileOpen) mobileTriggerRef.current?.focus(); mobileWasOpen.current = mobileOpen; }, [mobileOpen]);

  const closeDesktop = () => setOpen(false);
  const closeMobile = () => setMobileOpen(false);

  return <div className="relative"><button ref={desktopTriggerRef} type="button" onClick={() => setOpen((value) => !value)} aria-label="Open member menu" aria-haspopup="menu" aria-expanded={open} className="hidden h-11 max-w-56 items-center gap-2 rounded-[var(--public-radius)] px-1.5 text-left transition-colors hover:bg-public-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-public-primary xl:flex"><MemberAvatar name={name} image={image} className="size-10" /><span className="min-w-0 truncate text-sm font-bold text-public-text">{name}</span><ChevronDown className={cn("size-4 shrink-0 transition-transform", open && "rotate-180")} aria-hidden="true" /></button>{open ? <div ref={desktopMenuRef} role="menu" className="absolute right-0 top-[calc(100%+0.75rem)] hidden w-60 rounded-[var(--public-radius)] border border-public-border bg-public-surface p-2 shadow-[var(--public-shadow)] xl:block"><MenuItems unreadCount={unreadCount} onNavigate={closeDesktop} /></div> : null}<button ref={mobileTriggerRef} type="button" onClick={() => setMobileOpen(true)} aria-label="Open member menu" aria-haspopup="dialog" aria-expanded={mobileOpen} className="inline-flex size-11 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-public-primary xl:hidden"><MemberAvatar name={name} image={image} className="size-9" /></button>{mobileOpen ? <div className="fixed inset-0 z-50 xl:hidden" role="dialog" aria-modal="true" aria-label="Member menu"><button type="button" className="absolute inset-0 cursor-default bg-public-text/20" aria-label="Close member menu" onClick={closeMobile} /><div className="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col bg-public-surface shadow-xl"><div className="flex items-center gap-3 border-b border-public-border px-5 py-5"><MemberAvatar name={name} image={image} /><div className="min-w-0"><p className="truncate font-editorial text-lg font-bold text-public-text">{name}</p><Link href="/account" onClick={closeMobile} className="text-sm text-public-muted-text hover:text-public-primary">View your account</Link></div><button type="button" onClick={closeMobile} className="ml-auto inline-flex size-11 items-center justify-center rounded-[var(--public-radius)] text-public-text hover:bg-public-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-public-primary" aria-label="Close member menu"><X className="size-5" aria-hidden="true" /></button></div><nav className="p-4" aria-label="Member navigation"><MenuItems unreadCount={unreadCount} onNavigate={closeMobile} /></nav></div></div> : null}</div>;
}
