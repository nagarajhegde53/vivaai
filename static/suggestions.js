async function load(){

  const user = JSON.parse(localStorage.getItem("user"));

  /* 🔥 COMPARE */
  const res = await fetch("/api/compare",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({user_id:user.userid})
  });

  const data = await res.json();

  document.getElementById("topName").innerText = data.topper_name;
  document.getElementById("topScore").innerText = data.topper_score;
  document.getElementById("myScore").innerText = data.my_score;

  if(data.topper_id === user.userid){
    document.getElementById("title").innerText =
      "Congrats! You are the Topper 🎉";
  }

  /* 🔥 GRAPH (YOU VS TOPPER) */
  const h = await fetch("/api/history",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({user_id:user.userid})
  });

  const hist = await h.json();

  const maxLen = Math.max(hist.my_scores.length, hist.top_scores.length);

  const labels = [];
  for(let i=0;i<maxLen;i++){
    labels.push("Attempt "+(i+1));
  }

  new Chart(document.getElementById("lineChart"),{
    type:"line",
    data:{
      labels: labels,
      datasets:[
        {
          label:"You",
          data: hist.my_scores,
          borderColor:"#4fc3f7",
          tension:0.4
        },
        {
          label:"Topper",
          data: hist.top_scores,
          borderColor:"gold",
          tension:0.4
        }
      ]
    }
  });

  /* 🔥 SKILLS */
  setCircle("m_problem", data.my_skills.problem);
  setCircle("m_critical", data.my_skills.critical);
  setCircle("m_comm", data.my_skills.communication);
  setCircle("m_creative", data.my_skills.creativity);

  setCircle("t_problem", data.topper_skills.problem);
  setCircle("t_critical", data.topper_skills.critical);
  setCircle("t_comm", data.topper_skills.communication);
  setCircle("t_creative", data.topper_skills.creativity);

  /* 🔥 ROADMAP FIX */
  let qa = JSON.parse(localStorage.getItem("qaList") || "[]");

  const ul = document.getElementById("roadmap");
  ul.innerHTML = "";

  if(qa.length === 0){
    const li = document.createElement("li");
    li.innerText = "No viva data found. Please attempt viva first.";
    ul.appendChild(li);
  } else {

    const r = await fetch("/api/roadmap",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({qa_list:qa})
    });

    const roadmap = await r.json();

    roadmap.roadmap.forEach(item=>{
      const li = document.createElement("li");
      li.innerText = item;
      ul.appendChild(li);
    });
  }
}

function setCircle(id,val){
  const el = document.getElementById(id);
  el.style.background =
    `conic-gradient(#4fc3f7 ${val*3.6}deg,#ddd 0deg)`;
  el.innerText = val;
}

load();

async function loadRoadmap(){

  const user = JSON.parse(localStorage.getItem("user"));

  const res = await fetch("/api/roadmap",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({user_id:user.userid})
  });

  const data = await res.json();

  const ul = document.getElementById("roadmap");
  ul.innerHTML = "";

  data.roadmap.forEach(item=>{
    const li = document.createElement("li");
    li.innerText = item;
    ul.appendChild(li);
  });
}
loadRoadmap();



function goDashboard(){
  window.location.href="/dashboard";
}