from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
import sqlite3
from groq import Groq
import json
import random
from groq import Groq
import json
import re
import os
from dotenv import load_dotenv
load_dotenv()



app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")


#database---------------------------
def init_db():
    conn = sqlite3.connect("practice.db")
    cur = conn.cursor()

    cur.execute("""
    CREATE TABLE IF NOT EXISTS questions(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company TEXT,
        question TEXT,
        o1 TEXT,
        o2 TEXT,
        o3 TEXT,
        o4 TEXT,
        ans TEXT
    )
    """)

    
    # FRIEND TABLE
    cur.execute("""
CREATE TABLE IF NOT EXISTS friends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user TEXT,
    friend TEXT
)
""")

# RESULTS TABLE
    cur.execute("""
CREATE TABLE IF NOT EXISTS practice_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    company TEXT,
    round TEXT,
    score INTEGER,
    status TEXT
)
""")

# ACHIEVEMENTS TABLE
    cur.execute("""
CREATE TABLE IF NOT EXISTS achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    company TEXT,
    badge TEXT
)
""")

#for coding round
    cur.execute("""
CREATE TABLE IF NOT EXISTS coding_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company TEXT,
    question TEXT UNIQUE,
    o1 TEXT,
    o2 TEXT,
    o3 TEXT,
    o4 TEXT,
    ans TEXT
)
""")
    

    conn.commit()
    conn.close()

init_db()
client = Groq(
    api_key=os.getenv(
        "GROQ_API_KEY_2"
    ))


#routes
# @app.get("/practice", response_class=HTMLResponse)
# def practice():
#     return open("templates/practice.html", encoding="utf-8").read()
@app.get("/", response_class=HTMLResponse)
def practice():
    return open("templates/practice.html", encoding="utf-8").read()


@app.get("/aptitude", response_class=HTMLResponse)
def aptitude():
    return open("templates/aptitude.html", encoding="utf-8").read()

@app.get("/friend", response_class=HTMLResponse)
def friend_page():
    return open("templates/friend.html", encoding="utf-8").read()

@app.get("/coding", response_class=HTMLResponse)
def friend_page():
    return open("templates/coding.html", encoding="utf-8").read()

@app.get("/hr", response_class=HTMLResponse)
def friend_page():
    return open("templates/hr.html", encoding="utf-8").read()

@app.get("/buzzer", response_class=HTMLResponse)
def buzzer_page():
    return open("templates/buzzer.html", encoding="utf-8").read()





@app.post("/api/register")
async def register(request: Request):
    data = await request.json()
    name = data.get("name")

    conn = sqlite3.connect("practice.db")
    cur = conn.cursor()

    cur.execute("SELECT * FROM users WHERE username=?", (name,))
    if cur.fetchone():
        conn.close()
        return {"success": False, "msg": "Username already exists"}

    cur.execute("INSERT INTO users(username) VALUES(?)", (name,))
    conn.commit()
    conn.close()

    return {"success": True}


@app.post("/api/login")
async def login(request: Request):
    data = await request.json()
    name = data.get("name")

    conn = sqlite3.connect("practice.db")
    cur = conn.cursor()

    cur.execute("SELECT * FROM users WHERE username=?", (name,))
    user = cur.fetchone()

    conn.close()

    if not user:
        return {"success": False, "msg": "User not found"}

    return {"success": True}


#ai api_______________________________________________________________
@app.get("/api/get-questions/{company}")
def get_questions(company: str):

    conn = sqlite3.connect("practice.db")
    cur = conn.cursor()

    # 🔥 CHECK COUNT
    cur.execute("SELECT COUNT(*) FROM questions WHERE company=?", (company,))
    count = cur.fetchone()[0]

    # 🔥 IF NOT ENOUGH → GENERATE + STORE
    if count < 100:

        print("Generating questions for:", company)

        data = generate_questions(company)

        # 🔥 VERY IMPORTANT DEBUG
        print("Generated:", len(data))

        store_questions(company, data)

    # 🔥 NOW FETCH RANDOM 20
    cur.execute("""
    SELECT question,o1,o2,o3,o4,ans
    FROM questions
    WHERE company=?
    ORDER BY RANDOM()
    LIMIT 20
    """,(company,))

    rows = cur.fetchall()
    conn.close()

    result = []

    for r in rows:
        result.append({
            "q": r[0],
            "options":[r[1],r[2],r[3],r[4]],
            "ans": r[5]
        })

    # 🔥 FINAL SAFETY
    if not result:
        result = [
            {"q":"Emergency fallback","options":["A","B","C","D"],"ans":"A"}
        ]

    return result

