import requests
import json

BASE_URL = "http://localhost:8000"

def test_create_goals():
    print("Testing Create Goals...")
    goals = [
        {
            "name": "Test Goal 1",
            "target_amount": 1000,
            "current_amount": 0,
            "deadline": "2025-12-31"
        },
        {
            "name": "Test Goal 2",
            "target_amount": 5000,
            "current_amount": 100,
            "deadline": "2026-06-30"
        }
    ]
    response = requests.post(f"{BASE_URL}/goals", json=goals)
    if response.status_code == 200:
        print("Create Goals: SUCCESS")
        print(response.json())
        return response.json()
    else:
        print(f"Create Goals: FAILED ({response.status_code})")
        print(response.text)
        return []

def test_get_goals():
    print("\nTesting Get Goals...")
    response = requests.get(f"{BASE_URL}/goals")
    if response.status_code == 200:
        print("Get Goals: SUCCESS")
        goals = response.json()
        print(f"Found {len(goals)} goals")
        return goals
    else:
        print(f"Get Goals: FAILED ({response.status_code})")
        return []

def test_delete_goal(goal_id):
    print(f"\nTesting Delete Goal {goal_id}...")
    response = requests.delete(f"{BASE_URL}/goals/{goal_id}")
    if response.status_code == 200:
        print("Delete Goal: SUCCESS")
    else:
        print(f"Delete Goal: FAILED ({response.status_code})")
        print(response.text)

if __name__ == "__main__":
    created_goals = test_create_goals()
    if created_goals:
        test_get_goals()
        # Delete the first one
        test_delete_goal(created_goals[0]['id'])
        # Verify deletion
        remaining_goals = test_get_goals()
        if len(remaining_goals) == len(created_goals) - 1:
            print("Verification: SUCCESS - Goal count matches expected")
        else:
            print("Verification: FAILED - Goal count mismatch")
