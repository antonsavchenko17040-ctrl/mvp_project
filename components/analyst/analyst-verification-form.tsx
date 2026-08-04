"use client";

import Link from "next/link";
import { useState } from "react";

import { RecommendationFieldBlock } from "@/components/editor/recommendation-field-block";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type AnalystVerificationFormProps = {
  recommendationId: string;
  currentStatus: string;
  initialComment: string;
  sendToRevision: (formData: FormData) => Promise<void>;
  verifyRecommendation: (formData: FormData) => Promise<void>;
};

export function AnalystVerificationForm({
  recommendationId,
  currentStatus,
  initialComment,
  sendToRevision,
  verifyRecommendation,
}: AnalystVerificationFormProps) {
  const [comment, setComment] = useState(initialComment);
  const hasComment = comment.trim().length > 0;

  return (
    <div className="space-y-6 border-t border-border pt-6">
      <p className="text-base text-muted-foreground">
        Для верифікації залиште поле коментаря порожнім. Щоб повернути на доопрацювання, введіть коментар (не менше 5
        символів).
      </p>
      <form action={sendToRevision} className="flex w-full flex-col items-start gap-4">
        <input type="hidden" name="recommendation_id" value={recommendationId} />
        <input type="hidden" name="current_status" value={currentStatus} />
        <RecommendationFieldBlock label="Коментар аналітика" htmlFor={`comment-${recommendationId}`}>
          <div className="space-y-2">
            <Input
              id={`comment-${recommendationId}`}
              name="analyst_comment"
              minLength={5}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Заповніть для повернення на доопрацювання (мінімум 5 символів)"
              className="h-11 w-full text-base"
            />
            <p className="text-sm text-muted-foreground">
              Коментар використовується, якщо ви повертаєте рекомендацію на доопрацювання.
            </p>
          </div>
        </RecommendationFieldBlock>
        <div className="flex w-full flex-wrap items-center justify-end gap-2">
          <Button
            type="submit"
            formAction={verifyRecommendation}
            formNoValidate
            disabled={hasComment}
            className={cn(
              buttonVariants({ variant: "default" }),
              "bg-[#3a6fb8] text-white hover:bg-[#2f5e9a] disabled:bg-[#3a6fb8]/50",
            )}
          >
            Верифікувати
          </Button>
          <Button type="submit" variant="outline" disabled={!hasComment}>
            Повернути на доопрацювання
          </Button>
          <Link
            href="/analyst"
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
