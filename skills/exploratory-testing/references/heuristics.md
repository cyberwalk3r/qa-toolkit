# Exploratory Testing Heuristic Catalog

Structured heuristic categories for guided exploratory testing sessions. Each category includes concrete prompt questions and applicability tags for filtering based on project stack and exploration scope.

**Applicability tags:** `web`, `api`, `mobile`, `data`, `all`

Skills reference specific categories by header. The SKILL.md workflow selects 3-5 relevant categories based on input scope, detected stack tags, and known risk areas.

---

## 1. SFDIPOT (San Francisco Depot)

**Description:** Comprehensive exploration framework covering seven product dimensions. The primary mnemonic for structured exploratory testing.
**Tags:** `all`

### Structure

- How is the feature organized? Are there hidden screens, tabs, or states that aren't immediately visible?
- What are the navigational paths to and from this feature? Can you reach it from unexpected entry points?
- What happens when you remove or disable a component this feature depends on?

### Function

- Does every action produce the expected result? Try each function with its most common and least common inputs.
- What functions are advertised but not yet implemented? What functions exist but aren't documented?
- Can you trigger the same function from multiple paths (keyboard, mouse, API, URL)? Do they all behave identically?

### Data

- What data does this feature create, read, update, or delete? What happens at data boundaries (empty, one, many, max)?
- Can you inject unexpected data types (strings where numbers expected, special characters, Unicode, extremely long strings)?
- What happens to data integrity during concurrent access? Can two users modify the same record simultaneously?

### Interface

- How does this feature interact with other features in the system? Are there shared dependencies?
- What happens when an upstream dependency fails, returns slowly, or returns unexpected data?
- Are API contracts honored? Do request/response schemas match documentation?

### Platform

- Does the feature behave consistently across supported browsers, OS versions, and device types?
- What happens under constrained resources (low memory, slow CPU, limited disk)?
- How does the feature behave on different network conditions (slow, intermittent, offline)?

### Operations

- Can the feature be configured, monitored, and maintained by operations staff?
- What logging, alerting, and diagnostic information is available when something goes wrong?
- How does the feature behave during deployment, restart, or configuration change?

### Time

- What happens during peak usage periods vs. off-hours?
- How does the feature handle time zones, daylight saving transitions, and date boundaries?
- What happens with stale data, expired sessions, or timed-out operations?

---

## 2. Consistency Heuristics

**Description:** Compare the feature under test against reference points to find inconsistencies that indicate defects.
**Tags:** `all`

- Does this feature behave the same as similar features elsewhere in the application? (e.g., do all forms validate the same way?)
- Does it match what the documentation, help text, or tooltips describe?
- Is the behavior consistent with the previous version? What changed, and was the change intentional?
- Does it follow platform conventions that users expect? (e.g., Ctrl+S saves, Esc closes dialogs, back button navigates back)
- Is terminology consistent? Does the same concept use the same label everywhere?

---

## 3. Boundary Heuristics

**Description:** Probe the edges of valid and invalid input ranges where defects cluster.
**Tags:** `all`

- What are the minimum and maximum accepted values? What happens at min-1, min, min+1, max-1, max, max+1?
- What happens with empty input (null, empty string, zero, empty array)?
- What happens with exactly one item vs. many items? Is there a practical upper limit?
- What happens with precision boundaries (floating point rounding, large integers, currency calculations)?
- What about character encoding boundaries (ASCII limits, multi-byte Unicode, emoji, RTL text, zero-width characters)?

---

## 4. CRUD Heuristics

**Description:** Verify the complete Create, Read, Update, Delete lifecycle for data entities.
**Tags:** `web`, `api`, `data`

- Can you create an entity, read it back, update it, and delete it in sequence? Does each step reflect immediately?
- What happens when you delete an entity that other entities reference? Are orphan records created?
- Can you update an entity while another user is also updating it? Who wins? Is the user informed?
- Does the list/search view accurately reflect recent creates, updates, and deletes without requiring a refresh?
- What happens when you attempt to read or update a deleted entity? Is the error message clear and accurate?

