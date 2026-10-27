export type FormState = { error?: string; success?: string } | undefined;

export function str(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export const MIN_PASSWORD = 8;
