#!/usr/bin/env python3
# /// script
# requires-python = ">=3.8"
# dependencies = [
#     "elevenlabs",
# ]
# ///

import sys
import os
from elevenlabs.client import ElevenLabs
from elevenlabs import play


def main():
    if len(sys.argv) != 2:
        print("Usage: text_to_speech.py <text>", file=sys.stderr)
        sys.exit(1)

    text = sys.argv[1]
    voice_id = "FGY2WhTYpPnrIDTdsKH5"

    # Initialize ElevenLabs client (API key from environment variable)
    client = ElevenLabs()

    try:
        # Convert text to speech
        audio = client.text_to_speech.convert(
            text=text,
            voice_id=voice_id,
            model_id="eleven_multilingual_v2",
            output_format="mp3_44100_128",
        )

        # Play the audio
        play(audio)

    except Exception as e:
        print(f"Error generating speech: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
