"""
build-interlinear-complete.py

Converts STEPBible TAGNT and TAHOT source files into:
  - strongs-greek.json   (NT interlinear)
  - strongs-hebrew.json  (OT interlinear)

Place this script in the same folder as the STEPBible .txt files and run it,
or double-click build-interlinear-complete.bat

Output format (same for both Greek and Hebrew):
  {
    "John 3:16": [
      {"e": "For God", "o": "Οὕτως", "t": "Houtōs", "s": "G3779"},
      ...
    ],
    "Genesis 1:1": [
      {"e": "In the beginning", "o": "בְּרֵאשִׁית", "t": "be./re.Shit", "s": "H7225"},
      ...
    ]
  }

Column layouts differ between formats:

  TAGNT (Greek NT):
    col 0: verse ref  e.g. "1Co.1.1#01=NKO"
    col 1: Greek word + transliteration in parens  e.g. "Παῦλος (Paulos)"
    col 2: English gloss  e.g. "Paul"
    col 3: Grammar + Strong's  e.g. "G3972G=N-NSM-P"

  TAHOT (Hebrew OT):
    col 0: verse ref  e.g. "Jos.11.7#01=L"
    col 1: Hebrew word  e.g. "וַ/יָּבֹ֣א"
    col 2: Transliteration  e.g. "va/i.ya.Vo'"
    col 3: English gloss  e.g. "and/ he came"
    col 4: Strong's  e.g. "H9001/{H0935G}"
    col 5: Grammar  e.g. "Hc/Vqw3ms"
"""

import json, os, re, glob

script_dir = os.path.dirname(os.path.abspath(__file__))

# ── Book abbreviation → canonical name ───────────────────────────────────────
BOOK_MAP = {
    # OT
    "Gen":"Genesis","Exod":"Exodus","Lev":"Leviticus","Num":"Numbers",
    "Deut":"Deuteronomy","Josh":"Joshua","Judg":"Judges","Ruth":"Ruth",
    "1Sam":"1 Samuel","2Sam":"2 Samuel","1Kgs":"1 Kings","2Kgs":"2 Kings",
    "1Chr":"1 Chronicles","2Chr":"2 Chronicles","Ezra":"Ezra","Neh":"Nehemiah",
    "Esth":"Esther","Job":"Job","Ps":"Psalms","Prov":"Proverbs",
    "Eccl":"Ecclesiastes","Song":"Song of Solomon","Isa":"Isaiah",
    "Jer":"Jeremiah","Lam":"Lamentations","Ezek":"Ezekiel","Dan":"Daniel",
    "Hos":"Hosea","Joel":"Joel","Amos":"Amos","Obad":"Obadiah",
    "Jonah":"Jonah","Mic":"Micah","Nah":"Nahum","Hab":"Habakkuk",
    "Zeph":"Zephaniah","Hag":"Haggai","Zech":"Zechariah","Mal":"Malachi",
    # NT
    "Matt":"Matthew","Mark":"Mark","Luke":"Luke","John":"John",
    "Acts":"Acts","Rom":"Romans",
    "1Cor":"1 Corinthians","2Cor":"2 Corinthians",
    "Gal":"Galatians","Eph":"Ephesians","Phil":"Philippians","Col":"Colossians",
    "1Thess":"1 Thessalonians","2Thess":"2 Thessalonians",
    "1Tim":"1 Timothy","2Tim":"2 Timothy",
    "Titus":"Titus","Phlm":"Philemon","Heb":"Hebrews","Jas":"James",
    "1Pet":"1 Peter","2Pet":"2 Peter",
    "1John":"1 John","2John":"2 John","3John":"3 John",
    "Jude":"Jude","Rev":"Revelation",
    # Alternate STEPBible abbreviations
    "1Co":"1 Corinthians","2Co":"2 Corinthians",
    "1Th":"1 Thessalonians","2Th":"2 Thessalonians",
    "1Ti":"1 Timothy","2Ti":"2 Timothy",
    "Phm":"Philemon","Php":"Philippians","Tit":"Titus",
    "1Pe":"1 Peter","2Pe":"2 Peter",
    "1Jn":"1 John","2Jn":"2 John","3Jn":"3 John",
    "Jud":"Jude",
    "Jhn":"John","Mrk":"Mark","Luk":"Luke","Mat":"Matthew",
    "Act":"Acts",
    "Deu":"Deuteronomy","Exo":"Exodus",
    "Jos":"Joshua","Jdg":"Judges","Rut":"Ruth",
    "1Sa":"1 Samuel","2Sa":"2 Samuel",
    "1Ki":"1 Kings","2Ki":"2 Kings",
    "1Ch":"1 Chronicles","2Ch":"2 Chronicles",
    "Ezr":"Ezra","Est":"Esther",
    "Psa":"Psalms","Pro":"Proverbs","Ecc":"Ecclesiastes",
    "Sng":"Song of Solomon",
    "Isa":"Isaiah","Eze":"Ezekiel","Ezk":"Ezekiel",
    "Hos":"Hosea","Jol":"Joel","Joe":"Joel",
    "Amo":"Amos","Oba":"Obadiah","Jon":"Jonah",
    "Nam":"Nahum","Zep":"Zephaniah","Zec":"Zechariah",
    "Psm":"Psalms",
    "Nah":"Nahum","Hab":"Habakkuk","Hag":"Haggai","Mal":"Malachi",
}