#20 random questions ------------------------------------



def generate_questions(company):

    all_q = []

    for i in range(10):

        prompt = f"""
        Generate 10 aptitude MCQs for {company}.

        STRICT JSON:
        [
          {{
            "q":"question",
            "options":["opt1","opt2","opt3","opt4"],
            "ans":"A"
          }}
        ]
        """

        try:
            res = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role":"user","content":prompt}]
            )

            raw = res.choices[0].message.content

            match = re.search(r"\[.*\]", raw, re.S)
            if not match:
                continue

            data = json.loads(match.group())

            for q in data:

                # 🔥 CONVERT A/B/C/D → actual option
                ans_map = {
                    "A": q["options"][0],
                    "B": q["options"][1],
                    "C": q["options"][2],
                    "D": q["options"][3]
                }

                q["ans"] = ans_map.get(q["ans"], q["options"][0])

                all_q.append(q)

        except Exception as e:
            print("AI chunk failed:", e)
            continue

    return all_q

    #-------------------------store in db
def store_questions(company, data):

    conn = sqlite3.connect("practice.db")
    cur = conn.cursor()

    for q in data:

        try:
            if len(q["options"]) < 4:
                continue
            cur.execute("""
INSERT OR IGNORE INTO questions(company,question,o1,o2,o3,o4,ans)
VALUES(?,?,?,?,?,?,?)
""",(
    company,
    q["q"],
    q["options"][0],
    q["options"][1],
    q["options"][2],
    q["options"][3],
    q["ans"]   # now correct TEXT
))

    
        except:
            continue

    conn.commit()
    conn.close()

#fail suggestion-----------------------------------------
@app.post("/api/suggestions")
async def suggestions(request: Request):

    data = await request.json()

    score = data.get("score")
    company = data.get("company")
    attempted = data.get("attempted")
    timeout = data.get("timeout")

    prompt = f"""
    A student attempted {company} aptitude test.

    Score: {score}
    Attempted: {attempted}
    Time limit exceeded: {timeout}

    Give:
    - Weak areas
    - Improvement tips
    - Speed improvement advice

    Make it practical and different each time.
    """

    res = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role":"user","content":prompt}]
    )

    return {"msg": res.choices[0].message.content}




    #add friend --------------------------------------
@app.post("/api/add-friend")
async def add_friend(request: Request):

    data = await request.json()
    user = data.get("user")
    friend = data.get("friend")

    conn = sqlite3.connect("practice.db")
    cur = conn.cursor()

    # check friend exists
    cur.execute("SELECT * FROM users WHERE username=?", (friend,))
    exists = cur.fetchone()

    if not exists:
        conn.close()
        return {"success": False, "msg": "❌ No user found"}

    # 🔥 check already bound
    cur.execute("SELECT * FROM friends WHERE user=?", (user,))
    already = cur.fetchone()

    if already:
        conn.close()
        return {"success": False, "msg": "⚠️ Friend already connected"}

    cur.execute("INSERT INTO friends(user, friend) VALUES(?,?)",(user, friend))

    conn.commit()
    conn.close()

    return {"success": True, "msg": "✅ Friend connected"}
    

    #save result--------------------------------------
@app.post("/api/save-result")
async def save_result(request: Request):

    data = await request.json()

    username = (data.get("username") or "").strip().lower()

    if not username:
        return {"success": False}

    conn = sqlite3.connect("practice.db")
    cur = conn.cursor()

    cur.execute("""
    INSERT INTO practice_results(username,company,round,score,status)
    VALUES(?,?,?,?,?)
    """,(
        username,
        data.get("company"),
        data.get("round"),
        data.get("score"),
        data.get("status")
    ))

    # 🎖 BADGE LOGIC (FULL FLOW)
    if data.get("round") == "HR" and data.get("status") == "pass":
        cur.execute("""
        INSERT INTO achievements(username, company, badge)
        VALUES(?, ?, '🏆 Completed Full Interview')
        """,(username, data.get("company")))

    conn.commit()
    conn.close()

    return {"success": True}
#---------------------------------------------------------------------------------------------------------
#battle result
@app.get("/api/battle-results/{user}")
def battle_results(user: str):

    conn = sqlite3.connect("practice.db")
    cur = conn.cursor()

    cur.execute("""
    SELECT winner FROM battle_results
    WHERE user=?
    ORDER BY id DESC
    LIMIT 10
    """,(user,))

    rows = cur.fetchall()
    conn.close()

    return [r[0] for r in rows]
