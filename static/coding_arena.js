/* =========================================
   CODING ARENA - FINAL ADVANCED JS
========================================= */

/* QUESTIONS */
let questions = [];
let index = 0;

/* SCORE */
let solved = 0;
let attempted = 0;
let totalRuns = 0;

/* SESSION */
let solvedCurrent = false;
let topicSelected = "";

/* RESULTS */
let results = [];

/* TIMER */
let timerInt;
let timeLeft = 0;
let paused = false;

/* AI */
let agentPaused = false;
let idleTimer;
let observeTimeout;

/* MONACO */
let editor;

/* VOICE */
let aiVoice = null;
let speechQueue = [];
let speaking = false;

/* MEMORY */
let aiConversationMemory = [];
let recentCodeMemory = [];

/* =========================================
   INIT
========================================= */

document.addEventListener("DOMContentLoaded", ()=>{

  setupVoice();

  initMonaco();

});

/* =========================================
   MONACO
========================================= */

function initMonaco(){

  require.config({
    paths:{
      vs:'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs'
    }
  });

  require(['vs/editor/editor.main'], function(){

    editor = monaco.editor.create(

      document.getElementById("editor"),

      {

        value:
`# Start Coding Here

print("Hello Arena")
`,

        language:"python",

        theme:"vs-dark",

        automaticLayout:true,

        smoothScrolling:true,

        cursorBlinking:"smooth",

        fontSize:16,

        minimap:{
          enabled:true
        },

        padding:{
          top:20
        },

        roundedSelection:true,

        scrollBeyondLastLine:false
      }
    );

    /* ENTER OBSERVE */

    editor.onKeyDown((e)=>{

      if(
        e.keyCode === monaco.KeyCode.Enter
      ){

        observeCurrentContext();
      }
    });

    /* IDLE OBSERVE */

    editor.onDidChangeModelContent(()=>{

      resetIdleTimer();

      clearTimeout(observeTimeout);

      observeTimeout = setTimeout(()=>{

        observeCurrentContext();

      },10000);
    });

  });
}

/* =========================================
   VOICE SETUP
========================================= */

function setupVoice(){

  function loadVoices(){

    const voices =
      speechSynthesis.getVoices();

    aiVoice =

      voices.find(v =>
        v.name.includes(
          "Google UK English Female"
        )
      )

      ||

      voices.find(v =>
        v.name.includes("Microsoft Aria")
      )

      ||

      voices.find(v =>
        v.name.includes("Samantha")
      )

      ||

      voices.find(v =>
        v.name.includes(
          "Google US English"
        )
      )

      ||

      voices[0];
  }

  loadVoices();

  speechSynthesis.onvoiceschanged =
    loadVoices;
}

/* =========================================
   SPEECH QUEUE
========================================= */

function processSpeechQueue(){

  if(speaking) return;

  if(speechQueue.length === 0) return;

  speaking = true;

  const text =
    speechQueue.shift();

  const speech =
    new SpeechSynthesisUtterance(text);

  speech.voice = aiVoice;

  speech.rate = 0.92;

  speech.pitch = 1.03;

  speech.volume = 1;

  speech.lang = "en-US";

  speech.onend = ()=>{

    speaking = false;

    processSpeechQueue();
  };

  speech.onerror = ()=>{

    speaking = false;
  };

  speechSynthesis.speak(speech);
}

/* =========================================
   AI MESSAGE
========================================= */

function ai(msg,speak=true){

  const box =
    document.getElementById(
      "chatMessages"
    );

  const bubble =
    document.createElement("div");

  bubble.className =
    "chat-bubble ai-bubble";

  bubble.innerText = msg;

  box.appendChild(bubble);

  box.scrollTop =
    box.scrollHeight;

  /* VOICE */

  if(speak && !agentPaused){

    speechQueue.push(msg);

    processSpeechQueue();
  }
}

/* =========================================
   USER CHAT
========================================= */

