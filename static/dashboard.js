const user = JSON.parse(localStorage.getItem("user"));

if(user && user.username){
  document.getElementById("username").innerText = user.username;
}else{
  document.getElementById("username").innerText = "User";
}

/* NAVIGATION */
function go(page){
  if(page === "viva") window.location.href = "/viva";
  if(page === "practice") window.location.href = "/practice";
  if(page === "analytics") window.location.href = "/analytics";
  if(page === "suggestions") window.location.href = "/suggestions";
}

/* LOGOUT */
function logout(){
  localStorage.removeItem("user");
  window.location.href = "/";
}


// //popup
// /* OPEN POPUP */
// function openVivaPopup(){
//   document.getElementById("vivaOverlay").style.display = "flex";
// }

// /* CLOSE POPUP */
// function closeVivaPopup(){
//   document.getElementById("vivaOverlay").style.display = "none";
//   document.getElementById("errorMsg").innerText = "";
// }

/* VERIFY CODE */
// async function verifyViva(){

//   const code = document.getElementById("vivaCode").value;

//   if(!code){
//     document.getElementById("errorMsg").innerText = "Enter code";
//     return;
//   }

//   const res = await fetch("/api/verify-viva",{
//     method:"POST",
//     headers:{"Content-Type":"application/json"},
//     body: JSON.stringify({code})
//   });

//   const data = await res.json();

//   if(data.success){
//     localStorage.setItem("viva_access","true");
//     window.location.href="/viva";
//   }else{
//     document.getElementById("errorMsg").innerText = "❌ Wrong Code";
//   }
// }


function go(page){
  window.location.href = "/" + page;
}

function goProfile(){
  window.location.href = "/profile";
}

function goto(page){
  window.location.href ="/phase2";
}