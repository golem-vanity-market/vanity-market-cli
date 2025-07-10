#!/usr/bin/env python3
"""
Simple Google Sheets Status Reader using Sheets API v4

Reads from: https://docs.google.com/spreadsheets/d/13PALoUwM0zfAaME66HackqH3LiffFHjEpYCIafYGnVo/edit?gid=1248582987#gid=1248582987&range=A3:A50

Usage:
    export GOOGLE_APPLICATION_CREDENTIALS=/home/eb/.config/gcloud/application_default_credentials.json
    python read_status.py
"""

import google.auth
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

SPREADSHEET_ID = "13PALoUwM0zfAaME66HackqH3LiffFHjEpYCIafYGnVo"
RANGE_NAME = "A3:A50"


def read_status():
    """Read status data from Google Sheets"""
    creds, _ = google.auth.default()

    try:
        service = build("sheets", "v4", credentials=creds)

        result = (
            service.spreadsheets()
            .values()
            .get(spreadsheetId=SPREADSHEET_ID, range=RANGE_NAME)
            .execute()
        )

        values = result.get("values", [])
        print(f"Retrieved {len(values)} rows from range {RANGE_NAME}")

        for i, row in enumerate(values, start=3):
            if row and row[0]:  # Only print non-empty cells
                print(f"A{i}: {row[0]}")

        return values

    except HttpError as error:
        print(f"An error occurred: {error}")
        return None


if __name__ == "__main__":
    read_status()
