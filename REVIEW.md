# Code Review: P11-csv-cleaner

## Summary
The P11 CSV Cleaner is a well-structured, zero-dependency, pure client-side data cleaning tool. It correctly prioritizes local-only processing and avoids common XSS pitfalls by relying on `textContent` for DOM updates. CSV injection mitigation is also proactively handled. However, there are bugs in the charting logic, performance bottlenecks for large files, and a total lack of automated testing that should be addressed as the project evolves.

## Findings

### HIGH

**1. Incorrect Numeric Column Detection in Chart Rendering**
- **File:** `app.js` (around line 152)
- **Impact:** The function `renderChart` uses `rows.some(r => !Number.isNaN(Number(r[h])))` to identify a numeric column. In JavaScript, `Number("")` and `Number(" ")` evaluate to `0`, which is not `NaN`. This means a column containing empty strings will be incorrectly identified as a numeric column, resulting in broken charts or unintended visualization errors.
- **Fix Suggestion:** Update the check to explicitly reject empty strings, similar to how it is handled in `fillBlank`:
  ```javascript
  const numericCol = headers.find(h => rows.some(r => {
    const val = String(r[h] ?? "").trim();
    return val !== "" && !Number.isNaN(Number(val));
  }));
  ```

**2. Lack of Automated Testing**
- **File:** Repository wide
- **Impact:** While `QA.md` implies manual testing has been performed, there is no automated test suite. Core data transformation logic (e.g., `cleanRows`, `escapeCsvFormula`) is prone to regressions as the application scales or features are added.
- **Fix Suggestion:** Extract pure data transformation functions out of `app.js` and introduce a lightweight testing framework (like Jest, Mocha, or Node.js native test runner) to cover deduplication, empty filling, and CSV injection escaping.

### MEDIUM

**1. Performance Bottleneck in Row Deduplication**
- **File:** `app.js` (around line 79)
- **Impact:** The deduplication logic uses `JSON.stringify(headers.map(h => row[h] ?? ""))` for every single row. For large CSV files (e.g., 10,000+ rows), calling `JSON.stringify` inside a loop will cause unnecessary string allocations, leading to high memory consumption and potential UI blocking.
- **Fix Suggestion:** Instead of serializing an array to a JSON string, join the values using a rare delimiter to construct a string key.
  ```javascript
  const key = headers.map(h => row[h] ?? "").join('\x00'); // using null character as delimiter
  ```

**2. Tight Coupling of State and UI Manipulation**
- **File:** `app.js`
- **Impact:** The core logic functions and UI rendering functions are intermixed in a single file, relying heavily on global state variables (`rawRows`, `cleanedRows`, etc.). This makes unit testing the business logic and future maintainability difficult.
- **Fix Suggestion:** Refactor `app.js` to decouple the UI from state management. Consider encapsulating data cleaning logic into a pure module (`cleaner.js`) that takes inputs and returns outputs independently of DOM elements.

### LOW

**1. Developer Experience and Contribution Guidelines**
- **File:** `README.md`
- **Impact:** The repository lacks documentation on how to run the project locally for development. Because it uses a Service Worker (`sw.js`), opening `index.html` via the `file://` protocol may cause issues due to browser security restrictions.
- **Fix Suggestion:** Add a "Local Development" section in `README.md` instructing developers to use a local web server (e.g., `npx serve` or `python -m http.server`).

## Positive Observations
- **Security (XSS):** The use of `.textContent` completely mitigates XSS risks when rendering arbitrary CSV data in the HTML table.
- **Security (CSV Injection):** `escapeCsvFormula` effectively mitigates CSV injection (CWE-1236) by proactively escaping fields starting with `=`, `+`, `-`, or `@`.
- **UX & Resiliency:** The PWA implementation (`sw.js`) and graceful degradation logic for external dependencies (PapaParse/ECharts loading checks) are well thought out.
- **Performance:** Table rendering correctly limits output to the first 100 rows via `rows.slice(0, 100)`, effectively preventing DOM freezes on large CSV uploads.
