# Release Type Templates

## Hotfix
- **Scope**: Single critical bug fix
- **Testing**: Targeted — only the fix and immediate surroundings
- **Quality Gates**: Fix verified, no new regressions in affected area
- **Rollback**: Must have 1-click rollback ready
- **Monitoring**: Intensive for first 2 hours

## Patch Release
- **Scope**: Bug fixes, minor improvements
- **Testing**: Changed areas + smoke test of critical paths
- **Quality Gates**: All fixes verified, smoke tests pass, no open blockers
- **Rollback**: Rollback plan documented
- **Monitoring**: Active for first 24 hours

## Minor Release
- **Scope**: New features, non-breaking changes
- **Testing**: Standard — new features + regression on affected areas + full smoke
- **Quality Gates**: Feature acceptance criteria met, regression passed, no open criticals, performance baseline maintained
- **Rollback**: Rollback plan + feature flags for new features
- **Monitoring**: Active for first 48 hours

## Major Release
- **Scope**: Breaking changes, large features, architectural changes
- **Testing**: Full — all features, full regression, performance, security, accessibility
- **Quality Gates**: All of minor + migration tested, communication plan ready, support team briefed
- **Rollback**: Full rollback plan with data migration reversal if needed
- **Monitoring**: Intensive for first 72 hours, daily check-ins for 1 week
