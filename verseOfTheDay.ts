/**
 * verseOfTheDay.ts
 *
 * Deterministic Verse of the Day — same verse for every user on the same
 * calendar day, no network required. Algorithm: dayOfYear % pool.length.
 *
 * The pool covers all 365 days and spans the full canon — Law, History,
 * Wisdom, Prophecy, Gospels, Epistles, Apocalyptic. Curated for theological
 * weight and memorability, not novelty.
 */

export interface VOTDEntry {
  book: string;
  chapter: number;
  verse: number;
  /** Short thematic tag shown in the UI badge */
  tag: string;
}

// ── Curated pool (365 entries) ────────────────────────────────────────────────

const VOTD_POOL: VOTDEntry[] = [
  // January — New Beginnings
  { book: "Genesis",      chapter: 1,  verse: 1,  tag: "Creation" },
  { book: "John",         chapter: 1,  verse: 1,  tag: "The Word" },
  { book: "Isaiah",       chapter: 43, verse: 19, tag: "Renewal" },
  { book: "Lamentations", chapter: 3,  verse: 23, tag: "Mercy" },
  { book: "Romans",       chapter: 12, verse: 2,  tag: "Transform" },
  { book: "Philippians",  chapter: 4,  verse: 13, tag: "Strength" },
  { book: "Jeremiah",     chapter: 29, verse: 11, tag: "Hope" },
  { book: "Proverbs",     chapter: 3,  verse: 5,  tag: "Trust" },
  { book: "Psalm",        chapter: 23, verse: 1,  tag: "Shepherd" },
  { book: "Matthew",      chapter: 11, verse: 28, tag: "Rest" },
  // Faith & Trust
  { book: "Hebrews",      chapter: 11, verse: 1,  tag: "Faith" },
  { book: "Romans",       chapter: 1,  verse: 17, tag: "Righteousness" },
  { book: "Galatians",    chapter: 2,  verse: 20, tag: "Life in Christ" },
  { book: "Isaiah",       chapter: 40, verse: 31, tag: "Renewal" },
  { book: "Proverbs",     chapter: 3,  verse: 6,  tag: "Guidance" },
  { book: "2 Corinthians",chapter: 5,  verse: 7,  tag: "Faith" },
  { book: "James",        chapter: 1,  verse: 3,  tag: "Perseverance" },
  { book: "Romans",       chapter: 8,  verse: 28, tag: "Providence" },
  { book: "Matthew",      chapter: 17, verse: 20, tag: "Faith" },
  { book: "Mark",         chapter: 9,  verse: 23, tag: "Belief" },
  // Love & Grace
  { book: "John",         chapter: 3,  verse: 16, tag: "Grace" },
  { book: "Romans",       chapter: 5,  verse: 8,  tag: "Love" },
  { book: "1 John",       chapter: 4,  verse: 8,  tag: "God is Love" },
  { book: "1 Corinthians",chapter: 13, verse: 4,  tag: "Love" },
  { book: "Ephesians",    chapter: 2,  verse: 8,  tag: "Grace" },
  { book: "John",         chapter: 15, verse: 13, tag: "Sacrifice" },
  { book: "1 John",       chapter: 4,  verse: 19, tag: "Love" },
  { book: "Romans",       chapter: 8,  verse: 38, tag: "Love" },
  { book: "Zephaniah",    chapter: 3,  verse: 17, tag: "Delight" },
  { book: "Psalm",        chapter: 136,verse: 1,  tag: "Steadfast Love" },
  // Salvation & Redemption
  { book: "Romans",       chapter: 3,  verse: 23, tag: "Sin" },
  { book: "Romans",       chapter: 6,  verse: 23, tag: "Gift" },
  { book: "Acts",         chapter: 4,  verse: 12, tag: "Salvation" },
  { book: "John",         chapter: 14, verse: 6,  tag: "The Way" },
  { book: "Isaiah",       chapter: 53, verse: 5,  tag: "Atonement" },
  { book: "Titus",        chapter: 3,  verse: 5,  tag: "Mercy" },
  { book: "1 Timothy",    chapter: 1,  verse: 15, tag: "Sinners" },
  { book: "Luke",         chapter: 19, verse: 10, tag: "Lost & Found" },
  { book: "2 Corinthians",chapter: 5,  verse: 21, tag: "Imputation" },
  { book: "Colossians",   chapter: 1,  verse: 14, tag: "Redemption" },
  // Prayer & Worship
  { book: "Philippians",  chapter: 4,  verse: 6,  tag: "Prayer" },
  { book: "1 Thessalonians",chapter:5, verse: 17, tag: "Prayer" },
  { book: "Psalm",        chapter: 100,verse: 4,  tag: "Worship" },
  { book: "Matthew",      chapter: 6,  verse: 9,  tag: "Lord's Prayer" },
  { book: "James",        chapter: 5,  verse: 16, tag: "Prayer" },
  { book: "Psalm",        chapter: 46, verse: 10, tag: "Stillness" },
  { book: "Psalm",        chapter: 19, verse: 14, tag: "Meditation" },
  { book: "Daniel",       chapter: 6,  verse: 10, tag: "Prayer" },
  { book: "Romans",       chapter: 8,  verse: 26, tag: "Spirit" },
  { book: "1 John",       chapter: 5,  verse: 14, tag: "Prayer" },
  // Wisdom & Knowledge
  { book: "Proverbs",     chapter: 1,  verse: 7,  tag: "Wisdom" },
  { book: "Proverbs",     chapter: 9,  verse: 10, tag: "Wisdom" },
  { book: "James",        chapter: 1,  verse: 5,  tag: "Wisdom" },
  { book: "Colossians",   chapter: 2,  verse: 3,  tag: "Hidden Wisdom" },
  { book: "Isaiah",       chapter: 55, verse: 9,  tag: "God's Thoughts" },
  { book: "Proverbs",     chapter: 4,  verse: 7,  tag: "Wisdom" },
  { book: "Ecclesiastes", chapter: 12, verse: 13, tag: "Fear of God" },
  { book: "Romans",       chapter: 11, verse: 33, tag: "Unsearchable" },
  { book: "1 Corinthians",chapter: 1,  verse: 25, tag: "Foolishness" },
  { book: "Psalm",        chapter: 119,verse: 105,tag: "Word as Light" },
  // Courage & Strength
  { book: "Joshua",       chapter: 1,  verse: 9,  tag: "Courage" },
  { book: "Isaiah",       chapter: 41, verse: 10, tag: "Strength" },
  { book: "2 Timothy",    chapter: 1,  verse: 7,  tag: "Power" },
  { book: "Deuteronomy",  chapter: 31, verse: 6,  tag: "Courage" },
  { book: "Psalm",        chapter: 27, verse: 1,  tag: "Courage" },
  { book: "Romans",       chapter: 8,  verse: 31, tag: "God For Us" },
  { book: "Ephesians",    chapter: 6,  verse: 11, tag: "Armor of God" },
  { book: "1 Corinthians",chapter: 16, verse: 13, tag: "Stand Firm" },
  { book: "Habakkuk",     chapter: 3,  verse: 19, tag: "Deer's Feet" },
  { book: "Nehemiah",     chapter: 8,  verse: 10, tag: "Joy" },
  // Peace & Rest
  { book: "John",         chapter: 14, verse: 27, tag: "Peace" },
  { book: "Philippians",  chapter: 4,  verse: 7,  tag: "Peace" },
  { book: "Isaiah",       chapter: 26, verse: 3,  tag: "Perfect Peace" },
  { book: "Psalm",        chapter: 4,  verse: 8,  tag: "Rest" },
  { book: "Matthew",      chapter: 11, verse: 29, tag: "Rest" },
  { book: "Numbers",      chapter: 6,  verse: 26, tag: "Peace" },
  { book: "Colossians",   chapter: 3,  verse: 15, tag: "Peace" },
  { book: "Romans",       chapter: 15, verse: 13, tag: "Hope & Peace" },
  { book: "2 Thessalonians",chapter:3, verse: 16, tag: "Peace" },
  { book: "Psalm",        chapter: 29, verse: 11, tag: "Strength" },
  // Obedience & Holiness
  { book: "John",         chapter: 14, verse: 15, tag: "Obedience" },
  { book: "1 Peter",      chapter: 1,  verse: 16, tag: "Holiness" },
  { book: "Micah",        chapter: 6,  verse: 8,  tag: "Justice" },
  { book: "Deuteronomy",  chapter: 6,  verse: 5,  tag: "Love God" },
  { book: "Matthew",      chapter: 22, verse: 37, tag: "Greatest Cmd" },
  { book: "Romans",       chapter: 12, verse: 1,  tag: "Living Sacrifice" },
  { book: "1 John",       chapter: 2,  verse: 6,  tag: "Walk as Jesus" },
  { book: "Psalm",        chapter: 119,verse: 9,  tag: "Purity" },
  { book: "Galatians",    chapter: 5,  verse: 22, tag: "Fruit of Spirit" },
  { book: "2 Chronicles", chapter: 7,  verse: 14, tag: "Humility" },
  // Scripture & Word
  { book: "2 Timothy",    chapter: 3,  verse: 16, tag: "Scripture" },
  { book: "Hebrews",      chapter: 4,  verse: 12, tag: "Living Word" },
  { book: "Psalm",        chapter: 119,verse: 11, tag: "Word in Heart" },
  { book: "Isaiah",       chapter: 55, verse: 11, tag: "Word Accomplishes" },
  { book: "Matthew",      chapter: 24, verse: 35, tag: "Eternal Word" },
  { book: "Deuteronomy",  chapter: 8,  verse: 3,  tag: "Bread of Life" },
  { book: "John",         chapter: 17, verse: 17, tag: "Truth" },
  { book: "Romans",       chapter: 10, verse: 17, tag: "Faith from Hearing" },
  { book: "Colossians",   chapter: 3,  verse: 16, tag: "Word Richly" },
  { book: "1 Peter",      chapter: 2,  verse: 2,  tag: "Milk of Word" },
  // Community & Church
  { book: "Acts",         chapter: 2,  verse: 42, tag: "Early Church" },
  { book: "Hebrews",      chapter: 10, verse: 25, tag: "Fellowship" },
  { book: "Matthew",      chapter: 18, verse: 20, tag: "Gathered" },
  { book: "Galatians",    chapter: 6,  verse: 2,  tag: "Bear Burdens" },
  { book: "Romans",       chapter: 12, verse: 5,  tag: "One Body" },
  { book: "1 Corinthians",chapter: 12, verse: 12, tag: "Body of Christ" },
  { book: "Colossians",   chapter: 3,  verse: 13, tag: "Forgiveness" },
  { book: "Ephesians",    chapter: 4,  verse: 3,  tag: "Unity" },
  { book: "John",         chapter: 13, verse: 35, tag: "Love One Another" },
  { book: "Acts",         chapter: 1,  verse: 8,  tag: "Witnesses" },
  // Mission & Work
  { book: "Matthew",      chapter: 28, verse: 19, tag: "Commission" },
  { book: "Romans",       chapter: 10, verse: 15, tag: "Beautiful Feet" },
  { book: "Isaiah",       chapter: 6,  verse: 8,  tag: "Send Me" },
  { book: "2 Corinthians",chapter: 5,  verse: 20, tag: "Ambassadors" },
  { book: "Colossians",   chapter: 3,  verse: 17, tag: "All for God" },
  { book: "1 Corinthians",chapter: 10, verse: 31, tag: "Glory of God" },
  { book: "Proverbs",     chapter: 16, verse: 3,  tag: "Commit Work" },
  { book: "Ephesians",    chapter: 2,  verse: 10, tag: "Good Works" },
  { book: "John",         chapter: 15, verse: 5,  tag: "Fruit" },
  { book: "Mark",         chapter: 16, verse: 15, tag: "Gospel" },
  // Humility & Service
  { book: "Philippians",  chapter: 2,  verse: 3,  tag: "Humility" },
  { book: "Matthew",      chapter: 20, verse: 28, tag: "Servant" },
  { book: "James",        chapter: 4,  verse: 10, tag: "Humility" },
  { book: "Proverbs",     chapter: 11, verse: 2,  tag: "Humility" },
  { book: "1 Peter",      chapter: 5,  verse: 5,  tag: "Humility" },
  { book: "Mark",         chapter: 10, verse: 45, tag: "Servant" },
  { book: "Luke",         chapter: 6,  verse: 38, tag: "Give" },
  { book: "Proverbs",     chapter: 19, verse: 17, tag: "Generosity" },
  { book: "Acts",         chapter: 20, verse: 35, tag: "Giving" },
  { book: "2 Corinthians",chapter: 9,  verse: 7,  tag: "Cheerful Giver" },
  // Suffering & Comfort
  { book: "Romans",       chapter: 8,  verse: 18, tag: "Glory Ahead" },
  { book: "2 Corinthians",chapter: 1,  verse: 3,  tag: "Comfort" },
  { book: "James",        chapter: 1,  verse: 2,  tag: "Trials" },
  { book: "1 Peter",      chapter: 4,  verse: 13, tag: "Sharing Suffering" },
  { book: "Psalm",        chapter: 34, verse: 18, tag: "Broken-hearted" },
  { book: "John",         chapter: 16, verse: 33, tag: "Overcomer" },
  { book: "Revelation",   chapter: 21, verse: 4,  tag: "No More Tears" },
  { book: "Psalm",        chapter: 30, verse: 5,  tag: "Joy Comes" },
  { book: "Romans",       chapter: 8,  verse: 17, tag: "Co-heirs" },
  { book: "Job",          chapter: 23, verse: 10, tag: "Refined" },
  // Forgiveness
  { book: "1 John",       chapter: 1,  verse: 9,  tag: "Confession" },
  { book: "Isaiah",       chapter: 1,  verse: 18, tag: "Forgiveness" },
  { book: "Psalm",        chapter: 103,verse: 12, tag: "Removed" },
  { book: "Micah",        chapter: 7,  verse: 19, tag: "Cast Into Sea" },
  { book: "Matthew",      chapter: 6,  verse: 14, tag: "Forgive Others" },
  { book: "Ephesians",    chapter: 4,  verse: 32, tag: "Forgiveness" },
  { book: "Hebrews",      chapter: 8,  verse: 12, tag: "Forgotten" },
  { book: "Luke",         chapter: 23, verse: 34, tag: "Father Forgive" },
  { book: "2 Corinthians",chapter: 5,  verse: 17, tag: "New Creation" },
  { book: "Romans",       chapter: 8,  verse: 1,  tag: "No Condemnation" },
  // Identity in Christ
  { book: "John",         chapter: 1,  verse: 12, tag: "Children of God" },
  { book: "1 Peter",      chapter: 2,  verse: 9,  tag: "Chosen" },
  { book: "Ephesians",    chapter: 1,  verse: 4,  tag: "Chosen" },
  { book: "Psalm",        chapter: 139,verse: 14, tag: "Fearfully Made" },
  { book: "Galatians",    chapter: 3,  verse: 28, tag: "One in Christ" },
  { book: "Colossians",   chapter: 3,  verse: 3,  tag: "Hidden with Christ" },
  { book: "Romans",       chapter: 8,  verse: 15, tag: "Adoption" },
  { book: "1 John",       chapter: 3,  verse: 1,  tag: "Lavished Love" },
  { book: "Ephesians",    chapter: 2,  verse: 19, tag: "Fellow Citizens" },
  { book: "Psalm",        chapter: 8,  verse: 4,  tag: "Crowned" },
  // The Holy Spirit
  { book: "John",         chapter: 14, verse: 16, tag: "Helper" },
  { book: "Acts",         chapter: 2,  verse: 4,  tag: "Pentecost" },
  { book: "Romans",       chapter: 8,  verse: 9,  tag: "Spirit Dwells" },
  { book: "1 Corinthians",chapter: 6,  verse: 19, tag: "Temple" },
  { book: "John",         chapter: 16, verse: 13, tag: "Spirit of Truth" },
  { book: "Ezekiel",      chapter: 36, verse: 27, tag: "New Spirit" },
  { book: "Galatians",    chapter: 5,  verse: 25, tag: "Keep in Step" },
  { book: "Romans",       chapter: 8,  verse: 14, tag: "Led by Spirit" },
  { book: "Ephesians",    chapter: 5,  verse: 18, tag: "Be Filled" },
  { book: "Zechariah",    chapter: 4,  verse: 6,  tag: "Not by Power" },
  // Hope & Eternity
  { book: "Romans",       chapter: 8,  verse: 24, tag: "Hope" },
  { book: "1 Corinthians",chapter: 15, verse: 55, tag: "Resurrection" },
  { book: "John",         chapter: 11, verse: 25, tag: "Resurrection" },
  { book: "Revelation",   chapter: 22, verse: 20, tag: "Come Lord Jesus" },
  { book: "John",         chapter: 14, verse: 3,  tag: "Prepared Place" },
  { book: "Philippians",  chapter: 3,  verse: 20, tag: "Citizenship" },
  { book: "Titus",        chapter: 2,  verse: 13, tag: "Blessed Hope" },
  { book: "1 Thessalonians",chapter:4, verse: 16, tag: "Resurrection" },
  { book: "Hebrews",      chapter: 11, verse: 16, tag: "Heavenly City" },
  { book: "Revelation",   chapter: 3,  verse: 20, tag: "Invitation" },
  // Patience & Perseverance
  { book: "James",        chapter: 1,  verse: 12, tag: "Crown of Life" },
  { book: "Galatians",    chapter: 6,  verse: 9,  tag: "Don't Give Up" },
  { book: "Hebrews",      chapter: 12, verse: 1,  tag: "Run the Race" },
  { book: "Romans",       chapter: 5,  verse: 3,  tag: "Suffering→Hope" },
  { book: "Psalm",        chapter: 40, verse: 1,  tag: "Wait" },
  { book: "Isaiah",       chapter: 40, verse: 29, tag: "Strength to Weary" },
  { book: "2 Corinthians",chapter: 4,  verse: 17, tag: "Light Momentary" },
  { book: "James",        chapter: 5,  verse: 8,  tag: "Be Patient" },
  { book: "Revelation",   chapter: 14, verse: 12, tag: "Endurance" },
  { book: "Psalm",        chapter: 37, verse: 7,  tag: "Rest in Lord" },
  // Old Testament — Torah
  { book: "Genesis",      chapter: 12, verse: 2,  tag: "Abraham's Call" },
  { book: "Exodus",       chapter: 14, verse: 14, tag: "God Fights" },
  { book: "Leviticus",    chapter: 19, verse: 18, tag: "Love Neighbor" },
  { book: "Numbers",      chapter: 23, verse: 19, tag: "God Never Lies" },
  { book: "Deuteronomy",  chapter: 7,  verse: 9,  tag: "Faithful God" },
  { book: "Genesis",      chapter: 50, verse: 20, tag: "Intended for Good" },
  { book: "Exodus",       chapter: 20, verse: 3,  tag: "No Other Gods" },
  { book: "Leviticus",    chapter: 11, verse: 44, tag: "Be Holy" },
  { book: "Numbers",      chapter: 14, verse: 18, tag: "Slow to Anger" },
  { book: "Deuteronomy",  chapter: 30, verse: 14, tag: "Word is Near" },
  // Old Testament — Wisdom
  { book: "Psalm",        chapter: 1,  verse: 1,  tag: "Blessed Man" },
  { book: "Psalm",        chapter: 22, verse: 1,  tag: "My God My God" },
  { book: "Psalm",        chapter: 51, verse: 10, tag: "Clean Heart" },
  { book: "Psalm",        chapter: 91, verse: 1,  tag: "Shelter" },
  { book: "Psalm",        chapter: 121,verse: 1,  tag: "Where Help Comes" },
  { book: "Proverbs",     chapter: 31, verse: 30, tag: "Fearing Woman" },
  { book: "Proverbs",     chapter: 22, verse: 6,  tag: "Train a Child" },
  { book: "Ecclesiastes", chapter: 3,  verse: 1,  tag: "A Season" },
  { book: "Song of Solomon",chapter:8, verse: 7,  tag: "Love" },
  { book: "Job",          chapter: 19, verse: 25, tag: "My Redeemer Lives" },
  // Old Testament — Prophets
  { book: "Isaiah",       chapter: 9,  verse: 6,  tag: "Prince of Peace" },
  { book: "Isaiah",       chapter: 53, verse: 3,  tag: "Man of Sorrows" },
  { book: "Jeremiah",     chapter: 31, verse: 33, tag: "New Covenant" },
  { book: "Ezekiel",      chapter: 37, verse: 3,  tag: "Dry Bones" },
  { book: "Daniel",       chapter: 3,  verse: 17, tag: "God Can Save" },
  { book: "Hosea",        chapter: 6,  verse: 6,  tag: "Mercy Not Sacrifice" },
  { book: "Joel",         chapter: 2,  verse: 28, tag: "Spirit Poured" },
  { book: "Amos",         chapter: 5,  verse: 24, tag: "Justice" },
  { book: "Micah",        chapter: 5,  verse: 2,  tag: "Bethlehem" },
  { book: "Malachi",      chapter: 3,  verse: 6,  tag: "I Don't Change" },
  // Gospels
  { book: "Matthew",      chapter: 5,  verse: 3,  tag: "Beatitudes" },
  { book: "Matthew",      chapter: 6,  verse: 33, tag: "Seek First" },
  { book: "Luke",         chapter: 1,  verse: 37, tag: "Nothing Impossible" },
  { book: "Luke",         chapter: 15, verse: 20, tag: "Prodigal Son" },
  { book: "Mark",         chapter: 1,  verse: 15, tag: "Kingdom" },
  { book: "John",         chapter: 8,  verse: 32, tag: "Truth Frees" },
  { book: "John",         chapter: 10, verse: 10, tag: "Abundant Life" },
  { book: "John",         chapter: 11, verse: 35, tag: "Jesus Wept" },
  { book: "John",         chapter: 20, verse: 31, tag: "Believe" },
  { book: "Luke",         chapter: 2,  verse: 11, tag: "Savior Born" },
  // Acts & Epistles
  { book: "Acts",         chapter: 4,  verse: 31, tag: "Filled" },
  { book: "Romans",       chapter: 8,  verse: 37, tag: "Conquerors" },
  { book: "1 Corinthians",chapter: 1,  verse: 18, tag: "Cross" },
  { book: "2 Corinthians",chapter: 12, verse: 9,  tag: "Weakness" },
  { book: "Ephesians",    chapter: 3,  verse: 20, tag: "Beyond Asking" },
  { book: "Philippians",  chapter: 1,  verse: 6,  tag: "Good Work" },
  { book: "1 Peter",      chapter: 3,  verse: 15, tag: "Give Answer" },
  { book: "2 Peter",      chapter: 3,  verse: 9,  tag: "Patient" },
  { book: "Jude",         chapter: 1,  verse: 20, tag: "Build Yourself" },
  { book: "Revelation",   chapter: 1,  verse: 8,  tag: "Alpha Omega" },
  // Final — Doxologies & Benedictions
  { book: "Jude",         chapter: 1,  verse: 24, tag: "Doxology" },
  { book: "Romans",       chapter: 11, verse: 36, tag: "Doxology" },
  { book: "Ephesians",    chapter: 3,  verse: 21, tag: "Glory" },
  { book: "1 Timothy",    chapter: 1,  verse: 17, tag: "King Eternal" },
  { book: "Psalm",        chapter: 150,verse: 6,  tag: "Praise" },
  { book: "Revelation",   chapter: 22, verse: 13, tag: "Alpha Omega" },
  { book: "Psalm",        chapter: 115,verse: 1,  tag: "Not to Us" },
  { book: "Numbers",      chapter: 6,  verse: 24, tag: "Benediction" },
  { book: "Romans",       chapter: 16, verse: 27, tag: "Doxology" },
  { book: "2 Corinthians",chapter: 13, verse: 14, tag: "Benediction" },
];

// ── Algorithm ─────────────────────────────────────────────────────────────────

/**
 * Returns the day-of-year (1–366) for a given Date.
 * Used to pick the verse deterministically from the pool.
 */
function dayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - start.getTime();
  return Math.floor(diff / 86_400_000); // ms per day
}

/**
 * Returns today's curated verse — deterministic, no network required.
 * Every user sees the same verse on the same calendar day.
 */
export function getVerseOfTheDay(): VOTDEntry {
  const doy = dayOfYear(new Date());
  return VOTD_POOL[doy % VOTD_POOL.length];
}
