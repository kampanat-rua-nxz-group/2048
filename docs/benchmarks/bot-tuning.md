# Bot tuning benchmark

Measured on Node 24.20.0 during the 2026-09-21 tuning session. Each game uses the real game core, starts from a new board, continues beyond 2048, and ends at game over. The bot cannot inspect the seeded RNG.

## Equal thinking budget

The original bot used a maximum depth of six. The tuned bot uses eight, a cumulative spawn probability cutoff of `0.0001`, cached spawn expectations, and revised evaluation weights. Both received a 5 ms budget per move, using seeds 1–5.

```sh
# Before tuning
npm run benchmark:bot -- 5 5 6
# After tuning
npm run benchmark:bot -- 5 5 8
```

| Seed | Original score | Original tile | Tuned score | Tuned tile |
| --- | ---: | ---: | ---: | ---: |
| 1 | 80,500 | 4,096 | 16,464 | 1,024 |
| 2 | 113,484 | 8,192 | 156,160 | 8,192 |
| 3 | 71,592 | 4,096 | 122,884 | 8,192 |
| 4 | 37,204 | 2,048 | 36,640 | 2,048 |
| 5 | 34,816 | 2,048 | 112,956 | 8,192 |
| Average | 67,519 | | 89,021 | |

Average score increased by 31.8%; the best score increased by 37.6%. The tuned bot averaged 3.25–3.33 completed search levels, versus 2.65–2.84 before tuning. Actual time per move was approximately 5.0 ms for both.

This is a small development sample, not a reliable success-rate estimate. The tuning does not improve every seed. Timed searches vary with CPU scheduling, device speed, and cache warm-up, even with seeded tile spawns. The application uses a larger 150 ms budget; these results do not measure its default success rate. No game in this comparison reached 16,384 or 32,768.

## Deterministic heuristic comparison

To isolate evaluation weights from the timing budget, ten seeds were also run at exactly depth two with no probability pruning:

```sh
npm run benchmark:bot -- 10 Infinity 2 0
```

With the optimized search held constant, changing empty-space/merge/ordering/mass weights from `250/600/50/10` to `270/1400/47/11` raised the average score from 43,228 to 46,170. Games reaching 2048 increased from 7/10 to 9/10; neither configuration reached 8192 at this shallow depth.

The weights adapt the balance used by [nneonneo/2048-ai](https://github.com/nneonneo/2048-ai/blob/master/2048.cpp). This bot scores adjacent equal pairs at 1,400; its five-bit row keys retain support for values beyond 32,768.

## Correctness checks

Automated tests cover 90%/10% spawn weighting, exact cached spawn expectations including fatal spawns, legal fallback moves, pruning work reduction, unchanged inputs, no RNG access, and merges creating 16,384, 32,768, and 65,536. These merge checks establish numerical support, not a guarantee of reaching those tiles from a new game.
