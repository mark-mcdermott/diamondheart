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
  brain: Brain,
  wind: Wind,
  heart: Heart,
  flame: Flame,
  moon: Moon,
  sun: Sun,
  eye: Eye,
  ear: Ear,
  music: Music,
  treepine: TreePine,
  mountain: Mountain,
  waves: Waves,
  cloud: Cloud,
  sparkles: Sparkles,
  timer: Timer,
  clock: Clock,
  zap: Zap,
  leaf: Leaf,
  flower2: Flower2,
  star: Star,
  handheart: HandHeart,
  activity: Activity,
  smile: Smile,
  cloudrain: CloudRain,
  sunrise: Sunrise,
};

export function LucideIconByName({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = ICON_MAP[name.toLowerCase()] || Brain;
  return <Icon className={className} />;
}