function addUserBubble(msg){

  const box =
    document.getElementById(
      "chatMessages"
    );

  const bubble =
    document.createElement("div");

  bubble.className =
    "chat-bubble user-bubble";

  bubble.innerText = msg;

  box.appendChild(bubble);

  box.scrollTop =
    box.scrollHeight;
}

/* =========================================
   START ARENA
========================================= */

async function startArena(){

  topicSelected =
    document.getElementById(
      "topicSelect"
    ).value;

  showThinking();

  try{

    const res = await fetch(
      `/api/coding-set/${topicSelected}`
    );

    questions = await res.json();

  }catch(e){

    hideThinking();

    alert("Error loading questions");

    return;
  }

  hideThinking();

  /* RESET */

  index = 0;

  solved = 0;

  attempted = 0;

  totalRuns = 0;

  results = [];

  aiConversationMemory = [];

  recentCodeMemory = [];

  updateStats();

  document
    .getElementById("popup")
    .classList.add("hidden");

  document
    .getElementById("main")
    .classList.remove("hidden");

  document
    .getElementById("aiBox")
    .classList.remove("hidden");

  document.getElementById(
    "chatMessages"
  ).innerHTML = "";

  showQuestion();
}

/* =========================================
   SHOW QUESTION
========================================= */

function showQuestion(){

  solvedCurrent = false;

  const q = questions[index];

  results[index] = {

    level:q.level,

    attempted:false,

    correct:false
  };

  document.getElementById(
    "difficultyBadge"
  ).innerText =
    q.level.toUpperCase();

  document.getElementById(
    "questionText"
  ).innerText =
    q.question;

  document.getElementById(
    "inputBox"
  ).innerText =
    q.input;

  document.getElementById(
    "output"
  ).innerText =
    "Waiting for execution...";

  document.getElementById(
    "executionStatus"
  ).innerText =
    "Ready";

  document.getElementById(
    "liveAnalysis"
  ).innerText =
    "AI waiting for your coding approach...";

  editor.setValue(
`# Solve here

`
  );

  monaco.editor.setModelMarkers(

    editor.getModel(),

    "ai",

    []
  );

  startTimer(q.level);

  ai(
`New ${q.level} problem loaded.`,
true
  );

  resetIdleTimer();
}

/* =========================================
   TIMER
========================================= */

function startTimer(level){

  clearInterval(timerInt);

  const map = {

    easy:1200,

    medium:1800,

    hard:2700
  };

  timeLeft = map[level] || 1200;

  paused = false;

  updateTimer();

  timerInt = setInterval(()=>{

    if(!paused){

      timeLeft--;

      updateTimer();

      if(timeLeft <= 0){

        clearInterval(timerInt);

        ai(
"Time finished.",
true
        );

        giveUp();
      }
    }

  },1000);
}

function startResumeTimer(){

  clearInterval(timerInt);

  timerInt = setInterval(()=>{

    if(!paused){

      timeLeft--;

      updateTimer();

      if(timeLeft <= 0){

        clearInterval(timerInt);

        ai(
"Time finished."
        );

        giveUp();
      }
    }

  },1000);
}

function updateTimer(){

  let mins =
    Math.floor(timeLeft/60);

  let secs =
    String(timeLeft%60)
    .padStart(2,"0");

  document.getElementById(
    "timer"
  ).innerText =
    `${mins}:${secs}`;
}

/* =========================================
   PAUSE TIMER
========================================= */

function togglePause(){

  paused = !paused;

  const btn =
    document.getElementById(
      "pauseBtn"
    );

  if(paused){

    clearInterval(timerInt);

    btn.innerText =
      "Resume Timer";

    ai(
"Timer paused.",
false
    );

  }else{

    btn.innerText =
      "Pause Timer";

    startResumeTimer();

    ai(
"Timer resumed.",
false
    );
  }
}

/* =========================================
   PAUSE AGENT
========================================= */

