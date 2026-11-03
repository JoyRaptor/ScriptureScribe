/**
 * morphParser.ts — Compositional Grammar Parser
 *
 * Transforms raw biblical morphology codes (e.g. V-PAI3S, Vqw3ms)
 * into human-readable technical and plain-English descriptions.
 */

export interface MorphComponent {
  tech: string;
  plain: string;
}

export interface ParsedMorph {
  raw: string;
  language: "greek" | "hebrew";
  components: MorphComponent[];
  techLine: string;
  plainLine: string;
  isSignificant: boolean;
  note?: string;
}

// ── Greek Components (TAGNT / Robinson Format) ───────────────────────────────

const GR_FUNCTION: Record<string, MorphComponent> = {
  "V":    { tech: "Verb",        plain: "action word" },
  "N":    { tech: "Noun",        plain: "person/place/thing" },
  "A":    { tech: "Adjective",   plain: "describing word" },
  "ADV":  { tech: "Adverb",      plain: "describes how/when" },
  "PREP": { tech: "Preposition", plain: "relationship (in/with/by)" },
  "CONJ": { tech: "Conjunction", plain: "connecting word (and/but)" },
  "T":    { tech: "Article",     plain: "the" },
  "P":    { tech: "Pronoun",     plain: "proxy (he/she/it/they)" },
  "I":    { tech: "Interjection",plain: "expression" },
  "X":    { tech: "Particle",    plain: "grammatical marker" },
};

const GR_TENSE: Record<string, MorphComponent> = {
  "P":  { tech: "Present",   plain: "ongoing action" },
  "I":  { tech: "Imperfect", plain: "ongoing action in the past" },
  "F":  { tech: "Future",    plain: "action yet to happen" },
  "A":  { tech: "Aorist",    plain: "completed action (snapshot)" },
  "R":  { tech: "Perfect",   plain: "completed with ongoing effect" },
  "L":  { tech: "Pluperfect",plain: "had already been completed" },
};

const GR_VOICE: Record<string, MorphComponent> = {
  "A": { tech: "Active",  plain: "subject does the action" },
  "M": { tech: "Middle",  plain: "subject acts on/for self" },
  "P": { tech: "Passive", plain: "subject receives the action" },
  "D": { tech: "Deponent",plain: "passive form, active meaning" },
};

const GR_MOOD: Record<string, MorphComponent> = {
  "I": { tech: "Indicative",  plain: "stated as fact" },
  "S": { tech: "Subjunctive", plain: "possibility/purpose" },
  "O": { tech: "Optative",    plain: "wish/remote possibility" },
  "M": { tech: "Imperative",  plain: "command" },
  "N": { tech: "Infinitive",  plain: "to [act]" },
  "P": { tech: "Participle",  plain: "action used as description" },
};

const GR_CASE: Record<string, MorphComponent> = {
  "N": { tech: "Nominative",  plain: "subject" },
  "G": { tech: "Genitive",    plain: "possessive (of/from)" },
  "D": { tech: "Dative",      plain: "indirect object (to/for/by)" },
  "A": { tech: "Accusative",  plain: "direct object" },
  "V": { tech: "Vocative",    plain: "direct address" },
};

const GR_PERSON: Record<string, MorphComponent> = {
  "1": { tech: "1st Person", plain: "I/we" },
  "2": { tech: "2nd Person", plain: "you" },
  "3": { tech: "3rd Person", plain: "he/she/it/they" },
};

const GR_NUMBER: Record<string, MorphComponent> = {
  "S": { tech: "Singular", plain: "one" },
  "P": { tech: "Plural",   plain: "many" },
};

const GR_GENDER: Record<string, MorphComponent> = {
  "M": { tech: "Masculine", plain: "masc." },
  "F": { tech: "Feminine",  plain: "fem." },
  "N": { tech: "Neuter",    plain: "neut." },
};

// ── Hebrew Components (TAHOT / WLC Format) ───────────────────────────────────

const HB_POS: Record<string, MorphComponent> = {
  "V": { tech: "Verb",        plain: "action word" },
  "N": { tech: "Noun",        plain: "person/place/thing" },
  "A": { tech: "Adjective",   plain: "describing word" },
  "P": { tech: "Pronoun",     plain: "proxy (he/she/it)" },
  "R": { tech: "Preposition", plain: "relationship" },
  "C": { tech: "Conjunction", plain: "connecting word" },
  "T": { tech: "Particle",    plain: "marker" },
  "D": { tech: "Adverb",      plain: "describes action" },
};

const HB_STEM: Record<string, MorphComponent> = {
  "q": { tech: "Qal",      plain: "simple action" },
  "N": { tech: "Niphal",   plain: "simple passive/reflexive" },
  "p": { tech: "Piel",     plain: "intensive action" },
  "P": { tech: "Pual",     plain: "intensive passive" },
  "h": { tech: "Hiphil",   plain: "causing action" },
  "H": { tech: "Hophal",   plain: "caused action (passive)" },
  "t": { tech: "Hithpael", plain: "intensive reflexive" },
};

const HB_ASPECT: Record<string, MorphComponent> = {
  "p": { tech: "Perfect",         plain: "completed action" },
  "i": { tech: "Imperfect",       plain: "ongoing/future action" },
  "w": { tech: "Waw-consecutive", plain: "sequential (narrative)" },
  "j": { tech: "Jussive",         plain: "wish/command" },
  "v": { tech: "Imperative",      plain: "command" },
  "r": { tech: "Inf. Construct",  plain: "to [act]" },
  "s": { tech: "Inf. Absolute",   plain: "absolute/emphatic" },
  "a": { tech: "Part. Active",    plain: "one doing the action" },
  "o": { tech: "Part. Passive",   plain: "one receiving it" },
};