#-----------------------------------------------------------------------------------------------------------
#--------------get friend data
@app.get("/api/friend-data/{user}")
def friend_data(user: str):

    user = user.strip().lower()

    conn = sqlite3.connect("practice.db")
    cur = conn.cursor()

    # FRIEND
    cur.execute("SELECT friend FROM friends WHERE user=?", (user,))
    f = cur.fetchone()
    friend = f[0] if f else None

    # MY DATA
    cur.execute("""
    SELECT company, round, score, status
    FROM practice_results
    WHERE lower(trim(username))=?
    ORDER BY id DESC
    LIMIT 10
    """,(user,))
    my = cur.fetchall()

    # FRIEND DATA
    fr = []
    if friend:
        friend = friend.strip().lower()

        cur.execute("""
        SELECT company, round, score, status
        FROM practice_results
        WHERE lower(trim(username))=?
        ORDER BY id DESC
        LIMIT 10
        """,(friend,))
        fr = cur.fetchall()

    # BADGES
    cur.execute("SELECT badge FROM achievements WHERE lower(trim(username))=?", (user,))
    my_badges = cur.fetchall()

    fr_badges = []
    if friend:
        cur.execute("SELECT badge FROM achievements WHERE lower(trim(username))=?", (friend,))
        fr_badges = cur.fetchall()

    conn.close()

    return {
        "user_name": user,
        "friend_name": friend,
        "me": my,
        "friend": fr,
        "my_badges": my_badges,
        "friend_badges": fr_badges
    }
#unbind
@app.post("/api/remove-friend")
async def remove_friend(request: Request):

    data = await request.json()
    user = data.get("user")

    conn = sqlite3.connect("practice.db")
    cur = conn.cursor()

    cur.execute("DELETE FROM friends WHERE user=?", (user,))

    conn.commit()
    conn.close()

    return {"success": True, "msg": "Friend removed"}



#----------------------------for coding------------------------------------
#ai qna generation
from groq import Groq
import json, re, time


def generate_coding_questions(company):

    all_q = []

    for _ in range(10):  # 10 × 10 = 100

        prompt = f"""
        Generate 10 tricky coding MCQs for {company}.

        Types:
        - Output of code
        - Find error
        - Debugging

        STRICT JSON:
        [
          {{
            "q":"question",
            "options":["opt1","opt2","opt3","opt4"],
            "ans":"A"
          }}
        ]
        """

        try:
            res = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role":"user","content":prompt}]
            )

            raw = res.choices[0].message.content

            match = re.search(r"\[.*\]", raw, re.S)
            if not match:
                continue

            data = json.loads(match.group())

            for q in data:

                # convert A→actual
                ans_map = {
                    "A": q["options"][0],
                    "B": q["options"][1],
                    "C": q["options"][2],
                    "D": q["options"][3]
                }

                q["ans"] = ans_map.get(q["ans"], q["options"][0])

                all_q.append(q)

            time.sleep(1)

        except Exception as e:
            print("AI FAIL:", e)

    return all_q


#store qna
def store_coding_questions(company, data):

    conn = sqlite3.connect("practice.db")
    cur = conn.cursor()

    for q in data:
        try:
            cur.execute("""
            INSERT OR IGNORE INTO coding_questions
            (company,question,o1,o2,o3,o4,ans)
            VALUES(?,?,?,?,?,?,?)
            """,(
                company,
                q["q"],
                q["options"][0],
                q["options"][1],
                q["options"][2],
                q["options"][3],
                q["ans"]
            ))
        except:
            continue

    conn.commit()
    conn.close()


#get 20 qna 
@app.get("/api/coding-questions/{company}")
def get_coding_questions(company: str):

    conn = sqlite3.connect("practice.db")
    cur = conn.cursor()

    cur.execute("SELECT COUNT(*) FROM coding_questions WHERE company=?", (company,))
    count = cur.fetchone()[0]

    if count < 100:
        data = generate_coding_questions(company)
        store_coding_questions(company, data)

    cur.execute("""
    SELECT DISTINCT question,o1,o2,o3,o4,ans
    FROM coding_questions
    WHERE company=?
    ORDER BY RANDOM()
    LIMIT 20
    """,(company,))

    rows = cur.fetchall()
    conn.close()

    return [
        {
            "q": r[0],
            "options":[r[1],r[2],r[3],r[4]],
            "ans": r[5]
        }
        for r in rows
    ]


