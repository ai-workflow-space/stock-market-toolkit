import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

export type ToggleOption = { label: string; value: string };

const baseClass = "flex-wrap justify-start";

export function ToggleBar({
  options,
  value,
  onChange,
  className,
  ariaLabel,
}: {
  options: ToggleOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => { if (v) onChange(v); }}
      variant="outline"
      size="sm"
      aria-label={ariaLabel}
      className={cn(baseClass, className)}
    >
      {options.map((o) => (
        <ToggleGroupItem key={o.value} value={o.value}>{o.label}</ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

export function MultiToggleBar({
  options,
  value,
  onChange,
  className,
  ariaLabel,
}: {
  options: ToggleOption[];
  value: string[];
  onChange: (value: string[]) => void;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <ToggleGroup
      type="multiple"
      value={value}
      onValueChange={onChange}
      variant="outline"
      size="sm"
      aria-label={ariaLabel}
      className={cn(baseClass, className)}
    >
      {options.map((o) => (
        <ToggleGroupItem key={o.value} value={o.value}>{o.label}</ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
