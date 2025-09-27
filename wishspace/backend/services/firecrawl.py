import os
import requests
from dotenv import load_dotenv

load_dotenv()

FIRECRAWL_API_KEY = os.getenv("FIRECRAWL_API_KEY")
FIRECRAWL_API_URL = "https://api.firecrawl.dev/v0/scrape"

def scrape_url(url: str):
    if not FIRECRAWL_API_KEY:
        raise ValueError("FIRECRAWL_API_KEY is not set in the environment variables.")

    headers = {
        "Authorization": f"Bearer {FIRECRAWL_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "url": url,
        "extractor": {
            "mode": "llm-extraction",
            "json_schema": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "price": {"type": ["number", "string"]},
                    "description": {"type": "string"},
                    "image_url": {"type": "string", "format": "uri"}
                },
                "required": ["title"]
            }
        }
    }

    response = requests.post(FIRECRAWL_API_URL, json=payload, headers=headers)
    response.raise_for_status()  # Raise an exception for bad status codes
    return response.json()