# Matches a verse data line: e.g. "1Co.1.1#01=NKO" or "Jos.11.7#01=L"
VERSE_LINE_RE = re.compile(r'^([A-Za-z0-9]+)\.(\d+)\.(\d+)(?:\([^)]+\))?#\d+')

# Matches transliteration in parens (Greek format): "Παῦλος (Paulos)"
TRANSLIT_RE = re.compile(r'\(([^)]+)\)')

# Matches the PRIMARY Strong's number from the Hebrew dStrongs column.
# TAHOT format: "H9001/{H0935G}" — the number in {} is the root/primary lexeme.
# If no {}, fall back to first H/G number found.
STRONGS_PRIMARY_RE = re.compile(r'\{([GH]\d+)[A-Za-z]?\}')
STRONGS_ANY_RE     = re.compile(r'([GH]\d+)')

# OT book abbreviations (used to detect which column layout to use)
OT_ABBREVS = {
    "Gen","Exod","Lev","Num","Deut","Josh","Judg","Ruth",
    "1Sam","2Sam","1Kgs","2Kgs","1Chr","2Chr","Ezra","Neh",
    "Esth","Job","Ps","Prov","Eccl","Song","Isa","Jer","Lam",
    "Ezek","Dan","Hos","Joel","Amos","Obad","Jonah","Mic",
    "Nah","Hab","Zeph","Hag","Zech","Mal",
    # alternates
    "Deu","Exo","Jos","Jdg","Rut","1Sa","2Sa","1Ki","2Ki",
    "1Ch","2Ch","Ezr","Est","Psa","Pro","Ecc","Sng",
    "Isa","Eze","Ezk","Hos","Jol","Joe","Amo","Oba","Jon",
    "Nam","Zep","Zec","Psm","Nah","Hab","Hag","Mal",
}


def is_hebrew_abbr(abbr: str) -> bool:
    return abbr in OT_ABBREVS


def parse_abbr(abbr: str):
    return BOOK_MAP.get(abbr)


def extract_strongs_hebrew(col: str) -> str:
    """
    Extract the primary Strong's number from the TAHOT dStrongs column.

    The column format is e.g.:
      H9001/{H0935G}        → H935  (root lexeme in braces, strip trailing letter)
      {H5971K}              → H5971
      H9001/{H3605}\\H9014  → H3605
      {H5921A}/H9038        → H5921
      H9003/{H9038}\\H9016  → H9038

    We prefer the {} lexeme; strip trailing alpha disambiguation letter;
    strip leading zeros from the numeric part.
    """
    m = STRONGS_PRIMARY_RE.search(col)
    raw = m.group(1) if m else ""
    if not raw:
        m2 = STRONGS_ANY_RE.search(col)
        raw = m2.group(1) if m2 else ""
    if not raw:
        return ""
    # Normalize: strip trailing disambiguation letter, strip leading zeros
    raw = re.sub(r'([GH])0*(\d+)[A-Za-z]?$', lambda mo: mo.group(1) + mo.group(2), raw)
    return raw


