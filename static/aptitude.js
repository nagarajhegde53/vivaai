let questions = [];
let index = 0;
let score = 0;
let paused = false;
let time = 300;
let timerInterval;

// COMPANY
const company = localStorage.getItem("company") || "Practice";
document.getElementById("company").innerText = company + " Aptitude Test";

// LOAD QUESTIONS
async function loadQuestions(){

  try{
    const res = await fetch(`/api/get-questions/${company}`);
    const data = await res.json();

    if(!data || data.length === 0){
      throw new Error("No data");
    }

    questions = data;

  }catch(err){
    console.log("Fallback");

    questions = [
      {q:"2+2=?", options:["1","2","3","4"], ans:"4"}
    ];
  }

  loadQuestion();
  startTimer();
}

// LOAD QUESTION
function loadQuestion(){

  if(index >= 20 || index >= questions.length){
    finish();
    return;
  }

  const q = questions[index];

  document.getElementById("question").innerText = q.q;

  const opts = document.querySelectorAll(".opt");

  opts.forEach((o,i)=>{
    o.innerText = q.options[i] || "";
  });
}

// SELECT
function selectOption(el){

  if(paused) return;

  const q = questions[index];

  if(!q) return;

  // 🔥 FIXED MATCH
  if(el.innerText.trim() === q.ans.trim()){
    score++;
  }

  index++;
  loadQuestion();
}

// SKIP
function skip(){
  if(paused) return;

  index++;
  loadQuestion();
}

// TIMER
function startTimer(){

  timerInterval = setInterval(()=>{

    if(paused) return;

    time--;

    let m = Math.floor(time/60);
    let s = time%60;

    document.getElementById("timer").innerText =
      `${m}:${s<10?"0"+s:s}`;

    // 🔥 TIME UP CONDITION
    if(time <= 0){

      clearInterval(timerInterval);

      finish(true);   // 🔥 pass timeout flag
    }

  },1000);
}
// FINISH
async function finish(isTimeout = false){
  await fetch("/api/save-result",{
  method:"POST",
  headers:{"Content-Type":"application/json"},
  body:JSON.stringify({
    username: localStorage.getItem("practiceUser"),
    company: company,
    round: "Apti",
    score: score,
    status: score >= 15 ? "pass" : "fail"
  })
});


  clearInterval(timerInterval);
  paused = true;

  document.getElementById("resultOverlay").style.display="flex";
  document.body.classList.add("blur");

  // 🔥 TIMEOUT CASE
  if(isTimeout){

    document.getElementById("resultText").innerText =
      "⏰ Time Limit Exceeded";

    document.getElementById("analysis").innerText =
      `You answered ${index} questions.\nScore: ${score}/${index}`;

  }

  // NORMAL CASE
  else{

    document.getElementById("resultText").innerText =
      `Score: ${score}/20`;
  }

  const btn = document.getElementById("nextBtn");

  // 🔥 PASS CASE
  if(score >= 15){

    document.getElementById("analysis").innerText +=
      "\n\nGreat! You are eligible for coding round.";

    btn.innerText = "Go to Coding Round";

    btn.onclick = ()=>{
      window.location.href="/coding";
    };
  }

  // 🔥 FAIL OR TIMEOUT → AI SUGGESTIONS
  else{

    document.getElementById("analysis").innerText +=
      "\n\nAnalyzing performance...";

    try{

      const res = await fetch("/api/suggestions",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          score: score,
          company: company,
          attempted: index,
          timeout: isTimeout
        })
      });

      const data = await res.json();

      document.getElementById("analysis").innerText +=
        "\n\n" + (data.msg || "Improve speed and accuracy.");

    }catch{
      document.getElementById("analysis").innerText +=
        "\n\nImprove speed and practice more.";
    }

    btn.innerText = "Try Again";

    btn.onclick = ()=>{
      location.reload();
    };
  }
}
// BACK
function goPractice(){
  window.location.href="/practice";
}
function togglePause(){
  
  paused = !paused;

  const btn = document.querySelector(".pause");

  if(paused){
    btn.innerText = "▶ Resume";
  }else{
    btn.innerText = "⏸ Pause";
  }
}

// START
loadQuestions();