# Google Sheets Integration

This directory contains scripts for reading data from the project's Google Spreadsheet.

## Setup

1. **Install dependencies:**

   ```bash
   cd z_projectmanagement/gsheets
   uv sync
   ```

2. **Set up authentication:**

   Choose one of the following methods:
   - `gcloud auth application-default login --scopes='https://www.googleapis.com/auth/spreadsheets','https://www.googleapis.com/auth/cloud-platform'`
   - `export GOOGLE_APPLICATION_CREDENTIALS=/home/eb/.config/gcloud/application_default_credentials.json`
   - `python3 read_status.py`

   ## Docs
   - https://developers.google.com/workspace/sheets/api/guides/values#python
