import traceback
import sys

print("Starting debug script...")
try:
    print("Importing TransactionClassifier from services...")
    from services.classification_service import TransactionClassifier
    print("TransactionClassifier imported.")
    
    print("Initializing TransactionClassifier...")
    classifier = TransactionClassifier()
    print("Classifier initialized.")
    
    print("Testing classify...")
    print("Testing classify...")
    pairs = [
        ("Salary Deposit", "This transaction belongs to the Income category"),
        ("Salary Deposit", "This transaction belongs to the Dining category")
    ]
    scores = classifier.model.predict(pairs)
    with open("debug_output.txt", "w") as f:
        f.write(f"Scores (Salary->Income): {scores[0].tolist()}\n")
        f.write(f"Scores (Salary->Dining): {scores[1].tolist()}\n")
    
except Exception:
    print("Error during execution:")
    traceback.print_exc()
