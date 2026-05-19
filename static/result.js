async function loadResult(){

  const user = JSON.parse(localStorage.getItem("user"));

  try{
    const res = await fetch("/api/get-result", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        user_id:user.userid
      })
    });

    const data = await res.json();

    if(data.success){

      document.getElementById("score").innerText =
        data.result.score ?? "--";

      document.getElementById("strong").innerText =
        JSON.parse(data.result.strong_topics || "[]").join(", ") || "--";

      document.getElementById("weak").innerText =
        JSON.parse(data.result.weak_topics || "[]").join(", ") || "--";

      document.getElementById("suggestions").innerText =
        data.result.suggestions || "No suggestions available";

    }

  }catch{
    console.log("Error loading result");
  }
}

loadResult();

/* NAV */
function goDashboard(){
  window.location.href = "/dashboard";
}

function goViva(){
  window.location.href = "/viva";
}