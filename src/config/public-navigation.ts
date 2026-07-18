import { comingSoonHref } from "@/config/coming-soon";

export type PublicNavigationLink = {
  label: string;
  href: string;
};

export const publicPrimaryNavigation: PublicNavigationLink[] = [
  { label: "Home", href: "/" },
  { label: "News", href: "/news" },
  { label: "Events", href: "/events" },
  { label: "Magazine", href: "/magazine" },
  { label: "Resources", href: comingSoonHref("resources") },
  { label: "About", href: "/about" },
];

export const publicFooterNavigation = {
  explore: [
    { label: "News", href: "/news" },
    { label: "Events", href: "/events" },
    { label: "Magazine", href: "/magazine" },
    { label: "Resources", href: comingSoonHref("resources") },
    { label: "Videos", href: comingSoonHref("videos") },
  ],
  community: [
    { label: "About Us", href: "/about" },
    { label: "Contact Us", href: "/contact" },
    { label: "Speakers", href: comingSoonHref("speakers") },
    { label: "FAQ", href: comingSoonHref("faq") },
    { label: "Register", href: comingSoonHref("registration") },
  ],
  legal: [
    { label: "Privacy Policy", href: comingSoonHref("privacy-policy") },
    { label: "Terms of Use", href: comingSoonHref("terms") },
  ],
} satisfies Record<string, PublicNavigationLink[]>;

export const publicActionNavigation = {
  search: { label: "Search", href: "/search" },
  donate: { label: "Donate", href: comingSoonHref("donate") },
  subscribe: { label: "Subscribe", href: comingSoonHref("subscribe") },
};
