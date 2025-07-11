#!/usr/bin/env python3
"""
Google Docs Downloader Script

Simple script to download Google Docs content to local files.
Similar to the gsheets module but for Google Docs.

Usage:
    export GOOGLE_APPLICATION_CREDENTIALS=/home/eb/.config/gcloud/application_default_credentials.json
    uv run download_doc.py <document_id> [--format=format] [--output=filename]

Examples:
    uv run download_doc.py 1uQCl548xVI7DX_ykY_yxzahHhkkv8ODGJtpJk1FIeLg
    uv run download_doc.py 1uQCl548xVI7DX_ykY_yxzahHhkkv8ODGJtpJk1FIeLg --format=json --output=design_doc.json
"""

import argparse
import json
import sys
from pathlib import Path

import google.auth
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError


class GoogleDocsDownloader:
    """Downloads Google Docs content using the Google Docs API and Drive API."""

    def __init__(self):
        """Initialize the downloader with Application Default Credentials."""
        self.docs_service = None
        self.drive_service = None
        self._authenticate()

    def _authenticate(self):
        """Authenticate with Google APIs using Application Default Credentials."""
        try:
            creds, _ = google.auth.default()
            self.docs_service = build("docs", "v1", credentials=creds)
            self.drive_service = build("drive", "v3", credentials=creds)
        except Exception as e:
            print(f"Error: Failed to authenticate with Google APIs: {e}")
            print(
                "Please run: gcloud auth application-default login --scopes='https://www.googleapis.com/auth/documents.readonly','https://www.googleapis.com/auth/drive.readonly','https://www.googleapis.com/auth/cloud-platform'"
            )
            print(
                "Or set: export GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json"
            )
            sys.exit(1)

    def get_document_title(self, document_id: str) -> str:
        """Get the title of a Google Doc."""
        try:
            document = (
                self.docs_service.documents().get(documentId=document_id).execute()
            )
            return document.get("title", "Untitled Document")
        except HttpError as error:
            print(f"Error retrieving document title: {error}")
            return "Untitled Document"

    def download_as_json(self, document_id: str) -> str:
        """Download the full Google Doc structure as JSON."""
        try:
            document = (
                self.docs_service.documents().get(documentId=document_id).execute()
            )
            return json.dumps(document, indent=2)
        except HttpError as error:
            print(f"Error downloading document: {error}")
            return "{}"

    def download_as_odt(self, document_id: str) -> bytes:
        """Download Google Doc as ODT format using Drive API export."""
        try:
            request = self.drive_service.files().export_media(
                fileId=document_id, mimeType="application/vnd.oasis.opendocument.text"
            )
            return request.execute()
        except HttpError as error:
            print(f"Error downloading document as ODT: {error}")
            return b""


def main():
    """Main function to handle command line arguments and download docs."""
    parser = argparse.ArgumentParser(
        description="Download Google Docs content",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  uv run download_doc.py 1uQCl548xVI7DX_ykY_yxzahHhkkv8ODGJtpJk1FIeLg
  uv run download_doc.py 1uQCl548xVI7DX_ykY_yxzahHhkkv8ODGJtpJk1FIeLg --format=json
  uv run download_doc.py 1uQCl548xVI7DX_ykY_yxzahHhkkv8ODGJtpJk1FIeLg --output=design_doc.odt
        """,
    )

    parser.add_argument("document_id", help="Google Doc ID (from URL)")
    parser.add_argument(
        "--format",
        choices=["json", "odt"],
        default="odt",
        help="Output format (default: odt)",
    )
    parser.add_argument(
        "--output", help="Output filename (default: auto-generated based on doc title)"
    )

    args = parser.parse_args()

    # Initialize downloader
    try:
        downloader = GoogleDocsDownloader()
    except Exception as e:
        print(f"Error initializing downloader: {e}")
        sys.exit(1)

    # Get document title for auto-naming
    title = downloader.get_document_title(args.document_id)
    print(f"Document title: {title}")

    # Download content based on format
    if args.format == "json":
        content = downloader.download_as_json(args.document_id)
        extension = ".json"
        is_binary = False
    elif args.format == "odt":
        content = downloader.download_as_odt(args.document_id)
        extension = ".odt"
        is_binary = True

    if not content:
        print("No content retrieved. Check document ID and permissions.")
        sys.exit(1)

    # Determine output filename
    if args.output:
        output_file = args.output
    else:
        # Create safe filename from title
        safe_title = "".join(
            c for c in title if c.isalnum() or c in (" ", "-", "_")
        ).rstrip()
        safe_title = safe_title.replace(" ", "_")[:50]  # Limit length
        output_file = f"{safe_title}_{args.document_id[:8]}{extension}"

    # Write to file
    try:
        if is_binary:
            Path(output_file).write_bytes(content)
            print(f"Successfully downloaded to: {output_file}")
            print(f"File size: {len(content)} bytes")
        else:
            Path(output_file).write_text(content, encoding="utf-8")
            print(f"Successfully downloaded to: {output_file}")
            print(f"File size: {len(content)} characters")
    except Exception as e:
        print(f"Error writing file: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
