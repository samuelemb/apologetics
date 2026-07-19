import { redirect } from "next/navigation";

import { comingSoonHref } from "@/config/coming-soon";

export default function SearchPage() {
  redirect(comingSoonHref("search"));
}
