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