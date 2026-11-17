// DipMean: a 240-minute Bollinger mean-reversion bot for CBBTC (cbBTC/USDC).
//
// hello: the harness sends one hello, then one batch per 1-minute bar.
// Each batch carries the bar that just closed; the orders we return on it
// fill at the next bar's open. Long only, $1,000 paper USDC start, at most
// 1 open position. Fully deterministic: no clock, no environment, no random.
//
// Strategy: keep the last 240 closes. Each bar, compute their mean and
// standard deviation, and the z-score of the latest close. When flat and
// the z-score drops to -E or below, buy with 100% of cash. When holding,
// exit the whole position once the z-score rises back to +1.5, or when the
// close falls 1.2% below the entry close (stop loss). E tightens as the
// race goes on: 2.5 for bars 0-719, 2.0 for bars 720-1079, 1.5 from 1080.

import { runBars } from './vendor/makefun-bars.ts';
import type { BarsState, Batch, OrderInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
const WINDOW = 240;
const EXIT_Z = 1.5;
const STOP_LOSS = 0.988; // exit when the close falls 1.2% below the entry close
const MAX_SLIPPAGE_BPS = 200;

// Entry threshold E by bar index: 2.5 for bars 0-719, 2.0 for 720-1079, 1.5 from 1080 on.
// Why E falls as the race goes on: a lower E means buying on a shallower dip,
// so entries trigger more easily late in the window. Early on there are plenty
// of bars left, so only deep dips (z <= -2.5) are worth taking; near the end,
// holding out for an extreme dip risks finishing the 24h race flat with cash
// unspent, so the bar is lowered to make sure the bot still gets its trades in.
function entryThreshold(barIndex: number): number {
  if (barIndex < 720) return 2.5;
  if (barIndex < 1080) return 2.0;
  return 1.5;
}

// The last 240 closes, oldest first.
const closes: number[] = [];
// Bars seen so far, counted from 0 as batches arrive.
let barIndex = 0;
// Close at which the current position was entered (null when flat).
let entryClose: number | null = null;

await runBars({
  onBatch(state: BarsState, batch: Batch): OrderInput[] {
    const close = state.close(SYMBOL);
    if (close === null) {
      // No bar for CBBTC in this batch: nothing to decide on.
      barIndex += 1;
      return [];
    }
    const closeNum = Number(close);

    // Record this bar's close, keeping only the last 240.
    closes.push(closeNum);
    if (closes.length > WINDOW) closes.shift();

    const orders: OrderInput[] = [];
    // No trade before 240 closes of history exist.
    if (closes.length >= WINDOW) {
      // Mean and standard deviation of the last 240 closes.
      let sum = 0;
      for (const c of closes) sum += c;
      const mean = sum / WINDOW;
      let sq = 0;
      for (const c of closes) {
        const d = c - mean;
        sq += d * d;
      }
      const stddev = Math.sqrt(sq / WINDOW);
      const z = stddev === 0 ? 0 : (closeNum - mean) / stddev;

      const position = state.positions.get(SYMBOL);
      const holding = position !== undefined && position.qty > 0n;
      if (!holding) {
        // Flat: forget any stale entry, then buy the dip at z <= -E.
        entryClose = null;
        if (z <= -entryThreshold(barIndex)) {
          orders.push({ side: 'buy', symbol: SYMBOL, notional_quote_units: state.cash, max_slippage_bps: MAX_SLIPPAGE_BPS });
          entryClose = closeNum;
        }
      } else {
        // Holding: if the entry close was somehow lost, anchor it here so
        // the stop loss still has a reference; the z-score exit works anyway.
        if (entryClose === null) entryClose = closeNum;
        // Exit the whole position on mean reversion or on the stop loss.
        if (z >= EXIT_Z || closeNum <= entryClose * STOP_LOSS) {
          orders.push({ side: 'sell', symbol: SYMBOL, qty: position.qty, max_slippage_bps: MAX_SLIPPAGE_BPS });
        }
      }
    }

    barIndex += 1;
    return orders;
  },
});
