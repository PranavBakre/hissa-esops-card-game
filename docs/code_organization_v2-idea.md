# Code Organization V2 - Multi-Folder Structure (Future)

> **Status:** Not implemented. Documented for future reference when feature count grows significantly (20+ features).

## When to Upgrade to V2

Consider migrating to this structure when:
- Feature count exceeds 15-20
- Single `feature-map.md` exceeds 500 lines
- Features have complex sub-components needing detailed docs
- Multiple developers need to work on different features simultaneously

## Proposed Structure

```
docs/
├── architecture.md           # High-level overview (same as v1)
├── features/
│   ├── auction.md            # Primary auction mechanics
│   ├── setup-drafting.md     # Rummy-style company setup
│   ├── wildcard.md           # Double Down / Shield
│   ├── category-perks.md     # Engineering, Product, Sales, Ops, Finance perks
│   ├── market-leader.md      # Top 2 teams get 2x bonus
│   └── dual-winner.md        # Best Founder + Best Employer
├── reference/
│   └── functions.md          # Complete function index (auto-generated from tags)
└── archive/
    └── iterations/           # Historical iteration docs
```

## Feature Doc Template

Each feature file would follow this template:

```markdown
# Feature Name

## Current Behavior
[How it works NOW - authoritative source]

## Key Functions
| Function | Purpose |
|----------|---------|
| `funcName()` | One-liner description |

## Dependencies
- **Uses:** `CategoryPerks.getOpsDiscount`, `Wildcard.applyEffect`
- **Used by:** `MarketRound`, `ExitPhase`

## Changelog
### Recent (Last 3)
- **Iteration 8**: [Change description]
- **Iteration 7**: [Change description]
- **Iteration 5**: [Change description]

### Earlier
Iterations 1-4 established base mechanics. See archive for details.
```

## Migration Path from V1

1. Split `feature-map.md` into separate files in `features/`
2. Generate `reference/functions.md` by grepping `@feature` tags
3. Update `.cursor/rules/code_organization.md` to reference v2 structure
4. Keep code tagging system unchanged (works with both versions)

## Why We Skipped This (For Now)

- Current feature count: ~6 features
- Single file is easier to search and maintain
- Less context switching between files
- Premature organization adds overhead without benefit

## Code Tagging (Same as V1)

The `@feature`, `@feature-end`, `@uses`, and `@iteration` tags work identically in both versions. The only difference is where the documentation lives.
