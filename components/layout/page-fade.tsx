"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef } from "react";

import { cn } from "@/lib/utils";

let portalFadeArmed = false;

/** Плавна поява вмісту сторінки. Шапка і меню лишаються на місці. */
export function PageFade({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);
  const previousPath = useRef<string | null>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    const previous = previousPath.current;
    previousPath.current = pathname;
    const armed = portalFadeArmed;
    portalFadeArmed = true;
    if (!element || !armed || previous === pathname) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const animation = element.animate(
      [
        { opacity: 0, transform: "translateY(8px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      { duration: 280, easing: "ease-out", fill: "backwards" },
    );
    animation.onfinish = () => animation.cancel();
  }, [pathname]);

  return (
    <div ref={ref} className={cn(className)}>
      {children}
    </div>
  );
}
