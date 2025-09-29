import requests
from bs4 import BeautifulSoup
import re
from urllib.parse import urljoin, urlparse
import time
import random
from typing import Dict, Optional

class ProductParser:
    def __init__(self):
        # Rotation of User-Agents to avoid detection
        self.user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/121.0'
        ]
        
        # Common price selectors for popular Russian e-commerce sites
        self.price_selectors = {
            'ozon.ru': [
                '[data-widget="webPrice"] span',
                '.price-current-price',
                '.c2h5',
                '.c3016-a0',
                '[data-testid="price-current-value"]'
            ],
            'wildberries.ru': [
                '.product-page__price-block .price-block__final-price',
                '.product-page__price .price',
                '.final-cost',
                '.price-block__wallet-price'
            ],
            'market.yandex.ru': [
                '[data-auto="price-value"]',
                '.price .price__value',
                '.cia-cs',
                '.price_type_current .price__value'
            ],
            'aliexpress.ru': [
                '.product-price-current',
                '.uniform-banner-box-price',
                '.price--current'
            ],
            'dns-shop.ru': [
                '.product-buy__price .price__current',
                '.product-card-price__current',
                '.price-current'
            ],
            'mvideo.ru': [
                '.price__main-value',
                '.c-pdp-price__current',
                '.price-current'
            ],
            'citilink.ru': [
                '.product_price__current',
                '.price-current'
            ]
        }
    
    def get_headers(self) -> Dict[str, str]:
        """Generate realistic headers for requests"""
        headers = {
            'User-Agent': random.choice(self.user_agents),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'max-age=0',
            'sec-ch-ua': '"Google Chrome";v="120", "Chromium";v="120", "Not:A-Brand";v="8"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1'
        }
        
        # Add referer for some sites to look more legitimate
        if random.choice([True, False]):
            headers['Referer'] = 'https://www.google.com/'
        
        return headers
    
    def extract_price_from_text(self, text: str) -> Optional[float]:
        """Extract price from text using regex"""
        if not text:
            return None
            
        # Remove all non-digit characters except . and ,
        # Look for patterns like: 1234, 1234.56, 1 234, 1 234,56
        price_patterns = [
            r'(\d{1,3}(?:\s?\d{3})*(?:[.,]\d{2})?)',  # 1234.56, 1 234,56
            r'(\d+[.,]\d{2})',  # 123.45, 123,45
            r'(\d+)'  # Just digits
        ]
        
        for pattern in price_patterns:
            matches = re.findall(pattern, text.replace(' ', ''))
            if matches:
                try:
                    price_str = matches[0].replace(',', '.').replace(' ', '')
                    return float(price_str)
                except (ValueError, IndexError):
                    continue
        
        return None
    
    def extract_price(self, soup: BeautifulSoup, domain: str) -> Optional[float]:
        """Extract price using domain-specific selectors"""
        selectors = self.price_selectors.get(domain, [])
        
        # Try domain-specific selectors first
        for selector in selectors:
            try:
                elements = soup.select(selector)
                for element in elements:
                    text = element.get_text(strip=True)
                    price = self.extract_price_from_text(text)
                    if price and price > 0:
                        print(f"DEBUG: Found price {price} using selector {selector}")
                        return price
            except Exception as e:
                print(f"DEBUG: Error with selector {selector}: {e}")
                continue
        
        # Fallback: search for common price patterns in text
        price_keywords = ['цена', 'стоимость', 'price', '₽', 'руб', 'rub']
        for keyword in price_keywords:
            elements = soup.find_all(string=re.compile(keyword, re.IGNORECASE))
            for element in elements:
                parent = element.parent if element.parent else element
                text = parent.get_text(strip=True) if hasattr(parent, 'get_text') else str(element)
                price = self.extract_price_from_text(text)
                if price and price > 0:
                    print(f"DEBUG: Found price {price} using keyword search for '{keyword}'")
                    return price
        
        # Last resort: search all text for price patterns
        all_text = soup.get_text()
        price = self.extract_price_from_text(all_text)
        if price and price > 0:
            print(f"DEBUG: Found price {price} from general text search")
            return price
        
        return None
    
    def extract_image(self, soup: BeautifulSoup, base_url: str) -> Optional[str]:
        """Extract product image URL"""
        # Try Open Graph image
        og_image = soup.find('meta', property='og:image')
        if og_image and og_image.get('content'):
            image_url = og_image['content']
            return urljoin(base_url, image_url)
        
        # Try Twitter image
        twitter_image = soup.find('meta', name='twitter:image')
        if twitter_image and twitter_image.get('content'):
            image_url = twitter_image['content']
            return urljoin(base_url, image_url)
        
        # Try to find product images
        img_selectors = [
            'img[data-widget="webProductImages"]',  # Ozon
            '.product-page__gallery img',  # Wildberries
            '.ProductImage img',  # Yandex Market
            'img.magnifier-image',  # Generic
            'img[alt*="товар"]', 'img[alt*="product"]'  # Generic product images
        ]
        
        for selector in img_selectors:
            try:
                img = soup.select_one(selector)
                if img and img.get('src'):
                    image_url = img['src']
                    return urljoin(base_url, image_url)
            except:
                continue
        
        return None
    
    def extract_title(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract product title from various sources"""
        # Try Open Graph title
        og_title = soup.find('meta', property='og:title')
        if og_title and og_title.get('content'):
            title = og_title['content'].strip()
            if title and len(title) > 5:
                return title
        
        # Try page title
        title_tag = soup.find('title')
        if title_tag:
            title = title_tag.get_text(strip=True)
            # Clean up title (remove site name, etc.)
            title = re.sub(r'\s*[\|\-]\s*(купить|Ozon|Wildberries|Яндекс\.Маркет|DNS|М\.Видео).*$', '', title, flags=re.IGNORECASE)
            if title and len(title) > 5:
                return title
        
        # Try h1 tag
        h1 = soup.find('h1')
        if h1:
            title = h1.get_text(strip=True)
            if title and len(title) > 5:
                return title
        
        # Try product-specific selectors
        title_selectors = [
            '[data-widget="webProductHeading"] h1',  # Ozon
            '.product-page__title',  # Wildberries
            '[data-auto="productTitle"]',  # Yandex Market
            '.product-card-top__title',  # DNS
            '.product-title'  # Generic
        ]
        
        for selector in title_selectors:
            try:
                element = soup.select_one(selector)
                if element:
                    title = element.get_text(strip=True)
                    if title and len(title) > 5:
                        return title
            except:
                continue
        
        return None
    
    def extract_description(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract product description"""
        # Try Open Graph description
        og_desc = soup.find('meta', property='og:description')
        if og_desc and og_desc.get('content'):
            desc = og_desc['content'].strip()
            if desc and len(desc) > 10:
                return desc
        
        # Try meta description
        meta_desc = soup.find('meta', name='description')
        if meta_desc and meta_desc.get('content'):
            desc = meta_desc['content'].strip()
            if desc and len(desc) > 10:
                return desc
        
        return None
    
    def scrape_url(self, url: str, max_retries: int = 2) -> Dict:
        """Main scraping function with retry logic"""
        print(f"DEBUG: Scraping URL with custom parser: {url}")
        
        for attempt in range(max_retries + 1):
            try:
                # Add progressive delay for retries
                if attempt > 0:
                    delay = random.uniform(2, 5) * (attempt + 1)
                    print(f"DEBUG: Retry attempt {attempt}, waiting {delay:.1f}s")
                    time.sleep(delay)
                else:
                    # Initial delay
                    time.sleep(random.uniform(0.5, 1.5))
                
                # Make request
                response = requests.get(
                    url, 
                    headers=self.get_headers(),
                    timeout=15,
                    allow_redirects=True
                )
                
                # Handle different response codes
                if response.status_code == 429:
                    print(f"DEBUG: Rate limited (429) on attempt {attempt + 1}")
                    if attempt < max_retries:
                        continue
                    else:
                        print("DEBUG: Max retries reached for rate limiting")
                        return self._create_failed_result("Rate limited after retries")
                
                if response.status_code == 403:
                    print(f"DEBUG: Access forbidden (403)")
                    return self._create_failed_result("Access forbidden")
                
                response.raise_for_status()
                
                # Parse HTML
                soup = BeautifulSoup(response.content, 'lxml')
                domain = urlparse(url).netloc.lower()
                
                # Extract data
                title = self.extract_title(soup)
                price = self.extract_price(soup, domain)
                description = self.extract_description(soup)
                image_url = self.extract_image(soup, url)
                
                # Check if we got meaningful data
                if title and len(title) > 3:
                    result = {
                        'success': True,
                        'data': {
                            'llm_extraction': {
                                'title': title,
                                'price': price or 0.0,
                                'description': description,
                                'image_url': image_url
                            },
                            'source': 'custom_parser',
                            'url': url
                        }
                    }
                    print(f"DEBUG: Custom parser success: {result}")
                    return result
                else:
                    print(f"DEBUG: No meaningful title extracted on attempt {attempt + 1}")
                    if attempt < max_retries:
                        continue
                
            except requests.exceptions.Timeout:
                print(f"DEBUG: Timeout on attempt {attempt + 1}")
                if attempt < max_retries:
                    continue
                return self._create_failed_result("Request timeout")
                
            except requests.exceptions.RequestException as e:
                print(f"DEBUG: Request error on attempt {attempt + 1}: {e}")
                if attempt < max_retries and "429" in str(e):
                    continue
                return self._create_failed_result(f"Request failed: {str(e)}")
                
            except Exception as e:
                print(f"DEBUG: Parse error on attempt {attempt + 1}: {e}")
                if attempt < max_retries:
                    continue
                return self._create_failed_result(f"Parse failed: {str(e)}")
        
        return self._create_failed_result("All attempts failed")
    
    def _create_failed_result(self, error_message: str) -> Dict:
        """Create a standardized failed result"""
        return {
            'success': False,
            'error': error_message,
            'data': {'llm_extraction': {}}
        }

# Create instance for easy import
product_parser = ProductParser()

def scrape_url(url: str) -> Dict:
    """Legacy function for compatibility"""
    return product_parser.scrape_url(url)