/**
 * Jailbreak Detection Module
 * Detects prompt injection attempts and malicious inputs
 */

export interface JailbreakResult {
  isJailbreak: boolean;
  confidence: number;
  detections: Detection[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface Detection {
  type: 'pattern' | 'heuristic';
  name: string;
  score: number;
}

// Common jailbreak patterns
const JAILBREAK_PATTERNS = [
  // DAN (Do Anything Now) variants
  { pattern: /\b(DAN|do anything now)\b/gi, name: 'DAN Pattern', score: 0.9 },
  
  // Role-playing jailbreaks
  { pattern: /(pretend to be|act as if you are|roleplay as|you are now)/gi, name: 'Roleplay', score: 0.7 },
  
  // Prompt injection
  { pattern: /(ignore (all )?(previous|above)|disregard (your )?(instructions|rules)|forget (your )?guidelines)/gi, name: 'Prompt Injection', score: 0.85 },
  
  // System prompt extraction
  { pattern: /(repeat (your )?(system |initial )?prompt|show me (your )?(system |initial )?instructions|tell me (your )?(system |initial )?prompt)/gi, name: 'System Prompt Extraction', score: 0.95 },
  
  // Jailbreak keywords
  { pattern: /\b(jailbreak|bypass|override|unrestricted|no limits)\b/gi, name: 'Jailbreak Keyword', score: 0.6 },
  
  // Creator/manufacturer manipulation
  { pattern: /(your (creator|developer|manufacturer)|OpenAI|Anthropic) (said|told|asked)/gi, name: 'Authority Claim', score: 0.5 },
  
  //越狱 (jailbreak in Chinese)
  { pattern: /越狱/gi, name: 'Chinese Jailbreak', score: 0.8 },
  
  // Leet speak variations
  { pattern: /(\$|5|@|!|\^|\&|\*)[a-z]+/gi, name: 'Leet Speak', score: 0.4 },
];

// Heuristic rules
const HEURISTICS = [
  // Excessive caps (flag if >40% caps in suspicious context)
  { 
    check: (text: string) => {
      const letters = text.replace(/[^a-zA-Z]/g, '');
      if (letters.length < 10) return false;
      const caps = letters.replace(/[^A-Z]/g, '').length;
      return caps / letters.length > 0.4 && /[A-Z]{5,}/.test(text);
    },
    name: 'Excessive Capitalization',
    score: 0.6
  },
  
  // Repeated characters (char@cter@tion)
  {
    check: (text: string) => /[a-zA-Z](\W*[a-zA-Z]\W*){3,}[a-zA-Z]/.test(text) && /(.)\1{2,}/.test(text),
    name: 'Character Repetition',
    score: 0.5
  },
  
  // Base64-like strings
  {
    check: (text: string) => /^[A-Za-z0-9+/=]{20,}$/.test(text.replace(/\s/g, '')),
    name: 'Base64 Encoded',
    score: 0.7
  },
  
  // Suspicious URL encoding
  {
    check: (text: string) => /%[0-9A-Fa-f]{2}/.test(text) && /(<script|javascript:|on\w+=)/i.test(decodeURIComponent(text)),
    name: 'Encoded Injection',
    score: 0.8
  },
  
  // Token manipulation attempts
  {
    check: (text: string) => {
      const words = text.split(/\s+/);
      const shortTokens = words.filter(w => w.length <= 2 && /[a-zA-Z]/.test(w)).length;
      return shortTokens / words.length > 0.3 && words.length > 20;
    },
    name: 'Token Splitting',
    score: 0.5
  },
];

/**
 * Detect if input contains jailbreak attempts
 */
export function detectJailbreak(input: string): JailbreakResult {
  const detections: Detection[] = [];
  let totalScore = 0;
  
  // Pattern-based detection
  for (const { pattern, name, score } of JAILBREAK_PATTERNS) {
    const matches = input.match(pattern);
    if (matches && matches.length > 0) {
      detections.push({
        type: 'pattern',
        name,
        score: score * Math.min(matches.length / 2, 1), // Cap contribution
      });
      totalScore += score;
    }
  }
  
  // Heuristic analysis
  for (const { check, name, score } of HEURISTICS) {
    if (check(input)) {
      detections.push({
        type: 'heuristic',
        name,
        score,
      });
      totalScore += score;
    }
  }
  
  // Calculate confidence (0-1)
  const confidence = Math.min(totalScore / 2, 1);
  
  // Determine severity
  let severity: JailbreakResult['severity'] = 'low';
  if (confidence > 0.8) severity = 'critical';
  else if (confidence > 0.6) severity = 'high';
  else if (confidence > 0.3) severity = 'medium';
  
  const isJailbreak = confidence >= 0.3;
  
  return {
    isJailbreak,
    confidence: Math.round(confidence * 100) / 100,
    detections: detections.sort((a, b) => b.score - a.score),
    severity,
  };
}

/**
 * Batch detect jailbreak attempts
 */
export function detectJailbreaks(inputs: string[]): JailbreakResult[] {
  return inputs.map(detectJailbreak);
}
