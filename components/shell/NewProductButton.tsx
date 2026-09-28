import { Plus } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";

/** Every app page header's primary action. */
export function NewProductButton() {
  return (
    <ButtonLink href="/new" icon={Plus}>
      New product
    </ButtonLink>
  );
}
