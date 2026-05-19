from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
import sqlite3, json, re
from openai import OpenAI
from fastapi.responses import RedirectResponse
import subprocess
import tempfile
import random
import traceback
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi import FastAPI, WebSocket, Request
from fastapi.websockets import WebSocketDisconnect
import re
from pydantic import BaseModel
import requests
from fastapi import WebSocket
import os
from dotenv import load_dotenv
from groq import Groq
import sqlite3
load_dotenv()
# =========================
# WEBSOCKET CONNECTIONS
# =========================

active_rooms = {}
def init_db():

    conn = sqlite3.connect(
        "database.db"
    )

    cur = conn.cursor()

    # USERS TABLE

    cur.execute("""

    CREATE TABLE IF NOT EXISTS users(

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        username TEXT UNIQUE,

        password TEXT,

        room_id TEXT,

        viva_status TEXT

    )

    """)

    # SAFE COLUMN FIXES

    try:

        cur.execute(
            "ALTER TABLE users ADD COLUMN room_id TEXT"
        )

    except:
        pass

    try:

        cur.execute(
            "ALTER TABLE users ADD COLUMN viva_status TEXT"
        )

    except:
        pass
app = FastAPI()
init_db()
app.mount("/static", StaticFiles(directory="static"), name="static")

# ---------- DB ----------
def get_db():
    return sqlite3.connect("database.db", check_same_thread=False)


conn = get_db()
cur = conn.cursor()

# USERS
# cur.execute("""

# CREATE TABLE IF NOT EXISTS users(

#     id INTEGER PRIMARY KEY AUTOINCREMENT,

#     username TEXT UNIQUE,

#     password TEXT,

#     room_id TEXT,

#     viva_status TEXT

# )

# """)



# RESULTS
cur.execute("""
CREATE TABLE IF NOT EXISTS results(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    score REAL,
    communication REAL,
    critical REAL,
    problem_solving REAL,
    creativity REAL,
    weak_topics TEXT,
    strong_topics TEXT,
    suggestions TEXT
)
""")

#viva secure
cur.execute("""
    CREATE TABLE IF NOT EXISTS viva_access (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT,
        is_active INTEGER DEFAULT 1
    )
    """)

# ai arena 
cur.execute("""
CREATE TABLE IF NOT EXISTS coding_sessions(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    topic TEXT,
    level TEXT,   -- easy/medium/hard
    score INTEGER
)
""")

cur.execute("""
    CREATE TABLE IF NOT EXISTS victories(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT,
        topic TEXT,
        message TEXT
    )
    """)
#coding progress
cur.execute("""

CREATE TABLE IF NOT EXISTS dsa_progress(

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    username TEXT,

    topic TEXT,

    easy_count INTEGER DEFAULT 0,

    medium_count INTEGER DEFAULT 0,

    hard_count INTEGER DEFAULT 0,

    UNIQUE(username, topic)
)

""")


conn.commit()
conn.close()

# ---------- GROQ ----------
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# ---------- ROUTES ----------
@app.get("/", response_class=HTMLResponse)
def home():
    return open("templates/index.html").read()

@app.get("/dashboard", response_class=HTMLResponse)
def dashboard():
    return open("templates/dashboard.html").read()

@app.get("/viva", response_class=HTMLResponse)
def viva():
    return open("templates/viva.html").read()

@app.get("/result", response_class=HTMLResponse)
def viva():
    return open("templates/result.html").read()


@app.get("/analytics", response_class=HTMLResponse)
def analytics_page():
    return open("templates/analytics.html").read()

@app.get("/suggestions", response_class=HTMLResponse)
def suggestions_page():
    return open("templates/suggestions.html").read()

# @app.get("/practice")
# def go_practice():
#     return RedirectResponse(url="http://127.0.0.1:9000/practice")

@app.get("/coding-arena", response_class=HTMLResponse)
def coding_arena():
    return open("templates/coding_arena.html", encoding="utf-8").read()
@app.get("/profile", response_class=HTMLResponse)
def profile():
    return open("templates/profile.html", encoding="utf-8").read()

@app.get("/dsa", response_class=HTMLResponse)
def build():
    return open("templates/dsa.html",encoding="utf-8").read()
# ---------- SIR DASHBOARD PAGE ----------

@app.get("/sir-dashboard", response_class=HTMLResponse)
def sir_dashboard():
    return open(
        "templates/sir_dashboard.html",
        encoding="utf-8"
    ).read()


# ---------- SIR DASHBOARD ----------

@app.get("/sir-dashboard", response_class=HTMLResponse)
def sir_dashboard():
    return open(
        "templates/sir_dashboard.html",
        encoding="utf-8"
    ).read()


# ---------- DEFAULT SIR ACCOUNT SETUP ----------

conn = get_db()
cur = conn.cursor()

cur.execute("""
CREATE TABLE IF NOT EXISTS sir_accounts(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
)
""")

conn.commit()

# DEFAULT ACCOUNT

cur.execute(
    """
    SELECT id FROM sir_accounts
    WHERE username=?
    """,
    ("sir",)
)

existing_sir = cur.fetchone()

if not existing_sir:

    cur.execute(
        """
        INSERT INTO sir_accounts(username,password)
        VALUES(?,?)
        """,
        ("sir", "dattebayo")
    )

    conn.commit()

conn.close()


# ---------- CREATE SIR ACCOUNT ----------

@app.post("/api/create-sir-account")
async def create_sir_account(request: Request):

    data = await request.json()

    u = data.get("username", "").strip()
    p = data.get("password", "").strip()

    if not u or not p:

        return {
            "success": False,
            "message": "All fields required"
        }

    conn = get_db()
    cur = conn.cursor()

    # CHECK EXISTING

    cur.execute(
        """
        SELECT id
        FROM sir_accounts
        WHERE username=?
        """,
        (u,)
    )

    existing = cur.fetchone()

    if existing:

        conn.close()

        return {
            "success": False,
            "message": "Sir account already exists"
        }

    # INSERT ACCOUNT

    cur.execute(
        """
        INSERT INTO sir_accounts(username,password)
        VALUES(?,?)
        """,
        (u,p)
    )

    conn.commit()
    conn.close()

    return {
        "success": True,
        "message": "Sir account created"
    }


# ---------- SIR LOGIN ----------

@app.post("/api/sir-auth")
async def sir_auth(request: Request):

    data = await request.json()

    u = data.get("username", "").strip()
    p = data.get("password", "").strip()

    if not u or not p:

        return {
            "success": False,
            "message": "All fields required"
        }

    conn = get_db()
    cur = conn.cursor()

    cur.execute(
        """
        SELECT id, username
        FROM sir_accounts
        WHERE username=? AND password=?
        """,
        (u,p)
    )

    sir = cur.fetchone()

    conn.close()

    if sir:

        return {
            "success": True,
            "sirid": sir[0],
            "username": sir[1],
            "message": "Access granted"
        }

    return {
        "success": False,
        "message": "Invalid sir credentials"
    }
# ------------------------------------------------------


# ---------- STUDENT LIST ----------

# ---------- GET STUDENTS ----------

