# Claude.md - ESOP Wars

## Project Overview

ESOP Wars is a hot-seat multiplayer card game where 5 teams compete to build the highest-valued startup by bidding equity (ESOP) to hire employees, surviving market conditions, and exiting successfully.

**Tech Stack:** Vanilla HTML/CSS/JavaScript (browser-only, localStorage persistence)

## Documentation

| Document | Purpose |
|----------|---------|
| `rules/code_organization.md` | **Read first** - Documentation workflow, feature-map tagging system, grep commands |
| `docs/architecture.md` | Code structure, game state shape, phase flow |
| `docs/feature-map.md` | All features → functions + iteration history (tagged per code_organization rules) |
| `docs/ideas/` | Pre-implementation proposals |
| `docs/archive/` | Historical iteration docs, implemented ideas |

## Source Files

| File | Purpose |
|------|---------|
| `index.html` | Entry point, modal markup |
| `style.css` | All styling |
| `data.js` | Static game data: cards, teams, perks, bonuses |
| `game.js` | Game logic, state management, UI rendering |

## Quick Reference

**Game phases:**
```
registration → setup → setup-lock → setup-summary → auction → auction-summary
     ↓
   seed → early → secondary-drop → secondary-hire → mature → exit → winner
```

**Rendering:** All UI via `render()` switching on `gameState.phase`, calling `render*()` functions that replace `#app` contents.

## Workflow for Code Changes

**Hard rule: Docs first, code second.** When building something new, write the documentation first (in `docs/feature-map.md` or `docs/ideas/`), get user approval, then implement.

1. **Understand from docs first** - Use `docs/feature-map.md` to find relevant functions by feature name
2. **Serena tools have higher priority** - Use Serena's symbolic tools for reading and editing code instead of general file tools
3. **Update docs** - Add new functions to `docs/feature-map.md` with iteration tag
