import os
import json
from pysword.modules import SwordModules

def main():
    modules = SwordModules(r'C:\Users\JoyRaptor\Downloads\bible-obsidian-plugin\Scripture-scribe\LXX')
    found_modules = modules.parse_modules()
    print("Found modules:", found_modules.keys())
    
    lxx = modules.get_bible_from_module('LXX')
    
    # Let's check Genesis 1:1
    verses = lxx.get_iter('Genesis 1')
    for v in verses:
        print("Gen 1 verse text:")
        print(v)
        break

if __name__ == '__main__':
    main()
