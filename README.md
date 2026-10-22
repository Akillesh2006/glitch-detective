# Glitch Detective

> **"Understand the bug. Fix the code. Learn the concept."**

Glitch Detective is a beginner-friendly Java and Python debugging tutor and mystery game built for developers and students learning to debug code with confidence. Rather than giving away opaque corrections or executing unsafe code, Glitch Detective breaks errors down into structured pedagogical components and interactive debugging challenges.

---

## 🌟 Application Modes

### 1. 🔍 Code Mode (Step-by-Step Guided Tutor)
Paste any buggy Python or Java snippet (with optional compiler or runtime logs) to navigate a 4-step pedagogical debugging journey:
1. **Step 1: Diagnose** — Pinpoints exact line and column coordinates, diagnostic category, root cause explanation, and parser evidence lines without spoiling the answer.
2. **Step 2: Request a Progressive Clue** — Unlocks a targeted pedagogical hint guiding you toward discovering the fix independently.
3. **Step 3: Inspect Minimal Fix** — Reveals the minimal code diff, fix explanation, static expected output preview, and a relatable real-world analogy.
4. **Step 4: Verify & Learn** — Tests conceptual understanding with an interactive practice question and comprehensive rationale to solidify the pattern.

### 2. 🕵️ Detective Mode (Interactive Debugging Mysteries)
Step into the role of a software detective solving curated syntax, semantic, and logic cases across real-world scenarios:
- **Twenty Curated Mysteries**: 10 Python mysteries and 10 Java mysteries organized across Beginner, Intermediate, and Advanced difficulty tiers covering delimiter mismatches, missing colons, indentation errors, operator precedence, off-by-one loop boundaries, dictionary KeyErrors, string normalization, mutable default parameters, return values, type casting, array bounds, string reference equality, integer division truncation, variable shadowing, and recursive base cases.
- **Progressive Forensic Clues**: Request progressive clues one level at a time without prematurely revealing answers.
- **Canonical Solution Reveal**: Once all clues have been unlocked, learners can explicitly reveal the complete canonical solution, bug explanation, fix rationale, and real-world analogy. Revealing the solution never automatically marks a case solved; learners must study the fix and verify it in the editor.
- **Deterministic Verification**: Real-time solution verification powered by static AST analysis and token sequence checks. Accurately distinguishes between canonical solutions, accepted alternatives, original bugs, syntax errors, and unrelated code—with zero code execution on the host system.
- **Browser-Local Dossier Progress**: Persistently tracks solved cases in `localStorage` across languages (e.g. `X of 20 Solved`), preventing duplicate increments, enabling next-case rotation with wraparound, and allowing manual case selection from the mystery dropdown.

---

## 🛡️ Security Architecture

- **Zero Code Execution**: User-submitted code and challenge solutions are **never** executed on the host server or in sandboxes.
- **Static Analysis**: Diagnostics, static outputs, and verifications are computed entirely using Python's built-in `ast` parser, safe AST literal evaluators, and deterministic token matchers.

---

## 🧪 Verified Automated Test Suite

Every release is verified by automated test suites across both backend and frontend:

| Component | Test Suite | Tests Passed | Focus Areas |
|:---|:---|:---:|:---|
| **Backend** | `backend/tests/test_analyze.py` | 40 | Python AST parsing, line/column coordinates, Java static analysis, boundaries |
| **Backend** | `backend/tests/test_challenges.py` | 114 | 20 challenge catalog entries, difficulty tiers, seed rotation, hint disclosure, AST verifier, solution reveal |
| **Backend** | `backend/tests/test_explanations.py` | 40 | Real-world analogies, actionable summaries, category mapping |
| **Backend** | `backend/tests/test_health.py` | 4 | Service availability, supported language flags |
| **Frontend** | `frontend/src/App.test.tsx` | 27 | Code Mode 4-step workflow, Detective Mode hints, solution reveal, verification, case rotation |
| **Frontend** | `frontend/src/api.test.ts` | 10 | Typed API client methods, solution retrieval, error propagation, network resilience |
| **Frontend** | `frontend/src/progress.test.ts` | 7 | LocalStorage dossier persistence, deduplication, corrupt data recovery |
| **Total** | **Pytest + Vitest** | **242** | **198 backend + 44 frontend tests passing** |


