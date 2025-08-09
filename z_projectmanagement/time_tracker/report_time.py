#!/usr/bin/env python3
"""
JIRA Timetracker API client for submitting work entries.

Usage: uv run report_time.py <work_date> <start_time> <description> <duration_minutes> <issue_id> [--tags tag1,tag2]
Example: uv run report_time.py 2025-07-15 09:30 "Fixed authentication bug" 120 13048 --tags bug,backend
"""

import argparse
import json
import os
import sys
from datetime import datetime, time
from typing import Any, Dict, List, Optional

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


def validate_time(time_str: str) -> str:
    """Validate time format (HH:MM)."""
    try:
        datetime.strptime(time_str, "%H:%M")
        return time_str
    except ValueError:
        raise argparse.ArgumentTypeError(
            f"Invalid time format: {time_str}. Use HH:MM (e.g., 09:30, 14:45)"
        )


def validate_duration(duration_str: str) -> int:
    """Validate duration is a positive integer (in minutes)."""
    try:
        duration = int(duration_str)
        if duration <= 0:
            raise ValueError("Duration must be positive")
        return duration
    except ValueError:
        raise argparse.ArgumentTypeError(
            f"Invalid duration: {duration_str}. Must be positive integer (minutes)"
        )


def validate_issue_id(issue_id_str: str) -> int:
    """Validate issue ID is a positive integer."""
    try:
        issue_id = int(issue_id_str)
        if issue_id <= 0:
            raise ValueError("Issue ID must be positive")
        return issue_id
    except ValueError:
        raise argparse.ArgumentTypeError(
            f"Invalid issue ID: {issue_id_str}. Must be positive integer (e.g., 13048)"
        )


def parse_tags(tags_str: Optional[str]) -> Optional[List[str]]:
    """Parse comma-separated tags string."""
    if not tags_str:
        return None
    return [tag.strip() for tag in tags_str.split(",") if tag.strip()]


def fetch_tag_ids(api_token: str, tag_names: List[str]) -> List[int]:
    """
    Fetch tag IDs from tag names using the Tag API.

    Args:
        api_token: API token for authentication
        tag_names: List of tag names to resolve to IDs

    Returns:
        List of numeric tag IDs

    Raises:
        requests.RequestException: If API request fails
        ValueError: If tag names cannot be found
    """
    base_url = "https://jttp-cloud.everit.biz/timetracker/api/latest"
    endpoint = f"{base_url}/public/tag"

    headers = {
        "x-everit-api-key": api_token,
        "x-timezone": "Europe/Warsaw",
    }

    print(f"Fetching tag IDs for: {', '.join(tag_names)}")

    try:
        # Get all available tags
        response = requests.get(endpoint, headers=headers, timeout=30)
        response.raise_for_status()

        response_data = response.json()
        
        # Extract tags from response (API returns wrapped in 'worklogTags')
        if isinstance(response_data, dict) and "worklogTags" in response_data:
            all_tags = response_data["worklogTags"]
        else:
            all_tags = response_data
            
        print(f"Debug - Found {len(all_tags)} total tags in system")

        # Create mapping of tag names to IDs (case-insensitive)
        tag_map = {}
        for tag in all_tags:
            if isinstance(tag, dict):
                if not tag.get("archived", False):  # Only use non-archived tags
                    tag_map[tag["name"].lower()] = tag["id"]
            else:
                print(f"Warning: Unexpected tag format: {tag}", file=sys.stderr)

        # Resolve tag names to IDs
        tag_ids = []
        missing_tags = []

        for tag_name in tag_names:
            tag_id = tag_map.get(tag_name.lower())
            if tag_id is not None:
                tag_ids.append(tag_id)
                print(f"✓ Tag '{tag_name}' → ID {tag_id}")
            else:
                missing_tags.append(tag_name)

        if missing_tags:
            available_tags = list(tag_map.keys())
            print(f"Available tags: {', '.join(available_tags)}", file=sys.stderr)
            raise ValueError(f"Tags not found: {', '.join(missing_tags)}")

        return tag_ids

    except requests.exceptions.RequestException as e:
        print(f"Error fetching tags: {e}", file=sys.stderr)
        if hasattr(e, "response") and e.response is not None:
            print(f"Response: {e.response.text}", file=sys.stderr)
        raise


