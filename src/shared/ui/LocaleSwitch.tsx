import { useLingui } from "@lingui/react/macro";
import { Check, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LOCALE_LABELS,
  LOCALES,
  setAppLocale,
  type AppLocale,
} from "@/shared/i18n";

export function LocaleSwitch() {
  const { i18n, t } = useLingui();
  const locale = (LOCALES.includes(i18n.locale as AppLocale)
    ? i18n.locale
    : "en") as AppLocale;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="no-drag text-muted-foreground hover:text-foreground"
            aria-label={t`Language`}
          >
            <Languages aria-hidden="true" />
          </Button>
        }
      />
      <DropdownMenuContent
        align="start"
        side="top"
        className="no-drag w-auto min-w-36"
      >
        {LOCALES.map((id) => (
          <DropdownMenuItem
            key={id}
            className="text-xs"
            onClick={() => setAppLocale(id)}
          >
            <span className="flex-1">{LOCALE_LABELS[id]}</span>
            {locale === id ? (
              <Check aria-hidden="true" className="size-3.5 opacity-70" />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
