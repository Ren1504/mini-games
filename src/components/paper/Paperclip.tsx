import { cn } from "@/lib/cn";

/** A bent-wire paperclip, drawn with a slightly shaky pencil line. */
export function Paperclip({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 34 86"
      width="34"
      height="86"
      className={cn("drop-shadow-[1px_2px_0_rgba(43,43,43,0.18)]", className)}
    >
      <path
        d="M22.6 24.5 L22.9 66.2 C23 73.4 18.4 78.6 12.4 78.4 C6.6 78.3 2.6 73.6 2.7 66.6 L3.1 15.6 C3.2 9.1 7.6 4.3 13.3 4.4 C19.2 4.5 23.4 9.4 23.3 15.8 L23.6 58.8 C23.7 62.6 21.2 65.4 18 65.3 C14.9 65.2 12.8 62.5 12.8 58.9 L12.6 22.1"
        fill="none"
        stroke="#8A8F98"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M22.6 24.5 L22.9 66.2 C23 73.4 18.4 78.6 12.4 78.4 C6.6 78.3 2.6 73.6 2.7 66.6 L3.1 15.6 C3.2 9.1 7.6 4.3 13.3 4.4 C19.2 4.5 23.4 9.4 23.3 15.8 L23.6 58.8 C23.7 62.6 21.2 65.4 18 65.3 C14.9 65.2 12.8 62.5 12.8 58.9 L12.6 22.1"
        fill="none"
        stroke="#2B2B2B"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeDasharray="22 3 40 2"
        opacity="0.6"
      />
    </svg>
  );
}
