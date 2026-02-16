/**
 * PII Detection Module
 * Detects and redacts personally identifiable information
 */

export interface PIIResult {
  hasPII: boolean;
  detections: PIIDetection[];
  redacted: string;
  confidence: number;
}

export interface PIIDetection {
  type: PIIType;
  value: string;
  start: number;
  end: number;
  score: number;
}

export type PIIType =
  | "email"
  | "phone"
  | "ssn"
  | "credit_card"
  | "ip_address"
  | "date_of_birth"
  | "address"
  | "name"
  | "password"
  | "api_key"
  | "iban";

// PII patterns with regex and confidence scores
const PII_PATTERNS: Array<{
  type: PIIType;
  pattern: RegExp;
  score: number;
  redaction: string;
}> = [
  // Email
  {
    type: "email",
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    score: 0.95,
    redaction: "[EMAIL]",
  },
  // Phone (US formats)
  {
    type: "phone",
    pattern: /(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g,
    score: 0.85,
    redaction: "[PHONE]",
  },
  // SSN
  {
    type: "ssn",
    pattern: /\b(?!000|666|9\d{2})[0-9]{3}[-\s]?(?!00)[0-9]{2}[-\s]?(?!0000)[0-9]{4}\b/g,
    score: 0.9,
    redaction: "[SSN]",
  },
  // Credit Card (major brands)
  {
    type: "credit_card",
    pattern: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12}|(?:2131|1800|35\d{3})\d{11})\b/g,
    score: 0.88,
    redaction: "[CREDIT_CARD]",
  },
  // IP Address (IPv4)
  {
    type: "ip_address",
    pattern: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
    score: 0.95,
    redaction: "[IP]",
  },
  // Date of Birth
  {
    type: "date_of_birth",
    pattern: /\b(?:0?[1-9]|1[0-2])[\/\-](?:0?[1-9]|[12][0-9]|3[01])[\/\-](?:19|20)[0-9]{2}\b/g,
    score: 0.7,
    redaction: "[DOB]",
  },
  // API Key patterns (common formats)
  {
    type: "api_key",
    pattern: /\b(?:sk_live_|sk_test_|pk_live_|pk_test_|api_key_)[0-9a-zA-Z]{20,}\b/g,
    score: 0.98,
    redaction: "[API_KEY]",
  },
  // Password in context
  {
    type: "password",
    pattern: /(?:password|passwd|pwd|secret)[\s:=]+["']?([^\s"']{4,})["']?/gi,
    score: 0.8,
    redaction: "[PASSWORD]",
  },
  // IBAN
  {
    type: "iban",
    pattern: /\b[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[0-9]{7}(?:[A-Z0-9]?){0,16}\b/g,
    score: 0.92,
    redaction: "[IBAN]",
  },
];

/**
 * Detect PII in text
 */
export function detectPII(input: string): PIIResult {
  const detections: PIIDetection[] = [];
  
  // Run all pattern detections
  for (const { type, pattern, score, redaction } of PII_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    
    while ((match = regex.exec(input)) !== null) {
      // Skip if this overlapps with existing detection
      const isOverlap = detections.some(
        (d) => match!.index >= d.start && match!.index < d.end
      );
      
      if (!isOverlap) {
        detections.push({
          type,
          value: match[0],
          start: match.index,
          end: match.index + match[0].length,
          score,
        });
      }
    }
  }
  
  // Create redacted version
  let redacted = input;
  // Sort by position descending to avoid index shifting
  const sortedDetections = detections.sort((a, b) => b.start - a.start);
  
  for (const detection of sortedDetections) {
    const pattern = PII_PATTERNS.find((p) => p.type === detection.type);
    const replacement = pattern?.redaction ?? "[PII]";
    redacted =
      redacted.slice(0, detection.start) +
      replacement +
      redacted.slice(detection.end);
  }
  
  // Calculate overall confidence
  const avgConfidence =
    detections.length > 0
      ? detections.reduce((sum, d) => sum + d.score, 0) / detections.length
      : 0;
  
  return {
    hasPII: detections.length > 0,
    detections: detections.sort((a, b) => b.score - a.score),
    redacted,
    confidence: Math.round(avgConfidence * 100) / 100,
  };
}

/**
 * Redact PII from text (alias for detectPII)
 */
export function redactPII(input: string): string {
  return detectPII(input).redacted;
}

/**
 * Batch detect PII
 */
export function detectPIIs(inputs: string[]): PIIResult[] {
  return inputs.map(detectPII);
}