@app.get("/api/students")
async def get_students():

    conn = get_db()

    cur = conn.cursor()

    cur.execute("""
    SELECT
    id,
    username,
    room_id,
    viva_status
    FROM users
    WHERE room_id IS NOT NULL
    """)

    rows = cur.fetchall()

    conn.close()

    students = []

    for row in rows:

        students.append({

            "id": row[0],

            "username": row[1],

            "room_id": row[2],

            "status": row[3] or "offline"

        })

    return {

        "success": True,

        "students": students

    }


# ws connecton
# =========================
# WEBSOCKET VIVA ROOM
# =========================

active_rooms = {}


@app.websocket("/ws/viva/{room_id}")
async def viva_socket(
    websocket: WebSocket,
    room_id: str
):

    await websocket.accept()

    # CREATE ROOM

    if room_id not in active_rooms:

        active_rooms[room_id] = []

    # STORE CONNECTION

    active_rooms[room_id].append(
        websocket
    )

    print(f"{room_id} connected")

    try:

        while True:

            data = await websocket.receive_json()

            print(data)

            # SEND TO EVERYONE
            # IN SAME ROOM

            dead_connections = []

            for connection in active_rooms[room_id]:

                try:

                    await connection.send_json(
                        data
                    )

                except:

                    dead_connections.append(
                        connection
                    )

            # CLEAN DEAD SOCKETS

            for dead in dead_connections:

                if dead in active_rooms[room_id]:

                    active_rooms[room_id].remove(
                        dead
                    )

    except:

        if websocket in active_rooms[room_id]:

            active_rooms[room_id].remove(
                websocket
            )

        print(f"{room_id} disconnected")
# ---------- START VIVA ----------

# ---------- START VIVA ----------

@app.post("/api/start-viva")
async def start_viva(request: Request):

    data = await request.json()

    student_id = data.get(
        "student_id"
    )

    room_id = f"room_{student_id}"

    conn = get_db()

    cur = conn.cursor()

    # UPDATE USER STATUS

    cur.execute(
        """
        UPDATE users
        SET viva_status=?
        WHERE id=?
        """,
        (
            "active",
            student_id
        )
    )

    conn.commit()

    conn.close()

    return {

        "success": True,

        "room_id": room_id

    }

# ---------- AUTH ----------
@app.post("/api/register")
async def register(request: Request):
    data = await request.json()
    u, p = data.get("username"), data.get("password")

    conn = get_db()
    cur = conn.cursor()

    cur.execute("SELECT id FROM users WHERE username=?", (u,))
    if cur.fetchone():
        return {"success": False, "message": "User exists"}

    cur.execute("INSERT INTO users(username,password) VALUES (?,?)", (u, p))
    conn.commit()
    conn.close()

    return {"success": True}

@app.post("/api/login")
async def login(request: Request):

    data = await request.json()

    u = data.get("username")
    p = data.get("password")

    conn = get_db()

    cur = conn.cursor()

    cur.execute(
        """
        SELECT id, username
        FROM users
        WHERE username=? AND password=?
        """,
        (u, p)
    )

    user = cur.fetchone()

    if user:

        user_id = user[0]

        room_id = f"room_{user_id}"

        # UPDATE USER STATUS

        cur.execute(
            """
            UPDATE users
            SET room_id=?, viva_status=?
            WHERE id=?
            """,
            (
                room_id,
                "waiting",
                user_id
            )
        )

        conn.commit()

        conn.close()

        return {

            "success": True,

            "userid": user_id,

            "username": user[1],

            "room_id": room_id

        }

    conn.close()

    return {

        "success": False,

        "message": "Invalid credentials"

    }
# ---------- AI EVALUATION ----------
@app.post("/api/evaluate")
async def evaluate(request: Request):
    data = await request.json()
    qa_list = data.get("qa_list", [])
    user_id = data.get("user_id")

    if not qa_list:
        return {"success": False, "message": "No Q&A provided"}

    content = ""
    for qa in qa_list:
        content += f"Q: {qa['question']}\nA: {qa['answer']}\n\n"

    prompt = f"""
Evaluate this viva:

{content}

Return JSON ONLY:
{{
"score": 0-10,
"communication": 0-100,
"critical": 0-100,
"problem_solving": 0-100,
"creativity": 0-100,
"weak_topics": [],
"strong_topics": [],
"suggestions": "text"
}}
"""

    try:
        res = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role":"user","content":prompt}]
        )

        text = res.choices[0].message.content
        match = re.search(r"\{.*\}", text, re.DOTALL)
        result = json.loads(match.group(0))

    except:
        result = {}

    # ✅ SAFE FALLBACKS
    score = result.get("score", 5)
    communication = result.get("communication", 50)
    critical = result.get("critical", 50)
    problem_solving = result.get("problem_solving", 50)
    creativity = result.get("creativity", 50)
    weak_topics = result.get("weak_topics", ["General"])
    strong_topics = result.get("strong_topics", ["Basic"])
    suggestions = result.get("suggestions", "Improve clarity and structure")

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
    INSERT INTO results(
        user_id, score, communication, critical,
        problem_solving, creativity,
        weak_topics, strong_topics, suggestions
    )
    VALUES (?,?,?,?,?,?,?,?,?)
    """, (
        user_id,
        score,
        communication,
        critical,
        problem_solving,
        creativity,
        json.dumps(weak_topics),
        json.dumps(strong_topics),
        suggestions
    ))
    

    conn.commit()
    conn.close()

    return {"success": True}

#get result
@app.post("/api/get-result")
async def get_result(request: Request):
    data = await request.json()
    user_id = data.get("user_id")

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
    SELECT score, strong_topics, weak_topics, suggestions
    FROM results
    WHERE user_id=?
    ORDER BY id DESC LIMIT 1
    """, (user_id,))

    row = cur.fetchone()
    conn.close()

    if not row:
        return {"success": False}

    return {
        "success": True,
        "result": {
            "score": row[0],
            "strong_topics": row[1] or "[]",
            "weak_topics": row[2] or "[]",
            "suggestions": row[3] or "No suggestions available"
        }
    }




#analytics
@app.get("/api/analytics")
def analytics():

    conn = get_db()
    cur = conn.cursor()

    cur.execute("SELECT id, username FROM users")
    users = cur.fetchall()

    result = []
    all_scores = []

    for u in users:
        user_id = u[0]
        username = u[1]

        cur.execute("""
        SELECT score FROM results
        WHERE user_id=?
        ORDER BY id DESC
        """, (user_id,))

        scores = [r[0] for r in cur.fetchall()]

        if scores:
            all_scores.extend(scores)

        avg = sum(scores)/len(scores) if scores else 0

        last = scores[0] if len(scores) >= 1 else 0
        prev = scores[1] if len(scores) >= 2 else 0

        if last > prev:
            trend = "↑"
        elif last < prev:
            trend = "↓"
        else:
            trend = "-"

        result.append({
            "id": user_id,
            "username": username,
            "avg": avg,
            "last": last,
            "prev": prev,
            "trend": trend
        })

    conn.close()

    top_score = max(all_scores) if all_scores else 0

    return {
        "success": True,
        "users": result,
        "top_score": top_score
    }

####comparison api