---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, TypeScript, Vanilla CSS Design System (dark developer theme, responsive down to 320px mobile viewports)
- **Backend**: Python 3.10+, FastAPI, Pydantic v2, Uvicorn, Python standard library `ast`
- **Testing**: pytest (backend), vitest & React Testing Library (frontend)
- **Deployment**: Vercel Serverless Functions (`api/index.py` ASGI bridge with `vercel.json`)

---

## 📁 Project Structure

```text
glitch-detective/
├── .env.example              # Environment variables template
├── .gitignore                # Git exclusions (dependencies, venv, caches, builds)
├── README.md                 # Setup and run guide
├── vercel.json               # Vercel serverless routing and build configuration
├── requirements.txt          # Python dependencies for Vercel deployment
├── api/
│   └── index.py              # Serverless ASGI bridge exporting FastAPI app
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py           # FastAPI entrypoint, CORS & route mounting
│   │   ├── schemas.py        # Pydantic models for request & response validation
│   │   ├── engine/           # Static diagnostic and challenge engines
│   │   │   ├── __init__.py
│   │   │   ├── challenge_catalog.py # Curated Python & Java mysteries catalog
│   │   │   ├── challenge_verifier.py # Deterministic AST & token solution verifier
│   │   │   ├── explanations.py      # Real-world analogies & actionable summaries
│   │   │   ├── java_analyzer.py     # Deterministic Java static analyzer
│   │   │   ├── python_analyzer.py   # Python AST parser & syntax debugger
│   │   │   └── safe_evaluator.py    # Safe AST literal evaluator (no code execution)
│   │   └── routes/
│   │       ├── __init__.py
│   │       ├── health.py     # GET /api/health
│   │       ├── analyze.py    # POST /api/analyze
│   │       └── challenges.py # GET & POST /api/challenges/* endpoints
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── test_health.py       # Health check tests (4 tests)
│   │   ├── test_analyze.py      # Diagnostic engine tests (40 tests)
│   │   ├── test_explanations.py # Analogy & explanation tests (40 tests)
│   │   └── test_challenges.py   # Challenge catalog & verifier tests (114 tests)
│   └── requirements.txt      # Python backend dependencies
└── frontend/
    ├── index.html            # App entrypoint and SEO metadata
    ├── package.json          # Node dependencies & scripts
    ├── tsconfig.json         # TypeScript configuration
    ├── tsconfig.node.json
    ├── vite.config.ts        # Vite configuration with API proxying
    └── src/
        ├── App.css           # Component styles, mobile media queries, dark theme
        ├── App.test.tsx      # Code Mode & Detective Mode unit/integration tests (27 tests)
        ├── App.tsx           # Main application view (Code Mode & Detective Mode)
        ├── api.test.ts       # Typed API client tests (10 tests)
        ├── api.ts            # Typed API client for FastAPI backend
        ├── index.css         # Global design tokens & CSS reset
        ├── main.tsx          # React DOM root render
        ├── progress.test.ts  # LocalStorage progress manager tests (7 tests)
        ├── progress.ts       # Browser-local dossier persistence
        └── types.ts          # Shared TypeScript models
```

---

## 💻 Local Development & Testing Instructions

### 1. Prerequisites
Ensure you have the following installed on your machine:
- **Python 3.10+** (run `python --version` to verify)
- **Node.js 18+ and npm** (run `node --version` and `npm --version` to verify)

---

### 2. Backend Setup & Run

Open a terminal in the project root:

```powershell
# Navigate to the backend directory
cd backend

# Create a Python virtual environment
python -m venv .venv

# Activate the virtual environment
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# macOS/Linux:
# source .venv/bin/activate

# Upgrade pip and install backend dependencies
python -m pip install --upgrade pip
pip install -r requirements.txt

# Run the backend test suite with pytest (198 tests)
pytest tests

# Start the local development server (runs on http://localhost:8000)
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

> **PowerShell Execution Policy Note**: If you encounter an execution policy error when activating `Activate.ps1`, run:
> `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` in your PowerShell window.

Interactive Swagger API documentation is available at:
👉 **[http://localhost:8000/docs](http://localhost:8000/docs)**

---

### 3. Frontend Setup & Run

Open a second terminal in the project root:

```powershell
# Navigate to the frontend directory
cd frontend

# Install npm dependencies
npm install

# Run the frontend test suite with Vitest (44 tests)
npm test

# Start the Vite development server (runs on http://localhost:5173)
npm run dev

