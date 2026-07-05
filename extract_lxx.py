import os
import json
import re
from pysword.modules import SwordModules

script_dir = os.path.dirname(os.path.abspath(__file__))

# Map pysword canonical names to Scripture-scribe standard names
BOOK_MAP = {
    "Genesis": "Genesis", "Exodus": "Exodus", "Leviticus": "Leviticus", 
    "Numbers": "Numbers", "Deuteronomy": "Deuteronomy", "Joshua": "Joshua", 
    "Judges": "Judges", "Ruth": "Ruth", "I Samuel": "1 Samuel", 
    "II Samuel": "2 Samuel", "I Kings": "1 Kings", "II Kings": "2 Kings", 
    "I Chronicles": "1 Chronicles", "II Chronicles": "2 Chronicles", 
    "Ezra": "Ezra", "Nehemiah": "Nehemiah", "Esther": "Esther", 
    "Job": "Job", "Psalms": "Psalms", "Proverbs": "Proverbs", 
    "Ecclesiastes": "Ecclesiastes", "Song of Solomon": "Song of Solomon", 
    "Isaiah": "Isaiah", "Jeremiah": "Jeremiah", "Lamentations": "Lamentations", 
    "Ezekiel": "Ezekiel", "Daniel": "Daniel", "Hosea": "Hosea", 
    "Joel": "Joel", "Amos": "Amos", "Obadiah": "Obadiah", 
    "Jonah": "Jonah", "Micah": "Micah", "Nahum": "Nahum", 
    "Habakkuk": "Habakkuk", "Zephaniah": "Zephaniah", 
    "Haggai": "Haggai", "Zechariah": "Zechariah", "Malachi": "Malachi"
}

# <w lemma="strong:G1722" morph="packard:P" xlit="betacode:E)N">ἐν</w>
W_TAG_RE = re.compile(r'<w[^>]*lemma="strong:([^"]+)"[^>]*>(.*?)</w>')

# Load TBESG lexicon for transliterations and English glosses
tbesg_path = os.path.join(script_dir, "..", "strongs-greek-lxx.json")
TBESG = {}
if os.path.exists(tbesg_path):
    with open(tbesg_path, "r", encoding="utf-8") as f:
        TBESG = json.load(f)

def extract_lxx_strongs():
    modules = SwordModules(r'C:\Users\JoyRaptor\Downloads\bible-obsidian-plugin\Scripture-scribe\LXX')
    found_modules = modules.parse_modules()
    if not found_modules:
        print("ERROR: No SWORD modules found!")
        return
        
    lxx = modules.get_bible_from_module(list(found_modules.keys())[0])
    lxx_struct = lxx.get_structure().get_books()
    
    interlinear = {}
    total_words = 0
    total_verses = 0
    
    # Process OT books
    for book_obj in lxx_struct.get('ot', []):
        book_name = book_obj.name
        std_book = BOOK_MAP.get(book_name)
        if not std_book:
            # Skip apocrypha
            continue
            
        print(f"Processing {std_book}...")
        try:
            for chap_idx in range(book_obj.num_chapters):
                chap_num = chap_idx + 1
                num_verses = book_obj.chapter_lengths[chap_idx]
                
                for verse_idx in range(num_verses):
                    verse_num = verse_idx + 1
                    
                    # Call get() for this specific verse; returns raw OSIS string
                    text = lxx.get(books=[book_name], chapters=[chap_num], verses=[verse_num], clean=False)
                    
                    words = []
                    # Find all <w> tags
                    for match in W_TAG_RE.finditer(text):
                        strongs = match.group(1).replace("strong:", "")
                        word = match.group(2).strip()
                        if word:
                            # Normalize strongs to match dictionary keys (e.g., G0001 or G1722)
                            # TBESG keys are usually G0001, G0002... up to 4 digits.
                            # So pad with zeros if needed: G1 -> G0001
                            s_num = strongs[1:]
                            if s_num.isdigit():
                                s_key = f"{strongs[0]}{int(s_num):04d}"
                            else:
                                s_key = strongs
                                
                            dict_entry = TBESG.get(s_key, TBESG.get(strongs, {}))
                            
                            words.append({
                                "o": word,
                                "t": dict_entry.get("g", ""), # 'g' is Transliteration in TBESG format
                                "e": dict_entry.get("o", ""), # 'o' is English gloss in TBESG format
                                "s": strongs
                            })
                    
                    if words:
                        key = f"{std_book} {chap_num}:{verse_num}"
                        interlinear[key] = words
                        total_words += len(words)
                        total_verses += 1
                        
        except Exception as e:
            print(f"Error processing {std_book}: {e}")
            
    out_path = os.path.join(script_dir, "strongs-lxx.json")
    print(f"\nWriting to {out_path}...")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(interlinear, f, ensure_ascii=False, separators=(",", ":"))
        
    print(f"Done! {total_verses} verses and {total_words} words extracted.")

if __name__ == '__main__':
    extract_lxx_strongs()
