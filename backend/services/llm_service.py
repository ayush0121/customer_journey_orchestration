import os
from typing import List, Optional
from langchain_openai import ChatOpenAI, AzureChatOpenAI, OpenAIEmbeddings
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()

# Global Vector Store (In-memory for POC)
vector_store = None

# --- Pydantic Models for Structured Output ---

class Transaction(BaseModel):
    date: str = Field(description="Transaction date in YYYY-MM-DD format")
    merchant: str = Field(description="Name of the merchant or description")
    amount: float = Field(description="Transaction amount (absolute value)")
    type: str = Field(description="'income' or 'expense'")
    category: str = Field(description="Category (e.g., Dining, Groceries, Rent, Salary)")
    description: str = Field(description="Original description text")

class StatementAnalysis(BaseModel):
    transactions: List[Transaction]
    closing_balance: float = Field(description="The ending balance found in the statement, or 0 if not found")

class Anomaly(BaseModel):
    description: str = Field(description="Description of the anomaly or pattern")
    type: str = Field(description="'anomaly', 'recurring', or 'seasonality'")
    severity: str = Field(description="'low', 'medium', or 'high'")
    transaction_id: Optional[str] = Field(None, description="ID of related transaction if applicable")

class AnomalyList(BaseModel):
    anomalies: List[Anomaly]

class FinancialInsight(BaseModel):
    insight_text: str = Field(description="A one-sentence actionable financial insight.")
    metric_value: str = Field(description="The specific dollar amount or percentage related to the insight.")
    impacted_goal: str = Field(description="The name of the financial goal this insight helps achieve.")
    spending_summary: str = Field(description="A natural language summary of spending trends (e.g., 'You spent 20% less on dining this month').")
    projected_balance: float = Field(description="The projected end-of-month balance based on current spending patterns.")

class ActionDetails(BaseModel):
    from_category: Optional[str] = Field(None, description="Source category for budget move")
    to_category: Optional[str] = Field(None, description="Destination category for budget move")
    amount: Optional[float] = Field(None, description="Amount to move or save")
    goal_name: Optional[str] = Field(None, description="Name of the goal to create")
    target_amount: Optional[float] = Field(None, description="Target amount for the goal")
    deadline: Optional[str] = Field(None, description="Deadline for the goal")

class AgentAction(BaseModel):
    type: str = Field(description="Type of action: 'none', 'move_budget', 'create_goal'.")
    details: ActionDetails = Field(description="Details of the action.")
    message: str = Field(description="Message to display to the user.")

class BudgetSuggestion(BaseModel):
    category: str = Field(description="The spending category (e.g., Dining, Groceries).")
    suggested_limit: float = Field(description="The recommended monthly budget limit.")
    reason: str = Field(description="A brief explanation for this suggestion based on past spending.")

class BudgetSuggestionList(BaseModel):
    suggestions: List[BudgetSuggestion]

class GoalDeadline(BaseModel):
    goal_name: str = Field(description="Name of the goal")
    new_date: str = Field(description="New estimated completion date (YYYY-MM-DD)")
    months_saved: float = Field(description="Number of months saved compared to original timeline")

class SavingsScenario(BaseModel):
    monthly_contribution_increase: float = Field(description="The extra amount saved per month.")
    new_deadlines: List[GoalDeadline] = Field(description="List of goals with updated deadlines.")
    impact_description: str = Field(description="Natural language explanation of the impact (e.g., 'You will reach your Car goal 3 months earlier').")
    trade_off_suggestion: str = Field(description="A suggestion on how to achieve this saving (e.g., 'This is equivalent to cutting 2 dinners out per month').")

class CategoryList(BaseModel):
    categories: List[str] = Field(description="List of categories corresponding to the input descriptions.")


# --- Helper Functions ---

def get_llm(api_key: str, base_url: Optional[str] = None, temperature: float = 0):
    """
    Returns a configured ChatOpenAI or AzureChatOpenAI instance.
    """
    if base_url and "azure" in base_url:
        return AzureChatOpenAI(
            azure_endpoint=base_url.split("/openai")[0],
            api_key=api_key,
            api_version="2025-01-01-preview", # Update as needed
            deployment_name="gpt-4o", # Update as needed
            temperature=temperature
        )
    else:
        # Default to standard OpenAI if no base_url or not azure
        return ChatOpenAI(
            api_key=api_key,
            base_url=base_url if base_url else "https://api.openai.com/v1",
            model="gpt-4o",
            temperature=temperature
        )

