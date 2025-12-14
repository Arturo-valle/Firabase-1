# Scripts Directory

This directory contains maintenance and debugging scripts for the MVP-NIC-MARKET project.
Previously, these scripts were scattered in the project root.

## Structure

- **`maintenance/`**: Scripts for routine tasks, data backfilling, and general database maintenance.
  - Example: `analyze_issuers.js`, `fix-issuers.js`
- **`debug/`**: Scripts for one-off debugging, analyzing specific issues, or testing small pieces of logic.
  - Example: `debug_bdf_extraction.js`, `check_vector_health.js`
- **`logs/`**: Output files from scripts (.txt, .csv) to keep the root clean.

## Usage

To run a script, navigate to the project root and run:

```bash
node scripts/maintenance/NAME_OF_SCRIPT.js
```

**Note**: You may need to adjust relative paths inside these scripts if they reference files in `functions/` or `webapp/`.