# Run TypeScript type check and production bundle build
npm run build
```

Open your browser to:
👉 **[http://localhost:5173](http://localhost:5173)**

---

## 🧪 API Endpoints

### Health Check
- **`GET /api/health`**
  - Returns backend service availability and supported language flags.

### Code Mode Diagnostic Engine
- **`POST /api/analyze`**
  - Performs deterministic static analysis on submitted code with optional compiler/runtime error message.
  - **Request Body**:
    ```json
    {
      "language": "python",
      "code": "print(\"Hello\"",
      "error_message": "SyntaxError: unexpected EOF while parsing"
    }
    ```
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
      "root_cause": "An opening parenthesis '(' starting on line 1 was never closed...",
      "relevant_evidence": [
        "Parser detected SyntaxError: Unclosed Delimiter on line 1, column 6",
        "Line 1: print(\"Hello\"",
        "Pointer:      ^ (Parser detail: '(' was never closed)",
        "Safe Analysis: Code parsed statically via ast.parse(); user code was never executed."
      ],
      "suggested_fix": "print(\"Hello\")",
      "fix_explanation": "Appended matching closing delimiter ')' to close the expression properly.",
      "expected_output": "Hello",
      "hint": "Look at the opening parenthesis after print. Which character should close it?",
      "practice_question": "Why does Python require matching delimiters?",
      "real_world_analogy": "Like opening quotation marks in a sentence but never closing them...",
      "actionable_summary": "Add the matching closing delimiter to complete the expression.",
      "confidence": "high",
      "disclaimer": "Parsed statically using Python's built-in AST parser. User code was never executed on the host system."
    }
    ```

### Detective Mode Challenge Engine
- **`GET /api/challenges`**
  - List available mystery summaries. Supports optional query parameters `?language=python` or `java`, and `?difficulty=beginner`.
  - Solutions and hints are strictly concealed.

- **`GET /api/challenges/next`**
  - Retrieve the next mystery case matching query criteria (`?language=`, `?difficulty=`, `?seed=`).
  - Supports deterministic rotation through challenge seeds. Conceals unrequested hints and solutions.

- **`GET /api/challenges/{challenge_id}`**
  - Retrieve details for a specific mystery case by ID.
  - Query parameter `?hint_level=N` (0, 1, 2) safely reveals hints up to level `N` while concealing future hints.

- **`POST /api/challenges/{challenge_id}/verify`** (and **`POST /api/challenges/verify`**)
  - Deterministically verifies a proposed correction against the challenge using static AST analysis and token matching.
  - Zero code execution.
  - **Request Body**:
    ```json
    {
      "code": "def print_receipt(item_name, price, discount_rate):\n    final_price = price - (price * discount_rate)\n    print(\"Item:\", item_name, \"Final Price:\", round(final_price, 2))"
    }
    ```
  - **Response**:
    ```json
    {
      "status": "correct",
      "challenge_id": "py-receipt-unclosed-paren",
      "title": "The Mystery of the Silent Receipt",
      "feedback": "Outstanding detective work! Your fix resolved the defect and parsed cleanly.",
      "passed": true
    }
    ```

- **`GET /api/challenges/{challenge_id}/solution`**
  - Unlocks the canonical solution, bug explanation, fix rationale, and relatable real-world analogy.
  - *Pedagogical note*: In the user interface, this operation is gated until all forensic clues have been revealed to encourage independent learning.
  - **Response**:
    ```json
    {
      "challenge_id": "py-receipt-unclosed-paren",
      "title": "The Mystery of the Silent Receipt",
      "canonical_solution": "def print_receipt(item_name, price, discount_rate):\n    final_price = price - (price * discount_rate)\n    print(\"Item:\", item_name, \"Final Price:\", round(final_price, 2))",
      "bug_explanation": "An unclosed opening parenthesis on line 3 prevents Python from completing the print() statement.",
      "fix_rationale": "Appending the matching closing delimiter ')' completes the outer print() invocation.",
      "real_world_analogy": "Like opening a pair of quotation marks in a sentence and forgetting to close them before the period."
    }
    ```


---

## 🤖 AI Assistance Disclosure

In accordance with hackathon guidelines, Glitch Detective was developed with AI pair-programming assistance using **Google Antigravity**. Architecture, schemas, tests, styling, and pedagogical structures were designed specifically for the Glitch Detective project.
