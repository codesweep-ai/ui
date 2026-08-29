"use client";

import { forwardRef, useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "../lib/cn";

interface ModalProps {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  onClose: () => void;
  maxWidth?: string;
  className?: string;
  /** Element to focus when the dialog opens. Defaults to its first focusable element. */
  initialFocus?: React.RefObject<HTMLElement | null>;
}

export const Modal = forwardRef<HTMLDivElement, ModalProps>(function ModalImpl({
  title,
  children,
  actions,
  onClose,
  maxWidth = "var(--modal-max-width)",
  className,
  initialFocus,
}: ModalProps, forwardedRef) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<Element | null>(null);
  const titleId = useId();

  useEffect(() => {
    triggerRef.current = document.activeElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    const background = Array.from(new Set([
      ...Array.from(document.body.children).filter(
        (element) => element !== backdropRef.current && element.getAttribute("data-component") !== "Modal"
      ),
      ...Array.from(document.querySelectorAll("main, header, footer")).filter(
        (element) => !backdropRef.current?.contains(element)
      ),
    ])) as HTMLElement[];
    const previous = background.map((element) => ({
      element,
      inert: element.inert,
      ariaHidden: element.getAttribute("aria-hidden"),
    }));
    background.forEach((element) => {
      element.inert = true;
      element.setAttribute("aria-hidden", "true");
    });

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      previous.forEach(({ element, inert, ariaHidden }) => {
        element.inert = inert;
        if (ariaHidden === null) element.removeAttribute("aria-hidden");
        else element.setAttribute("aria-hidden", ariaHidden);
      });
      (triggerRef.current as HTMLElement)?.focus?.();
    };
  }, [onClose]);

  useEffect(() => {
    const el = dialogRef.current;
    if (el) {
      const focusable = initialFocus?.current ?? el.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      focusable?.focus();
    }
  }, [initialFocus]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab") return;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable || focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return createPortal(
    <div
      ref={(element) => {
        backdropRef.current = element;
        if (typeof forwardedRef === "function") forwardedRef(element);
        else if (forwardedRef) (forwardedRef as React.MutableRefObject<HTMLDivElement | null>).current = element;
      }}
      data-component="Modal"
      className={cn("cs-component-modal-14 ", className)}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        data-modal-dialog=""
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "cs-component-modal-18 ",
          "cs-component-modal-19 ",
          "cs-component-modal-20 "
        )}
        style={{
          maxWidth,
          width: "calc(100% - var(--space-6))",
          maxHeight: "var(--modal-max-height)",
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="cs-component-modal-23 ">
          <h2
            id={titleId}
            data-modal-title=""
            className="cs-component-modal-25 "
          >
            {title}
          </h2>
          <button
            data-modal-close=""
            onClick={onClose}
            className="cs-component-modal-26 "
            aria-label="Close dialog"
          >
            <X className="cs-component-modal-28 " />
          </button>
        </div>
        <div data-modal-content="" className="cs-component-modal-29 ">
          {children}
        </div>
        {actions && (
          <div className="cs-component-modal-30 ">
            {actions}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
});