function toggleAgentPause(){

  agentPaused = !agentPaused;

  const btn =
    document.getElementById(
      "agentPauseBtn"
    );

  if(agentPaused){

    btn.innerText =
      "Resume AI";

    speechSynthesis.cancel();

    speechQueue = [];

    speaking = false;

    ai(
"AI mentor paused.",
false
    );

  }else{

    btn.innerText =
      "Pause AI";

    ai(
"AI mentor resumed.",
false
    );
  }
}

/* =========================================
   OBSERVE CONTEXT
========================================= */

async function observeCurrentContext(){

  if(agentPaused) return;

  const model =
    editor.getModel();

  const pos =
    editor.getPosition();

  const line =
    model.getLineContent(
      pos.lineNumber - 1
    );

  if(!line.trim()) return;

  recentCodeMemory.push(line);

  if(recentCodeMemory.length > 20){

    recentCodeMemory.shift();
  }

  /* LOCAL CHECK */

  const localIssue =
    localCodeCheck(line);

  if(localIssue.issue){

    showInlineWarning(

      pos.lineNumber - 1,

      localIssue.msg
    );

    document.getElementById(
      "liveAnalysis"
    ).innerText =
      localIssue.msg;

    ai(localIssue.msg,false);

    return;
  }

  /* AI OBSERVE */

  if(line.length > 15){

    await sendSmartObservation(

      line,

      pos.lineNumber
    );
  }
}

/* =========================================
   LOCAL CHECKS
========================================= */

function localCodeCheck(line){

  line = line.trim();

  /* FOR LOOP */

  if(
    line.startsWith("for") &&
    !line.endsWith(":")
  ){

    return {

      issue:true,

      msg:
      "Your for loop is missing ':'."
    };
  }

  /* IF */

  if(
    line.startsWith("if") &&
    !line.endsWith(":")
  ){

    return {

      issue:true,

      msg:
      "Condition block needs ':'."
    };
  }

  /* WHILE */

  if(
    line.includes("while True")
  ){

    return {

      issue:true,

      msg:
      "This may become an infinite loop."
    };
  }

  /* PRINT */

  if(
    line.startsWith("print") &&
    !line.includes("(")
  ){

    return {

      issue:true,

      msg:
      "print syntax looks incorrect."
    };
  }

  return {

    issue:false
  };
}

/* =========================================
   SMART OBSERVE
========================================= */

async function sendSmartObservation(

  line,

  lineNumber
){

  if(agentPaused) return;

  showThinking();

  try{

    const res = await fetch(

      "/api/smart-observe",

      {

        method:"POST",

        headers:{
          "Content-Type":"application/json"
        },

        body:JSON.stringify({

          line:line,

          lineNumber:lineNumber,

          recentCode:
          recentCodeMemory,

          question:
          questions[index].question
        })
      }
    );

    const data =
      await res.json();

    hideThinking();

    if(data.issue){

      document.getElementById(
        "liveAnalysis"
      ).innerText =
        data.msg;

      showInlineWarning(

        lineNumber,

        data.msg
      );

      ai(data.msg,false);
    }

  }catch(e){

    hideThinking();
  }
}

/* =========================================
   INLINE WARNINGS
========================================= */

function showInlineWarning(

  lineNumber,

  msg
){

  monaco.editor.setModelMarkers(

    editor.getModel(),

    "ai",

    [
      {

        startLineNumber:lineNumber,

        endLineNumber:lineNumber,

        startColumn:1,

        endColumn:100,

        message:msg,

        severity:
        monaco.MarkerSeverity.Warning
      }
    ]
  );
}

/* =========================================
   RUN CODE
========================================= */

