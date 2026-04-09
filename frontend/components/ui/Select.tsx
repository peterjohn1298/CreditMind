"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  className?: string;
  capitalize?: boolean;
}

export default function Select({ value, onChange, options, className, capitalize }: SelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className={cn("relative", className)}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center justify-between gap-2 w-full border rounded-md px-3 py-2 text-sm focus:outline-none transition-colors bg-white text-black border-gray-300 hover:border-accent",
          capitalize && "capitalize",
          open && "border-accent"
        )}
      >
        <span className={capitalize ? "capitalize" : ""}>{value}</span>
        <ChevronDown size={14} className={cn("text-gray-500 transition-transform duration-150 flex-shrink-0", open && "rotate-180")} />
      </button>

      {/* Dropdown list */}
      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 w-full min-w-max bg-white border border-gray-200 rounded-md shadow-xl overflow-hidden">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => { onChange(opt); setOpen(false); }}
              className={cn(
                "w-full text-left px-3 py-2 text-sm transition-colors text-black",
                capitalize && "capitalize",
                opt === value
                  ? "bg-accent text-white font-semibold"
                  : "hover:bg-gray-100"
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
