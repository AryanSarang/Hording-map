# Perplexity prompt: Convert client media sheet to our import format

Copy the block below and paste it into Perplexity. Then attach:
1. **Client's media sheet** (CSV or Excel) – the file you received from the client.
2. **Our sample sheet** – the CSV template you downloaded from our app (Vendor → Media → Download CSV template), or the sample row described in the prompt.

---

## Prompt (copy from here)

```
I have two files:
1. A media sheet from my client (their format, their column names).
2. Our required CSV format (sample/example attached or described below).

TASK: Convert the client’s sheet so it matches our format exactly. Output a single CSV that I can upload to our system.

RULES:
- Use our column names and order exactly. Column names are case-sensitive and lowercase unless shown otherwise.
- For each column, use the data type and rules below. If the client’s sheet doesn’t have a column we need, leave that cell empty or use the default value listed.
- Map the client’s columns to ours by meaning (e.g. “City” → city, “POC Name” → poc_name). If something is unclear, leave empty or use a sensible default.
- Keep the same number of data rows as the client’s sheet (one row per media/location).
- For optional columns with no client data, leave empty unless a default is specified.
- Our database has several extra columns that are NOT required (e.g. display_format, screen_placement, slot_time, loop_time). These must still appear as column headers in the CSV so the file matches our format, but leave the cells empty when the client does not provide that data. Do not guess or invent values for these.

OUR FORMAT – COLUMNS AND FIELD TYPES
(Use these exact header names in this order. Types and defaults below.)

REQUIRED (must have a value for every row; if client data is missing, use empty string or the default):

| Column name                | Type     | Default if missing | Notes |
|---------------------------|----------|--------------------|--------|
| city                      | text     | (empty)            | Required. |
| state                     | text     | (empty)            | Required. |
| address                   | text     | (empty)            | Required. |
| latitude                  | decimal  | (empty)            | Required. Number between -90 and 90. |
| longitude                 | decimal  | (empty)            | Required. Number between -180 and 180. |
| poc_name                  | text     | (empty)            | Point of contact name. Required. |
| poc_number                | text     | (empty)            | Phone. Required. |
| minimum_booking_duration  | text     | (empty)            | e.g. "1 month", "1 week". Required. |
| media_type                | text     | (empty)            | Required. Must be exactly one of: Bus Shelter, Digital Screens, Residential, Corporate, Corporate Coffee Machines, Croma Stores, ATM, other. |

OPTIONAL / NOT REQUIRED (our database has these columns; include them in the header but leave empty if client has no data; use default only when specified):

| Column name           | Type    | Default if missing | Notes |
|-----------------------|---------|--------------------|--------|
| landmark              | text    | (empty)            | |
| pincode               | text    | (empty)            | |
| zone                  | text    | (empty)            | |
| road_name             | text    | (empty)            | |
| road_from             | text    | (empty)            | |
| road_to               | text    | (empty)            | |
| position_wrt_road     | text    | (empty)            | |
| poc_email             | text    | (empty)            | |
| vendor_id             | text    | (empty)            | Owner/vendor ID if we use it; else leave empty. |
| monthly_rental        | integer | (empty)            | Numeric only. |
| vendor_rate           | integer | (empty)            | Numeric only. |
| payment_terms         | text    | (empty)            | e.g. "Net 30". |
| width                 | integer | (empty)            | Numeric only. |
| height                | integer | (empty)            | Numeric only. |
| images                | text    | (empty)            | Multiple URLs separated by pipe: url1\|url2\|url3. |
| screen_size           | text    | (empty)            | |
| screen_number         | integer | (empty)            | Numeric only. |
| screen_placement      | text    | (empty)            | e.g. Residential, Corporate, Cinema (for Digital Screens). |
| display_format        | text    | (empty)            | LED, Front Lit, Back lit, Ambient Lit. |
| slot_time             | text    | (empty)            | e.g. "10 sec". |
| loop_time             | text    | (empty)            | e.g. "2 min". |
| display_hours         | text    | (empty)            | e.g. "8am-10pm". |
| traffic_type          | text    | (empty)            | |
| visibility            | text    | (empty)            | Default "Prime" if we need one: Prime, High, Medium, Low. |
| dwell_time            | text    | (empty)            | |
| condition             | text    | (empty)            | |
| previous_clientele    | text    | (empty)            | |
| status                | text    | (empty)            | Must be one of: active, inactive, maintenance. Default "active". |
| pricing               | text    | (empty)            | JSON array. Example: [{"price_name":"1 Week","price":15000,"duration":"1 week"},{"price_name":"1 Month","price":50000,"duration":"1 month"}]. If client has price/duration in other columns, build this JSON. |

METAFIELD COLUMNS (optional; include only if our sample has them):
- Header format: metafield.<key> where <key> is the metafield key (e.g. metafield.traffic_pattern).
- Type: text.
- If client has no equivalent, leave cell empty.
- Only include metafield columns that appear in our sample/template.

OUTPUT:
- One CSV with our header row exactly as above (same order, same names), then one row per client row.
- Use comma as separator. If a value contains comma, newline, or double quote, wrap it in double quotes and escape internal quotes by doubling them.
- Return the full CSV so I can save it as a .csv file and upload it.
```

---

## Tips

- If you use the **downloaded CSV template** from the app as “our sample”, attach it so Perplexity sees the exact header order and any `metafield.*` columns.
- After conversion, open the CSV in a spreadsheet app and check required columns (city, state, address, latitude, longitude, poc_name, poc_number, minimum_booking_duration, media_type) have values before uploading.
