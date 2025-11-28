from typing import List
from langchain_openai import ChatOpenAI, AzureChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.pydantic_v1 import BaseModel, Field
import re
from urllib.parse import urlparse, parse_qs

class Transaction(BaseModel):
    date: str = Field(description="Date of the transaction in YYYY-MM-DD format")
    merchant: str = Field(description="Name of the merchant or payee")
    amount: float = Field(description="Amount of the transaction")
    category: str = Field(description="Classify the transaction into one of the following categories based on the merchant and description: 'Groceries', 'Dining', 'Transport', 'Entertainment', 'Shopping', 'Utilities', 'Rent', 'Health', 'Travel', 'Education', 'Income', 'Transfer', 'Subscription', 'Other'. Use your knowledge of merchants (e.g., 'Uber' -> 'Transport', 'Netflix' -> 'Subscription') to assign the most appropriate category.")
    type: str = Field(description="Classify as 'income' if it is a deposit, salary, or credit. Classify as 'expense' if it is a payment, purchase, or debit.", pattern="^(income|expense)$")
    isRecurring: bool = Field(description="True if this looks like a recurring subscription or bill", default=False)
    originalDescription: str = Field(description="The original text description from the statement")
    reasoning: str = Field(description="Brief explanation for why you classified the type and category as you did. Mention specific keywords found (e.g., 'Found CR marker', 'Merchant is known for dining').")

class StatementAnalysis(BaseModel):
    transactions: List[Transaction]
    closing_balance: float = Field(description="The explicit 'Ending Balance', 'Closing Balance', or 'New Balance' found in the statement summary. If not found, return 0.0.")

class Anomaly(BaseModel):
    description: str = Field(description="Description of the finding.")
    type: str = Field(description="Type of finding: 'anomaly', 'recurring', 'seasonality'.")
    severity: str = Field(description="Severity/Importance: 'low', 'medium', 'high'.")
    transaction_id: str = Field(description="The ID of the transaction related to this finding, if applicable.", default="")

class AnomalyList(BaseModel):
    anomalies: List[Anomaly]

def extract_transactions_from_text(text_lines: List[str], api_key: str, base_url: str = "https://api.openai.com/v1") -> dict:
    if not text_lines:
        return {"transactions": [], "closing_balance": 0.0}

    # Check if it's an Azure endpoint
    if "azure.com" in base_url:
        try:
            # Parse Azure URL components
            parsed_url = urlparse(base_url)
            azure_endpoint = f"{parsed_url.scheme}://{parsed_url.netloc}"
            
            # Extract deployment name
            match = re.search(r"/deployments/([^/]+)", parsed_url.path)
            deployment_name = match.group(1) if match else "gpt-4o"
            
            # Extract api version
            qs = parse_qs(parsed_url.query)
            api_version = qs.get("api-version", ["2025-01-01-preview"])[0]

            llm = AzureChatOpenAI(
                azure_deployment=deployment_name,
                api_version=api_version,
                azure_endpoint=azure_endpoint,
                api_key=api_key,
                temperature=0
            )
        except Exception as e:
            print(f"Error parsing Azure URL: {e}, falling back to standard")
            llm = ChatOpenAI(model="gpt-3.5-turbo", api_key=api_key, base_url=base_url, temperature=0)
    else:
        llm = ChatOpenAI(model="gpt-3.5-turbo", api_key=api_key, base_url=base_url, temperature=0)
    
    full_text = "\n".join(text_lines)

    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are an expert financial data extractor. Your task is to extract structured transaction data AND the closing balance from the provided bank statement text.\n\nCRITICAL INSTRUCTIONS:\n1. **EXHAUSTIVENESS**: You must extract EVERY single transaction line item. Do not summarize. Do not skip large or small transactions. If there are 50 transactions, return 50 items.\n2. **CLOSING BALANCE**: Find the explicit 'Ending Balance', 'Closing Balance', or 'New Balance' in the summary section. This is the source of truth for the account status.\n3. **CLASSIFICATION**: \n   - Look for 'CR', 'Credit', 'Deposit' -> INCOME.\n   - Look for 'DR', 'Debit', 'Payment', 'Purchase' -> EXPENSE.\n   - Double-check high-value items (> $10,000).\n4. **REASONING**: Provide a brief reasoning for each classification.\n\nReturn a JSON object with 'transactions' and 'closing_balance'."),
        ("user", "{text}")
    ])

    chain = prompt | llm.with_structured_output(StatementAnalysis)

    try:
        result = chain.invoke({"text": full_text})
        return result.dict()
    except Exception as e:
        print(f"Error extracting transactions: {e}")
        return {"transactions": [], "closing_balance": 0.0}

        return {"transactions": [], "closing_balance": 0.0}

