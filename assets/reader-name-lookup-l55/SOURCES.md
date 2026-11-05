# Reader name lookup data — L5.5

This directory is shipped as lookup **data**, separately from DUDU application code.

| File | Origin | Author | License |
|---|---|---|---|
| `characters.json` | [Hán–Việt Pinyin wordlist](https://github.com/ph0ngp/hanviet-pinyin-wordlist), commit `b9923df92c8b55f013001390e37cddd35e986dc1`; simplified aliases derived from CVDICT | Phong Phan | **CC BY-SA 4.0** for the combined derivative; original readings are MIT |
| `meanings.json` | [CVDICT](https://github.com/ph0ngp/CVDICT), commit `c379d909e308343a247e51619f7839a2060a271c` | Phong Phan, based on CC-CEDICT | **CC BY-SA 4.0** |

The source readings remain covered by the accompanying `LICENSE_HANVIET.txt` copyright and permission notice. The combined derivative data and its modifications are offered under the accompanying `LICENSE_CVDICT.txt` (Creative Commons Attribution-ShareAlike 4.0 International). This data license does not change the license of independent DUDU application code.

CVDICT attribution: Phong Phan, *Chinese-Vietnamese dictionary CVDICT*. Original CC-CEDICT: https://www.mdbg.net/chinese/dictionary?page=cc-cedict ; CEDICT copyright (C) 1997, 1998 Paul Andrew Denisowski and subsequent contributors. Source credits and license are also recorded in the source file header.

Changes by DUDU Studio: parse source CSV / CEDICT records, join Hán–Việt pronunciations using pinyin, add simplified-character aliases, retain Han-character words of at most four characters with available readings and short Vietnamese glosses, remove long glosses / parenthetical annotations, deduplicate and package as JSON for local lookup. Filtering can remove useful context and create ambiguity. Reverse meanings are candidate evidence, not verified recovery of any novel's original Chinese names.

The CVDICT author notes that much of its Vietnamese translation was generated with a fine-tuned language model and manually reviewed; remaining translation and proper-name errors are possible. Do not present these candidate names as authoritative originals.

`manifest.json` contains source commits, source SHA-256 hashes, actual retained counts, output sizes and output SHA-256 hashes. Rebuild from the pinned upstream sources:

```
node scripts/build-reader-name-lookup-l55.cjs
```

For a reproducible offline rebuild, pass a directory containing the pinned `hanviet.csv` and `CVDICT.u8`. The builder checks both source hashes before generating output. No Quick Translator / Names database of unclear provenance is bundled. No paid API is required.
