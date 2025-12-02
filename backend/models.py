from sqlalchemy import Column, Integer, String, Float, Boolean
from database import Base

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(String, index=True) 
    amount = Column(Float)
    description = Column(String)
    merchant = Column(String)      # Added this
    category = Column(String)
    type = Column(String)          # Added this (income/expense)
    is_recurring = Column(Boolean, default=False) # Added this

class Goal(Base):
    __tablename__ = "goals"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    target_amount = Column(Float)
    current_amount = Column(Float)
    deadline = Column(String)

class ClassificationRule(Base):
    __tablename__ = "classification_rules"

    id = Column(Integer, primary_key=True, index=True)
    pattern = Column(String, index=True) # The text/merchant to match
    category = Column(String) # The target category
    match_type = Column(String, default="contains") # exact, contains