window.onload = () => {

  const user = localStorage.getItem("practiceUser");

  if(user){
    showWelcome(user);
    document.getElementById("overlay").style.display = "none";
  }else{
    blurOn();
  }
};

async function login(){

  const name = document.getElementById("loginName").value;

  const res = await fetch("/api/login",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({name})
  });

  const data = await res.json();

  if(!data.success){
    showError(data.msg);
    return;
  }

  localStorage.setItem("practiceUser", name);

  blurOff();
  document.getElementById("overlay").style.display = "none";

  showWelcome(name);
}

async function register(){

  const name = document.getElementById("registerName").value;

  const res = await fetch("/api/register",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({name})
  });

  const data = await res.json();

  if(!data.success){
    showError(data.msg);
    return;
  }

  showError("Registered! Now login");
}

function showRegister(){
  document.querySelector(".loginForm").style.display="none";
  document.querySelector(".registerForm").style.display="block";
}

function showLogin(){
  document.querySelector(".loginForm").style.display="block";
  document.querySelector(".registerForm").style.display="none";
}

function showWelcome(name){
  document.getElementById("welcome").innerText = "Welcome " + name;
}

function showError(msg){
  document.getElementById("error").innerText = msg;
}

function blurOn(){
  document.getElementById("mainContent").classList.add("blur");
}

function blurOff(){
  document.getElementById("mainContent").classList.remove("blur");
}

function logout(){
  localStorage.removeItem("practiceUser");

  const url = new URL(window.location.href);
  url.port = "8000";
  url.pathname = "/dashboard";
  window.location.href = url.toString();
}

function goDashboard(){
  const url = new URL(window.location.href);
  url.port = "8000";
  url.pathname = "/dashboard";
  window.location.href = url.toString();
}

function goSimulator(){
  window.location.href = "/simulator";
}

function gobuzzer(){
  window.location.href = "/buzzer";
}

function goFriend(){
  window.location.href = "/friend";
}




//select company
let selectedCompany = "";

/* OPEN POPUP */
function goSimulator(){
  document.getElementById("companyOverlay").style.display = "flex";
  blurOn();
}

/* CLOSE ON OUTSIDE CLICK */
function closeCompanyPopup(e){
  if(e.target.id === "companyOverlay"){
    document.getElementById("companyOverlay").style.display = "none";
    blurOff();
  }
}

/* SELECT COMPANY */
function selectCompany(name, el){

  selectedCompany = name;

  document.querySelectorAll(".company").forEach(c=>{
    c.classList.remove("active");
  });

  el.classList.add("active");
}

/* START INTERVIEW */
function startInterview(){

  if(!selectedCompany){
    alert("Please select a company");
    return;
  }

  localStorage.setItem("company", selectedCompany);

  document.getElementById("companyOverlay").style.display = "none";
  blurOff();

  // 🔥 CORRECT REDIRECT
  window.location.href = "/aptitude";
}