import requests
import json

url = "http://localhost:8000/analyze"
payload = {
    "text": ["Date: 2023-10-27", "Description: Test Transaction", "Amount: 100.00", "Closing Balance: 1000.00"],
    "api_key": "test_key",
    "api_endpoint": "https://api.openai.com/v1"
}

try:
    print("Sending request to backend...")
    response = requests.post(url, json=payload, timeout=10)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
