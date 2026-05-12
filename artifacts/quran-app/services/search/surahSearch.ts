import type { ApiSurah } from "@/services/quranApi";
import type { SurahMeta } from "@/constants/surahData";
import type { SearchIndexEntry, SearchResult, SearchToken } from "@/services/search/searchTypes";
import { compactLatinVowels, normalizeSearchText, tokenizeSearchText, uniqueValues } from "@/services/search/text";

type SearchableSurah = Pick<SurahMeta, "number" | "name" | "englishName"> &
  Partial<Pick<SurahMeta, "juz">> &
  Partial<Pick<ApiSurah, "englishNameTranslation" | "numberOfAyahs" | "revelationType">>;

const SURAH_ALIAS_OVERRIDES: Record<number, string[]> = {
  1: ["Al-Fatiha", "Al Faatiha", "Fatiha", "Fatihah", "The Opening", "الفاتحة"],
  36: ["Ya Sin", "Yasin", "Yaseen"],
  67: ["Mulk", "The Sovereignty", "The Kingdom"],
  112: ["Ikhlas", "Al Ikhlas", "Sincerity"],
  113: ["Falaq", "Al Falaq", "Daybreak"],
  114: ["Nas", "Naas", "An Nas", "Mankind"],
};

const DEFINITE_ARTICLES = new Set(["al", "an", "ar", "as", "at", "az", "ash", "adh"]);

function addToken(tokens: Map<string, SearchToken>, token: string, tokenType: SearchToken["tokenType"], weight: number) {
  const normalized = normalizeSearchText(token);
  if (!normalized) return;
  const current = tokens.get(normalized);
  if (!current || current.weight < weight) tokens.set(normalized, { token: normalized, tokenType, weight });
}

function variantsForPhrase(phrase: string): string[] {
  const normalized = normalizeSearchText(phrase);
  const words = tokenizeSearchText(phrase);
  const variants = [normalized, compactLatinVowels(normalized)];

  if (words.length > 1 && DEFINITE_ARTICLES.has(words[0])) {
    const withoutArticle = words.slice(1).join(" ");
    variants.push(withoutArticle, compactLatinVowels(withoutArticle));
  }

  for (const word of words) {
    variants.push(word, compactLatinVowels(word));
  }

  return uniqueValues(variants);
}

function buildSurahIndex(items: SearchableSurah[]): SearchIndexEntry<SearchableSurah>[] {
  return items.map((item) => {
    const tokens = new Map<string, SearchToken>();
    const exactValues = new Set<string>();
    const canonicalValues = [
      item.englishName,
      item.name,
      item.englishNameTranslation ?? "",
      String(item.number),
      item.juz != null ? String(item.juz) : "",
    ];
    const aliases = SURAH_ALIAS_OVERRIDES[item.number] ?? [];

    for (const value of canonicalValues) {
      const normalized = normalizeSearchText(value);
      if (normalized) exactValues.add(normalized);
      for (const variant of variantsForPhrase(value)) {
        addToken(tokens, variant, value === String(item.number) ? "numeric" : "canonical", value === String(item.number) ? 1.6 : 1);
      }
    }

    for (const alias of aliases) {
      const normalized = normalizeSearchText(alias);
      if (normalized) exactValues.add(normalized);
      for (const variant of variantsForPhrase(alias)) {
        addToken(tokens, variant, "alias", 1.35);
      }
    }

    return { item, tokens: [...tokens.values()], exactValues };
  });
}

function scoreSurahEntry(entry: SearchIndexEntry<SearchableSurah>, normalizedQuery: string, queryTokens: string[]): SearchResult<SearchableSurah> | null {
  if (!normalizedQuery) return { item: entry.item, score: 0, matchType: "token" };
  if (entry.exactValues.has(normalizedQuery)) {
    return { item: entry.item, score: 100, matchType: "exact" };
  }

  const queryVariants = uniqueValues([
    normalizedQuery,
    compactLatinVowels(normalizedQuery),
    ...queryTokens,
    ...queryTokens.map(compactLatinVowels),
  ]);
  let score = 0;
  let matched = 0;
  let aliasMatched = false;

  for (const candidate of queryVariants) {
    const token = entry.tokens.find((t) => t.token === candidate || t.token.includes(candidate) || candidate.includes(t.token));
    if (!token) continue;
    matched += 1;
    aliasMatched = aliasMatched || token.tokenType === "alias";
    score += token.weight * (token.token === candidate ? 12 : 6);
  }

  if (matched === 0) return null;

  const allQueryTokensMatched = queryTokens.length > 0 && queryTokens.every((queryToken) =>
    entry.tokens.some((token) => token.token === queryToken || token.token === compactLatinVowels(queryToken))
  );
  if (allQueryTokensMatched) score += 16;
  score += Math.max(0, 4 - entry.item.number / 100);

  return {
    item: entry.item,
    score,
    matchType: aliasMatched ? "alias" : "token",
  };
}

export function searchSurahs<TSurah extends SearchableSurah>(query: string, items: TSurah[]): TSurah[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return items;

  const queryTokens = tokenizeSearchText(query);
  return buildSurahIndex(items)
    .map((entry) => scoreSurahEntry(entry, normalizedQuery, queryTokens))
    .filter((result): result is SearchResult<SearchableSurah> => result !== null)
    .sort((a, b) => b.score - a.score || a.item.number - b.item.number)
    .map((result) => result.item as TSurah);
}
