import type { ComponentProps } from "react";
import { getSoviaTestCopy } from "../i18n/copy";
import { DEFAULT_SOVIA_TEST_LOCALE } from "../i18n/config";
import { SoviaTestComponent as Test } from "./sovia-test.component";
import { SoviaTestTypeComponent as Type } from "./sovia-test-type.component";
import { SoviaTestTypesComponent as Types } from "./sovia-test-types.component";
export function SoviaTestComponent(
  props: NonNullable<ComponentProps<typeof Test>>,
) {
  const locale = props.initialLocale ?? DEFAULT_SOVIA_TEST_LOCALE;
  return (
    <Test
      {...props}
      initialLocale={locale}
      initialCopy={getSoviaTestCopy(locale)}
    />
  );
}
export function SoviaTestTypeComponent(props: ComponentProps<typeof Type>) {
  const locale = props.initialLocale ?? DEFAULT_SOVIA_TEST_LOCALE;
  return (
    <Type
      {...props}
      initialLocale={locale}
      initialCopy={getSoviaTestCopy(locale)}
    />
  );
}
export function SoviaTestTypesComponent(
  props: NonNullable<ComponentProps<typeof Types>>,
) {
  const locale = props.initialLocale ?? DEFAULT_SOVIA_TEST_LOCALE;
  return (
    <Types
      {...props}
      initialLocale={locale}
      initialCopy={getSoviaTestCopy(locale)}
    />
  );
}
