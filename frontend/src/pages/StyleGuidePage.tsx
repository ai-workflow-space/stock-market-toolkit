import { useState } from "react";
import { Search } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import ChartCard from "@/components/common/ChartCard";
import StatCard from "@/components/common/StatCard";
import { ToggleBar, MultiToggleBar } from "@/components/common/ToggleBar";

const SWATCHES = [
  { name: "background", cls: "bg-background border" },
  { name: "card", cls: "bg-card border" },
  { name: "primary", cls: "bg-primary" },
  { name: "secondary", cls: "bg-secondary" },
  { name: "muted", cls: "bg-muted" },
  { name: "accent", cls: "bg-accent" },
  { name: "destructive", cls: "bg-destructive" },
  { name: "up", cls: "bg-up" },
  { name: "down", cls: "bg-down" },
  { name: "neutral", cls: "bg-neutral" },
];

const TYPE_SCALE = [
  { label: "text-3xl · 30px", cls: "text-3xl" },
  { label: "text-2xl · 24px", cls: "text-2xl" },
  { label: "text-xl · 20px", cls: "text-xl" },
  { label: "text-lg · 18px", cls: "text-lg" },
  { label: "text-base · 16px", cls: "text-base" },
  { label: "text-sm · 14px", cls: "text-sm" },
  { label: "text-xs · 12px", cls: "text-xs" },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <ChartCard title={title}>
      <div className="pt-2">{children}</div>
    </ChartCard>
  );
}

export default function StyleGuidePage() {
  const [tf, setTf] = useState("1mo");
  const [inds, setInds] = useState<string[]>(["rsi"]);
  const [on, setOn] = useState(true);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Style guide</h1>
        <p className="text-sm text-muted-foreground">Living reference for design tokens and components.</p>
      </div>

      <Section title="Color tokens">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {SWATCHES.map((s) => (
            <div key={s.name} className="flex flex-col gap-1.5">
              <div className={`h-12 rounded-md border-border ${s.cls}`} />
              <span className="text-xs text-muted-foreground">{s.name}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Typography">
        <div className="flex flex-col gap-2">
          {TYPE_SCALE.map((t) => (
            <div key={t.cls} className="flex items-baseline justify-between gap-4">
              <span className={t.cls}>The quick brown fox</span>
              <span className="shrink-0 font-mono text-xs text-muted-foreground">{t.label}</span>
            </div>
          ))}
          <div className="mt-2 font-mono text-sm tabular-nums">JetBrains Mono · 1,234.56 · +2.41% · 48.2M</div>
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-2">
          <Button>Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="link">Link</Button>
          <Button size="sm">Small</Button>
          <Button size="icon" aria-label="Search"><Search /></Button>
          <Button><Search /> With icon</Button>
        </div>
      </Section>

      <Section title="Form controls">
        <div className="flex max-w-sm flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sg-input">Input</Label>
            <Input id="sg-input" placeholder="Type here…" />
          </div>
          <div className="flex items-center gap-2">
            <Switch id="sg-switch" checked={on} onCheckedChange={setOn} />
            <Label htmlFor="sg-switch">Switch ({on ? "on" : "off"})</Label>
          </div>
          <ToggleBar ariaLabel="Timeframe" value={tf} onChange={setTf} options={[
            { value: "1mo", label: "1M" },
            { value: "3mo", label: "3M" },
            { value: "1y", label: "1Y" },
          ]} />
          <MultiToggleBar ariaLabel="Indicators" value={inds} onChange={setInds} options={[
            { value: "rsi", label: "RSI" },
            { value: "macd", label: "MACD" },
            { value: "bb", label: "Bollinger" },
          ]} />
        </div>
      </Section>

      <Section title="Badges">
        <div className="flex flex-wrap gap-2">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge variant="outline">Outline</Badge>
        </div>
      </Section>

      <Section title="Stat cards">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Up" value="+2.41%" tone="up" />
          <StatCard label="Down" value="-1.10%" tone="down" />
          <StatCard label="Neutral" value="32.6" tone="neutral" />
          <StatCard label="With delta" value="$214.29" delta="+2.41 (1.14%)" tone="up" />
        </div>
      </Section>

      <Section title="Feedback & overlays">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => toast("Saved", { description: "This is a sonner toast." })}>
            Show toast
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline">Hover for tooltip</Button>
            </TooltipTrigger>
            <TooltipContent>Tooltip content</TooltipContent>
          </Tooltip>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Dropdown</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Menu</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Item one</DropdownMenuItem>
              <DropdownMenuItem>Item two</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Open dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Dialog title</DialogTitle>
                <DialogDescription>Example dialog body content.</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button>Confirm</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
      </Section>
    </div>
  );
}
