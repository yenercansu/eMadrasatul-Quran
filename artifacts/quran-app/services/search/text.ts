const ARABIC_DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;

export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(ARABIC_DIACRITICS, "")
    .replace(/[إأٱآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/[^0-9a-z\u0600-\u06FF]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function tokenizeSearchText(value: string): string[] {
  const normalized = normalizeSearchText(value);
  return normalized ? normalized.split(" ") : [];
}

export function compactLatinVowels(value: string): string {
  return value.replace(/([aeiou])\1+/g, "$1");
}

export function uniqueValues(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
