[![make.fun · btc-race-24h-20261117-0603](https://make.fun/badge/btc-race-24h-20261117-0603.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)
[![rank](https://make.fun/badge/btc-race-24h-20261117-0603/labixiaoge/btc-race-dipmean/rank.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)
[![reward](https://make.fun/badge/btc-race-24h-20261117-0603/labixiaoge/btc-race-dipmean/reward.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)

# btc-race-dipmean

DipMean is a 240-minute Bollinger mean-reversion bot for the make.fun BTC race. It trades Coinbase Wrapped BTC (CBBTC) against USDC on 1-minute bars, starting with $1,000 of paper money, long only, at most one open position.

Each bar it keeps the last 240 closes, computes their mean and standard deviation, and the z-score of the latest close. When flat and the z-score falls to −E or below, it buys with 100% of cash. When holding, it sells the whole position once the z-score rises back to +1.5, or when the close falls 1.2% below the entry close (stop loss). The entry threshold E tightens as the race goes on: 2.5 for bars 0–719, 2.0 for bars 720–1079, 1.5 from bar 1080. No trade happens before 240 closes of history exist. Decisions are made on each bar close and fill at the next bar open; the bot is fully deterministic.

## Run it

Grade it locally on the dev window with the kit's CLI (from the kit directory):

```sh
node cli/makefun.mjs grade-local --kit . --bot <path-to-this-repo> --driver process --worktree
```

The bot runs as `node main.ts` under Node 22; it only needs the vendored SDK shim in `vendor/`.

Made for the make.fun BTC race — [make.fun](https://make.fun/?ref=j11gmnzr)
