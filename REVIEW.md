# Code Review: P11-csv-cleaner

## Summary
The P11 CSV Cleaner is a well-structured, zero-dependency, pure client-side data cleaning tool. It correctly prioritizes local-only processing and avoids common XSS pitfalls by relying on `textContent` for DOM updates. CSV injection mitigation is also proactively handled. However, there is a bug in the charting logic that should be addressed.

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

## Positive Observations
- **Security (XSS):** The use of `.textContent` completely mitigates XSS risks when rendering arbitrary CSV data in the HTML table.
- **Security (CSV Injection):** `escapeCsvFormula` effectively mitigates CSV injection (CWE-1236) by proactively escaping fields starting with `=`, `+`, `-`, or `@`.
- **UX & Resiliency:** The PWA implementation (`sw.js`) and graceful degradation logic for external dependencies (PapaParse/ECharts loading checks) are well thought out.
- **Performance:** Table rendering correctly limits output to the first 100 rows via `rows.slice(0, 100)`, effectively preventing DOM freezes on large CSV uploads.
