from services.classification_service import classifier

def debug_keywords():
    test_cases = [
        "Netflix Subscription",
        "Whole Foods Market",
        "Salary Deposit"
    ]
    
    print("Debugging Keywords...")
    for desc in test_cases:
        desc_upper = desc.upper()
        found = False
        for category, keywords in classifier.keyword_map.items():
            for keyword in keywords:
                if keyword in desc_upper:
                    print(f"'{desc}' matched '{keyword}' -> {category}")
                    found = True
                    break # Break keyword loop
            if found:
                break # Break category loop
        
        if not found:
            print(f"'{desc}' NO KEYWORD MATCH -> Fallback to Zero-Shot")

if __name__ == "__main__":
    debug_keywords()
