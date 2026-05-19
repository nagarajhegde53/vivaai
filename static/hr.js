let session = [];
let count = 0;
let paused = false;
let recognition = null;
let finalText = "";
let typingInterval = null;

/* NAV */
function goPractice(){
  window.location.href="/practice";
}

/* START INTERVIEW */
async function startInterview(){

  const data = {
    name: name.value,
    skills: skills.value,
    languages: languages.value,
    goals: goals.value,
    projects: projects.value
  };

  const res = await fetch("/api/hr/start",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(data)
  });

  const d = await res.json();

  session = d.session;

  document.getElementById("formBox").style.display="none";
  document.getElementById("chatBox").style.display="block";

  showHR(d.question);
}

/* HR DISPLAY */
function showHR(text){

  if(typingInterval){
    clearInterval(typingInterval);
  }

  const el = document.getElementById("hrSpeech");
  el.innerText = "";

  let i = 0;

  typingInterval = setInterval(()=>{
    el.innerText += text.charAt(i);
    i++;

    if(i >= text.length){
      clearInterval(typingInterval);
    }
  },15);

  speak(text);
  addMsg(text,"hr");
}

/* CHAT */
function addMsg(text,type){

  const div = document.createElement("div");
  div.className = "msg " + type;
  div.innerText = text;

  const chat = document.getElementById("chat");

  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

/* 🎤 START LISTEN */
function startListening(){

  if(paused) return;

  recognition = new webkitSpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;

  finalText = "";

  recognition.onresult = function(e){

    let interim = "";

    for(let i=e.resultIndex;i<e.results.length;i++){

      let t = e.results[i][0].transcript;

      if(e.results[i].isFinal){
        finalText += t + " ";
      }else{
        interim += t;
      }
    }

    document.getElementById("live").innerText =
      finalText + interim;
  };

  recognition.start();
}

/* STOP */
async function stopListening(){

  if(!recognition) return;

  recognition.stop();

  if(!finalText.trim()) return;

  addMsg(finalText,"me");

  count++;

  const res = await fetch("/api/hr/next",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      answer: finalText,
      session: session,
      count: count,
      company: localStorage.getItem("company"),
      user: localStorage.getItem("practiceUser")
    })
  });

  const d = await res.json();

  // FINAL RESULT
  if(d.done){
    showResult(d.result, d.status, d.probability);
    return;
  }

  session = d.session;

  // UPDATE PROBABILITY
  document.getElementById("prob").innerText =
    d.probability + "%";

  // UPDATE SCORES
  document.getElementById("comm").innerText =
    d.scores.communication;

  document.getElementById("tech").innerText =
    d.scores.technical;

  document.getElementById("conf").innerText =
    d.scores.confidence;

  showHR(d.reply);
}

/* SPEAK */
function speak(text){
  const u = new SpeechSynthesisUtterance(text);
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

/* PAUSE */
function togglePause(){
  paused = !paused;
  if(paused && recognition){
    recognition.stop();
  }
}

/* RESULT */
// function showResult(text, status, probability){

//   document.getElementById("resultOverlay").style.display="flex";

//   document.getElementById("resultText").innerText =
//     text +
//     "\n\nStatus: " + status.toUpperCase() +
//     "\nProbability: " + probability + "%";
// }
function showResult(text, status, probability){

  document.getElementById("resultOverlay").style.display="flex";

  document.getElementById("resultText").innerText =
    text +
    "\n\nFinal Status: " + status.toUpperCase() +
    "\nConfidence: " + probability + "%";
}