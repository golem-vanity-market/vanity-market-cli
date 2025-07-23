#!/usr/bin/env python3
"""
Production environment preparation script for Yagna.
Converted from prepare_prod.sh to Python.
"""

import os
import shutil
import subprocess
import sys
from pathlib import Path


def main():
    """Prepare production environment for Yagna."""
    print("Using binaries from the yagna sandbox")

    # Create yagna-prod directory
    prod_dir = Path("yagna-prod")
    prod_dir.mkdir(exist_ok=True)

    # Copy binaries
    try:
        shutil.copy2("yagna/yagna", prod_dir)
        shutil.copy2("yagna/gftp", prod_dir)
    except FileNotFoundError as e:
        print(f"Error: Could not find source file: {e}", file=sys.stderr)
        sys.exit(1)
    except PermissionError as e:
        print(f"Error: Permission denied: {e}", file=sys.stderr)
        sys.exit(1)

    # Change to production directory and run version check
    original_cwd = os.getcwd()
    try:
        os.chdir(prod_dir)
        subprocess.run(["./yagna", "--version"], check=True)
    except subprocess.CalledProcessError as e:
        print(f"Error running yagna version: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        os.chdir(original_cwd)

    # Prepare production environment
    print("Preparing production environment.")

    env_content = """YAGNA_DATADIR=yagna-dir
YAGNA_AUTOCONF_APPKEY=Y2TZTgGsD4HX
YAGNA_APPKEY=Y2TZTgGsD4HX
YAGNA_AUTOCONF_ID_SECRET=
"""

    env_file = prod_dir / ".env"
    with open(env_file, "a") as f:
        f.write(env_content)


if __name__ == "__main__":
    main()
