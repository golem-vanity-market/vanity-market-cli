#!/usr/bin/env python3
"""
JIRA Timetracker API client for fetching time entries.

Usage: uv run fetch_timetracker.py <user_id> <start_date> <end_date>
Example: uv run fetch_timetracker.py 712020:907c1770-daad-499f-977c-ab455303bdd1 2025-07-01 2025-07-31
"""

import argparse
import json
import os
import sys
from datetime import datetime
from typing import Any, Dict

import requests


def validate_date(date_str: str) -> str:
    """Validate date format (YYYY-MM-DD)."""
    try:
        datetime.strptime(date_str, "%Y-%m-%d")
        return date_str
    except ValueError:
        raise argparse.ArgumentTypeError(
            f"Invalid date format: {date_str}. Use YYYY-MM-DD"
        )


def fetch_timetracker_data(
    api_token: str,
    user_id: str,
    start_date: str,
    end_date: str,
) -> Dict[str, Any]:
    """
    Fetch time tracking data from Everit JIRA Timetracker Plugin API.

    Args:
        api_token: API token for authentication
        user_id: User account ID
        start_date: Start date in YYYY-MM-DD format
        end_date: End date in YYYY-MM-DD format

    Returns:
        Dictionary containing the API response

    Raises:
        requests.RequestException: If API request fails
    """
    base_url = "https://jttp-cloud.everit.biz/timetracker/api/latest"

    endpoint = f"{base_url}/public/report/details"

    headers = {
        "x-everit-api-key": api_token,
        "x-timezone": "Europe/Warsaw",
        "Content-Type": "application/json",
    }

    payload = {
        "startDate": start_date,
        "endDate": end_date,
        "users": [user_id],
        "maxResults": 1000,
        "startAt": 0,
    }

    print(f"Fetching time entries from {start_date} to {end_date} for user {user_id}")
    print(f"Debug - Endpoint: {endpoint}")
    print(f"Debug - Payload: {json.dumps(payload, indent=2)}")

    try:
        response = requests.post(endpoint, headers=headers, json=payload, timeout=30)
        print(f"Debug - Response status: {response.status_code}")

        response.raise_for_status()

        data = response.json()
        print(f"Successfully fetched {len(data.get('values', []))} entries")

        return data

    except requests.exceptions.RequestException as e:
        print(f"Error fetching data from API: {e}", file=sys.stderr)
        if hasattr(e, "response") and e.response is not None:
            print(f"Response: {e.response.text}", file=sys.stderr)
            print(f"Response headers: {dict(e.response.headers)}", file=sys.stderr)
        raise


def save_json_data(data: Dict[str, Any], output_path: str) -> None:
    """Save data to JSON file with proper formatting."""
    try:
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False, sort_keys=True)
        print(f"Data saved to: {output_path}")
    except (OSError, IOError) as e:
        print(f"Error saving file {output_path}: {e}", file=sys.stderr)
        raise


def create_output_filename(start_date: str, end_date: str) -> str:
    """Create output filename based on date range."""
    start_dt = datetime.strptime(start_date, "%Y-%m-%d")
    end_dt = datetime.strptime(end_date, "%Y-%m-%d")

    if start_dt.year == end_dt.year and start_dt.month == end_dt.month:
        return f"time_tracking_{start_dt.year:04d}{start_dt.month:02d}.json"
    else:
        return f"time_tracking_{start_date}_to_{end_date}.json"


def main() -> None:
    """Main entry point for the script."""
    parser = argparse.ArgumentParser(
        description="Fetch JIRA time tracking entries from Everit Timetracker Plugin",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Fetch July 2025 entries for Wojciech Barczyński
  uv run fetch_timetracker.py 712020:907c1770-daad-499f-977c-ab455303bdd1 2025-07-01 2025-07-31
  
  # Fetch custom date range
  uv run fetch_timetracker.py <user_id> 2025-06-01 2025-06-30
        """,
    )

    parser.add_argument(
        "user_id",
        help="JIRA user account ID (e.g., 712020:907c1770-daad-499f-977c-ab455303bdd1)",
    )
    parser.add_argument(
        "start_date",
        type=validate_date,
        help="Start date in YYYY-MM-DD format",
    )
    parser.add_argument(
        "end_date",
        type=validate_date,
        help="End date in YYYY-MM-DD format",
    )
    parser.add_argument(
        "-o",
        "--output",
        help="Output filename (defaults to time_tracking_YYYYMM.json)",
    )

    args = parser.parse_args()

    # Get API token from environment
    api_token = os.getenv("TR_TOKEN")
    if not api_token:
        print("Error: TR_TOKEN environment variable is not set", file=sys.stderr)
        print(
            "Please set your Everit API token: export TR_TOKEN=<your_token>",
            file=sys.stderr,
        )
        print(
            "Note: You can get the API token from JIRA > My Preferences > REST API tab",
            file=sys.stderr,
        )
        sys.exit(1)

    print(
        f"Debug - Using API token: {'*' * (len(api_token) - 4) + api_token[-4:] if len(api_token) > 4 else '***'}"
    )

    # Validate date range
    start_dt = datetime.strptime(args.start_date, "%Y-%m-%d")
    end_dt = datetime.strptime(args.end_date, "%Y-%m-%d")
    if start_dt > end_dt:
        print("Error: Start date must be before or equal to end date", file=sys.stderr)
        sys.exit(1)

    # Generate output filename if not provided
    output_filename = args.output or create_output_filename(
        args.start_date, args.end_date
    )

    try:
        # Fetch data from API
        data = fetch_timetracker_data(
            api_token, args.user_id, args.start_date, args.end_date
        )

        # Add metadata to the response
        enhanced_data = {
            "metadata": {
                "user_id": args.user_id,
                "start_date": args.start_date,
                "end_date": args.end_date,
                "fetched_at": datetime.now().isoformat(),
                "total_entries": len(data.get("values", [])),
            },
            "api_response": data,
        }

        # Save to file
        save_json_data(enhanced_data, output_filename)

        print(f"✓ Successfully exported time tracking data")
        print(f"  Period: {args.start_date} to {args.end_date}")
        print(f"  User: {args.user_id}")
        print(f"  Entries: {enhanced_data['metadata']['total_entries']}")
        print(f"  File: {output_filename}")

    except Exception as e:
        print(f"Failed to fetch time tracking data: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