def ingest_documents(text_lines: List[str], api_key: str):
    global vector_store
    
    if not text_lines:
        return

    try:
        text = "\n".join(text_lines)
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=300, chunk_overlap=20)
        docs = [Document(page_content=x) for x in text_splitter.split_text(text)]
        
        # Note: For Azure OpenAI Embeddings, you might need AzureOpenAIEmbeddings
        # For this POC, we assume standard OpenAIEmbeddings or compatible
        embeddings = OpenAIEmbeddings(api_key=api_key)
        
        # Initialize or update vector store
        vector_store = Chroma.from_documents(documents=docs, embedding=embeddings)
        print(f"Ingested {len(docs)} chunks into Vector Store.")
        
    except Exception as e:
        print(f"Error ingesting documents: {e}")

def extract_transactions_from_text(text_lines: List[str], api_key: str, base_url: str = "https://api.openai.com/v1") -> dict:
    if len(text_lines) == 0:
        return {"transactions": [], "closing_balance": 0.0}

    llm = get_llm(api_key, base_url, temperature=0)
    
    # Chunking configuration
    CHUNK_SIZE = 300
    OVERLAP = 30
    
    chunks = []
    for i in range(0, len(text_lines), CHUNK_SIZE - OVERLAP):
        chunk = text_lines[i:i + CHUNK_SIZE]
        chunks.append(chunk)
        
    print(f"Split text into {len(chunks)} chunks.")
    
    all_transactions = []
    closing_balance = 0.0
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are an expert financial data extractor. Extract structured transaction data from the provided bank statement segment.

CRITICAL INSTRUCTIONS:
1. **EXHAUSTIVENESS**: Extract EVERY single transaction line item in this segment.
2. **CLOSING BALANCE**: If you see an explicit 'Ending Balance' or 'New Balance' summary, extract it. Otherwise set to 0.
3. **CLASSIFICATION**: 
   - Look for 'CR', 'Credit', 'Deposit' -> INCOME.
   - Look for 'DR', 'Debit', 'Payment', 'Purchase', 'Withdrawal' -> EXPENSE.
   - **IMPORTANT:** If a transaction has values in both 'Withdrawal' and 'Deposit' columns (rare), prioritize the non-zero value.
4. **REASONING**: Provide a brief reasoning.

