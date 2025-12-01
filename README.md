# Personal Finance Dashboard with AI

This project is a comprehensive personal finance dashboard featuring AI-powered insights, anomaly detection, forecasting, and agentic budget reallocation.

## Prerequisites

- **Node.js**: Install from [nodejs.org](https://nodejs.org/) (v18+ recommended).
- **Python**: Install from [python.org](https://www.python.org/) (v3.9+ recommended).
- **Git**: Install from [git-scm.com](https://git-scm.com/).

## Setup Instructions

Follow these steps to set up the project on a new machine.

### 1. Clone the Repository

Open your terminal (Command Prompt, PowerShell, or Terminal) and run:

```bash
git clone https://github.com/ayush0121/customer_journey_orchestration.git
cd customer_journey_orchestration
```

### 2. Setup Backend

Navigate to the backend directory and set up the Python environment:

```bash
cd backend

# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Setup Frontend

Open a **new** terminal window (keep the backend terminal open), navigate to the project root, and install Node.js dependencies:

```bash
# Make sure you are in the root directory (customer_journey_orchestration)
npm install
```

## Running the Application

You need to run both the backend and frontend servers simultaneously.

### 1. Start Backend Server

In your **Backend Terminal** (where `venv` is active):

```bash
# Ensure you are in the 'backend' folder
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
*The backend will start at `http://localhost:8000`.*

### 2. Start Frontend Server

In your **Frontend Terminal**:

```bash
# Ensure you are in the root folder
npm run dev
```
*The frontend will start at `http://localhost:5173` (or similar).*

## First Time Usage

1.  Open the frontend URL in your browser.
2.  Go to the **Data Ingestion** tab.
3.  Enter your **OpenAI API Key** and **Endpoint**.
    *   *Note:* These are stored locally in your browser. You will need to re-enter them on a new machine.
4.  Upload a bank statement (PDF/CSV) or click **"Load Sample Data"** to get started.

## Features

- **Dashboard**: Overview of spending, budgets, and AI insights.
- **Data Ingestion**: Upload statements and auto-categorize transactions.
- **Financial Goals**: Set goals, track progress, and simulate "What-If" scenarios.
- **Chat Assistant**: Ask questions like "How much did I spend on dining?" or "Move $50 to savings".
