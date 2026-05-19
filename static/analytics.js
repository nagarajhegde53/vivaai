async function loadAnalytics(){

  const user = JSON.parse(localStorage.getItem("user"));

  const res = await fetch("/api/analytics");
  const data = await res.json();

  if(!data.success) return;

  const list = data.users;

  list.sort((a,b)=>b.avg - a.avg);

  const table = document.getElementById("tableBody");

  list.forEach((u,i)=>{

    let trendClass = "same";
    if(u.trend === "↑") trendClass = "up";
    if(u.trend === "↓") trendClass = "down";

    const tr = document.createElement("tr");

    if(u.id === user.userid){
      tr.classList.add("me"); // 🔥 highlight current user
    }

    tr.innerHTML = `
      <td>${i+1}</td>
      <td>${u.username}</td>
      <td>${u.avg.toFixed(2)}</td>
      <td>${u.last}</td>
      <td>${u.prev}</td>
      <td class="${trendClass}">${u.trend}</td>
    `;

    table.appendChild(tr);
  });

  /* TOPPER */
  document.getElementById("topper").innerText =
    list[0]?.username || "--";

  /* TOP SCORE */
  document.getElementById("topScore").innerText =
    data.top_score ?? "--";

  /* TOP 3 */
  const top3 = document.getElementById("top3");

  list.slice(0,3).forEach((u,i)=>{

    const div = document.createElement("div");

    let cls = "top3-card";
    if(i===0) cls += " gold";
    if(i===1) cls += " silver";
    if(i===2) cls += " bronze";

    div.className = cls;

    div.innerHTML = `
      <h3>#${i+1}</h3>
      <p>${u.username}</p>
      <p>${u.avg.toFixed(2)}</p>
    `;

    top3.appendChild(div);
  });
}

loadAnalytics();

function goDashboard(){
  window.location.href="/dashboard";
}