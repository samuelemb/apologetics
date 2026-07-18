import { PublicFooter } from "@/components/public/public-footer";
import { PublicHeader } from "@/components/public/public-header";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full flex-col overflow-x-clip bg-public-background text-public-text">
      <PublicHeader />
      <div className="flex flex-1 flex-col">{children}</div>
      <PublicFooter />
    </div>
  );
}
