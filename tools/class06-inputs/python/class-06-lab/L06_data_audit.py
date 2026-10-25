# %% [markdown]
# # L06 · Know your data before changing it
#
# Paste the sections you need into your **existing research notebook**. This is a
# reusable audit, not a new project or an automatic cleaning recipe. Start with your
# own research question and CSV. Do not install anything for this starter; it uses
# standard Python and pandas in your existing notebook environment.
#
# **Today’s result:** one clear question, a description of one row, a small verified
# sample, and one evidence-based decision. You do not need a model to make progress.
#
# ### A small first run
#
# 1. Open your continuing notebook and add an **L06** heading. Copy the setup cell
#    and the cells in sections **1, 2 and 3** below it, in that order.
# 2. Download your chosen file. If it comes in a ZIP, extract the intended table.
#    In Colab, upload that file through the Files panel and copy its path into
#    `SOURCE_PATH`. A file on your laptop is not automatically inside Colab.
# 3. Set the separator/encoding to match the file. Does its first row contain
#    column names? Keep `HAS_HEADER = True` if yes. If not, set it to `False` and
#    put the exact documented names in `COLUMN_NAMES`; ask AI or your instructor
#    to help check their order against the codebook. Do not delete the first row.
# 4. Run setup, load, sample, then missingness. If something fails, keep the exact
#    error and ask for help. Show your row/column counts and one inspected record.
#    Stop here for your first consultation if needed.
# 5. Add the repeat/key and range/category checks only when they fit your question.
#    Configure them with your codebook and AI/instructor help. All seven code cells
#    are **not** required for a first checkpoint. The decision cell can run after
#    the first four cells; skipped checks will be recorded as not run.
#
# For JSON, spreadsheets, images or signals, first agree on a suitable table or
# manifest loader with your instructor. Renaming the extension to `.csv` does not
# convert a file. Ask AI to adapt **one cell at a time**, explain the change, then
# wait for your actual output. Do not paste private records into an external chat.
#
# The original file stays unchanged. All fields initially stay as text so IDs such
# as `0012` and codes such as `NA` remain visible. Numeric checks use separate views.

# %%
from pathlib import Path
from datetime import datetime, timezone
import csv
import hashlib
import json
import pandas as pd

# EDIT THESE for your own question and source. This path is a placeholder.
SOURCE_PATH = Path("YOUR_DATA.csv")
QUESTION = ""             # What do you want to find out?
ONE_ROW = ""              # One shot? One story rating? One institution?
SOURCE_REFERENCE = ""     # Source URL, citation, or how you collected the data.
MEASUREMENT_PERIOD = ""   # When were the observations measured?
CODEBOOK_REFERENCE = ""   # Where are the field meanings/codes defined?
CSV_ENCODING = "utf-8"
CSV_SEPARATOR = ","
HAS_HEADER = True         # Does the FIRST record contain the column names?
COLUMN_NAMES = []         # If False above, supply exact codebook names, in order.

# Fill these only after inspecting the file and its codebook. Keep exact spelling.
KEY_COLUMNS = []          # Only if these fields SHOULD identify one record.
REVIEW_COLUMNS = []       # Small set of fields whose values you want to inspect.
MISSING_CODES = {}        # Example: {"score": ["-999"]}, ONLY if the codebook says so.
RANGE_RULES = {}          # Example: {"rating": {"min": 1, "max": 5, "units": "points"}}
ALLOWED_VALUES = {}       # Example: {"choice": ["human", "AI", "unsure"]}

# These are examples of configuration, not assumptions about your dataset.
# Do not treat zero, "NA", -999, or repeated rows as errors without evidence.

# %% [markdown]
# ## 1 · Preserve the source and inspect the table
#
# Run this after choosing your CSV. A SHA-256 fingerprint lets you check that the
# same source bytes were used later. It does not prove that the data are accurate.
# CSV parsing is separate from deciding what a field means. Duplicate or empty
# column headers need a source review; this starter will not rename them for you.
# For a headerless source, `HAS_HEADER = False` and `COLUMN_NAMES` keep the first
# data record. If the printed column names look like observations, stop and check
# the header setting before interpreting any counts.

