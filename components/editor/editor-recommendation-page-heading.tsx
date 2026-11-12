import Link from "next/link";

/** Шапка лишається на місці, прокручується лише тіло сторінки. */
export function EditorRecommendationFrame({
  header,
  children,
}: {
  header: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="shrink-0 bg-white px-5 pt-5 pb-4 xl:px-7 2xl:px-10">{header}</div>
      <div className="@container scrollbar-none min-h-0 flex-1 overflow-y-auto overscroll-none px-5 pt-1 pb-5 xl:px-7 2xl:px-10">
        {children}
      </div>
    </div>
  );
}

export function EditorRecommendationChangeBanner({
  banner,
}: {
  banner: { date: string; author: string; fields: string; reason: string };
}) {
  return (
    <div className="flex items-start gap-3.5 rounded-xl border border-[#0069aa] bg-[#dbeffc] px-[18px] py-3.5" role="status">
      <svg className="mt-0.5 shrink-0" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0069aa" strokeWidth="2.2" aria-hidden>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <p className="font-bold text-[#004a78]">Рекомендацію змінено</p>
          <p className="text-[#3b3b3b]">
            Остання зміна {banner.date} · {banner.author}
          </p>
        </div>
        <p>
          Остання зміна: <strong>{banner.fields}</strong>. Підстава: {banner.reason}
        </p>
      </div>
    </div>
  );
}

export function EditorRecommendationPageHeading({
  sequenceNumber,
  title,
  actionHref,
  extra,
}: {
  sequenceNumber?: number;
  title?: string;
  actionHref?: string | null;
  extra?: React.ReactNode;
}) {
  const heading = title ?? `Рекомендація №${sequenceNumber}`;

  return (
    <div className="flex flex-wrap items-start justify-between gap-6">
      <h1 className="text-[2rem] leading-tight font-semibold">{heading}</h1>
      {extra}
      {actionHref ? (
        <Link
          href={actionHref}
          className="inline-flex h-11 items-center gap-2 rounded-[22px] border border-black px-5 text-base font-semibold text-black no-underline"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
          Доповнити
        </Link>
      ) : null}
    </div>
  );
}
