import { forwardRef, type ComponentPropsWithoutRef, useState } from "react";
import { SlidersHorizontal, ArrowDownUp, MapPin } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

export interface FilterState {
  category: string | null;
  sortBy: "newest" | "oldest" | "closest";
  distance: number | null;
}

interface ExploreFilterProps {
  filters: FilterState;
  onApply: (filters: FilterState) => void;
  hasLocation?: boolean;
}

const SORT_OPTIONS = [
  { value: "newest" as const, label: "Newest first" },
  { value: "oldest" as const, label: "Oldest first" },
  { value: "closest" as const, label: "Closest first", requiresLocation: true },
];

const DISTANCE_OPTIONS = [
  { value: null, label: "Any" },
  { value: 5, label: "5 km" },
  { value: 10, label: "10 km" },
  { value: 25, label: "25 km" },
  { value: 50, label: "50 km" },
];

type FilterTriggerButtonProps = ComponentPropsWithoutRef<"button"> & {
  activeCount: number;
};

const FilterTriggerButton = forwardRef<HTMLButtonElement, FilterTriggerButtonProps>(
  ({ activeCount, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      {...props}
      className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-card text-sm font-medium text-foreground border border-border hover:border-primary/30 transition-colors active:scale-[0.97] relative"
    >
      <SlidersHorizontal className="w-4 h-4" />
      <span>Filter</span>
      {activeCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
          {activeCount}
        </span>
      )}
    </button>
  ),
);

FilterTriggerButton.displayName = "FilterTriggerButton";

const FilterBody = ({
  local,
  setLocal,
  activeCount,
  sortOptions,
  onApply,
  onReset,
}: {
  local: FilterState;
  setLocal: (f: FilterState) => void;
  activeCount: number;
  sortOptions: typeof SORT_OPTIONS;
  onApply: () => void;
  onReset: () => void;
}) => (
  <div className="space-y-5">
    <div className="flex items-center justify-between">
      <h3 className="text-base font-semibold text-foreground">Filters</h3>
      {activeCount > 0 && (
        <button onClick={onReset} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          Clear all
        </button>
      )}
    </div>

    {/* Sort By */}
    <div>
      <div className="flex items-center gap-2 mb-3">
        <ArrowDownUp className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Sort by</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {sortOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setLocal({ ...local, sortBy: opt.value })}
            className={`px-4 py-2 rounded-xl text-[13px] font-medium transition-all duration-150 active:scale-[0.97] ${
              local.sortBy === opt.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-secondary text-foreground hover:bg-accent border border-border"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>

    {/* Distance */}
    <div>
      <div className="flex items-center gap-2 mb-3">
        <MapPin className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Distance</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {DISTANCE_OPTIONS.map((opt) => (
          <button
            key={opt.value ?? "any"}
            onClick={() => setLocal({ ...local, distance: opt.value })}
            className={`px-4 py-2 rounded-xl text-[13px] font-medium transition-all duration-150 active:scale-[0.97] ${
              local.distance === opt.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-secondary text-foreground hover:bg-accent border border-border"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>

    <Button onClick={onApply} className="w-full h-12 rounded-md text-sm font-semibold">
      Apply Filters
    </Button>
  </div>
);

const ExploreFilter = ({ filters, onApply, hasLocation }: ExploreFilterProps) => {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState<FilterState>(filters);
  const isMobile = useIsMobile();

  const activeCount = [
    local.sortBy !== "newest" ? local.sortBy : null,
    local.distance,
  ].filter(Boolean).length;

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) setLocal(filters);
    setOpen(isOpen);
  };

  const handleApply = () => {
    onApply(local);
    setOpen(false);
  };

  const handleReset = () => {
    const reset: FilterState = { category: null, sortBy: "newest", distance: null };
    setLocal(reset);
    onApply(reset);
    setOpen(false);
  };

  const sortOptions = SORT_OPTIONS.filter(
    (opt) => !opt.requiresLocation || hasLocation
  );

  if (!isMobile) {
    return (
      <Popover open={open} onOpenChange={handleOpen}>
        <PopoverTrigger asChild>
          <FilterTriggerButton activeCount={activeCount} />
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-5">
          <FilterBody
            local={local}
            setLocal={setLocal}
            activeCount={activeCount}
            sortOptions={sortOptions}
            onApply={handleApply}
            onReset={handleReset}
          />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Sheet open={open} onOpenChange={handleOpen}>
      <SheetTrigger asChild>
        <FilterTriggerButton activeCount={activeCount} />
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-8 pt-3 max-h-[70vh]">
        <div className="flex justify-center mb-3">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>
        <FilterBody
          local={local}
          setLocal={setLocal}
          activeCount={activeCount}
          sortOptions={sortOptions}
          onApply={handleApply}
          onReset={handleReset}
        />
      </SheetContent>
    </Sheet>
  );
};

export default ExploreFilter;
