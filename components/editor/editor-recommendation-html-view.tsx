"use client";

import { useState } from "react";

import {
  EditorRecommendationChangeBanner,
  EditorRecommendationPageHeading,
} from "@/components/editor/editor-recommendation-page-heading";

import {
  editionOptionLabel,
  executionLabel,
  executionTileClass,
  significanceLevel,
  statusLabel,
  statusTileClass,
  ukCount,
  VERSIONED_FIELD_TITLES,
  type DateChange,
  type FieldEdition,
  type VersionedFieldKey,
} from "@/lib/editor/editor-recommendation-view-model";
import { resolveExecutionStatusLabel } from "@/lib/recommendation-execution-status";
import type { RecommendationStatus } from "@/lib/types";

type ViewProps = {
  supplementHref: string | null;
  sequenceNumber: number;
  status: RecommendationStatus;
  significance: string;
  sspUnit: string;
  vkElement: string;
  deadline: string;
  informingDeadline: string;
  deadlineWas: string;
  informingWas: string;
  deadlineChanges: DateChange[];
  informingChanges: DateChange[];
  deadlineInitial: string;
  informingInitial: string;
  daysUntilDeadline: number | null;
  banner: { date: string; author: string; fields: string; reason: string } | null;
  editions: Record<VersionedFieldKey, FieldEdition[]>;
  progressReport: string;
  actualDate: string;
  measures: string;
  achievement: string;
  documents: string;
  notes: string;
  managerComment: string;
  analystComment: string;
  notice: string | null;
};

function paragraphs(text: string): string[] {
  const parts = text.split(/\n+/).map((part) => part.trim()).filter(Boolean);
  return parts.length ? parts : ["—"];
}

function SignificanceBars({ level }: { level: number }) {
  return (
    <svg width="16" height="12" viewBox="0 0 16 12" aria-hidden>
      {[0, 1, 2, 3].map((index) => (
        <rect
          key={index}
          x={index * 4.3}
          y={8 - index * 3}
          width="3"
          height={4 + index * 3}
          fill={index < level ? "#000" : "none"}
          stroke="#000"
        />
      ))}
    </svg>
  );
}

function VersionBlock({ title, editions }: { title: string; editions: FieldEdition[] }) {
  const [selected, setSelected] = useState(String(editions[editions.length - 1]?.n ?? 1));
  const edition = editions.find((item) => String(item.n) === selected) ?? editions[editions.length - 1];
  if (!edition) return null;
  const meta = edition.current
    ? `Чинна з ${edition.from}${edition.reason ? ` · Підстава: ${edition.reason}` : ""}`
    : `${edition.from ? `Діяла ${edition.from} – ${edition.to ?? edition.from}` : `Діяла до ${edition.to ?? ""}`} · Підстава: ${edition.reason || "—"}`;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="border-l-[5px] border-[#0069aa] pl-3 text-lg font-semibold leading-snug">{title}</h2>
      <label className="relative inline-flex max-w-full items-center self-start">
        <span className="sr-only">Редакція: {title}</span>
        <select
          value={selected}
          onChange={(event) => setSelected(event.target.value)}
          className="h-9 max-w-full appearance-none rounded-[18px] border border-[#0069aa] bg-[#0069aa] py-0 pr-10 pl-3.5 text-sm font-semibold text-white"
        >
          {[...editions].reverse().map((item) => (
            <option key={item.n} value={item.n} className="bg-white text-black">
              {editionOptionLabel(item)}
            </option>
          ))}
        </select>
        <svg className="pointer-events-none absolute right-4" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" aria-hidden>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </label>
      <div
        className={
          edition.current
            ? "flex flex-col gap-3 rounded-xl border-2 border-[#0069aa] bg-white px-5 py-4"
            : "flex flex-col gap-3 rounded-xl border border-dashed border-[#9a9a9a] bg-[#f5f5f5] px-5 py-4 text-[#3b3b3b]"
        }
      >
        <p className={`text-sm font-bold tracking-wide ${edition.current ? "text-[#0069aa]" : "text-[#595959]"}`}>
          {edition.current ? `ЧИННА РЕДАКЦІЯ ${edition.n}` : `РЕДАКЦІЯ ${edition.n} · НЕЧИННА`}
        </p>
        <div className="flex flex-col gap-3">
          {paragraphs(edition.text).map((paragraph, index) => (
            <p key={`${edition.n}-${index}`} className="leading-relaxed whitespace-pre-wrap">
              {paragraph}
            </p>
          ))}
        </div>
        <p className="border-t border-[#d9d9d9] pt-2.5 text-sm leading-normal text-[#595959]">{meta}</p>
      </div>
    </section>
  );
}

function ChangesButton({ count, open, onClick }: { count: number; open: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className="inline-flex h-[22px] items-center gap-1 rounded-[10px] bg-[#0069aa] px-2 text-sm font-semibold text-white"
      aria-expanded={open}
      aria-controls="dates-history"
      onClick={onClick}
    >
      {ukCount(count, "зміна", "зміни", "змін")}
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        className={open ? "rotate-180" : undefined}
        aria-hidden
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </button>
  );
}

