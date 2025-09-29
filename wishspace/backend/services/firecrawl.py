import os
import requests
from dotenv import load_dotenv

load_dotenv()

FIRECRAWL_API_KEY = os.getenv("FIRECRAWL_API_KEY")
FIRECRAWL_API_URL = "https://api.firecrawl.dev/v0/scrape"

def scrape_url(url: str):
    if not FIRECRAWL_API_KEY:
        raise ValueError("FIRECRAWL_API_KEY is not set in the environment variables.")

    print(f"DEBUG: Scraping URL: {url}")
    
    headers = {
        "Authorization": f"Bearer {FIRECRAWL_API_KEY}",
        "Content-Type": "application/json"
    }
    
    # Улучшенная схема с более детальными инструкциями
    payload = {
        "url": url,
        "extractor": {
            "mode": "llm-extraction",
            "json_schema": {
                "type": "object",
                "properties": {
                    "title": {
                        "type": "string",
                        "description": "Product title or name from the page. Look for h1, product name, or main heading. If not found, extract from page title or meta tags."
                    },
                    "price": {
                        "type": ["number", "string"],
                        "description": "Product price in any currency. Look for price tags, cost information, or monetary values."
                    },
                    "description": {
                        "type": "string", 
                        "description": "Product description or summary. Extract key features or product details."
                    },
                    "image_url": {
                        "type": "string", 
                        "format": "uri",
                        "description": "Main product image URL. Look for product photos or main image."
                    }
                },
                "required": ["title"]
            },
            "instructions": "Extract product information from an e-commerce page. Focus on finding the product title, price, description and main image. If the title is not immediately obvious, look for the main heading, page title, or any prominent text describing the product."
        }
    }

    try:
        response = requests.post(FIRECRAWL_API_URL, json=payload, headers=headers)
        response.raise_for_status()
        result = response.json()
        
        print(f"DEBUG: Firecrawl response: {result}")
        
        # Попытка извлечь title из разных мест если основной способ не сработал
        if result.get('data', {}).get('llm_extraction', {}).get('title') in [None, '', 'No title found']:
            print("DEBUG: Title not found in llm_extraction, trying alternative methods")
            
            # Попробуем извлечь из markdown или content
            content = result.get('data', {}).get('content', '')
            markdown = result.get('data', {}).get('markdown', '')
            
            # Извлечение из URL (как fallback)
            if not result.get('data', {}).get('llm_extraction', {}).get('title'):
                url_parts = url.split('/')
                for part in reversed(url_parts):
                    if part and not part.startswith('t') and len(part) > 3:
                        # Попытка декодировать URL-encoded название
                        import urllib.parse
                        decoded_part = urllib.parse.unquote(part)
                        if len(decoded_part) > 10:  # Если это похоже на название товара
                            result.setdefault('data', {}).setdefault('llm_extraction', {})['title'] = decoded_part
                            print(f"DEBUG: Extracted title from URL: {decoded_part}")
                            break
        
        return result
        
    except requests.exceptions.RequestException as e:
        print(f"DEBUG: Firecrawl API error: {e}")
        raise
    except Exception as e:
        print(f"DEBUG: Unexpected error: {e}")
        raise