@app.post("/api/compare")
async def compare(request: Request):
    data = await request.json()
    user_id = data.get("user_id")

    conn = get_db()
    cur = conn.cursor()

    # topper
    cur.execute("""
    SELECT users.id, users.username, AVG(results.score)
    FROM users
    JOIN results ON users.id = results.user_id
    GROUP BY users.id
    ORDER BY AVG(results.score) DESC LIMIT 1
    """)
    topper = cur.fetchone()

    # latest user result
    cur.execute("""
    SELECT score, communication, critical, problem_solving, creativity
    FROM results
    WHERE user_id=?
    ORDER BY id DESC LIMIT 1
    """,(user_id,))
    me = cur.fetchone()

    # topper latest
    cur.execute("""
    SELECT communication, critical, problem_solving, creativity
    FROM results
    WHERE user_id=?
    ORDER BY id DESC LIMIT 1
    """,(topper[0],))
    top_skills = cur.fetchone()

    conn.close()

    return {
        "success": True,
        "topper_id": topper[0],
        "topper_name": topper[1],
        "topper_score": round(topper[2],2),

        "my_score": me[0],

        "my_skills":{
            "problem": me[3],
            "critical": me[2],
            "communication": me[1],
            "creativity": me[4]
        },

        "topper_skills":{
            "problem": top_skills[2],
            "critical": top_skills[1],
            "communication": top_skills[0],
            "creativity": top_skills[3]
        }
    }

# essentia


#####ai roadmap
@app.post("/api/roadmap")
async def roadmap(request: Request):

    data = await request.json()
    user_id = data.get("user_id")

    conn = get_db()
    cur = conn.cursor()

    # 🔥 GET LATEST RESULT
    cur.execute("""
    SELECT score, communication, critical, problem_solving, creativity
    FROM results
    WHERE user_id=?
    ORDER BY id DESC LIMIT 1
    """,(user_id,))

    row = cur.fetchone()
    conn.close()

    # ❌ NO DATA CASE
    if not row:
        return {
            "roadmap": [
                "Attempt a viva to generate insights",
                "Practice basic questions",
                "Improve communication clarity"
            ]
        }

    score, comm, critical, problem, creative = row

    # 🔥 FIND WEAK AREAS
    weak = []

    if problem < 6:
        weak.append("Problem Solving")
    if critical < 6:
        weak.append("Critical Thinking")
    if comm < 6:
        weak.append("Communication")
    if creative < 6:
        weak.append("Creativity")

    weak_text = ", ".join(weak) if weak else "None"

    prompt = f"""
Student performance analysis:

Score: {score}/10
Weak Areas: {weak_text}

Generate improvement roadmap:
- 5 bullet points
- Simple and practical
- Focus on weak areas
"""

    try:
        res = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role":"user","content":prompt}]
        )

        text = res.choices[0].message.content.split("\n")
        roadmap = [t.strip("- ").strip() for t in text if t.strip()]

    except:
        roadmap = [
            "Revise core concepts",
            "Practice structured answers",
            "Improve speaking clarity",
            "Work on problem-solving steps",
            "Think logically before answering"
        ]

    return {"roadmap": roadmap}
# end 

#####histroy
@app.post("/api/history")
async def history(request: Request):
    data = await request.json()
    user_id = data.get("user_id")

    conn = get_db()
    cur = conn.cursor()

    # YOUR SCORES
    cur.execute("""
    SELECT score FROM results
    WHERE user_id=?
    ORDER BY id ASC
    """,(user_id,))
    my_scores = [r[0] for r in cur.fetchall()]

    # TOPPER ID
    cur.execute("""
    SELECT user_id, AVG(score) as avg
    FROM results
    GROUP BY user_id
    ORDER BY avg DESC LIMIT 1
    """)
    topper = cur.fetchone()
    topper_id = topper[0]

    # TOPPER SCORES
    cur.execute("""
    SELECT score FROM results
    WHERE user_id=?
    ORDER BY id ASC
    """,(topper_id,))
    top_scores = [r[0] for r in cur.fetchall()]

    conn.close()

    return {
        "my_scores": my_scores,
        "top_scores": top_scores
    }
# end 


# coding arena
# =========================================
# FALLBACK QUESTIONS
# =========================================

def fallback_questions():

    return [

        {
            "level":"easy",

            "question":
            "Write a program to add two numbers.",

            "input":"2 3",

            "output":"5"
        },

        {
            "level":"medium",

            "question":
            "Find maximum element in array.",

            "input":"1 5 9 2",

            "output":"9"
        },

        {
            "level":"hard",

            "question":
            "Reverse a string.",

            "input":"hello",

            "output":"olleh"
        }
    ]

# =========================================
# GENERATE QUESTIONS
# =========================================

def generate_coding_set(topic):

    random_seed = random.randint(1,999999)

    prompt = f"""
    Generate 3 unique coding problems.

    Topic:
    {topic}

    Difficulty order:
    easy
    medium
    hard

    Use random seed:
    {random_seed}

    Return STRICT JSON ONLY.

    Format:

    [
      {{
        "level":"easy",
        "question":"...",
        "input":"...",
        "output":"..."
      }},
      {{
        "level":"medium",
        "question":"...",
        "input":"...",
        "output":"..."
      }},
      {{
        "level":"hard",
        "question":"...",
        "input":"...",
        "output":"..."
      }}
    ]

    Rules:
    - concise
    - interview style
    - no markdown
    """

    try:

        res = client.chat.completions.create(

            model="llama-3.3-70b-versatile",

            messages=[
                {
                    "role":"user",
                    "content":prompt
                }
            ]
        )

        raw = res.choices[0].message.content

        match = re.search(r"\[.*\]", raw, re.S)

        if not match:
            return fallback_questions()

        data = json.loads(match.group())

        return data

    except Exception as e:

        print(e)

        return fallback_questions()

# =========================================
# API - QUESTIONS
# =========================================

@app.get("/api/coding-set/{topic}")
def get_coding_set(topic:str):

    return generate_coding_set(topic)

# =========================================
# BLOCK DANGEROUS CODE
# =========================================

def blocked_code(code):

    dangerous = [

        "import os",

        "import sys",

        "subprocess",

        "socket",

        "shutil",

        "open(",

        "__import__",

        "eval(",

        "exec(",

        "threading",

        "fork",

        "while True"
    ]

    lower = code.lower()

    for d in dangerous:

        if d.lower() in lower:
            return True

    return False

# =========================================
# RUN CODE
# =========================================

@app.post("/api/run-code")
async def run_code(request: Request):

    data = await request.json()

    code = data.get("code","")

    inp = data.get("input","")

    # EMPTY

    if len(code.strip()) < 3:

        return {

            "output":"",

            "error":"No code written.",

            "success":False
        }

    # SECURITY

    if blocked_code(code):

        return {

            "output":"",

            "error":"Unsafe code blocked.",

            "success":False
        }

    temp_path = None

    try:

        with tempfile.NamedTemporaryFile(

            delete=False,

            suffix=".py",

            mode="w",

            encoding="utf-8"

        ) as f:

            f.write(code)

            temp_path = f.name

        result = subprocess.run(

            ["python", temp_path],

            input=inp,

            text=True,

            capture_output=True,

            timeout=5
        )
        # =====================================
