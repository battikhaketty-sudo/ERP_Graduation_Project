/**
 * Shared form UX helpers used across detail pages and modals.
 */

/** Scroll the first invalid field into view and focus it. */
export const focusAndScrollToFirstError = (
  root: ParentNode | Document | null = document,
) => {
  if (!root) return false;

  const field =
    root.querySelector<HTMLElement>("[data-field-error='true']") ??
    root.querySelector<HTMLElement>("[data-field-error]");

  if (!field) return false;

  field.scrollIntoView({ behavior: "smooth", block: "center" });

  const focusable = field.querySelector<HTMLElement>(
    "input:not([type='hidden']):not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
  );

  window.setTimeout(() => {
    focusable?.focus({ preventScroll: true });
  }, 180);

  return true;
};

/** Run after React paints validation errors onto the DOM. */
export const afterValidationPaint = (callback: () => void) => {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(callback);
  });
};