#ai suggestions
@app.post("/api/coding-suggestions")
async def coding_suggestions(request: Request):

    data = await request.json()

    score = data.get("score")
    company = data.get("company")
    timeout = data.get("timeout")

    prompt = f"""
    Student attempted {company} coding round.

    Score: {score}/20
    Timeout: {timeout}

    Give:
    - Weak coding areas
    - Debugging tips
    - Improvement steps

    Make response different each time.
    """

    res = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role":"user","content":prompt}]
    )

    return {"msg": res.choices[0].message.content}


#----------------------------hr system-----------
from fastapi import Request
from fastapi.responses import JSONResponse
import random

# =========================
# HR START
# =========================
@app.post("/api/hr/start")
async def hr_start(request: Request):

    data = await request.json()

    profile = f"""
    Candidate Name: {data.get("name")}
    Skills: {data.get("skills")}
    Languages: {data.get("languages")}
    Goals: {data.get("goals")}
    Projects: {data.get("projects")}
    """

    system_prompt = f"""
    You are a senior software engineer conducting a real interview.

    Candidate Profile:
    {profile}

    Rules:
    - Ask one question at a time
    - Ask based on profile
    - Ask follow-ups
    - Be realistic and slightly strict
    - Do not give answers
    """

    session = [
        {"role":"system","content":system_prompt}
    ]

    first_q = "Tell me about yourself."

    session.append({"role":"assistant","content":first_q})

    return {"question": first_q, "session": session}

#---------------------next question -----------------


@app.post("/api/hr/next")
async def hr_next(request: Request):

    data = await request.json()

    answer = data["answer"]
    session = data["session"]
    count = data["count"]
    user = data["user"]
    company = data["company"]

    session.append({"role": "user", "content": answer})

    # 🔥 STEP 1: EVALUATE ANSWER (STRICT)
    eval_prompt = f"""
    Evaluate this answer:

    "{answer}"

    Return STRICT JSON:
    {{
      "communication": x,
      "technical": x,
      "confidence": x
    }}

    Rules:
    - If rude → reduce all scores
    - If clear explanation → high communication
    - If correct logic → high technical
    """

    try:
        res_eval = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": eval_prompt}]
        )

        import json, re
        match = re.search(r"\{.*\}", res_eval.choices[0].message.content, re.S)
        scores = json.loads(match.group())

    except:
        scores = {
            "communication": 5,
            "technical": 5,
            "confidence": 5
        }

    # 🔥 CALCULATE PROBABILITY (SMART)
    probability = int(
        (scores["communication"] +
         scores["technical"] +
         scores["confidence"]) * 3.3
    )

    probability = max(10, min(95, probability))

    # 🔥 FINAL RESULT AFTER 8 QUESTIONS
    if count >= 8:

        final_prompt = """
        Based on full interview:

        Give:
        - Selected or Rejected
        - Reason
        - Suggestions
        """

        res_final = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=session + [{"role": "user", "content": final_prompt}]
        )

        result = res_final.choices[0].message.content

        #status = "pass" if "selected" in result.lower() else "fail"
        res_text = result.lower()

        if "not selected" in res_text or "rejected" in res_text:
            status = "fail"
        elif "selected" in res_text:
            status = "pass"
        else:
            status = "fail"

        conn = sqlite3.connect("practice.db")
        cur = conn.cursor()

        cur.execute("""
        INSERT INTO practice_results(username,company,round,score,status)
        VALUES(?,?,?,?,?)
        """,(user, company, "HR", probability, status))

        conn.commit()
        conn.close()

        return {
            "done": True,
            "result": result,
            "scores": scores,
            "probability": probability,
            "status": status
        }

    # 🔥 CONTROL QUESTION FLOW
    if count == 1:
        next_prompt = "Ask: Tell me about yourself."

    elif count <= 3:
        next_prompt = "Ask about projects (max 2 questions)."

    elif count <= 6:
        next_prompt = "Ask deep coding + DSA + debugging questions."

    else:
        next_prompt = "Ask situational + problem solving questions."

    system_prompt = f"""
    You are a strict senior interviewer.

    {next_prompt}

    Rules:
    - Ask ONE question
    - Do NOT repeat
    - Challenge weak answers
    """

    res = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=session + [{"role": "system", "content": system_prompt}]
    )

    reply = res.choices[0].message.content

    session.append({"role": "assistant", "content": reply})

    return {
        "reply": reply,
        "session": session,
        "probability": probability,
        "scores": scores,
        "done": False
    }
#---------------------------------final eval-------------
@app.post("/api/hr/evaluate")
async def hr_evaluate(request: Request):

    data = await request.json()
    session = data["session"]

    prompt = """
    Evaluate this interview.

    Give:
    - Communication (10)
    - Technical (10)
    - Confidence (10)
    - Final Result (Selected/Rejected)
    - Suggestions
    """

    res = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=session + [{"role":"user","content":prompt}]
    )

    return {"result": res.choices[0].message.content}

