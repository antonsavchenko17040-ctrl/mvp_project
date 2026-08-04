"use client";

import { useEffect } from "react";

import { nativeFieldValidationMessage } from "@/lib/i18n/native-validation";

type FormField = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

function isFormField(target: EventTarget | null): target is FormField {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

/** Українські підказки для вбудованої HTML5-валідації браузера. */
export function FormNativeValidationUk() {
  useEffect(() => {
    const onInvalid = (event: Event) => {
      const target = event.target;
      if (!isFormField(target)) return;
      target.setCustomValidity(nativeFieldValidationMessage(target));
    };

    const clearCustomValidity = (event: Event) => {
      const target = event.target;
      if (!isFormField(target)) return;
      target.setCustomValidity("");
    };

    document.addEventListener("invalid", onInvalid, true);
    document.addEventListener("input", clearCustomValidity, true);
    document.addEventListener("change", clearCustomValidity, true);

    return () => {
      document.removeEventListener("invalid", onInvalid, true);
      document.removeEventListener("input", clearCustomValidity, true);
      document.removeEventListener("change", clearCustomValidity, true);
    };
  }, []);

  return null;
}