def detect_anomalies(transactions: List[dict], api_key: str, base_url: str = "https://api.openai.com/v1") -> List[dict]:
    if not transactions:
        return []

    if "azure" in base_url:
        llm = AzureChatOpenAI(
            azure_deployment="gpt-4o",
            api_version="2025-01-01-preview",
            azure_endpoint=base_url.split("/openai")[0],
            api_key=api_key,
            temperature=0
        )
    else:
        llm = ChatOpenAI(model="gpt-4o", api_key=api_key, base_url=base_url, temperature=0)

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
        # Return the full objects as dicts so we can use the 'type' in frontend
        return [a.dict() for a in result.anomalies]
    except Exception as e:
        print(f"Error detecting anomalies: {e}")
        return []
class FinancialInsight(BaseModel):
    insight_text: str = Field(description="A one-sentence actionable financial insight.")
    metric_value: str = Field(description="The specific dollar amount or percentage related to the insight.")
    impacted_goal: str = Field(description="The name of the financial goal this insight helps achieve.")
    spending_summary: str = Field(description="A natural language summary of spending trends (e.g., 'You spent 20% less on dining this month').")
    projected_balance: float = Field(description="The projected end-of-month balance based on current spending patterns.")

class AgentAction(BaseModel):
    type: str = Field(description="Type of action: 'none', 'move_budget', 'create_goal'.")
    details: dict = Field(description="Details of the action (e.g., {'from_category': 'Dining', 'to_category': 'Utilities', 'amount': 50}).")
    message: str = Field(description="Message to display to the user.")

def chat_with_data(query: str, transactions: List[dict], api_key: str, base_url: str = "https://api.openai.com/v1") -> dict:
    if "azure" in base_url:
        llm = AzureChatOpenAI(
            azure_deployment="gpt-4o",
            api_version="2025-01-01-preview",
            azure_endpoint=base_url.split("/openai")[0],
            api_key=api_key,
            temperature=0.7
        )
    else:
        llm = ChatOpenAI(model="gpt-4o", api_key=api_key, base_url=base_url, temperature=0.7)

    transaction_context = "\n".join([f"- {t['date']}: {t['merchant']} ({t['category']}) - ${t['amount']}" for t in transactions[:50]])
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a helpful financial assistant. You can answer questions AND propose actions.\n\nSupported Actions:\n1. **Move Budget**: If the user wants to move money between categories (e.g., 'Move $50 from Dining to Utilities').\n2. **Create Goal**: If the user wants to save for something.\n\nIf the user asks a question, set type='none' and provide the answer in 'message'.\nIf the user requests an action, set type='move_budget' or 'create_goal', fill 'details', and ask for confirmation in 'message'."),
        ("system", f"Transaction Data:\n{transaction_context}"),
        ("user", "{query}")
    ])

    chain = prompt | llm.with_structured_output(AgentAction)
    response = chain.invoke({"query": query})
    return response.dict()

