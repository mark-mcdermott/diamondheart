import {
  Brain,
  Wind,
  Heart,
  Flame,
  Moon,
  Sun,
  Eye,
  Ear,
  Music,
  TreePine,
  Mountain,
  Waves,
  Cloud,
  Sparkles,
  Timer,
  Clock,
  Zap,
  Leaf,
  Flower2,
  Star,
  HandHeart,
  Activity,
  Smile,
  CloudRain,
  Sunrise,
  type LucideIcon,
} from "lucide-react";

export const ICON_MAP: Record<string, LucideIcon> = {
  Brain,
  Wind,
  Heart,
  Flame,
  Moon,
  Sun,
  Eye,
  Ear,
  Music,
  TreePine,
  Mountain,
  Waves,
  Cloud,
  Sparkles,
  Timer,
  Clock,
  Zap,
  Leaf,
  Flower2,
  Star,
  HandHeart,
  Activity,
  Smile,
  CloudRain,
  Sunrise,
};

export function LucideIconByName({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = ICON_MAP[name] || Brain;
  return <Icon className={className} />;
}
