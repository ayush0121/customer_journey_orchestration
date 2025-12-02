from sentence_transformers import CrossEncoder
import torch
import re

class TransactionClassifier:
    def __init__(self, model_name: str = "cross-encoder/nli-distilroberta-base"):
        """
        Initialize the CrossEncoder model.
        """
        with open("backend_debug.log", "a") as f:
            f.write(f"Loading CrossEncoder model: {model_name}...\n")
        print(f"Loading CrossEncoder model: {model_name}...")
        self.model = CrossEncoder(model_name)
        with open("backend_debug.log", "a") as f:
            f.write("CrossEncoder model loaded successfully.\n")
        
        # Define keyword mapping for fast and accurate classification
        # ORDER MATTERS: Specific categories first, generic ones last.
        self.keyword_map = {
            'Subscriptions': ['MEMBERSHIP', 'ANNUAL FEE', 'SUBSCRIPTION', 'MEMBER','NETFLIX', 'HULU', 'DISNEY+', 'HBO', 'HBO MAX', 'PRIME VIDEO','SPOTIFY', 'APPLE MUSIC', 'AMAZON MUSIC', 'TIDAL','MEMBERSHIP', 'ANNUAL FEE', 'SUBSCRIPTION', 'MEMBER','MICROSOFT', 'ADOBE', 'JETBRAINS', 'ATLASSIAN', 'ATLASIAN', 'SOFTWARE', 'GITHUB', 'NOTION', 'SLACK', 'TRELLO', 'ASAANA', 'ASANA','DROPBOX', 'GOOGLE DRIVE', 'GOOGLEDRIVE', 'ONE DRIVE', 'ONE-DRIVE', 'ONEDRIVE', 'ICLOUD', 'CLOUD STORAGE', 'GOOGLE ONE'],
            'Transportation': ['UBER', 'LYFT', 'SHELL', 'CHEVRON', 'BP', 'AMTRAK', 'METRO', 'TAXI', 'TOLL', 'TRANSPORT'],
            'Travel & Vacations': ['AIRBNB', 'EXPEDIA', 'DELTA', 'UNITED', 'SOUTHWEST', 'HOTEL', 'BOOKING.COM', 'BOOKING', 'TRAVEL', 'AIRLINE', 'AVION', 'MAKING TRAVEL', 'HOTELS.COM'],
            'Credit Card Payments': ['CARD PAYMENT', 'CREDIT CARD PAYMENT', 'AMEX PAYMENT', 'VISA PAYMENT', 'MASTERCARD PAYMENT', 'CC PAYMENT'],
            'Income': ['SALARY', 'PAYCHECK', 'DEPOSIT', 'INCOME', 'DIVIDEND', 'INTEREST', 'REFUND', 'REIMBURSEMENT'],
            'Others': ['PHARMACY', 'CVS', 'WALGREENS', 'KAISER', 'HOSPITAL', 'CLINIC', 'DOCTOR', 'MEDICINE','VANGUARD', 'SCHWAB', 'FIDELITY', 'ROBINHOOD', 'MUTUAL FUND', 'ETF', 'SIP', 'INVEST', 'BROKERAGE', 'ZERODHA', 'UPSTOX','LOAN PAYMENT', 'EMI', 'HOME LOAN', 'AUTO LOAN', 'PERSONAL LOAN', 'LOAN','TAX', 'IRS', 'HMRC', 'TDS', 'PAYROLL TAX', 'INCOME TAX','INSURANCE', 'PREMIUM', 'GEICO', 'AETNA', 'BLUE CROSS', 'PRUDENTIAL', 'HDFC ERGO', 'LIC','GYM', 'CLASSPASS', 'FITBIT', 'YOGA', 'PILATES', 'PERSONAL TRAI','DAYCARE', 'NANNY', 'SITTER', 'PRESCHOOL', 'CHILDCARE','VET', 'PETCO', 'PETSMART', 'PET', 'ANIMAL', 'GROOMING','EDU', 'COURSE', 'UDEMY', 'COURSERA', 'SCHOOL', 'UNIVERSITY', 'COLLEGE', 'TUITION', 'LEARNING', 'BOOTCAMP', 'K12'],
            'Groceries': ['WHOLEFOODS', 'WHOLEFDS', 'TRADER JOE', 'TRADER JOES', 'SAFEWAY', 'KROGER', 'ALDI', 'COSTCO', 'WALMART', 'PUBLIX', 'SPROUTS', 'GROCERY', 'SUPERMARKET', 'MARKET', 'BIG BASKET', 'GROCER', 'INSTA MART'],
            'Dining': ['STARBUCKS', 'MCDONALD', 'MCDONALDS', 'MCD', 'BURGER', 'PIZZA', 'PIZZA HUT', 'DOMINOS', 'PAPA JOHN', 'RESTAURANT', 'CAFE', 'DOORDASH', 'UBEREATS', 'GRUBHUB', 'ZOMATO', 'SWIGGY', 'DINING', 'FOOD', 'DINING OUT', 'DINING-OUT'],
            'Shopping': ['AMZN', 'AMAZON', 'TARGET', 'WALMART', 'BEST BUY', 'EBAY', 'TJMAXX', 'IKEA', 'SEPHORA', 'SHOP', 'MALL', 'FLIPKART'],
            'Bills': ['RENT','ELECTRIC', 'WATER', 'GAS', 'UTILITY', 'PG&E', 'PGE', 'CON EDISON', 'CONED', 'SCE', 'DOMINION', 'WATER BILL', 'ELECTRICITY', 'TELECOM', 'INTERNET', 'BILL']
        }
        
        self.categories = list(self.keyword_map.keys()) + ["Income", "Miscellaneous"]
        print("CrossEncoder model loaded successfully.")

