import type { LucideIcon } from "lucide-react";

export function EditorMenuLabel({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <span data-editor-menu-label className="flex min-w-0 items-center gap-2">
      <Icon aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.7} />
      <span className="truncate">{children}</span>
    </span>
  );
}