// ── Exegetical Teaching Notes ────────────────────────────────────────────────

const TEACHING_NOTES: Array<{ match: RegExp; note: string }> = [
  {
    match: /Verb.*Perfect.*Active.*Indicative/,
    note: "Perfect tense: the action is complete, but its effects continue into the present.",
  },
  {
    match: /Verb.*Imperfect/,
    note: "Imperfect tense: an ongoing action in the past — something that was continually happening.",
  },
  {
    match: /Verb.*Aorist.*Passive/,
    note: "Aorist Passive: the subject received a completed action — often used for divine intervention.",
  },
  {
    match: /Verb.*Present.*Active.*Indicative/,
    note: "Present Indicative: ongoing, continuous action — something happening right now, repeatedly.",
  },
  {
    match: /Verb.*Imperative/i,
    note: "Imperative mood: a command or urgent request.",
  },
  {
    match: /Hiphil/,
    note: "Hiphil stem: causative — the subject is making or causing something else to happen.",
  },
  {
    match: /Waw-consecutive/,
    note: "Waw-consecutive: sequential narrative — 'and then...' drives the story forward.",
  },
];

// ── Parser Logic ─────────────────────────────────────────────────────────────

export function parseMorph(code: string): ParsedMorph | null {
  if (!code) return null;

  // Determine language (crude check: Hebrew starts with lowercase/single capital + stem)
  // TAGNT: V-AAI3S, N-NSF
  // TAHOT: Vqw3ms, Ncmsa
  const isGreek = code.includes("-") || code.match(/^[A-Z][A-Z\d]/);

  return isGreek ? parseGreek(code) : parseHebrew(code);
}

function parseGreek(code: string): ParsedMorph {
  const parts = code.split("-");
  const base  = parts[Part.Func] || "";
  const morph = parts[Part.Morph] || "";

  const components: MorphComponent[] = [];
  
  // 1. Function
  if (GR_FUNCTION[base]) components.push(GR_FUNCTION[base]);

  if (base === "V") {
    // Verb: Tense Voice Mood Person Number
    // Example: PAI3S
    if (morph[0] && GR_TENSE[morph[0]])  components.push(GR_TENSE[morph[0]]);
    if (morph[1] && GR_VOICE[morph[1]])  components.push(GR_VOICE[morph[1]]);
    if (morph[2] && GR_MOOD[morph[2]])   components.push(GR_MOOD[morph[2]]);
    if (morph[3] && GR_PERSON[morph[3]]) components.push(GR_PERSON[morph[3]]);
    if (morph[4] && GR_NUMBER[morph[4]]) components.push(GR_NUMBER[morph[4]]);
  } else if (["N","A","P","T"].includes(base)) {
    // Noun/Adj/etc: Case Number Gender
    // Example: NSF
    if (morph[0] && GR_CASE[morph[0]])   components.push(GR_CASE[morph[0]]);
    if (morph[1] && GR_NUMBER[morph[1]]) components.push(GR_NUMBER[morph[1]]);
    if (morph[2] && GR_GENDER[morph[2]]) components.push(GR_GENDER[morph[2]]);
  }

  const techLine  = components.map(c => c.tech).join(" \u00B7 ");
  const plainLine = components.map(c => c.plain).join(" \u00B7 ");

  const note = TEACHING_NOTES.find(n => n.match.test(techLine))?.note;

  return {
    raw: code,
    language: "greek",
    components,
    techLine,
    plainLine,
    isSignificant: !!note,
    note
  };
}

function parseHebrew(code: string): ParsedMorph {
  const components: MorphComponent[] = [];
  
  // Pos 0: POS
  const pos = code[0];
  if (HB_POS[pos]) components.push(HB_POS[pos]);

  if (pos === "V") {
    // Verb: Stem Aspect Person Gender Number
    // Example: Vqw3ms
    if (code[1] && HB_STEM[code[1]])   components.push(HB_STEM[code[1]]);
    if (code[2] && HB_ASPECT[code[2]]) components.push(HB_ASPECT[code[2]]);
    if (code[3] && GR_PERSON[code[3]]) components.push(GR_PERSON[code[3]]); // reusing Greek Person
    if (code[4] && GR_GENDER[code[4]]) components.push(GR_GENDER[code[4]]); // reusing Greek Gender
    if (code[5] && GR_NUMBER[code[5]]) components.push(GR_NUMBER[code[5]]); // reusing Greek Number
  } else {
    // Noun etc: Gender Number State
    if (code[1] && GR_GENDER[code[1]]) components.push(GR_GENDER[code[1]]);
    if (code[2] && GR_NUMBER[code[2]]) components.push(GR_NUMBER[code[2]]);
  }

  const techLine  = components.map(c => c.tech).join(" \u00B7 ");
  const plainLine = components.map(c => c.plain).join(" \u00B7 ");

  const note = TEACHING_NOTES.find(n => n.match.test(techLine))?.note;

  return {
    raw: code,
    language: "hebrew",
    components,
    techLine,
    plainLine,
    isSignificant: !!note,
    note
  };
}

enum Part { Func = 0, Morph = 1 }
