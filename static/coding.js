let questions = [];
let index = 0;
let score = 0;
let time = 300;
let timer;
let paused = false;

const company = localStorage.getItem("company");

document.getElementById("company").innerText =
  company + " Coding Round";

/* LOAD QUESTIONS */
async function loadQuestions(){

  const res = await fetch(`/api/coding-questions/${company}`);
  questions = await res.json();

  loadQuestion();
  startTimer();
}

/* LOAD QUESTION */
function loadQuestion(){

  if(index >= 20){
    finish(false);
    return;
  }

  const q = questions[index];

  document.getElementById("question").innerText = q.q;

  const opts = document.querySelectorAll(".opt");

  opts.forEach((o,i)=>{
    o.innerText = q.options[i];
  });
}

/* SELECT */
function selectOption(el){

  if(paused) return;

  const q = questions[index];

  if(el.innerText.trim() === q.ans.trim()){
    score++;
  }

  index++;
  loadQuestion();
}

/* SKIP */
function skip(){
  if(paused) return;
  index++;
  loadQuestion();
}

/* TIMER */
function startTimer(){

  timer = setInterval(()=>{

    if(paused) return;

    time--;

    let m = Math.floor(time/60);
    let s = time%60;

    document.getElementById("timer").innerText =
      `${m}:${s<10?"0"+s:s}`;

    if(time <= 0){
      finish(true);
    }

  },1000);
}

/* PAUSE / RESUME */
function togglePause(){

  paused = !paused;

  const btn = document.querySelector(".pause");

  if(paused){
    btn.innerText = "▶ Resume";
  }else{
    btn.innerText = "⏸ Pause";
  }
}

/* FINISH */
async function finish(timeout){

  clearInterval(timer);
  paused = true;

  await fetch("/api/save-result",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      username: localStorage.getItem("practiceUser"),
      company: company,
      round: "Coding",
      score: score,
      status: score >= 13 ? "pass" : "fail"
    })
  });

  document.getElementById("resultOverlay").style.display="flex";
  document.getElementById("mainContent").classList.add("blur");

  const resultText = document.getElementById("resultText");
  const analysis = document.getElementById("analysis");
  const btn = document.getElementById("nextBtn");

  if(timeout){
    resultText.innerText = "⏰ Time Exceeded";
    analysis.innerText = `Score: ${score}/20`;
  }else{
    resultText.innerText = `Score: ${score}/20`;
  }

  /* PASS */
  if(score >= 13){

    analysis.innerText += "\n\nYou cleared coding round 🎉";

    btn.innerText = "Go to HR";

    btn.onclick = ()=>{
      window.location.href="/hr";
    };

  }

  /* FAIL */
  else{

    analysis.innerText += "\n\nAnalyzing performance...";

    try{

      const res = await fetch("/api/coding-suggestions",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          score: score,
          company: company,
          timeout: timeout
        })
      });

      const data = await res.json();

      analysis.innerText += "\n\n" + (data.msg || "Improve coding logic.");

    }catch{
      analysis.innerText += "\n\nPractice more coding problems.";
    }

    btn.innerText = "Retry";

    btn.onclick = ()=>{
      location.reload();
    };
  }
}

/* NAVIGATION */
function goBack(){
  window.location.href="/aptitude";
}

function goPractice(){
  window.location.href="/practice";
}

/* START */
loadQuestions();