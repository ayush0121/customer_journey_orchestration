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
            'Streaming Services': ['NETFLIX', 'HULU', 'DISNEY+', 'HBO', 'HBO MAX', 'PRIME VIDEO'],
            'Music Services': ['SPOTIFY', 'APPLE MUSIC', 'AMAZON MUSIC', 'TIDAL'],
            'Fitness & Wellness': ['GYM', 'CLASSPASS', 'FITBIT', 'YOGA', 'PILATES', 'PERSONAL TRAINER'],
            'Software Subscriptions': ['MICROSOFT', 'ADOBE', 'JETBRAINS', 'ATLASSIAN', 'ATLASIAN', 'SOFTWARE', 'GITHUB', 'NOTION', 'SLACK', 'TRELLO', 'ASAANA', 'ASANA'],
            'Cloud Storage': ['DROPBOX', 'GOOGLE DRIVE', 'GOOGLEDRIVE', 'ONE DRIVE', 'ONE-DRIVE', 'ONEDRIVE', 'ICLOUD', 'CLOUD STORAGE', 'GOOGLE ONE'],
            'Education': ['EDU', 'COURSE', 'UDEMY', 'COURSERA', 'SCHOOL', 'UNIVERSITY', 'COLLEGE', 'TUITION', 'LEARNING', 'BOOTCAMP', 'K12'],
            'Childcare': ['DAYCARE', 'NANNY', 'SITTER', 'PRESCHOOL', 'CHILDCARE'],
            'Pet Care': ['VET', 'PETCO', 'PETSMART', 'PET', 'ANIMAL', 'GROOMING'],
            'Gifts and Holidays': ['GIFT', 'HALLMARK', 'TOYS', 'GIFT SHOP', 'PRESENT', 'FLOWERS'],
            'Tax Payments': ['TAX', 'IRS', 'HMRC', 'TDS', 'PAYROLL TAX', 'INCOME TAX'],
            'Insurance premiums': ['INSURANCE', 'PREMIUM', 'GEICO', 'AETNA', 'BLUE CROSS', 'PRUDENTIAL', 'HDFC ERGO', 'LIC'],
            'Loan Payments': ['LOAN PAYMENT', 'EMI', 'HOME LOAN', 'AUTO LOAN', 'PERSONAL LOAN', 'LOAN'],
            'Memberships': ['MEMBERSHIP', 'ANNUAL FEE', 'SUBSCRIPTION', 'MEMBER'],
            'Healthcare': ['PHARMACY', 'CVS', 'WALGREENS', 'KAISER', 'HOSPITAL', 'CLINIC', 'DOCTOR', 'MEDICINE'],
            'Transportation': ['UBER', 'LYFT', 'SHELL', 'CHEVRON', 'BP', 'AMTRAK', 'METRO', 'TAXI', 'TOLL', 'TRANSPORT'],
            'Travel & Vacations': ['AIRBNB', 'EXPEDIA', 'DELTA', 'UNITED', 'SOUTHWEST', 'HOTEL', 'BOOKING.COM', 'BOOKING', 'TRAVEL', 'AIRLINE', 'AVION', 'MAKING TRAVEL', 'HOTELS.COM'],
            'Investement Contributions': ['VANGUARD', 'SCHWAB', 'FIDELITY', 'ROBINHOOD', 'MUTUAL FUND', 'ETF', 'SIP', 'INVEST', 'BROKERAGE', 'ZERODHA', 'UPSTOX'],
            'Credit Card Payments': ['CARD PAYMENT', 'CREDIT CARD PAYMENT', 'AMEX PAYMENT', 'VISA PAYMENT', 'MASTERCARD PAYMENT', 'CC PAYMENT'],
            'Income': ['SALARY', 'PAYCHECK', 'DEPOSIT', 'INCOME', 'DIVIDEND', 'INTEREST', 'REFUND', 'REIMBURSEMENT'],
            
            # Generic Categories (Check these later)
            'Groceries': ['WHOLEFOODS', 'WHOLEFDS', 'TRADER JOE', 'TRADER JOES', 'SAFEWAY', 'KROGER', 'ALDI', 'COSTCO', 'WALMART', 'PUBLIX', 'SPROUTS', 'GROCERY', 'SUPERMARKET', 'MARKET', 'BIG BASKET', 'GROCER', 'INSTA MART'],
            'Dining': ['STARBUCKS', 'MCDONALD', 'MCDONALDS', 'MCD', 'BURGER', 'PIZZA', 'PIZZA HUT', 'DOMINOS', 'PAPA JOHN', 'RESTAURANT', 'CAFE', 'DOORDASH', 'UBEREATS', 'GRUBHUB', 'ZOMATO', 'SWIGGY', 'DINING', 'FOOD', 'DINING OUT', 'DINING-OUT'],
            'Shopping': ['AMZN', 'AMAZON', 'TARGET', 'WALMART', 'BEST BUY', 'EBAY', 'TJMAXX', 'IKEA', 'SEPHORA', 'SHOP', 'MALL', 'FLIPKART'],
            'Utilities': ['ELECTRIC', 'WATER', 'GAS', 'UTILITY', 'PG&E', 'PGE', 'CON EDISON', 'CONED', 'SCE', 'DOMINION', 'WATER BILL', 'ELECTRICITY', 'TELECOM', 'INTERNET', 'BILL']
        }
        
        self.categories = list(self.keyword_map.keys()) + ["Income", "Miscellaneous"]
        print("CrossEncoder model loaded successfully.")

from sentence_transformers import CrossEncoder
import torch
import re
from typing import List

class TransactionClassifier:
    def __init__(self, model_name: str = "cross-encoder/nli-distilroberta-base"):
        """NER
        Initialize the CrossEncoder model.
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
        print("CrossEncoder model loaded successfully.")

    def classify_batch(self, texts: List[str]) -> List[str]:
        """
        Classify a batch of transaction descriptions.
        """
        if not texts:
            return []
            
        results = [None] * len(texts) # Initialize results with None placeholders
        texts_to_predict = []
        indices_to_predict = []
        
        # 1. Fast Keyword Matching
        for i, text in enumerate(texts):
            if not text:
                results[i] = "Miscellaneous"
                continue

            match_found = False
            text_upper = text.upper()
            
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
        
        # 2. Batch CrossEncoder Prediction for remaining
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