def submit_work_entry(
    api_token: str,
    work_date: str,
    work_start_time: str,
    description: str,
    duration_minutes: int,
    issue_id: int,
    tag_names: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Submit work entry to Everit JIRA Timetracker Plugin API.

    Args:
        api_token: API token for authentication
        work_date: Work date in YYYY-MM-DD format
        work_start_time: Start time in HH:MM format
        description: Work description
        duration_minutes: Time spent in minutes
        issue_id: JIRA issue ID (e.g., 13048)
        tag_names: Optional list of worklog tag names

    Returns:
        Dictionary containing the API response

    Raises:
        requests.RequestException: If API request fails
    """
    base_url = "https://jttp-cloud.everit.biz/timetracker/api/latest"
    endpoint = f"{base_url}/public/worklog"

    headers = {
        "x-everit-api-key": api_token,
        "x-timezone": "Europe/Warsaw",
        "Content-Type": "application/json",
        "x-requested-by": "api-client",
    }

    # Convert minutes to seconds for API
    duration_seconds = duration_minutes * 60

    # Build payload for worklog creation
    payload = {
        "workDate": work_date,
        "workStartTime": work_start_time,
        "description": description,
        "durationInSeconds": duration_seconds,
        "issueId": issue_id,
    }

    # Fetch tag IDs if tag names provided
    if tag_names:
        try:
            tag_ids = fetch_tag_ids(api_token, tag_names)
            payload["worklogTagIds"] = tag_ids
        except (requests.RequestException, ValueError) as e:
            print(f"Warning: Could not resolve tags: {e}", file=sys.stderr)
            print("Proceeding without tags...", file=sys.stderr)

    # Calculate hours and minutes for display
    hours = duration_minutes // 60
    remaining_minutes = duration_minutes % 60

    if hours > 0:
        duration_display = (
            f"{hours}h {remaining_minutes}m" if remaining_minutes > 0 else f"{hours}h"
        )
    else:
        duration_display = f"{remaining_minutes}m"

    print(f"Submitting work entry for {work_date} starting at {work_start_time}")
    print(f"Issue ID: {issue_id}")
    print(f"Duration: {duration_minutes} minutes ({duration_display})")
    print(f"Description: {description}")
    if tag_names and "worklogTagIds" in payload:
        tag_display = f"{', '.join(tag_names)} (IDs: {payload['worklogTagIds']})"
        print(f"Tags: {tag_display}")
    elif tag_names:
        print(f"Tags: {', '.join(tag_names)} (failed to resolve)")
    print(f"Debug - Endpoint: {endpoint}")
    print(f"Debug - Payload: {json.dumps(payload, indent=2)}")

    try:
        response = requests.post(endpoint, headers=headers, json=payload, timeout=30)
        print(f"Debug - Response status: {response.status_code}")

        response.raise_for_status()

        data = response.json()
        print("✓ Work entry submitted successfully")
        print(f"Worklog ID: {data.get('id', 'N/A')}")

        return data

    except requests.exceptions.RequestException as e:
        print(f"Error submitting work entry: {e}", file=sys.stderr)
        if hasattr(e, "response") and e.response is not None:
            print(f"Response: {e.response.text}", file=sys.stderr)
            print(f"Response headers: {dict(e.response.headers)}", file=sys.stderr)
        raise


def main() -> None:
    """Main entry point for the script."""
    parser = argparse.ArgumentParser(
        description="Submit JIRA work entry to Everit Timetracker Plugin",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Submit 2 hours of work starting at 9:30 AM
  uv run report_time.py 2025-07-15 09:30 "Fixed authentication bug" 120 13048
  
  # Submit with tags
  uv run report_time.py 2025-07-15 14:00 "Code review" 30 13049 --tags review,backend
  
  # Submit 30 minutes of documentation work
  uv run report_time.py 2025-07-15 16:30 "Updated API docs" 30 13050 --tags documentation
        """,
    )

    parser.add_argument(
        "work_date",
        type=validate_date,
        help="Work date in YYYY-MM-DD format",
    )
    parser.add_argument(
        "work_start_time",
        type=validate_time,
        help="Start time in HH:MM format (24-hour, e.g., 09:30, 14:45)",
    )
    parser.add_argument(
        "description",
        help="Work description",
    )
    parser.add_argument(
        "duration_minutes",
        type=validate_duration,
        help="Duration in minutes (e.g., 60 = 1 hour, 30 = 30 minutes)",
    )
    parser.add_argument(
        "issue_id",
        type=validate_issue_id,
        help="JIRA issue ID - numeric only (e.g., 13048)",
    )
    parser.add_argument(
        "--tags",
        help="Comma-separated worklog tags (e.g., 'bug,backend' or 'review,frontend')",
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

    # Parse tags
    parsed_tags = parse_tags(args.tags)

    try:
        # Submit work entry
        data = submit_work_entry(
            api_token,
            args.work_date,
            args.work_start_time,
            args.description,
            args.duration_minutes,
            args.issue_id,
            parsed_tags,
        )

        # Calculate duration display for success message
        hours = args.duration_minutes // 60
        remaining_minutes = args.duration_minutes % 60
        if hours > 0:
            duration_display = (
                f"{hours}h {remaining_minutes}m"
                if remaining_minutes > 0
                else f"{hours}h"
            )
        else:
            duration_display = f"{remaining_minutes}m"

        print(f"✓ Successfully submitted work entry")
        print(f"  Date: {args.work_date}")
        print(f"  Start Time: {args.work_start_time}")
        print(f"  Issue ID: {args.issue_id}")
        print(f"  Duration: {duration_display}")
        print(f"  Worklog ID: {data.get('id', 'N/A')}")

    except Exception as e:
        print(f"Failed to submit work entry: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
