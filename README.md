# Glitch Detective

> **"Understand the bug. Fix the code. Learn the concept."**

Glitch Detective is a beginner-friendly Java and Python debugging tutor built for developers and students learning to debug code with confidence. Rather than simply giving away quick answers or opaque corrections, Glitch Detective breaks issues down into structured pedagogical components:

1. **Root Cause Analysis** — Pinpointing the fundamental reason behind the error.
2. **Relevant Evidence** — Identifying the specific lines, variables, or error traces that reveal the defect.
3. **Suggested Fix & Pattern Remediation** — Illustrating the corrected pattern with clear diffs.
4. **Conceptual Practice Question** — Testing comprehension to prevent similar mistakes in the future.

---

## 🚀 Milestone 2: Real Debugging Engine Scope

This repository contains **Milestone 2: Real Debugging Engine**.
- **Frontend**: Responsive developer-tool UI built with React, Vite, and TypeScript, featuring real-time diagnostic reporting, line badges, copyable minimal fixes, pedagogical explanations, and expected output preview.
- **Backend**: Python REST API built with FastAPI and Pydantic validation.
- **Python Engine**: Deterministic AST parser using Python's built-in `ast.parse()`. Detects missing delimiters (parentheses, brackets, braces), missing colons, indentation errors, and unclosed strings with exact line numbers and column offsets. Computes minimal fixes and safe static output without executing user code.
- **Java Support**: Deterministic static analysis for delimiter balance, missing semicolons, type mismatches, and common beginner traps (like NPE). Safely queries `javac` if installed. Returns honest, unambiguous limitation notices when code cannot be diagnosed reliably.
- **Tests**: Pytest test suite with 22 automated tests validating syntax diagnostics, indentation, line numbers, Java cases, ambiguous fallbacks, and boundary conditions.
- **Security**: User-submitted code is never executed on the host system. All diagnostics and expected outputs are computed statically.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, TypeScript, Vanilla CSS Design System
- **Backend**: Python 3.10+, FastAPI, Pydantic v2, Uvicorn, Python `ast` Standard Library
- **Testing**: pytest, HTTPX / FastAPI TestClient

---

## 📁 Project Structure

```text
glitch-detective/
├── .env.example              # Environment variables template
├── .gitignore                # Git exclusions (dependencies, venv, caches, builds)
├── README.md                 # Setup and run guide
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py           # FastAPI entrypoint, CORS configuration
│   │   ├── schemas.py        # Pydantic models for request & response validation
│   │   ├── engine/           # Milestone 2 Real Debugging Engine
│   │   │   ├── __init__.py
│   │   │   ├── python_analyzer.py # Python AST parser & syntax debugger
│   │   │   ├── java_analyzer.py   # Deterministic Java static analyzer
│   │   │   └── safe_evaluator.py  # Safe AST literal evaluator (no code execution)
│   │   └── routes/
│   │       ├── __init__.py
│   │       ├── health.py     # GET /api/health
│   │       └── analyze.py    # POST /api/analyze
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── test_health.py    # Health check & root endpoint tests
│   │   └── test_analyze.py   # Syntax errors, delimiters, line numbers, Java & limit tests
│   └── requirements.txt      # Python dependencies
└── frontend/
    ├── index.html            # App entrypoint and SEO metadata
    ├── package.json          # Node dependencies & npm scripts
    ├── tsconfig.json         # TypeScript configuration
    ├── tsconfig.node.json
    ├── vite.config.ts        # Vite configuration with API proxying
    └── src/
        ├── App.css           # Component styles & dark developer theme
        ├── App.tsx           # Main application view & diagnostic report renderer
        ├── api.ts            # Typed API client for FastAPI backend
        ├── index.css         # Global design tokens & CSS reset
        ├── main.tsx          # React DOM root render
        └── types.ts          # Shared TypeScript models
```

---

## 💻 Windows PowerShell Setup & Run Instructions

### 1. Prerequisites
Ensure you have the following installed on your Windows machine:
- **Python 3.10+** (run `python --version` to verify)
- **Node.js 18+ and npm** (run `node --version` and `npm --version` to verify)