# %%
def sha256_file(path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()

if not SOURCE_PATH.is_file():
    raise FileNotFoundError("Set SOURCE_PATH to your own existing CSV, then rerun.")
source_sha256 = sha256_file(SOURCE_PATH)

with SOURCE_PATH.open(encoding=CSV_ENCODING, newline="") as handle:
    first_record = next(csv.reader(handle, delimiter=CSV_SEPARATOR), [])
if not isinstance(HAS_HEADER, bool):
    raise ValueError("Set HAS_HEADER to True or False after checking the first record.")
if HAS_HEADER and COLUMN_NAMES:
    raise ValueError("Leave COLUMN_NAMES empty when the file already has a header.")
header = first_record if HAS_HEADER else COLUMN_NAMES
if not header or any(not isinstance(name, str) or name == "" for name in header) or len(header) != len(set(header)):
    raise ValueError("Review the source: column headers must be present and unique.")
if not HAS_HEADER and len(first_record) != len(COLUMN_NAMES):
    raise ValueError("COLUMN_NAMES must match the number of fields in the first data record.")

raw = pd.read_csv(
    SOURCE_PATH, sep=CSV_SEPARATOR, encoding=CSV_ENCODING,
    header=0 if HAS_HEADER else None, names=None if HAS_HEADER else COLUMN_NAMES,
    dtype=str, keep_default_na=False, na_filter=False, skip_blank_lines=False,
)
assert list(raw.columns) == header, "Parser/header mismatch: inspect the CSV structure."
assert sha256_file(SOURCE_PATH) == source_sha256, "Source changed while being read."
n_rows = len(raw)
AUDIT_CHECK_STATUS = {
    "load": "run", "sample_drawn": "not run", "missingness": "not run",
    "repeats": "not run", "key_check": "not run",
    "range_rules": "not run", "allowed_values": "not run",
}
print("Source:", SOURCE_PATH.name)
print("SHA-256:", source_sha256)
print("Rows:", n_rows, "Columns:", len(raw.columns))
print("Question:", QUESTION or "Not specified yet")
print("One row:", ONE_ROW or "Not specified yet")
print(raw.head(5).to_string(index=False))

# %% [markdown]
# ## 2 · Verify a small sample by hand
#
# Read these records against the original source. Explain one field’s meaning,
# units, and allowed values. Check at least one value or calculation by hand.
# The same seed selects the same sample when the input row order stays the same.
# **CSV record position** below counts data records from 1; it is not a physical
# text-file line number, because a quoted CSV field can contain a newline.
#
# Write down what you actually checked. An empty review list means “not checked,”
# not “passed.” A sample cannot establish that every record is correct.

# %%
sample = raw.sample(n=min(5, n_rows), random_state=6).copy()
sample.index = sample.index + 1
sample.index.name = "CSV record position"
print(sample.to_string())
AUDIT_CHECK_STATUS["sample_drawn"] = "run"

MANUAL_CHECKS = []
# Add your actual checks, for example:
# MANUAL_CHECKS = [{"record_position": 3, "field": "rating",
#                   "source_value": "4", "check": "Matches original response",
#                   "result": "match", "remaining_question": "Scale definition?"}]

# %% [markdown]
# ## 3 · Count missing information with its denominator
#
# An empty field, whitespace, and a code like `-999` are different observations.
# Only add a token to `MISSING_CODES` after its meaning is confirmed in the codebook.
# Nothing here replaces, trims, fills or drops a value. Whitespace-only values are
# listed separately and are not silently classified as missing.
#
# The reported percentage is **(blank or codebook-missing fields) / all rows** for
# each column. “No rows” has no percentage. Ask whether missingness could change
# the comparison you want to make.

# %%
configured_columns = set(KEY_COLUMNS + REVIEW_COLUMNS)
configured_columns.update(MISSING_CODES)
configured_columns.update(RANGE_RULES)
configured_columns.update(ALLOWED_VALUES)
unknown_columns = configured_columns - set(raw.columns)
if unknown_columns:
    raise ValueError(f"Check your column names: {sorted(unknown_columns)}")
if MISSING_CODES and not CODEBOOK_REFERENCE.strip():
    raise ValueError("Record CODEBOOK_REFERENCE before assigning missing-code meanings.")
if any(not isinstance(token, str) for codes in MISSING_CODES.values() for token in codes):
    raise ValueError("Write missing codes as exact strings, for example '-999'.")

blank = raw.eq("")
whitespace_only = raw.apply(lambda column: column.str.fullmatch(r"\s+", na=False))
codebook_missing = pd.DataFrame(False, index=raw.index, columns=raw.columns)
for column, codes in MISSING_CODES.items():
    codebook_missing[column] = raw[column].isin(codes)
audit_missing = blank | codebook_missing

missing_report = pd.DataFrame({
    "all_rows": n_rows,
    "blank_fields": blank.sum(),
    "codebook_missing_fields": codebook_missing.sum(),
    "blank_or_codebook_missing": audit_missing.sum(),
    "whitespace_only_review": whitespace_only.sum(),
})
missing_report["blank_or_codebook_missing_pct"] = (
    (100 * audit_missing.sum() / n_rows).round(1) if n_rows else float("nan")
)
print(missing_report.to_string())
AUDIT_CHECK_STATUS["missingness"] = "run"
for column in REVIEW_COLUMNS:
    print("\nExact values to review:", column)
    # repr makes empty strings and surrounding spaces visible.
    print(raw[column].map(repr).value_counts(dropna=False).head(12).to_string())

# %% [markdown]
# ## 4 · Investigate repeats before deciding what they mean
#
# Repeated rows might be valid repeated events or repeated measurements. A key is
# only meaningful if the study design says it identifies one record. For example,
# one person can rate several stories; a person ID alone should then repeat.
# These checks flag candidates for review. They do not delete records.

# %%
repeat_report = {
    "all_rows": n_rows,
    "rows_in_exact_repeat_sets": int(raw.duplicated(keep=False).sum()),
    "exact_repeats_after_first": int(raw.duplicated(keep="first").sum()),
}
if KEY_COLUMNS:
    key_is_reported = ~audit_missing[KEY_COLUMNS].any(axis=1)
    reported_keys = raw.loc[key_is_reported, KEY_COLUMNS]
    repeat_report.update({
        "rows_with_reported_key": int(key_is_reported.sum()),
        "rows_with_blank_or_missing_key": int((~key_is_reported).sum()),
        "rows_in_repeated_key_sets": int(reported_keys.duplicated(keep=False).sum()),
    })
else:
    print("No key test: choose a key only after defining one row.")
print(repeat_report)
AUDIT_CHECK_STATUS["repeats"] = "run"
AUDIT_CHECK_STATUS["key_check"] = "run" if KEY_COLUMNS else "not configured"

# %% [markdown]
# ## 5 · Check only rules that fit your data
#
# Configure ranges with the source’s units and definitions. Numeric conversion
# happens in a separate audit view; `raw` remains text. A failed conversion may be
# a format or unit issue, not an invalid observation. Bounds are inclusive.
# Range-check denominators count numeric values; missing and nonnumeric values
# are reported separately. Allowed-value checks use exact case and spacing.

# %%
range_results = []
for column, rule in RANGE_RULES.items():
    reported = ~audit_missing[column]
    numeric_view = pd.to_numeric(raw[column].mask(~reported), errors="coerce")
    numeric_ok = numeric_view.notna()
    outside = pd.Series(False, index=raw.index)
    if rule.get("min") is not None:
        outside |= numeric_ok & (numeric_view < rule["min"])
    if rule.get("max") is not None:
        outside |= numeric_ok & (numeric_view > rule["max"])
    if rule.get("min") is not None and rule.get("max") is not None and rule["min"] > rule["max"]:
        raise ValueError(f"Minimum exceeds maximum for {column}.")
    range_results.append({
        "column": column, "units": rule.get("units", "not specified"),
        "all_rows": n_rows, "blank_or_codebook_missing": int((~reported).sum()),
        "numeric_values_tested": int(numeric_ok.sum()),
        "reported_but_nonnumeric": int((reported & ~numeric_ok).sum()),
        "outside_configured_range": int(outside.sum()),
    })
range_report = pd.DataFrame(range_results)
print(range_report.to_string(index=False) if range_results else "No range rules configured.")

allowed_results = []
for column, allowed in ALLOWED_VALUES.items():
    reported = ~audit_missing[column]
    outside = reported & ~raw[column].isin(allowed)
    allowed_results.append({
        "column": column, "reported_values_tested": int(reported.sum()),
        "outside_allowed_values": int(outside.sum()),
    })
allowed_report = pd.DataFrame(allowed_results)
print(allowed_report.to_string(index=False) if allowed_results else "No allowed-value rules configured.")
AUDIT_CHECK_STATUS["range_rules"] = "run" if RANGE_RULES else "not configured"
AUDIT_CHECK_STATUS["allowed_values"] = "run" if ALLOWED_VALUES else "not configured"

# %% [markdown]
# ## 6 · Make one defensible decision
#
# Choose one issue that matters to your research question. You may decide to keep
# the data as-is, ask the source owner, collect a missing definition, or make a
# documented change later in a separate working table. Explain the evidence and
# how you will verify that decision. **Do not change the source file.**
#
# The export is optional and off by default. It saves the audit and your notes,
# not a cleaned dataset. Use a new folder each time and keep the source reference
# and hash with the work. Review any output before sharing it.
# You can run this cell after setup, load, sample and missingness even if you have
# not run the optional repeat or range checks. An unrun check is not a passed check.

# %%
DECISIONS = []
# Add an actual decision, for example:
# DECISIONS = [{"issue": "Some values are blank", "evidence": "See missing_report",
#               "decision": "Keep blanks while asking how they were collected",
#               "reason": "Blank is not known to mean zero", "verification": "Check codebook",
#               "remaining_uncertainty": "Why these records are blank"}]

assert sha256_file(SOURCE_PATH) == source_sha256, "Source changed: investigate before continuing."
print("Source bytes unchanged:", source_sha256)
print("Manual checks recorded:", len(MANUAL_CHECKS))
print("Decisions recorded:", len(DECISIONS))

WRITE_AUDIT_EXPORT = False
EXPORT_PARENT = Path("l06_audit")
if WRITE_AUDIT_EXPORT:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    destination = EXPORT_PARENT / f"audit-{stamp}"
    destination.mkdir(parents=True, exist_ok=False)
    audit_record = {
        "created_utc": stamp, "source_filename": SOURCE_PATH.name,
        "source_sha256": source_sha256, "source_reference": SOURCE_REFERENCE,
        "measurement_period": MEASUREMENT_PERIOD, "codebook_reference": CODEBOOK_REFERENCE,
        "question": QUESTION, "one_row": ONE_ROW, "rows": n_rows,
        "csv_settings": {"encoding": CSV_ENCODING, "separator": CSV_SEPARATOR,
                         "has_header": HAS_HEADER, "column_names": COLUMN_NAMES,
                         "all_fields_initially_text": True, "automatic_na_parsing": False},
        "rules": {"key_columns": KEY_COLUMNS, "missing_codes": MISSING_CODES,
                  "ranges": RANGE_RULES, "allowed_values": ALLOWED_VALUES},
        "check_status": AUDIT_CHECK_STATUS,
        "repeat_report": repeat_report if AUDIT_CHECK_STATUS["repeats"] == "run" else None,
        "manual_checks": MANUAL_CHECKS,
        "decisions": DECISIONS, "source_unchanged": True,
    }
    with (destination / "audit_record.json").open("x", encoding="utf-8") as handle:
        json.dump(audit_record, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    missing_report.to_csv(destination / "missing_report.csv", index_label="column")
    if AUDIT_CHECK_STATUS["range_rules"] == "run" and not range_report.empty:
        range_report.to_csv(destination / "range_report.csv", index=False)
    if AUDIT_CHECK_STATUS["allowed_values"] == "run" and not allowed_report.empty:
        allowed_report.to_csv(destination / "allowed_values_report.csv", index=False)
    print("Saved audit (not cleaned data) to:", destination)

# %% [markdown]
# ## Bring this to your consultation
#
# 1. My question is **…** and one row represents **…**.
# 2. I checked **…** source records and found **…**.
# 3. The denominator for my first comparison will be **…**.
# 4. My next decision is **…**, because **…**. I still need to verify **…**.
#
# An audit flag is a question to investigate. A successful run is not evidence
# that the dataset is complete, unbiased, independent, or suitable for every claim.
