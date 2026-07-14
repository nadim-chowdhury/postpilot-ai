import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Converts basic Markdown-like styling (***bold-italic***, **bold**, *italic*, `monospace`)
 * into Unicode Mathematical Alphanumeric Symbols so that formatting displays properly
 * on Facebook and other social platforms that don't support markdown.
 */
export function convertMarkdownToUnicode(text: string): string {
  const convert = (str: string, type: "bold" | "italic" | "bold-italic" | "mono"): string => {
    return Array.from(str)
      .map((char) => {
        const code = char.charCodeAt(0);

        // Sans-Serif Bold: A-Z (65-90), a-z (97-122), 0-9 (48-57)
        if (type === "bold") {
          if (code >= 65 && code <= 90) return String.fromCodePoint(code + 120211);
          if (code >= 97 && code <= 122) return String.fromCodePoint(code + 120205);
          if (code >= 48 && code <= 57) return String.fromCodePoint(code + 120764);
        }

        // Sans-Serif Italic: A-Z (65-90), a-z (97-122)
        if (type === "italic") {
          if (code >= 65 && code <= 90) return String.fromCodePoint(code + 120263);
          if (code >= 97 && code <= 122) return String.fromCodePoint(code + 120257);
        }

        // Sans-Serif Bold Italic: A-Z (65-90), a-z (97-122)
        if (type === "bold-italic") {
          if (code >= 65 && code <= 90) return String.fromCodePoint(code + 120315);
          if (code >= 97 && code <= 122) return String.fromCodePoint(code + 120309);
        }

        // Monospace: A-Z (65-90), a-z (97-122), 0-9 (48-57)
        if (type === "mono") {
          if (code >= 65 && code <= 90) return String.fromCodePoint(code + 120367);
          if (code >= 97 && code <= 122) return String.fromCodePoint(code + 120361);
          if (code >= 48 && code <= 57) return String.fromCodePoint(code + 120774);
        }

        return char;
      })
      .join("");
  };

  let formatted = text;

  // 1. Bold Italic (***text*** or ___text___)
  formatted = formatted.replace(/\*\*\*([^*]+?)\*\*\*/g, (_, p1) => convert(p1, "bold-italic"));
  formatted = formatted.replace(/___([^_]+?)___/g, (_, p1) => convert(p1, "bold-italic"));

  // 2. Bold (**text** or __text__)
  formatted = formatted.replace(/\*\*([^*]+?)\*\*/g, (_, p1) => convert(p1, "bold"));
  formatted = formatted.replace(/__([^_]+?)__/g, (_, p1) => convert(p1, "bold"));

  // 3. Italic (*text* or _text_)
  formatted = formatted.replace(/\*([^*]+?)\*/g, (_, p1) => convert(p1, "italic"));
  formatted = formatted.replace(/_([^_]+?)_/g, (_, p1) => convert(p1, "italic"));

  // 4. Monospace (`text`)
  formatted = formatted.replace(/`([^`]+?)`/g, (_, p1) => convert(p1, "mono"));

  return formatted;
}