async function runCode(){

  const code =
    editor.getValue().trim();

  /* EMPTY */

  if(code.length < 5){

    ai(
"You haven't written enough code yet.",
true
    );

    return;
  }

  totalRuns++;

  updateStats();

  showThinking();

  document.getElementById(
    "executionStatus"
  ).innerText =
    "Running...";

  try{

    const res = await fetch(

      "/api/run-code",

      {

        method:"POST",

        headers:{
          "Content-Type":"application/json"
        },

        body:JSON.stringify({

          code:code,

          input:
          questions[index].input
        })
      }
    );

    const data =
      await res.json();

    hideThinking();

    /* ERROR */

    if(data.error){

      document.getElementById(
        "executionStatus"
      ).innerText =
        "Runtime Error";

      document.getElementById(
        "output"
      ).innerText =
        data.error;

      /* AI ERROR ANALYSIS */

      const explainRes =
        await fetch(

          "/api/analyze-error",

          {

            method:"POST",

            headers:{
              "Content-Type":"application/json"
            },

            body:JSON.stringify({

              code:code,

              error:data.error,

              question:
              questions[index].question
            })
          }
        );

      const explainData =
        await explainRes.json();

      document.getElementById(
        "liveAnalysis"
      ).innerText =
        explainData.msg;

      ai(explainData.msg,true);

      return;
    }

    /* OUTPUT */

    let userOutput =
      (data.output || "")
      .trim()
      .replace(/\s+/g," ");

    let correctOutput =
      (questions[index].output || "")
      .trim()
      .replace(/\s+/g," ");

    document.getElementById(
      "output"
    ).innerText =
      userOutput;

    /* ATTEMPT */

    if(!results[index].attempted){

      attempted++;
    }

    results[index].attempted = true;

    updateStats();

    /* CORRECT */

    if(userOutput === correctOutput){

  solved++;

  solvedCurrent = true;

  results[index].correct = true;

  updateStats();

  document.getElementById(
    "executionStatus"
  ).innerText =
    "Accepted";

  /* CLEAR WARNINGS */

  monaco.editor.setModelMarkers(

    editor.getModel(),

    "ai",

    []
  );

  /* SUCCESS UI */

  document.getElementById(
    "liveAnalysis"
  ).innerText =
    "Correct solution accepted.";

  /* STOP ANNOYING AI ANALYSIS */

  ai(
`Excellent.
Your solution is correct.`,
true
  );

  /* IMPORTANT */

  return;
}

    else{

      solvedCurrent = false;

      results[index].correct = false;

      document.getElementById(
        "executionStatus"
      ).innerText =
        "Wrong Answer";

      /* AI ANALYSIS */

      const wrongRes =
        await fetch(

          "/api/analyze-wrong-answer",

          {

            method:"POST",

            headers:{
              "Content-Type":"application/json"
            },

            body:JSON.stringify({

              code:code,

              expected:correctOutput,

              got:userOutput,

              question:
              questions[index].question
            })
          }
        );

      const wrongData =
        await wrongRes.json();

      document.getElementById(
        "liveAnalysis"
      ).innerText =
        wrongData.msg;

      ai(wrongData.msg,true);
    }

  }catch(e){

    hideThinking();

    document.getElementById(
      "executionStatus"
    ).innerText =
      "Execution Failed";

    ai(
"Execution server failed.",
true
    );
  }

  resetIdleTimer();
}

/* =========================================
   NEXT
========================================= */

function nextQuestion(){

  if(!solvedCurrent){

    ai(
"Try understanding the mistake before skipping.",
true
    );

    return;
  }

  index++;

  if(index >= questions.length){

    finishArena();

    return;
  }

  showQuestion();
}

/* =========================================
   GIVE UP
========================================= */

function giveUp(){

  if(!results[index].attempted){

    attempted++;
  }

  results[index].attempted = true;

  results[index].correct = false;

  updateStats();

  solvedCurrent = true;

  document.getElementById(
    "liveAnalysis"
  ).innerText =
    `Expected output:
${questions[index].output}`;

  ai(
`Correct output is:
${questions[index].output}`,
true
  );

  setTimeout(()=>{

    nextQuestion();

  },2500);
}

/* =========================================
   FINISH
========================================= */

