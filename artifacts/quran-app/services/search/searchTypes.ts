export type SearchType = "surah" | "ayah";

export type TokenType = "canonical" | "alias" | "stem" | "phonetic" | "numeric" | "translation";

export interface SearchToken {
  token: string;
  tokenType: TokenType;
  weight: number;
}

export interface SearchIndexEntry<TItem> {
  item: TItem;
  tokens: SearchToken[];
  exactValues: Set<string>;
}

export interface SearchResult<TItem> {
  item: TItem;
  score: number;
  matchType: "exact" | "alias" | "token" | "fuzzy";
}

export interface SearchStrategy<TItem> {
  type: SearchType;
  search: (query: string, items: TItem[]) => TItem[];
}
