/**
 * Smart commercial-intent detection for Instafarm captions.
 *
 * Uses a lightweight scoring system:
 *   +2  price pattern ($5, €10, 5.00)
 *   +1  sales phrase ("for sale", "DM to order", …)
 *   +1  urgency phrase ("limited stock", "only X left", …)
 *   +1  quantity mention ("5 kg available", "boxes of", …)
 *
 * Intent classification:
 *   score 0     → "informational" (safe)
 *   score 1     → "storytelling"  (safe)
 *   score 2     → "soft_commercial" (show soft warning)
 *   score ≥ 3   → "commercial"     (hard block without product link)
 */

// ── pattern groups ──────────────────────────────────────────────────

const PRICE_PATTERNS = [
  /[$€£]\s*\d+/i,
  /\d+\s*[$€£]/i,
  /\d+\.\d{2}/,
  /\d+\s*(?:per|each|\/)\s*/i,
];

const SALES_PHRASES = [
  /\bfor\s+sale\b/i,
  /\bDM\s+(?:to|for)\s+order/i,
  /\bmessage\s+me\b/i,
  /\bcontact\s+me\b/i,
  /\binbox\s+me\b/i,
  /\bready\s+for\s+delivery\b/i,
  /\bavailable\s+now\b/i,
  /\border\s+now\b/i,
  /\bbuy\s+now\b/i,
  /\bplace\s+(?:your\s+)?order/i,
  /\bwhatsapp\s+me\b/i,
  /\bcall\s+(?:to\s+)?order/i,
  /\bpre-?order/i,
];

const URGENCY_PHRASES = [
  /\blimited\s+stock\b/i,
  /\bonly\s+\d+\s+left\b/i,
  /\bselling\s+fast\b/i,
  /\bwhile\s+(?:stocks?|supplies?)\s+last/i,
  /\blast\s+(?:few|chance)\b/i,
  /\bhurry\b/i,
  /\bfirst\s+come\b/i,
  /\bdon'?t\s+miss\b/i,
  /\bgoing\s+fast\b/i,
];

const QUANTITY_PATTERNS = [
  /\d+\s*(?:kg|lb|lbs|g|oz|liters?|pcs|pieces?|boxes?|bags?|crates?|dozen|packs?|bundles?|trays?)\b/i,
  /\bboxes?\s+of\b/i,
  /\bpacks?\s+of\b/i,
];

// ── scoring ─────────────────────────────────────────────────────────

export type CaptionIntent =
  | "informational"
  | "storytelling"
  | "soft_commercial"
  | "commercial";

export interface CaptionAnalysis {
  score: number;
  intent: CaptionIntent;
  reasons: string[];
}

function matchAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

export function analyzeCaption(caption: string): CaptionAnalysis {
  if (!caption || !caption.trim()) {
    return { score: 0, intent: "informational", reasons: [] };
  }

  let score = 0;
  const reasons: string[] = [];

  // Price patterns (+2)
  if (matchAny(caption, PRICE_PATTERNS)) {
    score += 2;
    reasons.push("price");
  }

  // Sales phrases (+1)
  if (matchAny(caption, SALES_PHRASES)) {
    score += 1;
    reasons.push("sales_phrase");
  }

  // Urgency phrases (+1)
  if (matchAny(caption, URGENCY_PHRASES)) {
    score += 1;
    reasons.push("urgency");
  }

  // Quantity mentions (+1)
  if (matchAny(caption, QUANTITY_PATTERNS)) {
    score += 1;
    reasons.push("quantity");
  }

  let intent: CaptionIntent;
  if (score === 0) intent = "informational";
  else if (score === 1) intent = "storytelling";
  else if (score === 2) intent = "soft_commercial";
  else intent = "commercial";

  return { score, intent, reasons };
}

/** Human-friendly message for a given intent */
export function getIntentMessage(intent: CaptionIntent): {
  title: string;
  description: string;
  severity: "info" | "warning" | "error";
} | null {
  switch (intent) {
    case "soft_commercial":
      return {
        title: "Looks like you're promoting a product",
        description:
          "To sell or promote items, please link a product listing. This helps customers find and buy your products.",
        severity: "warning",
      };
    case "commercial":
      return {
        title: "Product link required",
        description:
          "Your caption contains selling language. To promote or sell a product, you must link a product listing.",
        severity: "error",
      };
    default:
      return null;
  }
}