function finishArena(){

  clearInterval(timerInt);

  let total =
    questions.length;

  let msg = "";

  if(solved === total){

    msg =
"Perfect victory. You solved every challenge.";

  }else{

    msg =
`Arena completed.
You solved ${solved} out of ${total}.`;
  }

  ai(msg,true);

  showResultPopup(
    "Arena Finished",
    msg
  );

  saveSession();
}

/* =========================================
   SAVE SESSION
========================================= */

function saveSession(){

  const user =
    JSON.parse(
      localStorage.getItem("user")
    )?.username || "guest";

  results.forEach(r=>{

    if(r && r.attempted){

      fetch("/api/save-session",{

        method:"POST",

        headers:{
          "Content-Type":"application/json"
        },

        body:JSON.stringify({

          user:user,

          topic:topicSelected,

          level:r.level,

          score:r.correct ? 1 : 0
        })
      });

    }
  });

  /* PERFECT WIN */

  if(

    results.length > 0 &&

    results.every(r => r && r.correct)

  ){

    fetch("/api/save-victory",{

      method:"POST",

      headers:{
        "Content-Type":"application/json"
      },

      body:JSON.stringify({

        user:user,

        topic:topicSelected,

        msg:"Completed all coding problems"
      })
    });
  }
}

/* =========================================
   SEND CHAT
========================================= */

async function sendChat(){

  const input =
    document.getElementById(
      "chatInput"
    );

  const msg =
    input.value.trim();

  if(!msg){

    ai(
"Ask something about the coding problem.",
true
    );

    return;
  }

  input.value = "";

  addUserBubble(msg);

  /* MEMORY */

  aiConversationMemory.push({

    role:"user",

    content:msg
  });

  if(aiConversationMemory.length > 20){

    aiConversationMemory.shift();
  }

  showThinking();

  try{

    const res = await fetch(

      "/api/ai-hint",

      {

        method:"POST",

        headers:{
          "Content-Type":"application/json"
        },

        body:JSON.stringify({

          code:
          editor.getValue(),

          question:
          questions[index].question,

          type:msg,

          memory:
          aiConversationMemory
        })
      }
    );

    const data =
      await res.json();

    aiConversationMemory.push({

      role:"assistant",

      content:data.msg
    });

    if(aiConversationMemory.length > 20){

      aiConversationMemory.shift();
    }

    ai(data.msg,true);

  }catch(e){

    ai(
"Connection issue while contacting AI.",
true
    );
  }

  hideThinking();
}

/* =========================================
   IDLE
========================================= */

function resetIdleTimer(){

  clearTimeout(idleTimer);

  idleTimer = setTimeout(()=>{

    if(!agentPaused){

      document.getElementById(
        "liveAnalysis"
      ).innerText =
        "You stopped typing. Try solving step by step.";
    }

  },15000);
}

/* =========================================
   THINKING
========================================= */

function showThinking(){

  document
    .getElementById("thinking")
    .classList.remove("hidden");
}

function hideThinking(){

  document
    .getElementById("thinking")
    .classList.add("hidden");
}

/* =========================================
   RESULT POPUP
========================================= */

function showResultPopup(title,msg){

  document.getElementById(
    "resultTitle"
  ).innerText =
    title;

  document.getElementById(
    "resultMsg"
  ).innerText =
    msg;

  document
    .getElementById(
      "resultOverlay"
    )
    .classList.remove("hidden");
}

/* =========================================
   UPDATE STATS
========================================= */

function updateStats(){

  document.getElementById(
    "solvedCount"
  ).innerText =
    solved;

  document.getElementById(
    "attemptedCount"
  ).innerText =
    attempted;

  document.getElementById(
    "runCount"
  ).innerText =
    totalRuns;
}

/* =========================================
   BACK
========================================= */

function goBack(){

  window.location.href =
    "/dashboard";
}

/* =========================================
   ENTER CHAT
========================================= */

document.addEventListener(

  "keydown",

  (e)=>{

    if(

      e.key === "Enter" &&

      document.activeElement.id ===
      "chatInput"

    ){

      sendChat();
    }
  }
);