import { useState } from "react";
import { Filter } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CATEGORIES } from "@/lib/categories";

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

const DISTANCE_OPTIONS = [
  { value: "any", label: "Any distance" },
  { value: "5", label: "5 km" },
  { value: "10", label: "10 km" },
  { value: "25", label: "25 km" },
  { value: "50", label: "50 km" },
];

const ExploreFilter = ({ filters, onApply, hasLocation }: ExploreFilterProps) => {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState<FilterState>(filters);

  const categoryOptions = CATEGORIES.filter((c) => c.key !== "all");

  const activeCount = [
    local.category,
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

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-secondary text-sm text-foreground border border-border hover:bg-accent transition-colors relative">
          <Filter className="w-4 h-4" />
          <span>Filter</span>
          {activeCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
              {activeCount}
            </span>
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">Filter Products</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Category */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Category</h3>
            <RadioGroup
              value={local.category || "all"}
              onValueChange={(v) => setLocal({ ...local, category: v === "all" ? null : v })}
              className="grid grid-cols-2 gap-1.5"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="all" id="cat-all" />
                <Label htmlFor="cat-all" className="text-sm cursor-pointer">All</Label>
              </div>
              {categoryOptions.map((cat) => (
                <div key={cat.key} className="flex items-center gap-2">
                  <RadioGroupItem value={cat.key} id={`cat-${cat.key}`} />
                  <Label htmlFor={`cat-${cat.key}`} className="text-sm cursor-pointer">{cat.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Sort */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Sort by</h3>
            <RadioGroup
              value={local.sortBy}
              onValueChange={(v) => setLocal({ ...local, sortBy: v as FilterState["sortBy"] })}
              className="space-y-1.5"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="newest" id="sort-newest" />
                <Label htmlFor="sort-newest" className="text-sm cursor-pointer">Newest first</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="oldest" id="sort-oldest" />
                <Label htmlFor="sort-oldest" className="text-sm cursor-pointer">Oldest first</Label>
              </div>
              {hasLocation && (
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="closest" id="sort-closest" />
                  <Label htmlFor="sort-closest" className="text-sm cursor-pointer">Closest first</Label>
                </div>
              )}
            </RadioGroup>
          </div>

          {/* Distance */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Distance</h3>
            <RadioGroup
              value={local.distance?.toString() || "any"}
              onValueChange={(v) => setLocal({ ...local, distance: v === "any" ? null : Number(v) })}
              className="space-y-1.5"
            >
              {DISTANCE_OPTIONS.map((opt) => (
                <div key={opt.value} className="flex items-center gap-2">
                  <RadioGroupItem value={opt.value} id={`dist-${opt.value}`} />
                  <Label htmlFor={`dist-${opt.value}`} className="text-sm cursor-pointer">{opt.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>

        <div className="flex gap-2 pt-3">
          <Button variant="outline" onClick={handleReset} className="flex-1 text-sm">
            Reset
          </Button>
          <Button onClick={handleApply} className="flex-1 text-sm">
            Apply Filters
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExploreFilter;
