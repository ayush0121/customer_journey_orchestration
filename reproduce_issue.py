import requests
import json

BASE_URL = "http://localhost:8000"

def test_appending():
    # 1. Clear Data
    print("Clearing data...")
    requests.delete(f"{BASE_URL}/transactions")

    # 2. Add Set A
    set_a = [
        {"date": "2023-01-01", "amount": 100.0, "description": "Test A1", "category": "Test", "merchant": "A1", "type": "expense"},
        {"date": "2023-01-02", "amount": 200.0, "description": "Test A2", "category": "Test", "merchant": "A2", "type": "expense"}
    ]
    print(f"Adding Set A ({len(set_a)} items)...")
    r = requests.post(f"{BASE_URL}/transactions", json=set_a)
    print(f"Response: {r.json()}")

    # 3. Verify Count
    r = requests.get(f"{BASE_URL}/transactions")
    count_a = len(r.json())
    print(f"Count after Set A: {count_a}")
    assert count_a == 2

    # 4. Add Set B
    set_b = [
        {"date": "2023-01-03", "amount": 300.0, "description": "Test B1", "category": "Test", "merchant": "B1", "type": "expense"},
        {"date": "2023-01-04", "amount": 400.0, "description": "Test B2", "category": "Test", "merchant": "B2", "type": "expense"}
    ]
    print(f"Adding Set B ({len(set_b)} items)...")
    r = requests.post(f"{BASE_URL}/transactions", json=set_b)
    print(f"Response: {r.json()}")

    # 5. Verify Total Count
    r = requests.get(f"{BASE_URL}/transactions")
    total_count = len(r.json())
    print(f"Count after Set B: {total_count}")
    
    if total_count == 4:
        print("SUCCESS: Transactions appended correctly.")
    else:
        print(f"FAILURE: Expected 4, got {total_count}.")

if __name__ == "__main__":
    test_appending()
