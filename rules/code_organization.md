# Code Organization Rules

## Overview

This project uses a **feature-tagged documentation** approach. The `feature-map.md` file is tagged with feature blocks, making it greppable. Function names in the map can be looked up via symbol tools to get actual code.

## Documentation Structure

```
docs/
├── architecture.md    # Code structure, state, game flow
├── feature-map.md     # All features → functions + last 3 iterations (tagged)
├── ideas/             # Pre-implementation feature proposals (move to archive/ after implementation)
└── archive/           # Old iteration docs + implemented idea docs for historical reference
```

## Feature Map Tagging System

Tags go in `feature-map.md` (not source code) to enable partial reads and grep.

**Naming convention:** Feature names use PascalCase (e.g., `MarketRound`, `CategoryPerks`, `SetupDrafting`).

### Feature Blocks

```markdown
<!-- @feature FeatureName @iteration N { -->
## FeatureName

Description...

### Functions
| Function | Purpose |
|----------|---------|
| `someFunction()` | Does X |

### Iterations
- **Iteration N**: Latest changes

<!-- } @feature-end FeatureName -->
```

### Cross-Feature References

When a feature uses functions from another feature, add `@uses` to the opening tag:

```markdown
<!-- @feature MarketRound @iteration 1,4,5 @uses CategoryPerks,Wildcard { -->
## Market Round

### Functions
...

### Uses
- `CategoryPerks: getOpsDiscount, hasCategoryPerk`
- `Wildcard: applyWildcardEffect`

<!-- } @feature-end MarketRound -->
```

The `@uses` tag enables grep for dependencies, while the Uses section provides details.

### Tag Reference

| Tag | Purpose | Example |
|-----|---------|---------|
| `<!-- @feature Name @iteration N { -->` | Start feature block | `<!-- @feature Wildcard @iteration 2 { -->` |
| `<!-- } @feature-end Name -->` | End feature block | `<!-- } @feature-end Wildcard -->` |
| `@uses Feature1,Feature2` | Dependencies (in opening tag) | `@uses CategoryPerks,Wildcard` |
| `@iteration N` | Which iteration introduced/modified | `@iteration 4` or `@iteration 2,4,5` |

## Searching

Find a feature's documentation:
```bash
grep -A 100 "@feature CategoryPerks" docs/feature-map.md | grep -B 100 "@feature-end CategoryPerks"
```

Find features that depend on another feature:
```bash
grep "@uses.*CategoryPerks" docs/feature-map.md
```

Then use symbol tools to get actual code for listed functions.

## Workflow

When adding a function:
1. Update `feature-map.md` with the function in the appropriate feature block
2. If new iteration, update iteration list (keep last 3)
3. Source code stays clean - no tags in `.js` files

## Iteration History Rules

- **Last 3 iterations**: Keep detailed in feature-map.md (latest first)
- **Older iterations**: Summarize in one line, full details in `archive/`
- **Git history**: Ultimate source of truth for ancient history

### Format Example

For a feature with 17 iterations:

```markdown
### Iterations
- **Iteration 17**: Latest feature description
- **Iteration 16**: Previous change description
- **Iteration 15**: Third most recent change

*Earlier (1-14): Base implementation (1) → Added X (3) → Major refactor (7) → Performance pass (10-12)*
```

Rules:
- Last 3 detailed as bullet points, latest first
- Older iterations compressed to single line with arrow notation
- Only mention significant milestones, not every iteration
- Parentheses indicate which iteration number