# CHECK OUTPUT
# =====================================

        actual_output = result.stdout.strip()

        expected_output = data.get(
        "expected",
        ""
        ).strip()

        is_correct = (
        actual_output == expected_output
        )

        return {

        "output": actual_output,

        "error":
        result.stderr.strip(),

        "success":
        result.returncode == 0,

        "correct":
        is_correct,

        "mentor_msg":

            "Great job! Your solution is correct."
            if is_correct
            else ""
}

    except subprocess.TimeoutExpired:

        return {

            "output":"",

            "error":
            "Execution timeout. Possible infinite loop.",

            "success":False
        }

    except Exception as e:

        print(traceback.format_exc())

        return {

            "output":"",

            "error":
            str(e),

            "success":False
        }

    finally:

        try:

            if temp_path and os.path.exists(temp_path):

                os.remove(temp_path)

        except:
            pass

# =========================================
# SMART INTERRUPT OBSERVER
# =========================================

@app.post("/api/smart-observe")
async def smart_observe(request: Request):

    data = await request.json()

    line = data.get("line","")

    question = data.get("question","")

    recent_code = data.get("recentCode",[])

    line_number = data.get("lineNumber",1)

    # =====================================
    # LOCAL FAST DETECTION
    # =====================================

    lower = line.lower().strip()

    # missing colon

    if (

        lower.startswith("for ") or
        lower.startswith("if ") or
        lower.startswith("while ")

    ) and not lower.endswith(":"):

        return {

            "issue":True,

            "msg":
            "Your control statement is missing ':'."
        }

    # infinite loop

    if "while true" in lower:

        return {

            "issue":True,

            "msg":
            "This may create an infinite loop."
        }

    # suspicious range

    if "range(len(" in lower and "+1" in lower:

        return {

            "issue":True,

            "msg":
            "range(len()+1) may cause index out of range."
        }

    # =====================================
    # AI DEEP ANALYSIS
    # =====================================

    prompt = f"""
    You are a real-time AI coding mentor.

    Coding Problem:
    {question}

    Latest line written:
    {line}

    Recent code context:
    {recent_code}

    Your job:
- detect important syntax issues
- detect major logical mistakes
- detect runtime-risk problems

IMPORTANT:

This is a beginner/intermediate DSA platform.

Do NOT behave like a production
software reviewer.

If the student's code already solves
the coding problem correctly,
do NOT interrupt for:

- optional edge cases
- negative number validation
- production robustness
- style improvements
- optional optimizations

Interrupt ONLY for mistakes likely
to fail the coding problem.

    IMPORTANT:
    - interrupt ONLY if issue is meaningful
    - do not overtalk
    - be specific
    - mention exact mistake
    - human natural tone
    - short answer
    - no markdown
    - never give full solution

    Return STRICT JSON:

    {{
      "issue": true/false,
      "msg":"..."
    }}
    """

    try:

        res = client.chat.completions.create(

            model="llama-3.3-70b-versatile",

            messages=[
                {
                    "role":"user",
                    "content":prompt
                }
            ]
        )

        raw = res.choices[0].message.content

        match = re.search(r"\{.*\}", raw, re.S)

        if not match:

            return {

                "issue":False,

                "msg":""
            }

        parsed = json.loads(match.group())

        return parsed

    except Exception as e:

        print(e)

        return {

            "issue":False,

            "msg":""
        }

# =========================================
# ANALYZE RUNTIME ERROR
# =========================================

@app.post("/api/analyze-error")
async def analyze_error(request: Request):

    data = await request.json()

    code = data.get("code","")

    error = data.get("error","")

    question = data.get("question","")

    prompt = f"""
    You are an expert Python mentor.

    Problem:
    {question}

    Student code:
    {code}

    Runtime error:
    {error}

    Explain:
    - what mistake happened
    - likely issue
    - how to think correctly

    Rules:
    - concise
    - human tone
    - no markdown
    - no full solution
    """

    try:

        res = client.chat.completions.create(

            model="llama-3.3-70b-versatile",

            messages=[
                {
                    "role":"user",
                    "content":prompt
                }
            ]
        )

        return {

            "msg":
            res.choices[0].message.content
        }

    except Exception as e:

        print(e)

        return {

            "msg":
            "Your program crashed because of a logic or syntax issue."
        }

# =========================================
# ANALYZE WRONG OUTPUT
# =========================================

@app.post("/api/analyze-wrong-answer")
async def analyze_wrong_answer(request: Request):

    data = await request.json()

    code = data.get("code","")

    expected = data.get("expected","")

    got = data.get("got","")

    question = data.get("question","")

    prompt = f"""
    You are an expert coding mentor.

    Problem:
    {question}

    Student code:
    {code}

    Expected output:
    {expected}

    Student output:
    {got}

    Explain:
    - why output became wrong
    - logical issue
    - possible edge case

    Rules:
    - concise
    - human tone
    - no markdown
    - no full solution
    """

    try:

        res = client.chat.completions.create(

            model="llama-3.3-70b-versatile",

            messages=[
                {
                    "role":"user",
                    "content":prompt
                }
            ]
        )

        return {

            "msg":
            res.choices[0].message.content
        }

    except Exception as e:

        print(e)

        return {

            "msg":
            "Your output differs from expected result."
        }

# =========================================
# AI CHAT / MEMORY
# =========================================

@app.post("/api/ai-hint")
async def ai_hint(request: Request):

    data = await request.json()

    code = data.get("code","")

    question = data.get("question","")

    user_msg = data.get("type","")

    memory = data.get("memory",[])

    messages = [

        {
            "role":"system",

            "content":"""

            You are a persistent AI coding mentor.

            Behaviors:

            - remember previous conversation
            - do not repeat same hints
            - guide according to user's current mistake
            - sound natural
            - no robotic tone
            - concise answers
            - no markdown
            - no full solution
            """
        }
    ]

    # previous memory

    messages.extend(memory)

    # latest context

    messages.append({

        "role":"user",

        "content":f"""

        Coding Problem:
        {question}

        Student Code:
        {code}

        User Question:
        {user_msg}
        """
    })

    try:

        res = client.chat.completions.create(

            model="llama-3.3-70b-versatile",

            messages=messages
        )

        return {

            "msg":
            res.choices[0].message.content
        }

    except Exception as e:

        print(e)

        return {

            "msg":
            "Try checking your logic once more."
        }

# =========================================
# UPDATE DSA PROGRESS
# =========================================

def update_dsa_progress(

    username,
    topic,
    level,
    score,
    runs=1
):

    conn = sqlite3.connect(
        "database.db"
    )

    cur = conn.cursor()

    # create row if not exists

    cur.execute("""

    INSERT OR IGNORE INTO
    dsa_progress(

        username,
        topic

    )

    VALUES(?,?)

    """,(username,topic))

    # =====================================
    # TOTAL ATTEMPTED
    # =====================================

    cur.execute("""

    UPDATE dsa_progress

    SET total_attempted =
    total_attempted + 1

    WHERE username=?
    AND topic=?

    """,(username,topic))

    # =====================================
    # TOTAL RUNS
    # =====================================

    cur.execute("""

    UPDATE dsa_progress

    SET total_runs =
    total_runs + ?

    WHERE username=?
    AND topic=?

    """,(runs,username,topic))

    # =====================================
    # SOLVED
    # =====================================

    if score == 1:

        # total solved

        cur.execute("""

        UPDATE dsa_progress

        SET total_solved =
        total_solved + 1

        WHERE username=?
        AND topic=?

        """,(username,topic))

        # difficulty solved

        if level == "easy":

            cur.execute("""

            UPDATE dsa_progress

            SET easy_count =
            easy_count + 1

            WHERE username=?
            AND topic=?

            """,(username,topic))

        elif level == "medium":

            cur.execute("""

            UPDATE dsa_progress

            SET medium_count =
            medium_count + 1

            WHERE username=?
            AND topic=?

            """,(username,topic))

        elif level == "hard":

            cur.execute("""

            UPDATE dsa_progress

            SET hard_count =
            hard_count + 1

            WHERE username=?
            AND topic=?

            """,(username,topic))

    conn.commit()

    conn.close()

