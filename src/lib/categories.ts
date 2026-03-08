import {
  Cherry,
  Carrot,
  Beef,
  Milk,
  Egg,
  Nut,
  Wheat,
  Leaf,
  Droplets,
  CakeSlice,
  Wine,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react";

export interface Category {
  key: string;
  label: string;
  icon: LucideIcon;
}

export const CATEGORIES: Category[] = [
  { key: "fruits", label: "Fruits", icon: Cherry },
  { key: "vegetables", label: "Vegetables", icon: Carrot },
  { key: "meat", label: "Meat", icon: Beef },
  { key: "dairy", label: "Dairy", icon: Milk },
  { key: "eggs", label: "Eggs", icon: Egg },
  { key: "nuts", label: "Nuts", icon: Nut },
  { key: "grains", label: "Grains", icon: Wheat },
  { key: "herbs", label: "Herbs", icon: Leaf },
  { key: "honey", label: "Honey", icon: Droplets },
  { key: "baked_goods", label: "Baked Goods", icon: CakeSlice },
  { key: "beverages", label: "Beverages", icon: Wine },
  { key: "other", label: "Other", icon: MoreHorizontal },
];
