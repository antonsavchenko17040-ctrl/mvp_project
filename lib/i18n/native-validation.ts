type FormField = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

export const nativeValidationMessages = {
  valueMissing: "Заповніть це поле.",
  typeMismatch: "Введіть значення у потрібному форматі.",
  emailTypeMismatch: "Введіть коректну адресу електронної пошти.",
  patternMismatch: "Введіть значення у потрібному форматі.",
  tooShort: (min: string) => `Значення має містити щонайменше ${min} символів.`,
  tooLong: "Значення занадто довге.",
  rangeUnderflow: "Значення занадто мале.",
  rangeOverflow: "Значення занадто велике.",
  stepMismatch: "Введіть коректне значення.",
  badInput: "Введіть коректне значення.",
  generic: "Введіть коректне значення.",
} as const;

export function nativeFieldValidationMessage(element: FormField): string {
  const { validity } = element;
  if (validity.valid) return "";

  if (validity.valueMissing) {
    return nativeValidationMessages.valueMissing;
  }
  if (validity.typeMismatch) {
    return element instanceof HTMLInputElement && element.type === "email"
      ? nativeValidationMessages.emailTypeMismatch
      : nativeValidationMessages.typeMismatch;
  }
  if (validity.patternMismatch) {
    return nativeValidationMessages.patternMismatch;
  }
  if (validity.tooShort) {
    const min = element.getAttribute("minlength");
    return min ? nativeValidationMessages.tooShort(min) : nativeValidationMessages.generic;
  }
  if (validity.tooLong) {
    return nativeValidationMessages.tooLong;
  }
  if (validity.rangeUnderflow) {
    return nativeValidationMessages.rangeUnderflow;
  }
  if (validity.rangeOverflow) {
    return nativeValidationMessages.rangeOverflow;
  }
  if (validity.stepMismatch) {
    return nativeValidationMessages.stepMismatch;
  }
  if (validity.badInput) {
    return nativeValidationMessages.badInput;
  }

  return nativeValidationMessages.generic;
}
