# Google Docs Downloader

Simple utility to download Google Docs content using the Google Docs API.

## Setup

1. **Install dependencies:**

   ```bash
   cd z_projectmanagement/gdocs
   uv sync
   ```

2. **Set up authentication:**

   Choose one of the following methods:
   - `gcloud auth application-default login --scopes='https://www.googleapis.com/auth/documents.readonly','https://www.googleapis.com/auth/drive.readonly','https://www.googleapis.com/auth/cloud-platform'`
   - `export GOOGLE_APPLICATION_CREDENTIALS=/home/eb/.config/gcloud/application_default_credentials.json`

## Usage

Download a Google Doc by ID:

```bash
# Download as ODT (default format)
uv run download_doc.py 1uQCl548xVI7DX_ykY_yxzahHhkkv8ODGJtpJk1FIeLg

# Download as JSON structure
uv run download_doc.py 1uQCl548xVI7DX_ykY_yxzahHhkkv8ODGJtpJk1FIeLg --format=json

# Specify output filename
uv run download_doc.py 1uQCl548xVI7DX_ykY_yxzahHhkkv8ODGJtpJk1FIeLg --output=design_doc.odt
```

## Project Documents

- **Design Doc**: `1uQCl548xVI7DX_ykY_yxzahHhkkv8ODGJtpJk1FIeLg`
- **Product Spec**: `10MnCkt5k9sX0xF7sOUCUnMFIOLZIuS_L_G3xe9k4ZXI`

## Finding Document ID

The document ID is the long string in the Google Docs URL:

```
https://docs.google.com/document/d/1uQCl548xVI7DX_ykY_yxzahHhkkv8ODGJtpJk1FIeLg/edit
                                  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                  This is the document ID
```

## Output Formats

- `odt`: OpenDocument Text format (default) - binary file that preserves all formatting
- `json`: Full document structure as JSON for programmatic access

## Authentication

Uses Application Default Credentials (same as gsheets module). Authentication is handled automatically after running the gcloud auth command.

## Docs

- https://developers.google.com/workspace/docs/api/quickstart/python
