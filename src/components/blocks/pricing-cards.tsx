import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface PricingTier {
  name: string;
  price: string;
  description: string;
  features: string[];
  cta: { label: string; href: string };
  highlighted?: boolean;
}

interface PricingCardsProps {
  tiers: PricingTier[];
}

export function PricingCards({ tiers }: PricingCardsProps) {
  return (
    <div className="grid gap-8 md:grid-cols-2 lg:max-w-4xl lg:mx-auto">
      {tiers.map((tier) => (
        <Card
          key={tier.name}
          className={`flex flex-col ${
            tier.highlighted ? "border-primary shadow-lg" : ""
          }`}
        >
          <CardHeader>
            <CardTitle>{tier.name}</CardTitle>
            <div className="mt-2">
              <span className="text-4xl font-bold">{tier.price}</span>
              {tier.price !== "$0" && (
                <span className="text-muted-foreground">/mo</span>
              )}
            </div>
            <CardDescription>{tier.description}</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <ul className="space-y-3">
              {tier.features.map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary" />
                  {feature}
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <Button
              asChild
              className="w-full"
              variant={tier.highlighted ? "default" : "outline"}
            >
              <Link href={tier.cta.href}>{tier.cta.label}</Link>
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
