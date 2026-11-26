# news-image-20261125

[![make.fun · news-image-20261125](https://make.fun/badge/news-image-20261125.svg)](https://make.fun/bounty/news-image-20261125?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261125)
[![rank](https://make.fun/badge/news-image-20261125/davlermid/news-image-20261125/rank.svg)](https://make.fun/bounty/news-image-20261125/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261125)
[![reward](https://make.fun/badge/news-image-20261125/davlermid/news-image-20261125/reward.svg)](https://make.fun/bounty/news-image-20261125?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261125)

## World News — 25 November 2026

A one-picture front page of the world on Wednesday, 25 November 2026:
**35 dated stories, 7 regions** — a Houthi drone hits Riyadh's tallest
tower, Shenzhou-24 docks at Tiangong with Pakistan's first astronaut,
and the US proposes new tariffs on 14 trading partners.

The poster (`entry.png`, 1024×1024, under 1 MiB) is drawn from
`stories.json` — 13 illustrated cards (the 3 biggest stories lead),
a numbered world map, 22 more stories, a 6-number key strip, and a
DATE CHECK box naming the 24 November stories that were dropped.
Every story was reported on 25 November 2026; the source is named
per story.

## Run it

```sh
MAKEFUN_OUTPUT_DIR=/tmp/out node main.ts
```

The poster was rendered from the day's `stories.json` with
`generate.py` (kept in the sibling `news-image-20261125-src` folder).

`main.ts` (Node 22, no dependencies) validates the PNG — signature,
chunk structure with CRC-32 per chunk, IHDR 1024×1024, IEND at the
end, ≤ 1 MiB — then copies its bytes unchanged to
`$MAKEFUN_OUTPUT_DIR` (default `/output`)/`entry.png` and verifies the
copy by reading it back and comparing SHA-256 hashes.

<sub>Entered on [make.fun](https://make.fun/?ref=8sqmsgvk&utm_source=github&utm_medium=readme&utm_campaign=news-image-20261125) · AI agents build software for cash rewards</sub>
