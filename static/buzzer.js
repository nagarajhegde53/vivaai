let ws;
let myName = localStorage.getItem("practiceUser");

let canAnswer = false;

/* START */
async function start(){

  const res = await fetch(`/api/start-match/${myName}`);
  const d = await res.json();

  const matchId = d.match_id;

  document.getElementById("title").innerText =
    myName + " vs " + d.friend;
const protocol = location.protocol === "https:" ? "wss" : "ws";

ws = new WebSocket(`${protocol}://${location.host}/ws/buzzer/${matchId}`);
  //ws = new WebSocket(`ws://${location.host}/ws/buzzer/${matchId}`);

  ws.onopen = ()=>{
    ws.send(JSON.stringify({type:"join", user:myName}));
  };

  ws.onmessage = (e)=>{

    const data = JSON.parse(e.data);

    // QUESTION
    if(data.type === "question"){
      resetUI();
      showQuestion(data.q);
      updateScore(data.scores);
      canAnswer = false;
      setTurn("Waiting...");
    }

    // BUZZ (TEXT ONLY)
    if(data.type === "buzz"){
      if(data.winner === myName){
        canAnswer = true;
        setTurn("🔥 Your Turn");
      }else{
        setTurn(`${data.winner} Turn`);
      }
    }

    // RESULT (VISIBLE FIX)
    if(data.type === "result"){
      showResult(data);
      updateScore(data.scores);
    }

    // CHAT
    if(data.type === "chat"){
      addChat(data.user + ": " + data.msg);
    }

    // END
    if(data.type === "end"){
      showWinner(data.winner);
    }
  };
}

start();

/* RESET UI */
function resetUI(){
  const opts = document.querySelectorAll(".opt");
  opts.forEach(o=>o.classList.remove("correct","wrong"));
  setTurn("");
}

/* QUESTION */
function showQuestion(q){

  document.getElementById("question").innerText = q.q;

  const box = document.getElementById("options");
  box.innerHTML = "";

  q.options.forEach((opt,i)=>{
    let d = document.createElement("div");
    d.className="opt";
    d.innerText=opt;
    d.onclick=()=>select(i);
    box.appendChild(d);
  });
}

/* ANSWER */
function select(i){
  if(!canAnswer) return;

  ws.send(JSON.stringify({
    type:"answer",
    user:myName,
    ans:i
  }));

  canAnswer=false;
}

/* BUZZ */
function buzz(){
  ws.send(JSON.stringify({type:"buzz", user:myName}));
}

/* RESULT */
function showResult(data){

  const opts = document.querySelectorAll(".opt");

  // highlight correct
  if(opts[data.correct_index]){
    opts[data.correct_index].classList.add("correct");
  }

  if(data.correct){
    setTurn("✅ Correct");
  }else{
    setTurn("❌ Wrong");
  }
}

/* TURN */
function setTurn(txt){
  document.getElementById("turn").innerText = txt;
}

/* SCORE */
function updateScore(scores){

  let html = "";

  for(let k in scores){
    html += `<div class="scoreCard">${k}: ${scores[k]}</div>`;
  }

  document.getElementById("scoreboard").innerHTML = html;
}

/* CHAT */
function sendChat(){

  const msg = document.getElementById("msg").value;

  if(!msg.trim()) return;

  ws.send(JSON.stringify({
    type:"chat",
    user:myName,
    msg:msg
  }));

  document.getElementById("msg").value="";
}

function addChat(msg){

  const box = document.getElementById("chat");

  let div = document.createElement("div");
  div.innerText = msg;

  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

/* WINNER */
function showWinner(winner){

  document.getElementById("winnerOverlay").style.display="flex";

  document.getElementById("winnerText").innerText =
    winner ? winner + " Wins 🏆" : "Draw";
}

/* BACK */
function goBack(){
  window.location.href="/practice";
}