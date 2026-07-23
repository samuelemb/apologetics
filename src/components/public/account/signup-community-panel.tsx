import { Bell, Heart, MessageCircle, Reply } from "lucide-react";
import Image from "next/image";

const benefits = [
  { icon: Heart, text: "Like articles you value" },
  { icon: MessageCircle, text: "Comment and share your thoughts" },
  { icon: Reply, text: "Reply to discussions" },
  { icon: Bell, text: "Receive replies and important updates" },
];

export function SignupCommunityPanel() {
  return (
    <aside className="relative overflow-hidden rounded-2xl border border-public-border bg-[#fffaf6] px-6 py-8 sm:px-9 sm:py-10 lg:min-h-full lg:px-10 lg:py-12">
      <div className="absolute -right-12 -top-12 size-44 rotate-45 border border-public-primary/10" aria-hidden="true" />
      <div className="absolute -bottom-20 -left-20 size-44 rotate-45 border border-public-primary/10" aria-hidden="true" />
      <div className="relative">
        <p className="text-xs font-bold tracking-[0.08em] text-public-primary">APOLOGETICS COMMUNITY</p>
        <div className="mt-4 h-0.5 w-8 bg-public-primary" aria-hidden="true" />
        <h1 className="mt-7 max-w-md font-editorial text-4xl font-bold leading-[1.12] text-public-text sm:text-5xl lg:text-[3.25rem]">Join thoughtful conversations that matter.</h1>
        <p className="mt-5 max-w-md text-base leading-7 text-public-muted-text">Create a verified account to engage with our articles and be part of a respectful, knowledge-seeking community.</p>
        <ul className="mt-8 grid gap-4 text-sm font-medium text-public-text sm:grid-cols-2 lg:grid-cols-1">
          {benefits.map(({ icon: Icon, text }) => <li key={text} className="flex items-center gap-3"><Icon className="size-5 shrink-0 text-public-primary" aria-hidden="true" /><span>{text}</span></li>)}
        </ul>
        <div className="mt-10 hidden items-center gap-4 lg:flex" aria-hidden="true"><span className="h-px w-10 bg-public-primary/70" /><Image src="/images/apologetics-logo.png" alt="" width={72} height={72} className="size-[4.5rem] rounded-full object-contain" /><span className="h-px w-10 bg-public-primary/70" /></div>
      </div>
    </aside>
  );
}
