import { ChevronDown, ScrollText } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useId, useRef, useState } from "react";

export function SectionCard({ title, eyebrow, action, children, className = "" }) {
  return (
    <section className={`panel rounded-lg p-5 ${className}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow ? <p className="text-xs font-bold uppercase leading-none tracking-[0.18em] text-zinc-400">{eyebrow}</p> : null}
          <h2 className="mt-2 font-display text-xl font-semibold leading-tight text-bone">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function StatCard({ label, value, tone = "base" }) {
  const tones = {
    base: "border-blood/25 bg-marrow/45 text-bone",
    steel: "border-garnet/35 bg-wine/45 text-red-50",
    slate: "border-blood/20 bg-black/35 text-zinc-100"
  };

  return (
    <div className={`min-h-[5.75rem] rounded-lg border p-4 shadow-[inset_0_1px_0_rgba(185,28,28,0.08)] ${tones[tone] || tones.base}`}>
      <p className="text-xs font-bold uppercase leading-snug tracking-[0.12em] text-red-200/55">{label}</p>
      <p className="mt-4 break-words text-2xl font-bold leading-tight text-inherit">{value}</p>
    </div>
  );
}

export function EmptyState({ title, message }) {
  return (
    <div className="flex min-h-36 flex-col items-center justify-center rounded-lg border border-dashed border-blood/30 bg-marrow/35 p-6 text-center">
      <ScrollText className="h-8 w-8 text-red-200/60" aria-hidden="true" />
      <h3 className="mt-3 font-semibold text-bone">{title}</h3>
      <p className="mt-1 max-w-xl text-sm text-zinc-400">{message}</p>
    </div>
  );
}

export function StatusPill({ status }) {
  const classes = {
    Active: "border-garnet/40 bg-blood/30 text-red-100",
    Low: "border-blood/35 bg-wine/25 text-red-200",
    Inactive: "border-zinc-700/50 bg-black/30 text-zinc-500"
  };

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${classes[status] || classes.Inactive}`}>
      {status}
    </span>
  );
}

export function DarkSelect({ value, onChange, options, ariaLabel, className = "" }) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState(null);
  const ref = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const listboxId = useId();
  const selectedOption = options.find((option) => option.value === value) || options[0];

  function updateMenuPosition() {
    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const gap = 8;
    const margin = 12;
    const optionHeight = 40;
    const menuHeight = Math.min(options.length * optionHeight + 8, 280);
    const width = Math.max(rect.width, 160);
    const left = Math.min(Math.max(margin, rect.right - width), viewportWidth - width - margin);
    const spaceBelow = viewportHeight - rect.bottom - gap - margin;
    const opensUp = spaceBelow < menuHeight && rect.top > spaceBelow;
    const top = opensUp
      ? Math.max(margin, rect.top - menuHeight - gap)
      : Math.min(rect.bottom + gap, viewportHeight - menuHeight - margin);

    setMenuStyle({
      left,
      top,
      width,
      maxHeight: Math.min(menuHeight, opensUp ? rect.top - gap - margin : viewportHeight - rect.bottom - gap - margin)
    });
  }

  useEffect(() => {
    if (!open) return undefined;
    updateMenuPosition();

    function handlePointerDown(event) {
      if (ref.current?.contains(event.target) || menuRef.current?.contains(event.target)) return;
      setOpen(false);
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") setOpen(false);
    }

    function handleViewportChange() {
      updateMenuPosition();
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [open]);

  function chooseOption(nextValue) {
    onChange(nextValue);
    setOpen(false);
  }

  function handleTriggerKeyDown(event) {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen(true);
    }
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        className="input flex min-h-9 items-center justify-between gap-2 text-left"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className="truncate">{selectedOption?.label || ""}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-red-100/70 transition ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open && menuStyle ? createPortal(
        <div
          ref={menuRef}
          id={listboxId}
          role="listbox"
          className="fixed z-[9999] overflow-y-auto rounded-lg border border-blood/45 bg-[#100406]/[0.98] p-1 text-sm text-bone shadow-[0_24px_70px_rgba(0,0,0,0.82),0_0_0_1px_rgba(127,29,29,0.24)] backdrop-blur-xl"
          style={menuStyle}
        >
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                className={`flex min-h-10 w-full items-center rounded-md px-3 text-left transition hover:bg-blood/40 hover:text-white ${selected ? "bg-blood/55 text-white shadow-[inset_0_0_0_1px_rgba(248,113,113,0.16)]" : "text-zinc-300"}`}
                onClick={() => chooseOption(option.value)}
              >
                {option.label}
              </button>
            );
          })}
        </div>,
        document.body
      ) : null}
    </div>
  );
}