from sentence_transformers import CrossEncoder
import torch
import re
from typing import List
from sqlalchemy.orm import Session
from database import SessionLocal
from models import ClassificationRule

class TransactionClassifier:
    def __init__(self, model_name: str = "cross-encoder/nli-distilroberta-base"):
        """
        Initialize the CrossEncoder model and load custom rules.
        """
        with open("backend_debug.log", "a") as f:
            f.write(f"Loading CrossEncoder model: {model_name}...\n")
        print(f"Loading CrossEncoder model: {model_name}...")
        self.model = CrossEncoder(model_name)
        with open("backend_debug.log", "a") as f:
            f.write("CrossEncoder model loaded successfully.\n")
        
        self.keyword_map = {
            'Subscriptions': ['MEMBERSHIP', 'ANNUAL FEE', 'SUBSCRIPTION', 'MEMBER','NETFLIX', 'HULU', 'DISNEY+', 'HBO', 'HBO MAX', 'PRIME VIDEO','SPOTIFY', 'APPLE MUSIC', 'AMAZON MUSIC', 'TIDAL','MEMBERSHIP', 'ANNUAL FEE', 'SUBSCRIPTION', 'MEMBER','MICROSOFT', 'ADOBE', 'JETBRAINS', 'ATLASSIAN', 'ATLASIAN', 'SOFTWARE', 'GITHUB', 'NOTION', 'SLACK', 'TRELLO', 'ASAANA', 'ASANA','DROPBOX', 'GOOGLE DRIVE', 'GOOGLEDRIVE', 'ONE DRIVE', 'ONE-DRIVE', 'ONEDRIVE', 'ICLOUD', 'CLOUD STORAGE', 'GOOGLE ONE'],
            'Transportation': ['UBER', 'LYFT', 'SHELL', 'CHEVRON', 'BP', 'AMTRAK', 'METRO', 'TAXI', 'TOLL', 'TRANSPORT'],
            'Travel & Vacations': ['AIRBNB', 'EXPEDIA', 'DELTA', 'UNITED', 'SOUTHWEST', 'HOTEL', 'BOOKING.COM', 'BOOKING', 'TRAVEL', 'AIRLINE', 'AVION', 'MAKING TRAVEL', 'HOTELS.COM'],
            'Credit Card Payments': ['CARD PAYMENT', 'CREDIT CARD PAYMENT', 'AMEX PAYMENT', 'VISA PAYMENT', 'MASTERCARD PAYMENT', 'CC PAYMENT'],
            'Income': ['SALARY', 'PAYCHECK', 'DEPOSIT', 'INCOME', 'DIVIDEND', 'INTEREST', 'REFUND', 'REIMBURSEMENT'],
            'Others': ['PHARMACY', 'CVS', 'WALGREENS', 'KAISER', 'HOSPITAL', 'CLINIC', 'DOCTOR', 'MEDICINE','VANGUARD', 'SCHWAB', 'FIDELITY', 'ROBINHOOD', 'MUTUAL FUND', 'ETF', 'SIP', 'INVEST', 'BROKERAGE', 'ZERODHA', 'UPSTOX','LOAN PAYMENT', 'EMI', 'HOME LOAN', 'AUTO LOAN', 'PERSONAL LOAN', 'LOAN','TAX', 'IRS', 'HMRC', 'TDS', 'PAYROLL TAX', 'INCOME TAX','INSURANCE', 'PREMIUM', 'GEICO', 'AETNA', 'BLUE CROSS', 'PRUDENTIAL', 'HDFC ERGO', 'LIC','GYM', 'CLASSPASS', 'FITBIT', 'YOGA', 'PILATES', 'PERSONAL TRAI','DAYCARE', 'NANNY', 'SITTER', 'PRESCHOOL', 'CHILDCARE','VET', 'PETCO', 'PETSMART', 'PET', 'ANIMAL', 'GROOMING','EDU', 'COURSE', 'UDEMY', 'COURSERA', 'SCHOOL', 'UNIVERSITY', 'COLLEGE', 'TUITION', 'LEARNING', 'BOOTCAMP', 'K12'],
            'Groceries': ['WHOLEFOODS', 'WHOLEFDS', 'TRADER JOE', 'TRADER JOES', 'SAFEWAY', 'KROGER', 'ALDI', 'COSTCO', 'WALMART', 'PUBLIX', 'SPROUTS', 'GROCERY', 'SUPERMARKET', 'MARKET', 'BIG BASKET', 'GROCER', 'INSTA MART'],
            'Dining': ['STARBUCKS', 'MCDONALD', 'MCDONALDS', 'MCD', 'BURGER', 'PIZZA', 'PIZZA HUT', 'DOMINOS', 'PAPA JOHN', 'RESTAURANT', 'CAFE', 'DOORDASH', 'UBEREATS', 'GRUBHUB', 'ZOMATO', 'SWIGGY', 'DINING', 'FOOD', 'DINING OUT', 'DINING-OUT'],
            'Shopping': ['AMZN', 'AMAZON', 'TARGET', 'WALMART', 'BEST BUY', 'EBAY', 'TJMAXX', 'IKEA', 'SEPHORA', 'SHOP', 'MALL', 'FLIPKART'],
            'Bills': ['RENT','ELECTRIC', 'WATER', 'GAS', 'UTILITY', 'PG&E', 'PGE', 'CON EDISON', 'CONED', 'SCE', 'DOMINION', 'WATER BILL', 'ELECTRICITY', 'TELECOM', 'INTERNET', 'BILL']
        }
        
        self.categories = list(self.keyword_map.keys()) + ["Income", "Miscellaneous"]
        
        # Load rules from DB
        self.rules = []
        self.reload_rules()
        print("CrossEncoder model loaded successfully.")

    def reload_rules(self):
        """Reloads classification rules from the database."""
        try:
            db = SessionLocal()
            rules = db.query(ClassificationRule).all()
            self.rules = rules
            print(f"Loaded {len(rules)} classification rules.")
            db.close()
        except Exception as e:
            print(f"Error loading rules: {e}")
            self.rules = []

    def learn_correction(self, description: str, category: str):
        """
        Learns a new classification rule based on user correction.
        """
        try:
            db = SessionLocal()
            # Check if rule already exists
            existing_rule = db.query(ClassificationRule).filter(
                ClassificationRule.pattern == description,
                ClassificationRule.match_type == "exact"
            ).first()
            
            if existing_rule:
                existing_rule.category = category
            else:
                new_rule = ClassificationRule(
                    pattern=description,
                    category=category,
                    match_type="exact" # Default to exact match for corrections to be safe
                )
                db.add(new_rule)
            
            db.commit()
            db.close()
            
            # Reload rules
            self.reload_rules()
            return True
        except Exception as e:
            print(f"Error learning correction: {e}")
            return False

    def classify_batch(self, texts: List[str], api_key: str = None, base_url: str = None) -> List[str]:
        """
        Classify a batch of transaction descriptions.
        """
        if not texts:
            return []
            
        results = [None] * len(texts) # Initialize results with None placeholders
        texts_to_predict = []
        indices_to_predict = []
        
        for i, text in enumerate(texts):
            if not text:
                results[i] = "Miscellaneous"
                continue

            match_found = False
            text_upper = text.upper()
            
            # 0. Check Custom Rules (Highest Priority)
            for rule in self.rules:
                if rule.match_type == "exact":
                    if rule.pattern.upper() == text_upper:
                        results[i] = rule.category
                        match_found = True
                        break
                elif rule.match_type == "contains":
                    if rule.pattern.upper() in text_upper:
                        results[i] = rule.category
                        match_found = True
                        break
            
            if match_found:
                continue

            # 1. Fast Keyword Matching
            for category, keywords in self.keyword_map.items():
                for keyword in keywords:
                    # Use regex word boundary for short keywords (<= 3 chars) to avoid false positives (e.g. ETF in NETFLIX)
                    if len(keyword) <= 3:
                        # Escape keyword just in case, though they are mostly alphanumeric
                        pattern = r'\b' + re.escape(keyword) + r'\b'
                        if re.search(pattern, text_upper):
                            results[i] = category
                            match_found = True
                            break
                    else:
                        # Standard substring match for longer keywords
                        if keyword in text_upper:
                            results[i] = category
                            match_found = True
                            break
                if match_found:
                    break
            
            if not match_found:
                texts_to_predict.append(text)
                indices_to_predict.append(i)
        
        # 2. LLM Fallback (If API Key provided)
        if texts_to_predict and api_key:
            try:
                # Import here to avoid circular dependency at module level
                from services.llm_service import classify_transactions_with_llm
                
                print(f"Falling back to LLM for {len(texts_to_predict)} transactions...")
                llm_categories = classify_transactions_with_llm(texts_to_predict, api_key, base_url)
                
                for idx, category in enumerate(llm_categories):
                    original_idx = indices_to_predict[idx]
                    results[original_idx] = category
                    
                # Clear texts_to_predict as they are now handled
                texts_to_predict = []
                indices_to_predict = []
                
            except Exception as e:
                print(f"LLM Fallback failed: {e}")
                # Fall through to CrossEncoder if LLM fails
        
        # 3. Batch CrossEncoder Prediction for remaining (if any)
        if texts_to_predict:
            pairs = []
            for text in texts_to_predict:
                for category in self.categories:
                    pairs.append([text, f"This transaction is for {category}."])
            
            # Predict scores (N, 3)
            scores = self.model.predict(pairs, batch_size=32, show_progress_bar=False) # Changed show_progress_bar to False for cleaner output
            
            # Reshape to (Num_Texts, Num_Categories, 3)
            num_categories = len(self.categories)
            scores_reshaped = scores.reshape(len(texts_to_predict), num_categories, 3)
            
            # Extract entailment scores (index 1) -> (Num_Texts, Num_Categories)
            entailment_scores = scores_reshaped[:, :, 1]
            
            # Find max score index for each text
            max_indices = entailment_scores.argmax(axis=1)
            
            for idx, max_score_idx in enumerate(max_indices):
                best_category = self.categories[max_score_idx]
                original_idx = indices_to_predict[idx]
                results[original_idx] = best_category
                
        return results

    def classify(self, description: str) -> str:
        """
        Classify a single transaction description.
        Uses keyword matching first, then falls back to Zero-Shot CrossEncoder.
        """
        return self.classify_batch([description])[0]

# Global instance
classifier = TransactionClassifier()