# =========================================
# SAVE SESSION
# =========================================

@app.post("/api/save-session")
async def save_session(request: Request):

    data = await request.json()

    user = data.get("user","guest")

    topic = data.get("topic","unknown")

    level = data.get("level","easy")

    score = data.get("score",0)

    runs = data.get("runs",1)

    try:

        conn = sqlite3.connect("database.db")

        cur = conn.cursor()

        cur.execute("""

        INSERT INTO coding_sessions(

            username,
            topic,
            level,
            score

        )

        VALUES(?,?,?,?)

        """,(

            user,
            topic,
            level,
            score
        ))

        conn.commit()

        conn.close()

        # update progress

        update_dsa_progress(

            user,
            topic,
            level,
            score,
            runs
        )

        return {

            "msg":"saved"
        }

    except Exception as e:

        print(e)

        return {

            "msg":"db error"
        }

# =========================================
# SAVE VICTORY
# =========================================

@app.post("/api/save-victory")
async def save_victory(request: Request):

    data = await request.json()

    user = data.get("user","guest")

    topic = data.get("topic","unknown")

    msg = data.get("msg","victory")

    try:

        conn = sqlite3.connect("database.db")

        cur = conn.cursor()

        cur.execute("""

        INSERT INTO victories(

            username,
            topic,
            message

        )

        VALUES(?,?,?)

        """,(

            user,
            topic,
            msg
        ))

        conn.commit()

        conn.close()

        return {

            "msg":"victory saved"
        }

    except Exception as e:

        print(e)

        return {

            "msg":"db error"
        }

# =========================================
# USER DSA PROGRESS
# =========================================

@app.get("/api/dsa-progress/{username}")
def dsa_progress(username:str):

    try:

        conn = sqlite3.connect("database.db")

        conn.row_factory = sqlite3.Row

        cur = conn.cursor()

        cur.execute("""

        SELECT *

        FROM dsa_progress

        WHERE username=?

        """,(username,))

        rows = cur.fetchall()

        conn.close()

        return [dict(r) for r in rows]

    except Exception as e:

        print(e)

        return []

# =========================================
# LEADERBOARD
# =========================================

@app.get("/api/coding-leaderboard")
def leaderboard():

    try:

        conn = sqlite3.connect("database.db")

        cur = conn.cursor()

        cur.execute("""

        SELECT username,
        SUM(score) as total

        FROM coding_sessions

        GROUP BY username

        ORDER BY total DESC

        LIMIT 10

        """)

        rows = cur.fetchall()

        conn.close()

        leaderboard = []

        for r in rows:

            leaderboard.append({

                "username":r[0],

                "score":r[1]
            })

        return leaderboard

    except Exception as e:

        print(e)

        return []

# =========================================
# USER STATS
# =========================================

@app.get("/api/user-coding-stats/{username}")
def user_stats(username:str):

    try:

        conn = sqlite3.connect("database.db")

        cur = conn.cursor()

        # attempts

        cur.execute("""

        SELECT COUNT(*)

        FROM coding_sessions

        WHERE username=?

        """,(username,))

        attempts = cur.fetchone()[0]

        # solved

        cur.execute("""

        SELECT COUNT(*)

        FROM coding_sessions

        WHERE username=?
        AND score=1

        """,(username,))

        solved = cur.fetchone()[0]

        conn.close()

        return {

            "attempted":
            attempts,

            "solved":
            solved
        }

    except Exception as e:

        print(e)

        return {

            "attempted":0,

            "solved":0
        }

# =========================================
# ROOT
# =========================================

@app.get("/")
def root():

    return {

        "msg":
        "Coding Arena Backend Running"
    }

# =========================================
# RUN
# =========================================
 
# add avtar
from fastapi import UploadFile, File
import os

@app.post("/api/upload-avatar/{username}")
async def upload_avatar(username: str, file: UploadFile = File(...)):

    # ensure folder exists
    os.makedirs("static/profile", exist_ok=True)

    # 🔥 ALWAYS SAME FILE NAME → overwrite
    file_path = f"static/profile/{username}.png"

    with open(file_path, "wb") as f:
        f.write(await file.read())

    # save path in DB
    db_path = "/" + file_path.replace("\\", "/")

    conn = sqlite3.connect("database.db")
    cur = conn.cursor()

    cur.execute("""
    UPDATE users SET profile_pic=? WHERE username=?
    """, (db_path, username))

    conn.commit()
    conn.close()

    return {"path": db_path}
# profile api
@app.get("/api/profile/{username}")
def get_profile(username: str):

    conn = sqlite3.connect("database.db")
    cur = conn.cursor()

    # 🔥 PROFILE PIC
    cur.execute("SELECT profile_pic FROM users WHERE username=?", (username,))
    row = cur.fetchone()

    profile_pic = row[0] if row and row[0] else "/static/default.png"

    # 🔥 CODING SESSIONS
    cur.execute("""
    SELECT topic, level, score FROM coding_sessions
    WHERE username=?
    """, (username,))
    sessions = cur.fetchall()

    attempts = len(sessions)

    avg_score = sum([s[2] for s in sessions]) / attempts if attempts else 0

    # 🔥 ROADMAP PROGRESS
        # 🔥 REAL DSA PROGRESS
    cur.execute("""

    SELECT
    topic,
    easy_count,
    medium_count,
    hard_count,
    total_solved

    FROM dsa_progress

    WHERE username=?

    """,(username,))

    rows = cur.fetchall()

    progress_data = {}

    for r in rows:

        topic = r[0]

        easy = r[1]
        medium = r[2]
        hard = r[3]
        total = r[4]

        progress_data[topic] = {

        "easy": easy,
        "medium": medium,
        "hard": hard,
        "total": total
    }

    # 🔥 WINS
    cur.execute("SELECT COUNT(*) FROM victories WHERE username=?", (username,))
    wins = cur.fetchone()[0]

    conn.close()

    return {
        "username": username,
        "profile_pic": profile_pic,
        "attempts": attempts,
        "avg_score": round(avg_score, 2),
        "wins": wins,
        "progress": progress_data,
        "sessions": sessions   # 🔥 IMPORTANT FOR HISTORY UI
    }

# python compiler 
from fastapi import Request
import subprocess
import tempfile
import os

@app.post("/api/run-code")
async def run_code(request: Request):

    data = await request.json()

    code = data.get("code", "")
    user_input = data.get("input", "")

    # 🔴 BASIC BLOCK (important)
    banned = ["import os", "import sys", "__", "open(", "exec(", "eval("]

    for b in banned:
        if b in code:
            return {"output": "⛔ Unsafe code detected"}

    try:
        # create temp python file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".py", mode="w") as f:
            f.write(code)
            filename = f.name

        # run code
        result = subprocess.run(
            ["python", filename],
            input=user_input,
            text=True,
            capture_output=True,
            timeout=3
        )

        # get output
        output = result.stdout.strip() if result.stdout else result.stderr.strip()

        if not output:
            output = "⚠️ No output"

    except subprocess.TimeoutExpired:
        output = "⛔ Time Limit Exceeded"

    except Exception as e:
        output = f"Error: {str(e)}"

    finally:
        if os.path.exists(filename):
            os.remove(filename)

    return {"output": output}