Return a JSON object with 'transactions' and 'closing_balance'."""),
        ("user", "{text}")
    ])

    chain = prompt | llm.with_structured_output(StatementAnalysis)

    from concurrent.futures import ThreadPoolExecutor, as_completed

    def process_chunk(index, chunk_lines):
        chunk_text = "\n".join(chunk_lines)
        try:
            msg = f"Processing Chunk {index+1}/{len(chunks)} ({len(chunk_lines)} lines)..."
            print(msg)
            with open("backend_debug.log", "a") as f:
                f.write(f"{msg}\n")
            
            result = chain.invoke({"text": chunk_text})
            return result.model_dump()
        except Exception as e:
            print(f"Error processing chunk {index+1}: {e}")
            with open("backend_debug.log", "a") as f:
                f.write(f"Error in chunk {index+1}: {str(e)}\n")
            return None

    with ThreadPoolExecutor(max_workers=5) as executor:
        future_to_chunk = {executor.submit(process_chunk, i, chunk): i for i, chunk in enumerate(chunks)}
        
        for future in as_completed(future_to_chunk):
            data = future.result()
            if data:
                chunk_txs = data.get('transactions', [])
                print(f"  Found {len(chunk_txs)} transactions in a chunk.")
                all_transactions.extend(chunk_txs)
                
                # Update closing balance if found and non-zero
                cb = data.get('closing_balance', 0.0)
                if cb != 0.0:
                    closing_balance = cb

    # Deduplicate transactions based on date+description+amount
    unique_transactions = []
    seen = set()
    for t in all_transactions:
        # Create a unique key
        key = f"{t['date']}|{t['description']}|{t['amount']}"
        if key not in seen:
            seen.add(key)
            unique_transactions.append(t)
            
    print(f"Total unique transactions: {len(unique_transactions)}")

    # Post-processing classification (Mocked for now, or use classification_service if available)
    # For this POC, we'll trust the LLM's initial classification or do a simple pass
    # If classification_service exists, we can use it.
    try:
        from services.classification_service import classifier
        descriptions = [t.get('description', '') for t in unique_transactions]
        # Pass API key and base_url to allow LLM fallback
        new_categories = classifier.classify_batch(descriptions, api_key=api_key, base_url=base_url)
        for i, t in enumerate(unique_transactions):
            if t.get('merchant') is None:
                t['merchant'] = "Unknown"
            if new_categories[i]:
                t['category'] = new_categories[i]
    except ImportError:
        pass # Classification service might not be available

    return {"transactions": unique_transactions, "closing_balance": closing_balance}

def detect_anomalies(transactions: List[dict], api_key: str, base_url: str = "https://api.openai.com/v1") -> List[dict]:
    if not transactions:
        return []

    llm = get_llm(api_key, base_url, temperature=0)

    # Summarize transactions for the LLM
    transaction_summary = "\n".join([f"- {t['date']}: {t['merchant']} ({t['category']}) - ${t['amount']}" for t in transactions])

    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a financial auditor. Analyze the provided list of transactions for anomalies, recurring patterns, and seasonality.\n\nLook for:\n1. **Anomalies**: Unusually high amounts, duplicate charges, suspicious merchants.\n2. **Recurring**: Identify regular subscriptions or bills (e.g., Netflix, Rent, Utilities) and their frequency.\n3. **Seasonality**: Identify spending spikes related to specific times (e.g., 'Higher utility bills in winter', 'Weekend dining spikes').\n\nReturn a list of findings. If nothing significant is found, return an empty list."),
        ("system", f"Transactions:\n{transaction_summary}"),
        ("user", "Analyze for anomalies, recurring patterns, and seasonality.")
    ])

    chain = prompt | llm.with_structured_output(AnomalyList)
    
    try:
        result = chain.invoke({})
        return [a.model_dump() for a in result.anomalies]
    except Exception as e:
        print(f"Error detecting anomalies: {e}")
        return []

def chat_with_data(query: str, transactions: List[dict], budgets: List[dict], goals: List[dict], api_key: str, base_url: str = "https://api.openai.com/v1") -> dict:
    llm = get_llm(api_key, base_url, temperature=0.7)

    # 1. Retrieve relevant context from PDF if available
    retrieved_context = ""
    if vector_store:
        try:
            results = vector_store.similarity_search(query, k=3)
            retrieved_context = "\n\n".join([doc.page_content for doc in results])
            print(f"Retrieved {len(results)} chunks for query.")
        except Exception as e:
            print(f"Error retrieving context: {e}")

    # 2. Format Transaction Data (Dashboard Context)
    total_income = sum(t['amount'] for t in transactions if t.get('type') == 'income')
    total_expense = sum(t['amount'] for t in transactions if t.get('type') == 'expense')
    
    # Category Totals (All Time)
    category_totals = {}
    for t in transactions:
        if t.get('type') == 'expense':
            cat = t.get('category', 'Other')
            category_totals[cat] = category_totals.get(cat, 0) + float(t['amount'])
            
    category_summary = "\n".join([f"   - {cat}: ${amt:.2f}" for cat, amt in category_totals.items()])

    # Monthly Breakdown
    monthly_data = {}
    for t in transactions:
        try:
            date_str = t.get('date', '')
            # Assume YYYY-MM-DD
            month_key = date_str[:7] # YYYY-MM
            if not month_key: continue
            
            if month_key not in monthly_data:
                monthly_data[month_key] = {'income': 0, 'expense': 0, 'categories': {}}
            
            amt = float(t['amount'])
            if t.get('type') == 'income':
                monthly_data[month_key]['income'] += amt
            else:
                monthly_data[month_key]['expense'] += amt
                cat = t.get('category', 'Other')
                monthly_data[month_key]['categories'][cat] = monthly_data[month_key]['categories'].get(cat, 0) + amt
        except:
            continue

    monthly_breakdown = []
    for month, data in sorted(monthly_data.items(), reverse=True):
        cat_str = ", ".join([f"{c}: ${a:.0f}" for c, a in data['categories'].items()])
        monthly_breakdown.append(f"- **{month}**: Income ${data['income']:.0f}, Expense ${data['expense']:.0f} ({cat_str})")
    
    monthly_breakdown_str = "\n".join(monthly_breakdown)

    # Budgets Context
    budget_context = "\n".join([f"- {b['category']}: Limit ${b['limit']}, Spent ${b['spent']} (Remaining: ${b['limit'] - b['spent']})" for b in budgets])

    # Goals Context
    goal_context = "\n".join([f"- {g['name']}: Target ${g['targetAmount']}, Current ${g['currentAmount']}, Deadline {g['deadline']}" for g in goals])

    transaction_context = "\n".join([f"- {t['date']}: {t['merchant']} ({t['category']}) - ${t['amount']}" for t in transactions])
    
    # 3. Construct Hybrid Prompt
    system_prompt = (
        "You are a helpful financial assistant. You have access to comprehensive dashboard data:\n"
        "1. **Dashboard Data**: Transactions, Budgets, and Goals.\n"
        "2. **Document Context**: Relevant text chunks retrieved from uploaded bank statements.\n\n"
        "**Financial Summary (Calculated):**\n"
        f"- **Total Income**: ${total_income:.2f}\n"
        f"- **Total Expense**: ${total_expense:.2f}\n"
        "- **Spending by Category (All Time)**:\n"
        f"{category_summary}\n\n"
        "**Monthly Breakdown (Use this for temporal questions like 'How much did I spend in June?'):**\n"
        f"{monthly_breakdown_str}\n\n"
        "**Active Budgets:**\n"
        f"{budget_context}\n\n"
        "**Financial Goals:**\n"
        f"{goal_context}\n\n"
        "Use ALL sources to answer. Be accurate with numbers.\n"
        "- If the user asks about specific months, look at the 'Monthly Breakdown'.\n"
        "- If the user asks about budgets or goals, use the respective sections.\n"
        "- If the user asks about specific transactions, refer to the raw list.\n\n"
        "Supported Actions:\n"
        "1. **Move Budget**: If the user wants to move money between categories.\n"
        "2. **Create Goal**: If the user wants to save for something.\n\n"
        "If the user asks a question, set type='none' and provide the answer in 'message'.\n"
        "If the user requests an action, set type='move_budget' or 'create_goal', fill 'details', and ask for confirmation in 'message'."
    )

    user_content = f"""Query: {query}

