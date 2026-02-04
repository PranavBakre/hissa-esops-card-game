# Code Change Workflow

## Hard Rule: Docs First, Code Second
When building something new, write the documentation first, get user approval, then implement. No exceptions.

## Steps

1. **Find functions from docs** - Read `docs/feature-map.md` to identify functions by feature name
2. **Serena tools have higher priority** - Use Serena's symbolic tools for reading and editing code instead of general file tools
3. **Update documentation** - Add new functions to `docs/feature-map.md` with iteration tag

## Anti-patterns to Avoid
- Reading same file multiple times with offset/limit
- Using grep to find function locations then reading around them
- Using line-based Edit when symbolic edit would work
- Ignoring the documented structure in CLAUDE.md
- Writing code before documenting the feature and getting approval