import type { ReactNode } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function ChartCard({
  title,
  subtitle,
  toolbar,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  const hasHeader = Boolean(title || subtitle || toolbar);
  return (
    <Card className={cn("flex flex-col", className)}>
      {hasHeader && (
        <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 px-4 pb-2 pt-4">
          <div className="min-w-0">
            {title && <div className="truncate text-sm font-medium">{title}</div>}
            {subtitle && <div className="truncate text-xs text-muted-foreground">{subtitle}</div>}
          </div>
          {toolbar && <div className="flex shrink-0 items-center gap-1">{toolbar}</div>}
        </CardHeader>
      )}
      <CardContent className={cn("px-4 pb-4 pt-0", !hasHeader && "pt-4", bodyClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}
