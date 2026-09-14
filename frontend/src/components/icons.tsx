import type { LucideIcon } from 'lucide-react'
import {
  Wallet,
  TrendingUp,
  PlusCircle,
  Home,
  Utensils,
  Car,
  HeartPulse,
  GraduationCap,
  Gamepad2,
  Tv,
  ShoppingCart,
  Plane,
  Gift,
  Shirt,
  Smartphone,
  Zap,
  Coffee,
  Circle,
  FolderLock,
  PiggyBank,
} from 'lucide-react'

const iconMap: Record<string, LucideIcon> = {
  wallet: Wallet,
  'trending-up': TrendingUp,
  'plus-circle': PlusCircle,
  home: Home,
  utensils: Utensils,
  car: Car,
  'heart-pulse': HeartPulse,
  'graduation-cap': GraduationCap,
  'gamepad-2': Gamepad2,
  tv: Tv,
  'shopping-cart': ShoppingCart,
  plane: Plane,
  gift: Gift,
  shirt: Shirt,
  smartphone: Smartphone,
  zap: Zap,
  coffee: Coffee,
  'piggy-bank': PiggyBank,
  'folder-lock': FolderLock,
}

export const PRESET_ICONS = Object.keys(iconMap)

export function CategoryIcon({
  name,
  className,
  style,
}: {
  name?: string | null
  className?: string
  style?: React.CSSProperties
}) {
  const Icon = (name && iconMap[name]) || Circle
  return <Icon className={className} style={style} aria-hidden="true" />
}

export { iconMap }
export type { LucideIcon }