If Python or Node.js are not yet installed on your system, you can install them using `winget` in PowerShell:
```powershell
winget install Python.Python.3.11 --source winget
winget install OpenJS.NodeJS.LTS --source winget
```
*(After installing via winget, restart PowerShell to update your environment PATH).*

---

### 2. Backend Setup & Run

Open a Windows PowerShell terminal in the project root:

```powershell
# Navigate to the backend directory
cd backend

# Create a Python virtual environment
python -m venv venv

# Activate the virtual environment
.\venv\Scripts\Activate.ps1

# Upgrade pip and install backend dependencies
python -m pip install --upgrade pip
pip install -r requirements.txt

# Run the backend test suite with pytest
pytest -v

# Start the local development server (runs on http://localhost:8000)
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

> **PowerShell Execution Policy Note**: If you encounter an execution policy error when activating `Activate.ps1`, run:
> `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` in your PowerShell window.

Interactive Swagger API documentation is available at:
👉 **[http://localhost:8000/docs](http://localhost:8000/docs)**

---

### 3. Frontend Setup & Run

Open a second Windows PowerShell terminal in the project root:

```powershell
# Navigate to the frontend directory
cd frontend

# Install npm dependencies
npm install

# Start the Vite development server (runs on http://localhost:5173)
npm run dev

# Run TypeScript check and production build
npm run build
```

Open your browser to:
👉 **[http://localhost:5173](http://localhost:5173)**

---

## 🧪 API Endpoints

### `GET /api/health`
Checks backend service availability.
- **Response**:
```json
{
  "status": "ok",
  "app_name": "Glitch Detective API",
  "version": "0.1.0",
  "tagline": "Understand the bug. Fix the code. Learn the concept.",
  "supported_languages": ["python", "java"]
}
```

### `POST /api/analyze`
Analyzes a code snippet with optional compiler/runtime error message.
- **Request Body**:
```json
{
  "language": "python",
  "code": "def divide(a, b):\n    return a / b\n\nprint(divide(10, 0))",
  "error_message": "ZeroDivisionError: division by zero"
}
```
- **Validation Rules**:
  - `language`: Required. Must be `"python"` or `"java"` (case-insensitive).
  - `code`: Required. Non-empty string up to 20,000 characters.
  - `error_message`: Optional. String up to 10,000 characters.
- **Response**:
```json
{
  "status": "syntax_error",
  "is_placeholder": false,
  "language": "python",
  "error_category": "SyntaxError: Unclosed Delimiter",
  "title": "Missing Closing Parenthesis ')' on Line 1",
  "line_number": 1,
  "column_offset": 6,
  "root_cause": "An opening parenthesis '(' starting on line 1 was never closed. In Python, every opening delimiter must have a corresponding closing delimiter ')' before the end of the statement or script.",
  "relevant_evidence": [
    "Parser detected SyntaxError: Unclosed Delimiter on line 1, column 6",
    "Line 1: print(\"Hello\"",
    "Pointer:      ^ (Parser detail: '(' was never closed)",
    "Safe Analysis: Code parsed statically via ast.parse(); user code was never executed."
  ],
  "suggested_fix": "print(\"Hello\")",
  "fix_explanation": "Appended matching closing delimiter ')' to close the expression properly.",
  "expected_output": "Hello",
  "practice_question": "In Python, what is the syntactic difference between using parentheses for a function call, a single-element tuple, and mathematical grouping?",
  "confidence": "high",
  "disclaimer": "Parsed statically using Python's built-in AST parser. User code was never executed on the host system.",
  "submitted_code_preview": "print(\"Hello\"",
  "submitted_error_preview": null
}
```

---

## 🤖 AI Assistance Disclosure

In accordance with hackathon guidelines, this foundation milestone was scaffolded with AI pair-programming assistance using **Google Antigravity**. Architecture, schemas, tests, styling, and educational structures were designed specifically for the Glitch Detective project.