# lets build
# =========================================================
# REQUIRED IMPORTS
# =========================================================

import re

from collections import deque

from pydantic import BaseModel

# =========================================================
# REQUEST MODEL
# =========================================================

class CodeInput(BaseModel):

    code: str

    ds: str

# =========================================================
# NORMALIZER
# =========================================================

def normalize_line(line):

    line = line.upper()

    line = re.sub(r'\s+', ' ', line)

    return line.strip()

# =========================================================
# DSA PATTERNS
# =========================================================

DS_PATTERNS = {

   "array": {

    "declare":[

        r'DECLARE ARRAY SIZE (\d+)',

        r'CREATE ARRAY OF SIZE (\d+)'

    ],

    "insert":[

        r'INSERT (\d+)',

        r'ADD (\d+)'

    ],

    "delete":[

        r'DELETE (\d+)',

        r'REMOVE (\d+)'

    ],

    "search":[

        r'SEARCH (\d+)',

        r'FIND (\d+)'

    ]

},

    "stack": {

        "push":[
            r'PUSH (\d+)'
        ],

        "pop":[
            r'POP'
        ],

        "peek":[
            r'PEEK'
        ]

    },

    "queue": {

        "enqueue":[
            r'ENQUEUE (\d+)'
        ],

        "dequeue":[
            r'DEQUEUE'
        ],

        "search":[
            r'SEARCH (\d+)'
        ]

    },

    "linkedlist": {

        "insert":[
            r'INSERT NODE (\d+)',
            r'ADD NODE (\d+)'
        ],

        "insert_head":[
            r'INSERT NODE (\d+) AT HEAD'
        ],

        "delete":[
            r'DELETE NODE (\d+)'
        ],

        "search":[
            r'SEARCH NODE (\d+)'
        ],

        "reverse":[
            r'REVERSE LINKED LIST'
        ]

    },

    "graph": {

        "add_node":[
            r'ADD NODE (\w+)'
        ],

        "add_edge":[
            r'CONNECT (\w+) TO (\w+)'
        ],

        "bfs":[
            r'BFS (\w+)'
        ],

        "dfs":[
            r'DFS (\w+)'
        ]

    },

    "tree": {

    "insert":[

        r'INSERT (\d+)',

        r'ADD (\d+)'

    ],

    "search":[

        r'SEARCH (\d+)',

        r'FIND (\d+)'

    ],

    "delete":[

        r'DELETE (\d+)',

        r'REMOVE (\d+)'

    ],

    "set_root":[

        r'ROOT\s*=\s*(\d+)'

    ],

    "set_left":[

        r'(\d+)\.LEFT\s*=\s*(\d+)',

        r'SET LEFT OF (\d+) TO (\d+)',

        r'ATTACH (\d+) LEFT OF (\d+)'

    ],

    "set_right":[

        r'(\d+)\.RIGHT\s*=\s*(\d+)',

        r'SET RIGHT OF (\d+) TO (\d+)',

        r'ATTACH (\d+) RIGHT OF (\d+)'

    ],

    "inorder":[

        r'INORDER'

    ],

    "preorder":[

        r'PREORDER'

    ],

    "postorder":[

        r'POSTORDER'

    ]

},

    "heap": {

        "insert":[
            r'INSERT (\d+)'
        ],

        "delete_root":[
            r'DELETE ROOT'
        ]

    },

    "hashmap": {

        "put":[
            r'PUT (\w+) (\w+)'
        ],

        "get":[
            r'GET (\w+)'
        ],

        "remove":[
            r'REMOVE (\w+)'
        ]

    }

}

# =========================================================
# EXECUTION TRACE HELPERS
# =========================================================

def add_traverse(actions, ds, value):

    actions.append({

        "ds":ds,

        "action":"traverse",

        "data":{
            "current":value
        }

    })

def add_found(actions, ds, value):

    actions.append({

        "ds":ds,

        "action":"found",

        "data":{
            "value":value
        }

    })

def add_error(actions, msg):

    actions.append({

        "type":"error",

        "message":msg

    })

# new helper 
# =========================================================
# TREE NODE
# =========================================================

class TreeNode:

    def __init__(self, value):

        self.value = value

        self.left = None

        self.right = None

# =========================================================
# TREE HELPERS
# =========================================================

def insert_bst(root, value, actions):

    if root is None:

        actions.append({

            "ds":"tree",

            "action":"insert",

            "data":{
                "value":value
            }

        })

        return TreeNode(value)

    actions.append({

        "ds":"tree",

        "action":"traverse",

        "data":{
            "current":root.value
        }

    })

    if value < root.value:

        root.left = insert_bst(
           
                root.left,
                value,
                actions
            )

    else:

        root.right = insert_bst(
           
                root.right,
                value,
                actions
            )

    return root

# =========================================================
# FIND NODE
# =========================================================

def find_node(root, value):

    if root is None:
        return None

    if root.value == value:
        return root

    left =find_node(
        
            root.left,
            value
        )

    if left:
        return left

    return find_node(
        root.right,
        value
    )

# =========================================================
# TREE TO JSON
# =========================================================

def tree_to_dict(root):

    if root is None:
        return None

    return {

        "value":root.value,

        "left":
            tree_to_dict(
                root.left
            ),

        "right":
            tree_to_dict(
                root.right
            )

    }

# =========================================================
# TRAVERSALS
# =========================================================

def inorder(root, actions):

    if root is None:
        return

    inorder(root.left, actions)

    actions.append({

        "ds":"tree",

        "action":"traverse",

        "data":{
            "current":root.value
        }

    })

    inorder(root.right, actions)

def preorder(root, actions):

    if root is None:
        return

    actions.append({

        "ds":"tree",

        "action":"traverse",

        "data":{
            "current":root.value
        }

    })

    preorder(root.left, actions)

    preorder(root.right, actions)

def postorder(root, actions):

    if root is None:
        return

    postorder(root.left, actions)

    postorder(root.right, actions)

    actions.append({

        "ds":"tree",

        "action":"traverse",

        "data":{
            "current":root.value
        }

    })

# =========================================================
# DELETE BST
# =========================================================

def delete_bst(root, value, actions):

    if root is None:

        return None

    actions.append({

        "ds":"tree",

        "action":"traverse",

        "data":{
            "current":root.value
        }

    })

    if value < root.value:

        root.left = delete_bst(
           
                root.left,
                value,
                actions
            )

    elif value > root.value:

        root.right = delete_bst(
           
                root.right,
                value,
                actions
            )

    else:

        actions.append({

            "ds":"tree",

            "action":"found",

            "data":{
                "value":value
            }

        })

        # ======================================
        # NO CHILD
        # ======================================

        if root.left is None and root.right is None:

            return None

        # ======================================
        # ONE CHILD
        # ======================================

        if root.left is None:

            return root.right

        if root.right is None:

            return root.left

        # ======================================
        # TWO CHILDREN
        # ======================================

        successor =root.right
            

        while successor.left:

            successor =successor.left
                

        root.value = successor.value
           

        root.right = delete_bst(
           
                root.right,
                successor.value,
                actions
            )

    return root


