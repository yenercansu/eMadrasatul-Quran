import { searchSurahs } from "@/services/search/surahSearch";
import type { SearchType } from "@/services/search/searchTypes";

export { normalizeSearchText, tokenizeSearchText } from "@/services/search/text";
export { searchSurahs } from "@/services/search/surahSearch";
export type { SearchType } from "@/services/search/searchTypes";

export function searchByType<TItem>(type: SearchType, query: string, items: TItem[]): TItem[] {
  switch (type) {
    case "surah":
      return searchSurahs(query, items as Parameters<typeof searchSurahs>[1]) as TItem[];
    case "ayah":
      return items;
    default:
      return items;
  }
}
