import { PageFade } from "@/components/layout/page-fade";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <PageFade className="flex min-h-full flex-1 flex-col">{children}</PageFade>;
}
