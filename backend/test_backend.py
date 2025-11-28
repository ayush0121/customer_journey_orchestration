import requests
import json

def test_backend():
    print("Testing backend connectivity...")
    try:
        # 1. Test basic connectivity (docs page)
        response = requests.get("http://localhost:8000/docs")
        if response.status_code == 200:
            print("✅ Backend is reachable (Docs page accessible)")
        else:
            print(f"❌ Backend returned status {response.status_code} for /docs")
            return

        # 2. Test /analyze endpoint with dummy data
        print("\nTesting /analyze endpoint...")
        payload = {
            "text": ["2023-10-01 Starbucks $5.50", "2023-10-02 Uber $15.00"],
            "api_key": "sk-dummy-key", # Backend will fail if it tries to call OpenAI with this, but we want to see if it reaches that point
            "api_endpoint": "https://api.openai.com/v1"
        }
        
        # We expect a 500 or 401 from OpenAI, but a response from our backend means it's running
        response = requests.post("http://localhost:8000/analyze", json=payload)
        
        if response.status_code == 200:
            print("✅ /analyze endpoint returned 200 (Unexpected with dummy key, but backend is up)")
            print(response.json())
        elif response.status_code == 500:
            print("✅ /analyze endpoint returned 500 (Expected with dummy key - backend logic executed)")
            print("Error detail:", response.json().get('detail'))
        else:
            print(f"⚠️ /analyze endpoint returned {response.status_code}")
            print(response.text)

    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to backend at http://localhost:8000. Is it running?")
    except Exception as e:
        print(f"❌ An error occurred: {e}")

if __name__ == "__main__":
    test_backend()
