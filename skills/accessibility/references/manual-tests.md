# Manual Accessibility Test Procedures

## Keyboard Navigation Test
1. Start at the browser address bar
2. Press TAB repeatedly through the entire page
3. Verify: every interactive element (links, buttons, inputs, dropdowns) receives focus
4. Verify: focus indicator is clearly visible (colored outline or highlight)
5. Verify: focus order follows visual layout (top-to-bottom, left-to-right)
6. Press SHIFT+TAB to go backwards — verify it reverses correctly
7. Press ENTER on buttons and links — verify they activate
8. Press SPACE on checkboxes and buttons — verify they toggle/activate
9. Press ESCAPE on dialogs/modals — verify they close and focus returns

## Screen Reader Test (NVDA on Windows / VoiceOver on Mac)
1. Turn on screen reader
2. Navigate page top-to-bottom using arrow keys
3. Verify: all visible text is announced
4. Verify: images announce their alt text (or are skipped if decorative)
5. Verify: form fields announce their labels
6. Verify: buttons announce their purpose
7. Verify: headings create a logical outline (H1 → H2 → H3)
8. Verify: error messages are announced when they appear

## Color Contrast Test
1. Use browser DevTools or a contrast checker tool
2. Check text against its background — must be ≥ 4.5:1 ratio
3. Check large text (18pt+) — must be ≥ 3:1 ratio
4. Check UI controls (buttons, inputs, icons) — must be ≥ 3:1 ratio

## Zoom Test
1. Set browser zoom to 200%
2. Verify: no content is cut off or overlapping
3. Verify: no horizontal scrolling needed
4. Verify: all functionality still works
5. Test at 400% for Level AAA compliance

## Recommended Tools
- **axe DevTools** (browser extension) — automated WCAG scanning
- **WAVE** (browser extension) — visual accessibility evaluation
- **Lighthouse** (Chrome DevTools) — accessibility score
- **Colour Contrast Analyser** (desktop app) — eyedropper contrast checker
- **NVDA** (Windows, free) — screen reader
- **VoiceOver** (Mac, built-in) — screen reader
