#!/usr/bin/env python3

import sys
import os
sys.path.append('/Users/nord/WORK/test/wishspace/backend')

from services.product_parser import product_parser

# Set shorter timeout for testing
import requests
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry

# Configure shorter timeouts
product_parser.session.timeout = 10

def test_parser(url, comment=""):
    print(f"\n{'='*60}")
    print(f"Testing URL: {url}")
    print(f"Comment: {comment}")
    print(f"{'='*60}")
    
    result = product_parser.scrape_url(url)
    
    print(f"\nResult:")
    print(f"Success: {result.get('success', False)}")
    if result.get('success'):
        data = result.get('data', {}).get('llm_extraction', {})
        print(f"Title: {data.get('title')}")
        print(f"Price: {data.get('price')}")
        print(f"Description: {data.get('description', 'None')[:100]}...")
        print(f"Image URL: {data.get('image_url', 'None')}")
    else:
        print(f"Error: {result.get('error')}")
    
    return result

if __name__ == "__main__":
    # Test URLs will be provided by user
    test_urls = []
    
    if len(sys.argv) > 1:
        test_urls = sys.argv[1:]
    else:
        print("Usage: python test_parser.py <url1> [url2] ...")
        print("Example: python test_parser.py 'https://market.yandex.ru/cc/7h5EWA'")
        sys.exit(1)
    
    for url in test_urls:
        test_parser(url)