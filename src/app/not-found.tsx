import { PublicFooter } from "@/components/public/public-footer";
import { PublicHeader } from "@/components/public/public-header";
import { PublicNotFound } from "@/components/public/public-not-found";

export default function NotFound() {
  return (
    <div className="flex min-h-screen w-full flex-col overflow-x-clip bg-public-background text-public-text">
      <PublicHeader />
      <PublicNotFound />
      <PublicFooter />
    </div>
  );
}
