import React, { useMemo } from "react";
import { Text, type StyleProp, type TextStyle } from "react-native";

export type TajweedToken = {
  text: string;
  className?: string;
};

export type TajweedWord = {
  text: string;
  tokens: TajweedToken[];
};

const TAJWEED_COLORS: Record<string, string> = {
  ham_wasl: "#8A8A8A",
  laam_shamsiyah: "#C0504D",
  madda_normal: "#2F80AD",
  madda_permissible: "#6B63B5",
  madda_necessary: "#8E44AD",
  qalaqah: "#2E7D60",
  ikhafa: "#B06A2B",
  ikhafa_shafawi: "#A15C38",
  idgham_ghunnah: "#B35C88",
  idgham_wo_ghunnah: "#7B5EA7",
  idgham_shafawi: "#5E7EA7",
  iqlab: "#9B6B2D",
  ghunnah: "#B64D6B",
};

function getAttribute(raw: string, name: string): string | undefined {
  const match = raw.match(new RegExp(`${name}\\s*=\\s*["']?([^\\s"'>]+)["']?`, "i"));
  return match?.[1];
}

export function stripTajweedMarkup(markup: string): string {
  return markup
    .replace(/<span\b[^>]*class=["']?end["']?[^>]*>.*?<\/span>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseTajweedMarkup(markup: string): TajweedToken[] {
  const tokens: TajweedToken[] = [];
  const tagPattern = /<\/?[^>]+>/g;
  const classStack: Array<string | undefined> = [];
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(markup))) {
    const before = markup.slice(cursor, match.index);
    const activeClass = classStack[classStack.length - 1];
    if (before) tokens.push({ text: before, className: activeClass });

    const tag = match[0];
    const lower = tag.toLowerCase();
    if (lower.startsWith("</")) {
      classStack.pop();
    } else if (lower.startsWith("<span") && getAttribute(tag, "class") === "end") {
      const closeIndex = markup.toLowerCase().indexOf("</span>", tagPattern.lastIndex);
      if (closeIndex >= 0) {
        tagPattern.lastIndex = closeIndex + "</span>".length;
      }
    } else if (lower.startsWith("<tajweed")) {
      classStack.push(getAttribute(tag, "class"));
    }
    cursor = tagPattern.lastIndex;
  }

  const trailing = markup.slice(cursor);
  if (trailing) tokens.push({ text: trailing, className: classStack[classStack.length - 1] });

  return tokens.filter((token) => token.text.length > 0);
}

export function splitTajweedWords(markup: string): TajweedWord[] {
  const words: TajweedWord[] = [];
  let current: TajweedWord | null = null;

  for (const token of parseTajweedMarkup(markup)) {
    const parts = token.text.split(/(\s+)/);
    for (const part of parts) {
      if (!part) continue;
      if (/^\s+$/.test(part)) {
        if (current) {
          words.push(current);
          current = null;
        }
        continue;
      }
      if (!current) current = { text: "", tokens: [] };
      current.text += part;
      current.tokens.push({ text: part, className: token.className });
    }
  }

  if (current) words.push(current);
  return words;
}

export function getTajweedColor(className?: string): string | undefined {
  return className ? TAJWEED_COLORS[className] : undefined;
}

export function splitOriginalWordsWithTajweed(text: string, markup: string): TajweedWord[] {
  const originalWords = text.split(/\s+/).filter(Boolean);
  const tajweedWords = splitTajweedWords(markup);

  return originalWords.map((originalWord, wordIndex) => {
    const sourceWord = tajweedWords[wordIndex];
    if (!sourceWord) return { text: originalWord, tokens: [{ text: originalWord }] };

    const originalChars = Array.from(originalWord);
    let cursor = 0;
    const tokens: TajweedToken[] = [];

    for (const sourceToken of sourceWord.tokens) {
      if (cursor >= originalChars.length) break;
      const length = Array.from(sourceToken.text).length;
      const textPart = originalChars.slice(cursor, cursor + length).join("");
      if (textPart) tokens.push({ text: textPart, className: sourceToken.className });
      cursor += length;
    }

    const rest = originalChars.slice(cursor).join("");
    if (rest) tokens.push({ text: rest });

    return { text: originalWord, tokens: tokens.length > 0 ? tokens : [{ text: originalWord }] };
  });
}

export function TajweedInlineText({
  markup,
  style,
  rtl,
  fallbackColor,
}: {
  markup: string;
  style?: StyleProp<TextStyle>;
  rtl?: boolean;
  fallbackColor?: string;
}) {
  const tokens = useMemo(() => parseTajweedMarkup(markup), [markup]);

  return (
    <Text style={[style, rtl && { writingDirection: "rtl" }]}>
      {tokens.map((token, index) => (
        <Text key={`${index}-${token.text}`} style={{ color: getTajweedColor(token.className) ?? fallbackColor }}>
          {token.text}
        </Text>
      ))}
    </Text>
  );
}

export function TajweedWordsText({
  text,
  markup,
  style,
  rtl,
  fallbackColor,
  onWordLongPress,
}: {
  text?: string;
  markup: string;
  style?: StyleProp<TextStyle>;
  rtl?: boolean;
  fallbackColor?: string;
  onWordLongPress?: (word: string) => void;
}) {
  const words = useMemo(() => text ? splitOriginalWordsWithTajweed(text, markup) : splitTajweedWords(markup), [text, markup]);

  return (
    <Text style={[style, rtl && { writingDirection: "rtl" }]}>
      {words.map((word, wordIndex) => (
        <Text
          key={`${wordIndex}-${word.text}`}
          onLongPress={onWordLongPress ? () => onWordLongPress(word.text) : undefined}
          suppressHighlighting={!onWordLongPress}
        >
          {word.tokens.map((token, tokenIndex) => (
            <Text
              key={`${wordIndex}-${tokenIndex}-${token.text}`}
              style={{ color: getTajweedColor(token.className) ?? fallbackColor }}
            >
              {token.text}
            </Text>
          ))}
          {wordIndex < words.length - 1 ? " " : ""}
        </Text>
      ))}
    </Text>
  );
}
