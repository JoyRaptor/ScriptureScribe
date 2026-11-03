export type EmbedStyle = "link" | "tooltip" | "quote";
export type CardTrigger = "always" | "shift" | "ctrl";
export type TooltipStyle = "auto" | "hover" | "bottom-sheet";
export type InterlinearDisplay = "auto" | "modal" | "inline";
export type InterlinearLanguage = "both" | "greek" | "hebrew";
export type CardShowTranslit = boolean;
export type CardShowEnglish = boolean;
export type ReferenceClickBehavior = "panel" | "tooltip" | "both";
export type PanelSide = "right" | "left";
export type CrossRefShowLess = 3 | 5;
export type CitationFormat = "apa" | "chicago" | "turabian" | "mla" | "plain";
export type VOTDAlgorithm = "deterministic" | "random";
export type MorphUIMode = "simple" | "advanced";

export interface ScriptureScribeSettings {
  primaryTranslation: string;
  offlineFallback: boolean;
  favoriteTranslations: string[];
  hoverSettings: {
    showVersionToggle: boolean;
    showEmbedOptions: boolean;
    triggerDelayMs: number;
  };
  embedding: {
    defaultStyle: EmbedStyle;
    autoInsertCitation: boolean;
    includeVersionBadge: boolean;
  };
  display: {
    tooltipStyle: TooltipStyle;
    interlinearDisplay: InterlinearDisplay;
    interlinearLanguage: InterlinearLanguage;
    cardShowTranslit: boolean;
    cardShowEnglish: boolean;
    cardShowStrongs: boolean;
    /** What happens when a highlighted reference is hovered/clicked */
    referenceClickBehavior: ReferenceClickBehavior;
    /**
     * Color each book of the Bible with its genre accent color.
     * When false, the UI always uses the default purple palette.
     */
    useBookColors: boolean;
    /**
     * Card Mode: hovering a reference fades in a full-screen verse card
     * instead of the tooltip (for screen-recording videos).
     */
    cardMode: boolean;
    /** Skin file name in the plugin's skins/ folder; "" = built-in */
    cardSkin: string;
    /** When Card Mode is on: always show cards, or only while holding a key */
    cardTrigger: CardTrigger;
    /** Hide the mouse pointer while a card is showing */
    cardHideCursor: boolean;
  };
  readingPanel: {
    /** Side the panel was last docked on — persisted so it re-opens there */
    lastSide: PanelSide;
  };
  crossRefs: {
    /** How many refs to show collapsed. User-adjustable from the panel. */
    showLessCount: CrossRefShowLess;
    /** Whether the cross-ref list is currently expanded (show all) */
    expanded: boolean;
  };
  apiKeys: {
    bibleGateway: string;
  };
  excludedFolders: string[];
  vaultScan: {
    /** Mirror the global excludedFolders list when scanning notes */
    useGlobalExclusions: boolean;
    /** Additional folders to exclude only from the vault scan */
    additionalExclusions: string[];
  };
  vaultHighlight: {
    /** Background opacity of vault highlights, 0-100 */
    opacity: number;
    /** Text color on highlighted verses: dark, light, or auto (follows Obsidian theme) */
    textColor: "dark" | "light" | "auto";
  };
  bibleText: {
    /** Font size in px for Bible reader text */
    fontSize: number;
    /** Font family key */
    fontFamily: string;
  };
  verseOfTheDay: {
    /** Show a curated verse when the panel opens with no reference loaded */
    enabled: boolean;
    /** "deterministic" = same verse for all users on same day (default) */
    algorithm: VOTDAlgorithm;
    /** Automatically show on panel open */
    showOnStartup: boolean;
  };
  citation: {
    /** Default citation format for "Copy as Citation" */
    format: CitationFormat;
    /** Include the translation name/abbreviation in citations */
    includeVersion: boolean;
  };
  morphology: {
    /** Show morphology information on interlinear word cards */
    enabled: boolean;
    /** simple = plain-English labels; advanced = raw codes + search chips */
    uiMode: MorphUIMode;
    /** Surface exegetical teaching notes for significant constructions */
    showTeachingNotes: boolean;
  };
}

export const DEFAULT_SETTINGS: ScriptureScribeSettings = {
  primaryTranslation: "KJV",
  offlineFallback: true,
  favoriteTranslations: ["KJV", "LXX", "ESV", "NIV", "NASB", "NKJV"],
  hoverSettings: {
    showVersionToggle: true,
    showEmbedOptions: true,
    triggerDelayMs: 300,
  },
  embedding: {
    defaultStyle: "quote",
    autoInsertCitation: true,
    includeVersionBadge: true,
  },
  display: {
    tooltipStyle: "auto",
    interlinearDisplay: "auto",
    interlinearLanguage: "both",
    cardShowTranslit: true,
    cardShowEnglish: true,
    cardShowStrongs: true,
    referenceClickBehavior: "both",
    useBookColors: true,
    cardMode: false,
    cardSkin: "",
    cardTrigger: "always",
    cardHideCursor: true,
  },
  readingPanel: {
    lastSide: "right",
  },
  crossRefs: {
    showLessCount: 3,
    expanded: false,
  },
  apiKeys: {
    bibleGateway: "",
  },
  excludedFolders: [],
  vaultScan: {
    useGlobalExclusions: true,
    additionalExclusions: [],
  },
  vaultHighlight: {
    opacity:   88,
    textColor: "auto",
  },
  bibleText: {
    fontSize:   15,
    fontFamily: "default",
  },
  verseOfTheDay: {
    enabled:       true,
    algorithm:     "deterministic",
    showOnStartup: true,
  },
  citation: {
    format:         "plain",
    includeVersion: true,
  },
  morphology: {
    enabled:          true,
    uiMode:           "simple",
    showTeachingNotes:true,
  },
};

export const VERSION_CODES: Record<string, string> = {
  KJV: "KJV", LXX: "LXX", ESV: "ESV", NIV: "NIV", NASB: "NASB1995",
  NKJV: "NKJV", NLT: "NLT", CSB: "CSB", AMP: "AMP", MSG: "MSG", NRSV: "NRSV",
};