# =========================================================
# MAIN PARSER
# =========================================================
# =========================================================
# MAIN PARSER
# =========================================================

def parse_universal_code(code, active_ds):

    actions = []

    lines = code.split("\n")

    operations = DS_PATTERNS.get(active_ds, {})

    # =====================================================
    # STATES
    # =====================================================

    array_capacity = 0

    array_state = []

    stack_state = []

    queue_state = deque()

    linked_state = []

    graph_nodes = set()

    graph_edges = []

    graph_adj = {}

    tree_root = None

    heap_state = []

    hashmap_state = {}

    # =====================================================
    # PROCESS LINES
    # =====================================================

    for raw_line in lines:

        line = normalize_line(raw_line)

        if line == "":
            continue

        matched = False

        for action_name, patterns in operations.items():

            for pattern in patterns:

                match = re.search(pattern, line)

                if not match:
                    continue

                matched = True

                groups = match.groups()

                # =================================================
                # ARRAY ENGINE
                # =================================================

                if active_ds == "array":

                    if action_name == "declare":

                        array_capacity = int(groups[0])

                        array_state = [None] * array_capacity

                        actions.append({

                            "ds":"array",

                            "action":"declare",

                            "data":{

                                "array":
                                array_state.copy(),

                                "capacity":
                                array_capacity

                            }

                        })

                    elif action_name == "insert":

                        value = int(groups[0])

                        if array_capacity == 0:

                            add_error(
                                actions,
                                "Declare array size first"
                            )

                        elif None not in array_state:

                            add_error(
                                actions,
                                "Array Overflow"
                            )

                        else:

                            index = array_state.index(None)
                               

                            array_state[index] = value
                            print(array_state)

                            actions.append({

                                "ds":"array",

                                "action":"insert",

                                "data":{

                                    "value":value,

                                    "array":
                                    array_state.copy()

                                }

                            })

                    elif action_name == "search":

                        value = int(groups[0])

                        found = False

                        for item in array_state:

                            if item is None:
                                continue

                            add_traverse(
                                actions,
                                "array",
                                item
                            )

                            if item == value:

                                found = True

                                add_found(
                                    actions,
                                    "array",
                                    value
                                )

                                break

                        if not found:

                            add_error(
                                actions,
                                f"Element {value} not found"
                            )

                    elif action_name == "delete":

                        value = int(groups[0])

                        found = False

                        for i, item in enumerate(array_state):

                            if item is None:
                                continue

                            add_traverse(
                                actions,
                                "array",
                                item
                            )

                            if item == value:

                                found = True

                                array_state.pop(i)

                                array_state.append(None)

                                break

                        if found:

                            actions.append({

                                "ds":"array",

                                "action":"delete",

                                "data":{

                                    "array":
                                    array_state.copy()

                                }

                            })

                        else:

                            add_error(
                                actions,
                                f"Element {value} not found"
                            )

                # =================================================
                # STACK ENGINE
                # =================================================

                elif active_ds == "stack":

                    if action_name == "push":

                        value = int(groups[0])

                        stack_state.append(value)

                        actions.append({

                            "ds":"stack",

                            "action":"push",

                            "data":{

                                "stack":
                                stack_state.copy()

                            }

                        })

                    elif action_name == "pop":

                        if not stack_state:

                            add_error(
                                actions,
                                "Stack Underflow"
                            )

                        else:

                            top = stack_state[-1]

                            add_traverse(
                                actions,
                                "stack",
                                top
                            )

                            stack_state.pop()

                            actions.append({

                                "ds":"stack",

                                "action":"pop",

                                "data":{

                                    "stack":
                                    stack_state.copy()

                                }

                            })

                # =================================================
                # QUEUE ENGINE
                # =================================================

                elif active_ds == "queue":

                    if action_name == "enqueue":

                        value = int(groups[0])

                        queue_state.append(value)

                        actions.append({

                            "ds":"queue",

                            "action":"enqueue",

                            "data":{

                                "queue":
                                list(queue_state)

                            }

                        })

                    elif action_name == "dequeue":

                        if not queue_state:

                            add_error(
                                actions,
                                "Queue Underflow"
                            )

                        else:

                            front = queue_state[0]

                            add_traverse(
                                actions,
                                "queue",
                                front
                            )

                            queue_state.popleft()

                            actions.append({

                                "ds":"queue",

                                "action":"dequeue",

                                "data":{

                                    "queue":
                                    list(queue_state)

                                }

                            })

                    elif action_name == "search":

                        value = int(groups[0])

                        found = False

                        for item in queue_state:

                            add_traverse(
                                actions,
                                "queue",
                                item
                            )

                            if item == value:

                                found = True

                                add_found(
                                    actions,
                                    "queue",
                                    value
                                )

                                break

                        if not found:

                            add_error(
                                actions,
                                f"Element {value} not found"
                            )

                # =================================================
                # LINKED LIST ENGINE
                # =================================================

                elif active_ds == "linkedlist":

                    if action_name == "insert":

                        value = int(groups[0])

                        linked_state.append(value)

                    elif action_name == "insert_head":

                        value = int(groups[0])

                        linked_state.insert(0, value)

                    elif action_name == "delete":

                        value = int(groups[0])

                        found = False

                        for node in linked_state:

                            add_traverse(
                                actions,
                                "linkedlist",
                                node
                            )

                            if node == value:

                                found = True
                                break

                        if found:

                            linked_state.remove(value)

                        else:

                            add_error(
                                actions,
                                f"Node {value} not found"
                            )

                    elif action_name == "search":

                        value = int(groups[0])

                        found = False

                        for node in linked_state:

                            add_traverse(
                                actions,
                                "linkedlist",
                                node
                            )

                            if node == value:

                                found = True

                                add_found(
                                    actions,
                                    "linkedlist",
                                    value
                                )

                                break

                        if not found:

                            add_error(
                                actions,
                                f"Node {value} not found"
                            )

                    elif action_name == "reverse":

                        linked_state.reverse()

                    actions.append({

                        "ds":"linkedlist",

                        "action":"render",

                        "data":{

                            "list":
                            linked_state.copy()

                        }

                    })

                # =================================================
                # GRAPH ENGINE
                # =================================================

                elif active_ds == "graph":

                    if action_name == "add_node":

                        node = groups[0]

                        graph_nodes.add(node)

                        graph_adj[node] = []

                        actions.append({

                            "ds":"graph",

                            "action":"add_node",

                            "data":{
                                "node":node
                            }

                        })

                    elif action_name == "add_edge":

                        from_node = groups[0]
                        to_node = groups[1]

                        if from_node not in graph_nodes:

                            add_error(
                                actions,
                                f"Node {from_node} not found"
                            )

                        elif to_node not in graph_nodes:

                            add_error(
                                actions,
                                f"Node {to_node} not found"
                            )

                        else:

                            graph_edges.append({

                                "from":from_node,

                                "to":to_node

                            })

                            graph_adj[from_node].append(to_node)

                            actions.append({

                                "ds":"graph",

                                "action":"add_edge",

                                "data":{

                                    "from":from_node,

                                    "to":to_node

                                }

                            })

                    elif action_name == "bfs":

                        start = groups[0]

                        visited = set()

                        queue = deque([start])

                        while queue:

                            actions.append({

                                "ds":"graph",

                                "action":"bfs_step",

                                "data":{

                                    "current":queue[0],

                                    "queue":
                                    list(queue),

                                    "visited":
                                    list(visited)

                                }

                            })

                            node = queue.popleft()

                            if node in visited:
                                continue

                            visited.add(node)

                            for neighbor in graph_adj.get(node, []):

                                if neighbor not in visited:

                                    queue.append(neighbor)
                                    # bfs end

                    elif action_name == "dfs":

                        start = groups[0]

                        visited = set()

                        stack = [start]

                        while stack:

                            actions.append({

                                "ds":"graph",

                                "action":"dfs_step",

                                "data":{

                                    "current":stack[-1],

                                    "stack":
                                    stack.copy(),

                                    "visited":
                                    list(visited)

                                }

                            })

                            node = stack.pop()

                            if node in visited:
                                continue

                            visited.add(node)

                            for neighbor in reversed(
                                graph_adj.get(node, [])
                            ):

                                if neighbor not in visited:

                                    stack.append(neighbor)

                # =================================================
                # TREE ENGINE
                # =================================================

                elif active_ds == "tree":

                    if action_name == "insert":

                        value = int(groups[0])

                        tree_root = insert_bst(
                            tree_root,
                            value,
                            actions
                        )

                    elif action_name == "set_root":

                        value = int(groups[0])

                        tree_root = TreeNode(value)

                    elif action_name == "set_left":

                        parent = int(groups[0])

                        child = int(groups[1])

                        parent_node =find_node(
                            
                                tree_root,
                                parent
                            )

                        if parent_node:

                            parent_node.left =TreeNode(child)
                                

                        else:

                            add_error(
                                actions,
                                f"Parent node {parent} not found"
                            )

                    elif action_name == "set_right":

                        parent = int(groups[0])

                        child = int(groups[1])

                        parent_node =find_node(
                            
                                tree_root,
                                parent
                            )

                        if parent_node:

                            parent_node.right = TreeNode(child)
                               

                        else:

                            add_error(
                                actions,
                                f"Parent node {parent} not found"
                            )

                    elif action_name == "search":

                        value = int(groups[0])

                        current = tree_root

                        found = False

                        while current:

                            add_traverse(
                                actions,
                                "tree",
                                current.value
                            )

                            if current.value == value:

                                found = True

                                add_found(
                                    actions,
                                    "tree",
                                    value
                                )

                                break

                            if value < current.value:

                                current = current.left

                            else:

                                current = current.right

                        if not found:

                            add_error(
                                actions,
                                f"Node {value} not found"
                            )

                    elif action_name == "delete":

                        value = int(groups[0])

                        tree_root = delete_bst(
                            tree_root,
                            value,
                            actions
                        )

                    elif action_name == "inorder":

                        inorder(
                            tree_root,
                            actions
                        )

                    elif action_name == "preorder":

                        preorder(
                            tree_root,
                            actions
                        )

                    elif action_name == "postorder":

                        postorder(
                            tree_root,
                            actions
                        )

                    actions.append({

                        "ds":"tree",

                        "action":"render",

                        "data":{

                            "tree":
                            tree_to_dict(
                                tree_root
                            )

                        }

                    })

                # =================================================
                # HASHMAP ENGINE
                # =================================================

                elif active_ds == "hashmap":

                    if action_name == "put":

                        key = groups[0]
                        value = groups[1]

                        hashmap_state[key] = value

                    elif action_name == "get":

                        key = groups[0]

                        add_traverse(
                            actions,
                            "hashmap",
                            key
                        )

                        if key in hashmap_state:

                            add_found(
                                actions,
                                "hashmap",
                                key
                            )

                        else:

                            add_error(
                                actions,
                                f"Key {key} not found"
                            )

                    elif action_name == "remove":

                        key = groups[0]

                        if key in hashmap_state:

                            del hashmap_state[key]

                        else:

                            add_error(
                                actions,
                                f"Key {key} not found"
                            )

                    actions.append({

                        "ds":"hashmap",

                        "action":"render",

                        "data":{

                            "map":
                            hashmap_state.copy()

                        }

                    })

                break

            if matched:
                break

        # =====================================================
        # UNKNOWN COMMAND
        # =====================================================

        if not matched:

            actions.append({

                "type":"warning",

                "message":
                f"Unsupported command: {line}",

                "suggestions":
                list(operations.keys())

            })

    return actions
