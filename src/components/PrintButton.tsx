"use client";

export function PrintButton({ label }: { label: string }) {
  return (
    <button onClick={() => window.print()} className="rounded-full border border-ink/25 px-4 py-1.5 text-sm hover:bg-white">
      {label}
    </button>
  );
}