--- Document Context (from PDF) ---
{retrieved_context}

--- Raw Transactions ---
{transaction_context}
"""

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("user", "{user_content}")
    ])

    chain = prompt | llm.with_structured_output(AgentAction)
    response = chain.invoke({"user_content": user_content})
    return response.model_dump()

def generate_financial_insight(transactions: List[dict], goals: List[dict], api_key: str, base_url: str = "https://api.openai.com/v1") -> dict:
    try:
        llm = get_llm(api_key, base_url, temperature=0.7)

        transaction_summary = "\n".join([f"- {t['merchant']} ({t['category']}): ${t['amount']}" for t in transactions])
        goals_summary = "\n".join([f"- {g['name']}: Target ${g['targetAmount']}, Current ${g['currentAmount']}" for g in goals])

        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a financial advisor. Analyze the user's spending and goals.\n1. Generate a structured financial insight to help save money.\n2. Create a natural language summary of their spending trends (e.g., compare to typical or highlight major categories).\n3. Estimate a projected end-of-month balance assuming current spending continues (provide a realistic number based on the data)."),
            ("system", f"Recent Transactions:\n{transaction_summary}\n\nActive Goals:\n{goals_summary}"),
            ("user", "Generate financial insight, summary, and projection.")
        ])

        if not transactions and not goals:
             return {
                "insight_text": "Add transactions and goals to get AI insights.",
                "metric_value": "$0",
                "impacted_goal": "None",
                "spending_summary": "No data available yet.",
                "projected_balance": 0.0
            }

        chain = prompt | llm.with_structured_output(FinancialInsight)
        result = chain.invoke({})
        return result.model_dump()
    except Exception as e:
        print(f"Error generating insight: {e}")
        return {
            "insight_text": "Could not generate insight at this time.",
            "metric_value": "N/A",
            "impacted_goal": "None",
            "spending_summary": "Please check your connection or try again later.",
            "projected_balance": 0.0
        }

def generate_budget_suggestion(transactions: List[dict], api_key: str, base_url: str = "https://api.openai.com/v1") -> List[dict]:
    llm = get_llm(api_key, base_url, temperature=0.7)

    # Summarize spending by category
    category_totals = {}
    for t in transactions:
        cat = t.get('category', 'Other')
        amount = float(t.get('amount', 0))
        if cat not in category_totals:
            category_totals[cat] = 0
        category_totals[cat] += amount

    spending_summary = "\n".join([f"- {cat}: ${total:.2f}" for cat, total in category_totals.items()])

    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a financial planner. Analyze the user's spending summary. For each major category (especially discretionary ones like Dining, Shopping, Entertainment), suggest a realistic monthly budget that encourages saving (e.g., 10-15% less than current average). Ignore fixed costs like Rent unless they seem variable."),
        ("system", f"Spending Summary:\n{spending_summary}"),
        ("user", "Generate budget suggestions.")
    ])

    chain = prompt | llm.with_structured_output(BudgetSuggestionList)
    result = chain.invoke({})
    return [s.model_dump() for s in result.suggestions]

def generate_savings_scenario(transactions: List[dict], goals: List[dict], extra_savings: float, api_key: str, base_url: str = "https://api.openai.com/v1") -> dict:
    llm = get_llm(api_key, base_url, temperature=0.7)

    goals_summary = "\n".join([f"- {g['name']}: Target ${g['targetAmount']}, Current ${g['currentAmount']}, Deadline {g['deadline']}" for g in goals])
    
    # Calculate spending context for trade-offs
    category_totals = {}
    for t in transactions:
        cat = t.get('category', 'Other')
        amount = float(t.get('amount', 0))
        if t.get('type') == 'expense':
             category_totals[cat] = category_totals.get(cat, 0) + amount
    
    spending_context = "\n".join([f"- {cat}: ${total:.2f}" for cat, total in category_totals.items()])

    with open("backend_debug.log", "a") as f:
        f.write(f"\n--- Generating Savings Scenario ---\n")
        f.write(f"Goals Summary:\n{goals_summary}\n")
        f.write(f"Spending Context:\n{spending_context}\n")

    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a financial simulator. The user wants to see the impact of saving an EXTRA amount per month.\n1. Calculate how much faster they will reach each goal with the extra contribution (assume the extra amount is split evenly or applied to the nearest deadline).\n2. Provide a 'trade_off_suggestion' based on their actual spending (e.g., 'Cut Dining by 10%').\n3. Generate a natural language 'impact_description'."),
        ("system", f"Goals:\n{goals_summary}\n\nSpending Context:\n{spending_context}"),
        ("user", f"Simulate an extra monthly saving of ${extra_savings}.")
    ])

    chain = prompt | llm.with_structured_output(SavingsScenario)
    
    try:
        result = chain.invoke({})
        with open("backend_debug.log", "a") as f:
            f.write(f"LLM Result: {result}\n")
        return result.model_dump()
    except Exception as e:
        with open("backend_debug.log", "a") as f:
            f.write(f"Error in generate_savings_scenario: {e}\n")
        print(f"Error in generate_savings_scenario: {e}")
        # Return a dummy object to prevent frontend crash
        return {
            "monthly_contribution_increase": extra_savings,
            "new_deadlines": [],
            "impact_description": "Could not generate simulation. Please try again.",
            "trade_off_suggestion": "Check your connection."
        }

def classify_transactions_with_llm(descriptions: List[str], api_key: str, base_url: str = "https://api.openai.com/v1") -> List[str]:
    """
    Classifies a list of transaction descriptions using the LLM.
    Returns a list of categories corresponding to the input descriptions.
    """
    if not descriptions:
        return []

    try:
        llm = get_llm(api_key, base_url, temperature=0)
        
        # Batch descriptions to avoid token limits (though for this app volume is likely low)
        # For simplicity, we'll send all at once if < 50, otherwise chunking might be needed.
        # Assuming reasonable batch size from caller.

        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert transaction classifier. Classify the following transaction descriptions into one of these categories:
- Subscriptions
- Transportation
- Travel & Vacations
- Credit Card Payments
- Income
- Groceries
- Dining
- Shopping
- Bills
- Others

Use your knowledge of US merchants and brands.
Return a list of categories in the exact same order as the input descriptions.
If you are unsure, use 'Others'."""),
            ("user", "Classify these:\n" + "\n".join([f"- {d}" for d in descriptions]))
        ])

        chain = prompt | llm.with_structured_output(CategoryList)
        result = chain.invoke({})
        
        # Ensure we return exactly one category per description
        categories = result.categories
        
        # Pad or truncate if length mismatch (shouldn't happen with structured output but safety first)
        if len(categories) < len(descriptions):
            categories.extend(["Others"] * (len(descriptions) - len(categories)))
        return categories[:len(descriptions)]

    except Exception as e:
        print(f"Error in classify_transactions_with_llm: {e}")
        # Fallback to 'Others' or None to let caller handle
        return ["Others"] * len(descriptions)