def clean_english(english: str) -> str:
    """Strip leading articles and slash-prefixes from English gloss."""
    # Remove leading articles in brackets: "[the] will" → "will"
    english = re.sub(r'^\[the\]\s*', '', english)
    english = re.sub(r'^\[a\]\s*',   '', english)
    english = re.sub(r'^\[an\]\s*',  '', english)
    # Hebrew glosses often have leading slash from morpheme join: "and/ he came"
    # Keep as-is — it's actually useful context. But strip <> brackets.
    english = re.sub(r'[<>]', '', english)
    return english.strip()


def clean_hebrew(word: str) -> str:
    """
    Strip cantillation marks and maqaf/sof-pasuq punctuation that
    would be distracting when displayed as-is in the interlinear grid.
    Keep the base Hebrew letters and common vowel points.
    """
    # Remove sof pasuq (׃), maqaf (\־ in source), and trailing backslash
    word = re.sub(r'[\\׃]', '', word)
    word = re.sub(r'\\?[־]', '', word)   # maqaf (Hebrew hyphen)
    # Forward slash is a morpheme divider in TAHOT — keep or strip?
    # We'll keep it so the display matches the source data, and the
    # rendering layer can strip/style it as desired.
    return word.strip()


def parse_file_greek(filepath: str, output: dict) -> int:
    """
    Parse a TAGNT Greek NT file.

    Column layout:
      0: verse ref + word index  e.g. "1Co.1.1#01=NKO"
      1: Greek word (transliteration in parens)  e.g. "Παῦλος (Paulos)"
      2: English gloss  e.g. "Paul"
      3: Grammar + Strong's  e.g. "G3972G=N-NSM-P"
    """
    verses_added  = 0
    skipped_books = set()

    with open(filepath, encoding="utf-8") as f:
        for line in f:
            line = line.rstrip("\n")
            if not line or line.startswith("#") or line.startswith("\t"):
                continue
            if line.startswith("Word") or line.startswith("word"):
                continue

            parts = line.split("\t")
            if len(parts) < 4:
                continue

            ref_col = parts[0].strip()
            m = VERSE_LINE_RE.match(ref_col)
            if not m:
                continue

            abbr    = m.group(1)
            chapter = int(m.group(2))
            verse   = int(m.group(3))

            book = parse_abbr(abbr)
            if not book:
                skipped_books.add(abbr)
                continue

            key = f"{book} {chapter}:{verse}"

            word_col = parts[1].strip()
            tm = TRANSLIT_RE.search(word_col)
            original        = TRANSLIT_RE.sub("", word_col).strip()
            transliteration = tm.group(1).strip() if tm else ""

            english     = clean_english(parts[2].strip() if len(parts) > 2 else "")
            grammar_col = parts[3].strip() if len(parts) > 3 else ""

            sm = STRONGS_ANY_RE.search(grammar_col)
            strongs_raw = sm.group(1) if sm else ""
            # Normalize: strip trailing disambiguation letter + leading zeros
            strongs = re.sub(r'([GH])0*(\d+)[A-Za-z]?$',
                             lambda mo: mo.group(1) + mo.group(2),
                             strongs_raw) if strongs_raw else ""

            if not original:
                continue

            word_entry = {"e": english, "o": original, "t": transliteration, "s": strongs}

            if key not in output:
                output[key] = []
                verses_added += 1
            output[key].append(word_entry)

    if skipped_books:
        print(f"  Note: unrecognised abbreviations (skipped): {', '.join(sorted(skipped_books))}")

    return verses_added