#----------------------------------------------------ai buzzer------------------------------------------
from fastapi import WebSocket, WebSocketDisconnect
from groq import Groq
import json, re, sqlite3


matches = {}

def generate_buzzquestions():
    prompt = """
    Generate 20 MCQ coding questions.

    STRICT JSON:
    [
      {
        "q":"question",
        "options":["opt1","opt2","opt3","opt4"],
        "ans":"opt1"
      }
    ]
    """
    try:
        res = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role":"user","content":prompt}]
        )

        raw = res.choices[0].message.content
        match = re.search(r"\[.*\]", raw, re.S)
        data = json.loads(match.group())
        return data[:20]

    except:
        return [
            {"q":"2+2=?", "options":["1","2","3","4"], "ans":"4"}
        ] * 20


@app.get("/api/start-match/{user}")
def start_match(user: str):

    conn = sqlite3.connect("practice.db")
    cur = conn.cursor()

    cur.execute("SELECT friend FROM friends WHERE user=?", (user,))
    row = cur.fetchone()

    if not row:
        return {"error": "No friend connected"}

    friend = row[0]

    questions = generate_buzzquestions()
    match_id = "_".join(sorted([user, friend]))

    matches[match_id] = {
        "players": [],
        "questions": questions,
        "index": 0,
        "buzzed": None,
        "scores": {user:0, friend:0}
    }

    return {"match_id": match_id, "friend": friend}

#websocket-------------------------------------------------------------------------------------------------------------------
from fastapi import WebSocket, WebSocketDisconnect
import asyncio

matches = {}

@app.websocket("/ws/buzzer/{match_id}")
async def buzzer_ws(websocket: WebSocket, match_id: str):

    await websocket.accept()

    match = matches.get(match_id)
    if not match:
        await websocket.close()
        return

    match["players"].append(websocket)

    try:
        while True:
            data = await websocket.receive_json()

            # JOIN
            if data["type"] == "join":
                q = match["questions"][match["index"]]
                await websocket.send_json({
                    "type":"question",
                    "q":q,
                    "scores":match["scores"]
                })

            # BUZZ
            elif data["type"] == "buzz":
                if match["buzzed"] is None:
                    match["buzzed"] = data["user"]

                    for ws in match["players"]:
                        await ws.send_json({
                            "type":"buzz",
                            "winner":data["user"]
                        })

            # ANSWER
            elif data["type"] == "answer":

                user = data["user"]
                ans_index = data["ans"]

                q = match["questions"][match["index"]]

                try:
                    correct_index = q["options"].index(q["ans"])
                except:
                    correct_index = 0

                correct = (ans_index == correct_index)

                if correct:
                    match["scores"][user] += 1

                match["buzzed"] = None
                match["index"] += 1

                # SEND RESULT FIRST
                for ws in match["players"]:
                    await ws.send_json({
                        "type":"result",
                        "user":user,
                        "correct":correct,
                        "correct_index":correct_index,
                        "scores":match["scores"]
                    })

                # 🔥 WAIT 1 SECOND (FIX)
                await asyncio.sleep(1)

                # END CHECK
                winner = None
                for u,s in match["scores"].items():
                    if s >= 8:
                        winner = u

                if winner or match["index"] >= len(match["questions"]):
                    for ws in match["players"]:
                        await ws.send_json({
                            "type":"end",
                            "scores":match["scores"],
                            "winner":winner
                        })
                    continue

                # NEXT QUESTION
                next_q = match["questions"][match["index"]]

                for ws in match["players"]:
                    await ws.send_json({
                        "type":"question",
                        "q":next_q,
                        "scores":match["scores"]
                    })

            # CHAT
            elif data["type"] == "chat":
                for ws in match["players"]:
                    await ws.send_json({
                        "type":"chat",
                        "user":data["user"],
                        "msg":data["msg"]
                    })

    except WebSocketDisconnect:
        match["players"].remove(websocket)

    #save battle
@app.post("/api/save-battle")
async def save_battle(request: Request):

    data = await request.json()

    conn = sqlite3.connect("practice.db")
    cur = conn.cursor()

    cur.execute("""
    CREATE TABLE IF NOT EXISTS battle_results(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user TEXT,
        winner TEXT
    )
    """)

    cur.execute("""
    INSERT INTO battle_results(user,winner)
    VALUES(?,?)
    """,(data["user"], data["winner"]))

    conn.commit()
    conn.close()

    return {"msg":"saved"}
    