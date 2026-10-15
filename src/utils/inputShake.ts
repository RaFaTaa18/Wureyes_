const SHAKE_DURATION_MS = 280;

export function shakeInput(target: EventTarget | Element | null): void {
  if (!(target instanceof HTMLElement)) return;

  const targetElement =
    target instanceof HTMLInputElement && target.type === "checkbox"
      ? target.closest<HTMLElement>(".booking-terms-label") ?? target
      : target;

  targetElement.classList.add("t-shake-target", "is-error");
  targetElement.classList.remove("is-shaking");
  void targetElement.offsetWidth;
  targetElement.classList.add("is-shaking");

  window.setTimeout(() => {
    targetElement.classList.remove("is-shaking");
  }, SHAKE_DURATION_MS);
}

export function clearInputError(target: EventTarget | Element | null): void {
  if (!(target instanceof HTMLElement)) return;

  target.classList.remove("t-shake-target", "is-error", "is-shaking");

  if (target instanceof HTMLInputElement && target.type === "checkbox") {
    target.closest<HTMLElement>(".booking-terms-label")?.classList.remove(
      "t-shake-target",
      "is-error",
      "is-shaking",
    );
  }
}