def generate_financial_insight(transactions: List[dict], goals: List[dict], api_key: str, base_url: str = "https://api.openai.com/v1") -> dict:
    if "azure" in base_url:
        llm = AzureChatOpenAI(
            azure_deployment="gpt-4o",
            api_version="2025-01-01-preview",
            azure_endpoint=base_url.split("/openai")[0],
            api_key=api_key,
            temperature=0.7
        )
    else:
        llm = ChatOpenAI(model="gpt-4o", api_key=api_key, base_url=base_url, temperature=0.7)

    transaction_summary = "\n".join([f"- {t['merchant']} ({t['category']}): ${t['amount']}" for t in transactions[:50]])
    goals_summary = "\n".join([f"- {g['name']}: Target ${g['targetAmount']}, Current ${g['currentAmount']}" for g in goals])

    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a financial advisor. Analyze the user's spending and goals.\n1. Generate a structured financial insight to help save money.\n2. Create a natural language summary of their spending trends (e.g., compare to typical or highlight major categories).\n3. Estimate a projected end-of-month balance assuming current spending continues (provide a realistic number based on the data)."),
        ("system", f"Recent Transactions:\n{transaction_summary}\n\nActive Goals:\n{goals_summary}"),
        ("user", "Generate financial insight, summary, and projection.")
    ])

    chain = prompt | llm.with_structured_output(FinancialInsight)
    result = chain.invoke({})
    return result.dict()

class BudgetSuggestion(BaseModel):
    category: str = Field(description="The spending category (e.g., Dining, Groceries).")
    suggested_limit: float = Field(description="The recommended monthly budget limit.")
    reason: str = Field(description="A brief explanation for this suggestion based on past spending.")

class BudgetSuggestionList(BaseModel):
    suggestions: List[BudgetSuggestion]

def generate_budget_suggestion(transactions: List[dict], api_key: str, base_url: str = "https://api.openai.com/v1") -> List[dict]:
    if "azure" in base_url:
        llm = AzureChatOpenAI(
            azure_deployment="gpt-4o",
            api_version="2025-01-01-preview",
            azure_endpoint=base_url.split("/openai")[0],
            api_key=api_key,
            temperature=0.7
        )
    else:
        llm = ChatOpenAI(model="gpt-4o", api_key=api_key, base_url=base_url, temperature=0.7)

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
    return [s.dict() for s in result.suggestions]

class SavingsScenario(BaseModel):
    monthly_contribution_increase: float = Field(description="The extra amount saved per month.")
    new_deadlines: List[dict] = Field(description="List of goals with updated deadlines. Each dict has 'goal_name', 'new_date', 'months_saved'.")
    impact_description: str = Field(description="Natural language explanation of the impact (e.g., 'You will reach your Car goal 3 months earlier').")
    trade_off_suggestion: str = Field(description="A suggestion on how to achieve this saving (e.g., 'This is equivalent to cutting 2 dinners out per month').")

def generate_savings_scenario(transactions: List[dict], goals: List[dict], extra_savings: float, api_key: str, base_url: str = "https://api.openai.com/v1") -> dict:
    if "azure" in base_url:
        llm = AzureChatOpenAI(
            azure_deployment="gpt-4o",
            api_version="2025-01-01-preview",
            azure_endpoint=base_url.split("/openai")[0],
            api_key=api_key,
            temperature=0.7
        )
    else:
        llm = ChatOpenAI(model="gpt-4o", api_key=api_key, base_url=base_url, temperature=0.7)

    goals_summary = "\n".join([f"- {g['name']}: Target ${g['targetAmount']}, Current ${g['currentAmount']}, Deadline {g['deadline']}" for g in goals])
    
    # Calculate spending context for trade-offs
    category_totals = {}
    for t in transactions:
        cat = t.get('category', 'Other')
        amount = float(t.get('amount', 0))
        if t.get('type') == 'expense':
             category_totals[cat] = category_totals.get(cat, 0) + amount
    
    spending_context = "\n".join([f"- {cat}: ${total:.2f}" for cat, total in category_totals.items()])

    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a financial simulator. The user wants to see the impact of saving an EXTRA amount per month.\n1. Calculate how much faster they will reach each goal with the extra contribution (assume the extra amount is split evenly or applied to the nearest deadline).\n2. Provide a 'trade_off_suggestion' based on their actual spending (e.g., 'Cut Dining by 10%').\n3. Generate a natural language 'impact_description'."),
        ("system", f"Goals:\n{goals_summary}\n\nSpending Context:\n{spending_context}"),
        ("user", f"Simulate an extra monthly saving of ${extra_savings}.")
    ])

    chain = prompt | llm.with_structured_output(SavingsScenario)
    result = chain.invoke({})
    return result.dict()
