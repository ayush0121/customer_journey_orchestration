from services.classification_service import classifier
import time

def test_classification():
    test_cases = [
        ("Uber * Trip", "Transportation"),
        ("Walmart Store", "Groceries"),
        ("Netflix Subscription", "Streaming Services"),
        ("Salary Deposit", "Income"),
        ("Starbucks Coffee", "Dining"),
        ("CVS Pharmacy", "Healthcare"),
        ("Coursera", "Education"),
        ("Planet Fitness", "Fitness & Wellness"),
        ("Spotify", "Music Services"),
        ("Whole Foods Market", "Groceries"),
        ("Unknown Merchant XYZ", "Miscellaneous") # Should fallback to Miscellaneous or Zero-Shot
    ]

    with open("test_results.txt", "w") as f:
        f.write("Starting Classification Test...\n")
        start_time = time.time()
        
        correct = 0
        for description, expected in test_cases:
            predicted = classifier.classify(description)
            f.write(f"Description: '{description}' | Predicted: {predicted} | Expected: {expected}\n")
            
            # Allow some flexibility
            if predicted == expected:
                correct += 1
            elif expected == "Transport" and predicted == "Travel":
                 f.write("  [ACCEPTABLE MATCH] Transport/Travel\n")
                 correct += 1
            else:
                f.write(f"  [MISMATCH] Expected {expected}, got {predicted}\n")

        end_time = time.time()
        duration = end_time - start_time
        
        f.write(f"\nAccuracy: {correct}/{len(test_cases)} ({correct/len(test_cases)*100:.1f}%)\n")
        f.write(f"Total Time: {duration:.2f}s\n")
        f.write(f"Average Time per Item: {duration/len(test_cases):.4f}s\n")

if __name__ == "__main__":
    test_classification()
