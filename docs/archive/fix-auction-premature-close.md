# Fix: Auction Premature Close in Bot-Only Games

## Problem

In `handleAuctionTimeout()`, the auction timeout handler picks **one random eligible bot** and asks it to decide. If that single bot passes (or its bid is invalid), bidding immediately closes — even if 4 other bots would have bid.

The `decideBid()` function has built-in randomness: a 15% chance to pass on affordable cards, and a 30% chance to stretch budget. So a bot that *could* bid may randomly decide not to. When that unlucky bot is the one randomly selected, the card closes prematurely.

### Current flow (per alarm tick)

```
1. Filter eligible bots (not current highest bidder, has ESOP, needs employees)
2. Pick ONE random bot from the list
3. Call decideBid() for that bot
4. If bot bids → place bid, reschedule timeout, return
5. If bot passes → close bidding immediately
```

Step 5 is the problem. One bot's pass kills the entire round.

### Impact

- Cards get assigned to the first bidder with no counter-bids
- Cards get discarded (no winner) when multiple bots would have bid
- The auction feels broken — most cards resolve in a single alarm tick

## Proposed Fix

Change `handleAuctionTimeout()` to try **all eligible bots** before closing. Only close bidding when every eligible bot has passed.

### New flow (per alarm tick)

```
1. Filter eligible bots (not current highest bidder, has ESOP, needs employees)
2. Shuffle the eligible bots list (randomize order)
3. For each bot in the list:
   a. Call decideBid()
   b. If bot bids → place bid, reschedule timeout, return
4. If we get through the entire list with no bids → close bidding
```

This gives every bot a fair chance to respond to the current bid. The shuffling preserves randomness in who bids first.

### Edge case: bidding wars

When a bot bids, we reschedule the timeout and return. The next alarm tick rebuilds the eligible list (excluding the new highest bidder) and tries all remaining bots again. This naturally creates back-and-forth bidding wars where bots outbid each other — exactly what we want.

## Files Changed

- `packages/worker/src/room.ts` — `handleAuctionTimeout()` method