# =========================================================
# ROUTE
# =========================================================

@app.post("/execute-dsa")
async def execute_dsa(data: CodeInput):

    actions = parse_universal_code(
        data.code,
        data.ds
    )

    return {

        "success":True,

        "actions":actions

    }



# groq api

# =========================================================
# REQUEST MODEL
# =========================================================

class AIRequest(BaseModel):

    message:str

    ds:str

    editor:str

    memory:list


# =========================================================
# AI ROUTE
# =========================================================

@app.post("/ask-ai")
async def ask_ai(data:AIRequest):

    try:

        # =================================================
        # SYSTEM PROMPT
        # =================================================

        system_prompt = f"""

You are Viva AI.

You are an intelligent DSA tutor and coding companion.

You have FULL access to the editor.

You help students learn:

- arrays
- stack
- queue
- linked list
- graph

=================================================

YOUR RESPONSIBILITIES

=================================================

1. Explain DSA concepts clearly
2. Detect wrong commands
3. Suggest valid commands
4. Solve doubts
5. Help educationally
6. Keep responses concise
7. Use current editor context
8. Generate professional pseudo code
9. Interrupt incorrect syntax
10. Suggest fixes immediately

=================================================

EDITOR CONTROL

=================================================

If user asks:
- add node
- insert
- delete
- search
- push
- pop
- enqueue
- dequeue

then return:

COMMAND: <pseudo code>

Example:

COMMAND: INSERT 50

OR

COMMAND: ADD NODE A

=================================================

CURRENT DATA STRUCTURE

=================================================

{data.ds}

=================================================

CURRENT EDITOR CONTENT

=================================================

{data.editor}

"""

        # =================================================
        # MESSAGE STACK
        # =================================================

        messages = [

            {

                "role":"system",

                "content":system_prompt

            }

        ]

        # =================================================
        # MEMORY
        # =================================================

        messages.extend(data.memory[-20:])

        # =================================================
        # USER MESSAGE
        # =================================================

        messages.append({

            "role":"user",

            "content":data.message

        })

        # =================================================
        # GROQ REQUEST
        # =================================================

        response = client.chat.completions.create(

           model="llama-3.1-8b-instant",

            messages=messages,

            temperature=0.3

        )

        # =================================================
        # AI REPLY
        # =================================================

        reply = response.choices[0].message.content

        # =================================================
        # COMMAND EXTRACTION
        # =================================================

        command = None

        ai_text = reply

        if "COMMAND:" in reply:

            split_reply = reply.split("COMMAND:")

            ai_text = split_reply[0].strip()

            command = split_reply[1].strip()

        # =================================================
        # RETURN
        # =================================================

        return JSONResponse({

            "success":True,

            "reply":ai_text,

            "command":command

        })

    # =====================================================
    # ERROR
    # =====================================================

    except Exception as e:

        return JSONResponse({

            "success":False,

            "reply":str(e)

        })