---

## 5. State Transition Heuristics

**Description:** Exercise valid and invalid state transitions to find defects in lifecycle management.
**Tags:** `web`, `api`

- Draw the state diagram: what are all possible states, and what transitions between them are valid?
- Can you trigger an invalid transition (e.g., publishing a draft that was already archived)? What happens?
- What happens if a state transition is interrupted (network failure, browser close, timeout)? Is the entity left in a consistent state?
- Can you reach the same state through different paths? Is the behavior identical regardless of path?
- What happens with concurrent state changes from different users or sessions?

---

## 6. Error Handling Heuristics

**Description:** Deliberately trigger error conditions to evaluate the system's resilience and error communication.
**Tags:** `all`

- What happens when the network drops mid-operation? Does the system retry, fail gracefully, or corrupt data?
- What happens when an external service (database, API, payment provider) is unavailable or slow?
- Are error messages user-friendly, specific, and actionable? Do they avoid exposing internal details (stack traces, SQL, file paths)?
- Can the user recover from an error without losing their work? Is there auto-save, draft recovery, or undo?
- What happens when the system hits a rate limit? Is the user informed with a clear message and retry guidance?

---

## 7. Performance Heuristics

**Description:** Assess responsiveness, resource usage, and behavior under load during exploratory sessions.
**Tags:** `web`, `api`, `data`

- Does the feature feel responsive under normal usage? Are there noticeable delays on any action?
- What happens when you load a large dataset (hundreds, thousands, millions of records)? Does pagination, search, or filtering still work?
- Does the feature leak resources over time? (Open browser dev tools and monitor memory, network requests, DOM nodes during extended use)
- What happens when multiple users perform the same operation simultaneously?
- Are there operations that block the UI? Can the user cancel long-running operations?

---

## 8. Security Heuristics

**Description:** Probe authentication, authorization, and input handling for common vulnerability patterns.
**Tags:** `web`, `api`

- Can you access the feature without authenticating? Try direct URL access, API calls without tokens, and manipulating session storage.
- Can you access another user's data by modifying IDs in URLs, request parameters, or API calls (IDOR)?
- What happens when you inject special characters in inputs: `' OR 1=1 --` (SQL), `<script>alert(1)</script>` (XSS), `; ls -la` (command injection)?
- Can you escalate privileges by modifying role fields, tokens, or hidden form fields?
- Are sensitive operations protected against CSRF? Can you replay a captured request from a different origin?

---

## 9. Usability Heuristics

**Description:** Evaluate user experience against Nielsen's 10 usability heuristics adapted as exploration prompts.
**Tags:** `web`, `mobile`

- Is the system status always visible? Does the user know what's happening during loading, processing, and saving?
- Does the system speak the user's language? Are labels, messages, and flows intuitive to the target audience?
- Can the user easily undo, redo, or escape from any state? Are there dead ends where the only option is the back button?
- Is the interface consistent? Do similar elements look and behave the same way throughout?
- Does the design prevent errors before they occur? (confirmation dialogs, input constraints, smart defaults, inline validation)

---

## 10. Accessibility Heuristics

**Description:** Verify the feature is usable by people with diverse abilities, including assistive technology users.
**Tags:** `web`, `mobile`

- Can you complete the entire workflow using only the keyboard? Is the tab order logical? Are focus indicators visible?
- Does a screen reader announce all interactive elements, state changes, and dynamic content updates correctly?
- Do all images, icons, and non-text elements have meaningful alternative text? Are decorative elements properly hidden from assistive technology?
- Is the color contrast ratio at least 4.5:1 for normal text and 3:1 for large text? Is color never the only means of conveying information?
- Does the interface respect user preferences for reduced motion, high contrast, and text scaling?
