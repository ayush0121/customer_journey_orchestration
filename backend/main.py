import uvicorn
import shutil
import os
from sqlalchemy.orm import Session
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List

import models
from database import SessionLocal, engine
from services.llm_service import (
    extract_transactions_from_text,
    chat_with_data,
    generate_financial_insight,
    generate_budget_suggestion,
    detect_anomalies,
    generate_savings_scenario,
    ingest_documents
)

# Load environment variables
load_dotenv()

# Create tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Pydantic Models ---

class AnalyzeRequest(BaseModel):
    text: List[str]

class ChatRequest(BaseModel):
    query: str
    transactions: List[dict]
    budgets: List[dict] = []
    goals: List[dict] = []

class InsightRequest(BaseModel):
    transactions: List[dict]
    goals: List[dict]

class BudgetRequest(BaseModel):
    transactions: List[dict]

class AnomalyRequest(BaseModel):
    transactions: List[dict]

class WhatIfRequest(BaseModel):
    transactions: List[dict]
    goals: List[dict]
    extra_savings: float

class TransactionCreate(BaseModel):
    date: str
    merchant: str
    amount: float
    type: str
    category: str
    description: str

class GoalCreate(BaseModel):
    name: str
    target_amount: float
    current_amount: float = 0
    deadline: str


# --- Endpoints ---

@app.get("/")
def read_root():
    return {"message": "Finance AI Backend is running"}

@app.post("/analyze")
async def analyze_statement(request: AnalyzeRequest):
    try:
        # Get API key from env
        api_key = os.getenv("OPENAI_API_KEY")
        base_url = os.getenv("OPENAI_BASE_URL")
        
        if not api_key:
            raise HTTPException(status_code=500, detail="Server misconfiguration: OPENAI_API_KEY not set.")

        text_lines = request.text

        # 1. Ingest for RAG
        ingest_documents(text_lines, api_key)
        
        # 2. Extract Structured Data
        result = extract_transactions_from_text(text_lines, api_key, base_url)
        
        return result
    except Exception as e:
        print(f"Error in analyze_statement: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat")
async def chat(request: ChatRequest):
    try:
        api_key = os.getenv("OPENAI_API_KEY")
        base_url = os.getenv("OPENAI_BASE_URL")
        if not api_key:
             raise HTTPException(status_code=500, detail="Server misconfiguration: OPENAI_API_KEY not set.")

        response = chat_with_data(request.query, request.transactions, request.budgets, request.goals, api_key, base_url)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/insight")
async def get_insight(request: InsightRequest):
    try:
        api_key = os.getenv("OPENAI_API_KEY")
        base_url = os.getenv("OPENAI_BASE_URL")
        if not api_key:
             raise HTTPException(status_code=500, detail="Server misconfiguration: OPENAI_API_KEY not set.")

        insight = generate_financial_insight(request.transactions, request.goals, api_key, base_url)
        return insight
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/budget-suggestion")
async def get_budget_suggestion(request: BudgetRequest):
    try:
        api_key = os.getenv("OPENAI_API_KEY")
        base_url = os.getenv("OPENAI_BASE_URL")
        if not api_key:
             raise HTTPException(status_code=500, detail="Server misconfiguration: OPENAI_API_KEY not set.")

        suggestions = generate_budget_suggestion(request.transactions, api_key, base_url)
        return {"suggestions": suggestions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/anomalies")
async def get_anomalies(request: AnomalyRequest):
    try:
        api_key = os.getenv("OPENAI_API_KEY")
        base_url = os.getenv("OPENAI_BASE_URL")
        if not api_key:
             raise HTTPException(status_code=500, detail="Server misconfiguration: OPENAI_API_KEY not set.")

        anomalies = detect_anomalies(request.transactions, api_key, base_url)
        return {"anomalies": anomalies}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/savings-scenario")
async def what_if_analysis(request: WhatIfRequest):
    try:
        api_key = os.getenv("OPENAI_API_KEY")
        base_url = os.getenv("OPENAI_BASE_URL")
        if not api_key:
             raise HTTPException(status_code=500, detail="Server misconfiguration: OPENAI_API_KEY not set.")

        scenario = generate_savings_scenario(request.transactions, request.goals, request.extra_savings, api_key, base_url)
        return scenario
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Database Endpoints (Optional, for persistence) ---

@app.post("/transactions")
def create_transactions(transactions: List[TransactionCreate], db: Session = Depends(get_db)):
    try:
        db_transactions = []
        for t in transactions:
            db_t = models.Transaction(
                date=t.date,
                merchant=t.merchant,
                amount=t.amount,
                type=t.type,
                category=t.category,
                description=t.description
            )
            db.add(db_t)
            db_transactions.append(db_t)
        db.commit()
        for t in db_transactions:
            db.refresh(t)
        return db_transactions
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/transactions")
def read_transactions(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    transactions = db.query(models.Transaction).offset(skip).limit(limit).all()
    return transactions

@app.get("/goals")
def read_goals(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    goals = db.query(models.Goal).offset(skip).limit(limit).all()
    return goals

@app.post("/goals")
def create_goals(goals: List[GoalCreate], db: Session = Depends(get_db)):
    try:
        db_goals = []
        for g in goals:
            db_g = models.Goal(
                name=g.name,
                target_amount=g.target_amount,
                current_amount=g.current_amount,
                deadline=g.deadline
            )
            db.add(db_g)
            db_goals.append(db_g)
        db.commit()
        for g in db_goals:
            db.refresh(g)
        return db_goals
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/goals/{goal_id}")
def delete_goal(goal_id: int, db: Session = Depends(get_db)):
    try:
        goal = db.query(models.Goal).filter(models.Goal.id == goal_id).first()
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")
        db.delete(goal)
        db.commit()
        return {"message": "Goal deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/transactions")
def clear_data(db: Session = Depends(get_db)):
    try:
        # Delete all transactions
        db.query(models.Transaction).delete()
        # Delete all goals (optional, but "clear everything" implies this)
        db.query(models.Goal).delete()
        db.commit()
        return {"message": "All data cleared successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

class CategoryUpdate(BaseModel):
    category: str

@app.put("/transactions/{transaction_id}/category")
def update_transaction_category(transaction_id: int, update: CategoryUpdate, db: Session = Depends(get_db)):
    try:
        transaction = db.query(models.Transaction).filter(models.Transaction.id == transaction_id).first()
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        old_category = transaction.category
        new_category = update.category
        
        # Update transaction
        transaction.category = new_category
        db.commit()
        
        # Learn from correction
        # We use the description (or merchant) as the pattern
        # Ideally we use the description as it's more specific, or merchant if description is generic.
        # For now, let's use description as the pattern.
        from services.classification_service import classifier
        classifier.learn_correction(transaction.description, new_category)
        
        return {"message": "Category updated and rule learned", "transaction": transaction}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)