function DateColumn({ title, initial, changes }: { title: string; initial: string; changes: DateChange[] }) {
  return (
    <div className="flex min-w-0 flex-col">
      <h3 className="mb-1 text-base font-semibold">
        {title} · {ukCount(changes.length, "зміна", "зміни", "змін")}
      </h3>
      <ol className="mt-1 list-none p-0">
        {changes.map((change) => (
          <li key={`${change.when}-${change.to}`} className="flex flex-col gap-1 border-b border-[#e6e6e6] py-3">
            <span className="flex flex-wrap items-center gap-2 font-semibold">
              {change.from} → {change.to}
              {change.current ? (
                <span className="inline-flex h-[22px] items-center rounded-[10px] border border-[#0069aa] px-2 text-sm font-semibold text-[#0069aa]">
                  чинний
                </span>
              ) : null}
            </span>
            <span className="text-sm text-[#595959]">
              Змінено {change.when} · {change.author}
            </span>
            <span>Підстава: {change.reason}</span>
          </li>
        ))}
      </ol>
      {initial ? <p className="pt-2 text-sm text-[#595959]">Початковий: {initial}</p> : null}
    </div>
  );
}

export function EditorRecommendationHtmlView(props: ViewProps) {
  const hasDateHistory = props.deadlineChanges.length > 0 || props.informingChanges.length > 0;
  const [historyOpen, setHistoryOpen] = useState(false);
  const toggleHistory = () => setHistoryOpen((open) => !open);
  const level = significanceLevel(props.significance);
  const execution = executionLabel(props.progressReport);
  const executionClass = executionTileClass(resolveExecutionStatusLabel(props.progressReport));

  return (
    <section className="@container flex flex-col gap-[22px]">
      <EditorRecommendationPageHeading sequenceNumber={props.sequenceNumber} actionHref={props.supplementHref} />

      {props.notice ? (
        <p className="rounded-xl border border-[#1e6b35] bg-[#dcf3e2] px-4 py-3 text-[#1e6b35]">{props.notice}</p>
      ) : null}

      {props.banner ? <EditorRecommendationChangeBanner banner={props.banner} /> : null}

      <div className="grid grid-cols-1 gap-3 @[392px]:grid-cols-2 @[594px]:grid-cols-3 @[1200px]:grid-cols-6">
        <article className={`flex gap-2.5 rounded-xl border p-3 ${statusTileClass(props.status)}`}>
          <div className="min-w-0">
            <p className="text-[#595959]">Статус</p>
            <p className="font-semibold">{statusLabel(props.status)}</p>
          </div>
        </article>
        <article
          className={`flex gap-2.5 rounded-xl border p-3 ${level === 2 ? "border-[#585836] bg-[#fefe9c]" : "border-[#d9d9d9] bg-white"}`}
        >
          <div className="min-w-0">
            <p className="text-[#595959]">Значущість спостереження</p>
            <p className="flex items-center gap-2 font-semibold">
              <SignificanceBars level={level} />
              <span>{props.significance.trim() || "—"}</span>
            </p>
          </div>
        </article>
        <article className="flex gap-2.5 rounded-xl border border-[#d9d9d9] bg-white p-3">
          <div className="min-w-0">
            <p className="text-[#595959]">Відповідальний підрозділ</p>
            <p className="font-semibold">{props.sspUnit.trim() || "—"}</p>
          </div>
        </article>
        <article className={`flex gap-2.5 rounded-xl border p-3 ${props.deadlineChanges.length ? "border-[#0069aa] bg-[#eef6fc]" : "border-[#d9d9d9] bg-white"}`}>
          <div className="min-w-0">
            <p className="text-[#595959]">Термін виконання</p>
            <p className="flex flex-wrap items-center gap-2 font-semibold">
              {props.deadline || "—"}
              {props.daysUntilDeadline !== null && props.daysUntilDeadline >= 0 && props.daysUntilDeadline <= 7 ? (
                <span className="inline-flex h-[26px] items-center rounded-md bg-[#ffc353] px-2 text-sm font-bold text-[#3d2600]">
                  {props.daysUntilDeadline === 0 ? "сьогодні" : `через ${ukCount(props.daysUntilDeadline, "день", "дні", "днів")}`}
                </span>
              ) : null}
              {props.deadlineChanges.length ? (
                <ChangesButton count={props.deadlineChanges.length} open={historyOpen} onClick={toggleHistory} />
              ) : null}
            </p>
            {props.deadlineWas ? <p className="text-sm text-[#595959]">було: {props.deadlineWas}</p> : null}
          </div>
        </article>
        <article className={`flex gap-2.5 rounded-xl border p-3 ${props.informingChanges.length ? "border-[#0069aa] bg-[#eef6fc]" : "border-[#d9d9d9] bg-white"}`}>
          <div className="min-w-0">
            <p className="text-[#595959]">Строк інформування</p>
            <p className="flex flex-wrap items-center gap-2 font-semibold">
              {props.informingDeadline || "—"}
              {props.informingChanges.length ? (
                <ChangesButton count={props.informingChanges.length} open={historyOpen} onClick={toggleHistory} />
              ) : null}
            </p>
            {props.informingWas ? <p className="text-sm text-[#595959]">було: {props.informingWas}</p> : null}
          </div>
        </article>
        <article className="flex gap-2.5 rounded-xl border border-[#d9d9d9] bg-white p-3">
          <div className="min-w-0">
            <p className="text-[#595959]">Елемент ВК</p>
            <p className="font-semibold">{props.vkElement.trim() || "—"}</p>
          </div>
        </article>
      </div>

      {hasDateHistory && historyOpen ? (
        <div id="dates-history" className="flex flex-col gap-3 rounded-xl border border-[#0069aa] px-5 py-[18px]">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Історія зміни строків</h2>
            <button type="button" className="inline-flex size-8 items-center justify-center" aria-label="Згорнути історію строків" onClick={() => setHistoryOpen(false)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" aria-hidden>
                <path d="M6 15l6-6 6 6" />
              </svg>
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 min-[960px]:grid-cols-2">
            {props.deadlineChanges.length ? (
              <DateColumn title="Термін виконання" initial={props.deadlineInitial} changes={props.deadlineChanges} />
            ) : null}
            {props.informingChanges.length ? (
              <div className={props.deadlineChanges.length ? "min-[960px]:border-l min-[960px]:border-[#d9d9d9] min-[960px]:pl-8" : undefined}>
                <DateColumn title="Строк інформування" initial={props.informingInitial} changes={props.informingChanges} />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {(Object.keys(VERSIONED_FIELD_TITLES) as VersionedFieldKey[]).map((key) => (
        <VersionBlock key={key} title={VERSIONED_FIELD_TITLES[key]} editions={props.editions[key]} />
      ))}

      {props.status === "published" ? (
      <section className="flex flex-col gap-[22px] border-t border-black pt-6">
        <h2 className="text-2xl font-semibold">Результати виконання</h2>
        <div className="grid grid-cols-1 gap-3 @[392px]:grid-cols-2">
          <article className={`rounded-xl border p-3 ${executionClass}`}>
            <p className="text-[#595959]">Стан впровадження</p>
            <p className="font-semibold">{execution}</p>
          </article>
          <article className="rounded-xl border border-[#d9d9d9] bg-white p-3">
            <p className="text-[#595959]">Фактична дата впровадження</p>
            <p className="font-semibold">{props.actualDate || "—"}</p>
          </article>
        </div>
        <div>
          <h3 className="mb-3 border-l-[5px] border-[#0069aa] pl-3 text-lg font-semibold">Заходи з впровадження</h3>
          {paragraphs(props.measures).map((paragraph) => (
            <p key={paragraph} className={paragraph === "—" ? "text-[#595959]" : "mb-3 leading-relaxed"}>
              {paragraph}
            </p>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 min-[960px]:grid-cols-2">
          <div>
            <h3 className="mb-3 border-l-[5px] border-[#0069aa] pl-3 text-lg font-semibold">Досягнення очікуваного</h3>
            {paragraphs(props.achievement).map((paragraph) => (
              <p key={paragraph} className={paragraph === "—" ? "text-[#595959]" : "mb-3 leading-relaxed"}>
                {paragraph}
              </p>
            ))}
          </div>
          <div>
            <h3 className="mb-3 border-l-[5px] border-[#0069aa] pl-3 text-lg font-semibold">Підтверджуючі документи</h3>
            {paragraphs(props.documents).map((paragraph) => (
              <p key={paragraph} className={paragraph === "—" ? "text-[#595959]" : "mb-3 leading-relaxed"}>
                {paragraph}
              </p>
            ))}
          </div>
        </div>
        <div>
          <h3 className="mb-3 border-l-[5px] border-[#0069aa] pl-3 text-lg font-semibold">Примітки</h3>
          <p className={props.notes.trim() ? "leading-relaxed" : "text-[#595959]"}>{props.notes.trim() || "—"}</p>
        </div>
      </section>
      ) : null}
        {props.managerComment.trim() ? (
          <div>
            <h3 className="mb-3 border-l-[5px] border-[#0069aa] pl-3 text-lg font-semibold">Коментар керівника</h3>
            <p className="leading-relaxed whitespace-pre-wrap">{props.managerComment}</p>
          </div>
        ) : null}
        {props.analystComment.trim() ? (
          <div>
            <h3 className="mb-3 border-l-[5px] border-[#0069aa] pl-3 text-lg font-semibold">Коментар аналітика</h3>
            <p className="leading-relaxed whitespace-pre-wrap">{props.analystComment}</p>
          </div>
        ) : null}
    </section>
  );
}
