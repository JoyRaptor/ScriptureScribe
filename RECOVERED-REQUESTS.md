---
zone: synthesis
created: 2026-11-02
tags: [tech/scripture-scribe]
---
# Scripture Scribe — recovered requests for review

These requests were found during the November 2 code review. This is a review queue, not authorization to implement the additional requests. The current session already authorizes the supplied improvement handoff, performance work, the full-screen card repair, and moving the extra books below the New Testament in a normal, expanded “Apocryphal” category.

## Where your notes were hiding

- [[Bible buddy fix list.]] — light-theme interlinear text, Research address jump, short-form embedding, and selecting words on the phone. These overlap the supplied handoff and were included in this session.
- [[Bible Scriptures test document]] — the actual request list begins near the bottom, after the sample verses (around line 90).
- [[Bible APP Scriptures test document]] — a nearly duplicate request list, with one extra item: selecting dictionary definition text for copying.
- [[bible buddy]] — original Bible/Research feature brief and the detailed book-color theme requirements.
- [[joyraptors_highlightcolors]] — palette reference, not a separate bug list.
- [[Test verses]] — parser examples, not an improvement queue.

## Additional requests to approve or discard

| # | What you asked for | What the code review found |
|---|---|---|
| 1 | Book colors update immediately after changing a book/chapter, hovering an address, searching, or changing modes. Each mode keeps its own active book. Headers, KJV selector, interlinear toggle, icons, chapter-selector heading/back arrow, and search-result underlays all follow the right book. Cross-references keep their own book colors. | Much of the theme machinery exists. This needs a focused visual audit across both themes and modes; do not assume the old symptoms are resolved merely because the machinery exists. |
| 2 | Scrolling cross-reference and search-result lists on the phone must not activate whichever item is under the finger when it lifts. | Touch/synthetic-mouse suppression exists in several paths. A focused gesture reproduction is still needed for the reported lists. |
| 3 | Complete LXX English gloss and Strong’s coverage where words currently lack them. | Existing entries are preserved. Filling missing linguistic annotations is a separate source-data project; this session does not invent missing glosses or Strong’s numbers. |
| 4 | Make the simple dictionary’s pale-gray text darker/readable, and let you select/copy parts of a definition. | Needs a dictionary-specific readability and selection pass. The extra copy request is in the APP test document. |
| 5 | Clicking the address in a tooltip opens Bible mode at that verse. | Separate from the Research-header address jump addressed in the handoff. Keep this tooltip request in the approval queue. |
| 6 | Swipe the active Research verse to insert a quote. | Search-result/cross-reference swipe embeds exist. Confirm the active verse itself has the requested behavior. |
| 7 | Back retraces Bible → Research → Search transitions and restores recent search results. | A navigation stack exists. Revisit restoration/caching of results and mixed-mode routes against your exact examples. |
| 8 | Make searches faster, possibly show results as they arrive. Animate the magnifier with a 100–110% pulse and cycling Greek/Hebrew/English characters; keep offsets easy to tune. | Search animation code exists. Current work reduces startup and search memory; progressive result display and animation refinements remain separate decisions. |
| 9 | Vector results for numbered books and Revelation must show text and remain clickable/swipable. | Name normalization exists, and the new parser covers Roman/ordinal forms. An actual vector-runtime/device test is needed before declaring this older report closed. |
| 10 | Morphology controls stay in Research mode, not Bible mode. | Bible-mode entry currently hides the morphology panel. Retest the old reproduction before doing new implementation. |
| 11 | Swiping interlinear verses respects real verse/chapter/book boundaries and wraps Revelation → Genesis. | Existence-aware navigation is already in the code. Retest 1 John 1:10 and end-of-book examples. |
| 12 | Daniel 4:1 interlinear did not work; John 7:53 was another test address. | The missing Hebrew verse repair includes English/native-numbering differences such as Daniel 4:1. Device checks should confirm these exact samples. |

## Original feature brief

The “bible buddy” note also describes the two modes; preloaded chapter swipes; three-tap book/chapter navigation; a drop-cap chapter number; long-press address insertion and word study; automatic vault-reference highlighting and backlinks; separate Bible/Research positions; and a purple override for book colors. Most are already implemented. Treat that document as the intended behavior reference, not a fresh instruction to rebuild them all.

Tell Codex which numbered items still matter. No additional implementation from this queue is approved by this note.
