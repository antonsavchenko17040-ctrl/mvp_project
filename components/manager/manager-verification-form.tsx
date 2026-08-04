"use client";

import Link from "next/link";
import { useState } from "react";

import { RecommendationFieldBlock } from "@/components/editor/recommendation-field-block";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ManagerVerificationFormProps = {
  recommendationId: string;
  currentStatus: string;
  initialComment: string;
  sendToRevision: (formData: FormData) => Promise<void>;
  submitToAnalyst: (formData: FormData) => Promise<void>;
};

export function ManagerVerificationForm({
  recommendationId,
  currentStatus,
  initialComment,
  sendToRevision,
  submitToAnalyst,
}: ManagerVerificationFormProps) {
  const [comment, setComment] = useState(initialComment);
  const hasComment = comment.trim().length > 0;

  return (
    <div className="space-y-6 border-t border-border pt-6">
      <p className="text-base text-muted-foreground">
        Для передачі аналітику залиште поле коментаря порожнім. Щоб повернути на доопрацювання, введіть коментар
        (не менше 5 символів).
      </p>
      <form action={sendToRevision} className="flex w-full flex-col items-start gap-4">
        <input type="hidden" name="recommendation_id" value={recommendationId} />
        <input type="hidden" name="current_status" value={currentStatus} />
        <RecommendationFieldBlock label="Коментар керівника" htmlFor={`comment-${recommendationId}`}>
          <Textarea
            id={`comment-${recommendationId}`}
            name="manager_comment"
            minLength={5}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Заповніть для повернення на доопрацювання (мінімум 5 символів)"
            className="min-h-[88px] w-full resize-y border-input bg-background text-base leading-relaxed"
          />
        </RecommendationFieldBlock>
        <div className="flex flex-wrap items-center justify-start gap-2">
          <Button type="submit" variant="outline" disabled={!hasComment}>
            Повернути на доопрацювання
          </Button>
          <Button
            type="submit"
            formAction={submitToAnalyst}
            formNoValidate
            disabled={hasComment}
            className={cn(
              buttonVariants({ variant: "default" }),
              "bg-[#3a6fb8] text-white hover:bg-[#2f5e9a] disabled:bg-[#3a6fb8]/50",
            )}
          >
            Передати аналітику
          </Button>
          <Link
            href="/manager"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "inline-flex h-10 items-center justify-center px-4 py-2 text-base",
            )}
          >
            Назад до списку
          </Link>
        </div>
      </form>
    </div>
  );
}