def parse_file_hebrew(filepath: str, output: dict) -> int:
    """
    Parse a TAHOT Hebrew OT file.

    Column layout:
      0: verse ref + word index  e.g. "Jos.11.7#01=L"
      1: Hebrew word             e.g. "וַ/יָּבֹ֣א"
      2: Transliteration         e.g. "va/i.ya.Vo'"
      3: English gloss           e.g. "and/ he came"
      4: Strong's (dStrongs)     e.g. "H9001/{H0935G}"
      5: Grammar                 e.g. "Hc/Vqw3ms"
      (further columns: meaning variants, spelling variants, etc.)
    """
    verses_added  = 0
    skipped_books = set()

    with open(filepath, encoding="utf-8") as f:
        for line in f:
            line = line.rstrip("\n")
            if not line or line.startswith("#") or line.startswith("\t"):
                continue
            # Skip the column-header row (starts with "Eng" or "Word" etc.)
            if re.match(r'^(Eng|Word|word)\s', line):
                continue

            parts = line.split("\t")
            if len(parts) < 4:
                continue

            ref_col = parts[0].strip()
            m = VERSE_LINE_RE.match(ref_col)
            if not m:
                continue

            abbr    = m.group(1)
            chapter = int(m.group(2))
            verse   = int(m.group(3))

            # Only process OT abbreviations in the Hebrew parser
            if not is_hebrew_abbr(abbr):
                continue

            book = parse_abbr(abbr)
            if not book:
                skipped_books.add(abbr)
                continue

            key = f"{book} {chapter}:{verse}"

            # col 1: Hebrew word
            original        = clean_hebrew(parts[1].strip() if len(parts) > 1 else "")
            # col 2: Transliteration
            transliteration = parts[2].strip() if len(parts) > 2 else ""
            # col 3: English gloss
            english         = clean_english(parts[3].strip() if len(parts) > 3 else "")
            # col 4: Strong's (dStrongs column)
            strongs_col     = parts[4].strip() if len(parts) > 4 else ""
            strongs         = extract_strongs_hebrew(strongs_col)

            if not original:
                continue

            word_entry = {"e": english, "o": original, "t": transliteration, "s": strongs}

            if key not in output:
                output[key] = []
                verses_added += 1
            output[key].append(word_entry)

    if skipped_books:
        print(f"  Note: unrecognised abbreviations (skipped): {', '.join(sorted(skipped_books))}")

    return verses_added


def main():
    greek  = {}
    hebrew = {}

    # ── Greek NT (TAGNT) ──────────────────────────────────────────────────────
    tagnt_files = glob.glob(os.path.join(script_dir, "TAGNT*.txt"))
    if not tagnt_files:
        print("WARNING: No TAGNT*.txt files found — strongs-greek.json will be empty.")
    for fp in sorted(tagnt_files):
        fname = os.path.basename(fp)
        print(f"Parsing Greek: {fname}")
        n = parse_file_greek(fp, greek)
        print(f"  → {n} new verse keys (total: {len(greek)})")

    # ── Hebrew OT (TAHOT) ─────────────────────────────────────────────────────
    tahot_files = glob.glob(os.path.join(script_dir, "TAHOT*.txt"))
    if not tahot_files:
        print("WARNING: No TAHOT*.txt files found — strongs-hebrew.json will be empty.")
    for fp in sorted(tahot_files):
        fname = os.path.basename(fp)
        print(f"Parsing Hebrew: {fname}")
        n = parse_file_hebrew(fp, hebrew)
        print(f"  → {n} new verse keys (total: {len(hebrew)})")

    # ── Totals ────────────────────────────────────────────────────────────────
    total_greek_words  = sum(len(v) for v in greek.values())
    total_hebrew_words = sum(len(v) for v in hebrew.values())
    print(f"\nGreek:  {len(greek)} verses, {total_greek_words} words")
    print(f"Hebrew: {len(hebrew)} verses, {total_hebrew_words} words")

    # ── Write output ──────────────────────────────────────────────────────────
    out_greek  = os.path.join(script_dir, "strongs-greek.json")
    out_hebrew = os.path.join(script_dir, "strongs-hebrew.json")

    print(f"\nWriting {out_greek} ...")
    with open(out_greek, "w", encoding="utf-8") as f:
        json.dump(greek, f, ensure_ascii=False, separators=(",", ":"))
    print(f"  → {os.path.getsize(out_greek)//1024} KB")

    print(f"\nWriting {out_hebrew} ...")
    with open(out_hebrew, "w", encoding="utf-8") as f:
        json.dump(hebrew, f, ensure_ascii=False, separators=(",", ":"))
    print(f"  → {os.path.getsize(out_hebrew)//1024} KB")

    print("\n✓ Done! Copy both .json files into your plugin folder:")
    print("  [Vault]\\.obsidian\\plugins\\scripture-scribe\\")

if __name__ == "__main__":
    main()
