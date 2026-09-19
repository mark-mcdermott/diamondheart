/**
 * Value types a tracker metric can hold.
 *
 * `number` is the schema default and is used by 14 seeded metrics (weight among
 * them). It was missing from the pickers, so editing one of those metrics
 * silently changed its type to whichever option happened to render first.
 */
export const VALUE_TYPES = [
  { value: "none", label: "None (just log it)" },
  { value: "number", label: "Number" },
  { value: "int", label: "Integer" },
  { value: "float", label: "Decimal" },
  { value: "text", label: "Text" },
  { value: "bool", label: "Yes/No" },
] as const;

export function isNumericValueType(valueType: string): boolean {
  return valueType === "number" || valueType === "int" || valueType === "float";
}
