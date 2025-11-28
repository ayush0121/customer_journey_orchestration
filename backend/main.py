from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from typing import List
from services.llm_service import extract_transactions_from_text, chat_with_data, generate_financial_insight, generate_budget_suggestion, detect_anomalies, generate_savings_scenario

import uvicorn
from sqlalchemy.orm import Session
from fastapi import Depends
import models
from database import SessionLocal, engine

models.Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalyzeRequest(BaseModel):
    text: List[str]
    api_key: str
    api_endpoint: str = "https://api.openai.com/v1"

class ChatRequest(BaseModel):
    query: str
    transactions: List[dict]
    api_key: str
    api_endpoint: str = "https://api.openai.com/v1"

class InsightRequest(BaseModel):
    transactions: List[dict]
    goals: List[dict]
    api_key: str
    api_endpoint: str = "https://api.openai.com/v1"

class BudgetRequest(BaseModel):
    transactions: List[dict]
    api_key: str
    api_endpoint: str = "https://api.openai.com/v1"

class AnomalyRequest(BaseModel):
    transactions: List[dict]
    api_key: str
    api_endpoint: str = "https://api.openai.com/v1"

class TransactionModel(BaseModel):
    date: str
    amount: float
    description: str
    category: str
    merchant: str

class GoalModel(BaseModel):
    name: str
    target_amount: float
    current_amount: float
    deadline: str

@app.get("/transactions")
def get_transactions(db: Session = Depends(get_db)):
    return db.query(models.Transaction).all()

@app.post("/transactions")
def create_transactions(transactions: List[TransactionModel], db: Session = Depends(get_db)):
    try:
        added_count = 0
        skipped_count = 0
        
        for t in transactions:
            # Check for duplicate
            existing = db.query(models.Transaction).filter(
                models.Transaction.date == t.date,
                models.Transaction.amount == t.amount,
                models.Transaction.description == t.description
            ).first()
            
            if existing:
                skipped_count += 1
                continue

            db_transaction = models.Transaction(
                date=t.date,
                amount=t.amount,
                description=t.description, # Mapping merchant to description/merchant
                category=t.category
            )
            db.add(db_transaction)
            added_count += 1
        
        db.commit()
        return {
            "message": f"Processed {len(transactions)} transactions.",
            "added": added_count,
            "skipped": skipped_count
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/goals")
def get_goals(db: Session = Depends(get_db)):
    return db.query(models.Goal).all()

@app.post("/goals")
def create_goal(goal: GoalModel, db: Session = Depends(get_db)):
    try:
        db_goal = models.Goal(
            name=goal.name,
            target_amount=goal.target_amount,
            current_amount=goal.current_amount,
            deadline=goal.deadline
        )
        db.add(db_goal)
        db.commit()
        db.refresh(db_goal)
        return db_goal
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/goals/{goal_id}")
def update_goal(goal_id: int, goal: GoalModel, db: Session = Depends(get_db)):
    db_goal = db.query(models.Goal).filter(models.Goal.id == goal_id).first()
    if not db_goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    db_goal.name = goal.name
    db_goal.target_amount = goal.target_amount
    db_goal.current_amount = goal.current_amount
    db_goal.deadline = goal.deadline
    
    db.commit()
    return db_goal

@app.post("/analyze")
async def analyze_statement(request: AnalyzeRequest):
    try:
        result = extract_transactions_from_text(request.text, request.api_key, request.api_endpoint)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat")
async def chat(request: ChatRequest):
    try:
        response = chat_with_data(request.query, request.transactions, request.api_key, request.api_endpoint)
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/insight")
async def generate_insight(request: InsightRequest):
    try:
        insight = generate_financial_insight(request.transactions, request.goals, request.api_key, request.api_endpoint)
        return insight
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/budget_suggestion")
async def suggest_budgets(request: BudgetRequest):
    try:
        suggestions = generate_budget_suggestion(request.transactions, request.api_key, request.api_endpoint)
        return {"suggestions": suggestions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/anomalies")
async def get_anomalies(request: AnomalyRequest):
    try:
        anomalies = detect_anomalies(request.transactions, request.api_key, request.api_endpoint)
        return {"anomalies": anomalies}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class WhatIfRequest(BaseModel):
    transactions: List[dict]
    goals: List[dict]
    extra_savings: float
    api_key: str
    api_endpoint: str = "https://api.openai.com/v1"

@app.post("/what_if")
async def what_if_analysis(request: WhatIfRequest):
    try:
        print(f"Received what_if request: extra_savings={request.extra_savings}")
        scenario = generate_savings_scenario(request.transactions, request.goals, request.extra_savings, request.api_key, request.api_endpoint)
        print(f"Generated scenario: {scenario}")
        return scenario
    except Exception as e:
        print(f"Error in what_if_analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
