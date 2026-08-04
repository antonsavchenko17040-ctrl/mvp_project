import { PublicHeader } from "@/components/public/public-header";
import { PublicNav } from "@/components/public/public-nav";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="workspace-ui min-h-screen bg-[#f5f5f5]">
      <PublicHeader />
      <div className="flex min-h-[calc(100vh-3.5rem)] w-full">
        <aside className="w-[240px] shrink-0 border-r border-black/20 bg-white">
          <PublicNav />
        </aside>
        <main className="min-w-0 flex-1 p-5 xl:p-7 2xl:px-10 2xl:py-9">{children}</main>
      </div>
    </div>
  );
}

