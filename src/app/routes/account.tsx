import { AccountPageClient } from "@/app/sections/account/account-page-client";
import { IntegrationsPageClient } from "@/app/sections/account/integrations/integrations-page-client";
import { RemindersPageClient } from "@/app/sections/account/reminders/reminders-page-client";

export function AccountRoute() {
  return <AccountPageClient />;
}

export function IntegrationsRoute() {
  return <IntegrationsPageClient />;
}

export function RemindersRoute() {
  return <RemindersPageClient />;
}
