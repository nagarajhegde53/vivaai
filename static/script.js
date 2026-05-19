const landing = document.getElementById("landing");
const main = document.getElementById("main");
const wrapper = document.getElementById("wrapper");

const startBtn = document.getElementById("startBtn");

const toRegister = document.getElementById("toRegister");
const toLogin = document.getElementById("toLogin");

const loginError = document.getElementById("loginError");
const registerError = document.getElementById("registerError");

const sirOption = document.getElementById("sirOption");

const sirModal = document.getElementById("sirModal");
const closeSirModal = document.getElementById("closeSirModal");

const sirError = document.getElementById("sirError");

/* OPEN STUDENT LOGIN */

startBtn.onclick = () => {

  landing.style.opacity = "0";

  setTimeout(() => {

    landing.style.display = "none";

    main.style.display = "block";

    main.classList.add("open");

    wrapper.classList.add("show-login");

  }, 300);

};

/* OPEN SIR MODAL */

sirOption.onclick = () => {

  sirModal.classList.add("active");

};

/* CLOSE MODAL */

closeSirModal.onclick = () => {

  sirModal.classList.remove("active");

  sirError.innerText = "";

};

/* SWITCH LOGIN/REGISTER */

toRegister.onclick = () => {

  loginError.innerText = "";

  wrapper.classList.remove("show-login");

  wrapper.classList.add("show-register");

};

toLogin.onclick = () => {

  registerError.innerText = "";

  wrapper.classList.remove("show-register");

  wrapper.classList.add("show-login");

};

/* REGISTER */

document.getElementById("registerBtn").onclick = async () => {

  const username =
    document.getElementById("regUser").value.trim();

  const password =
    document.getElementById("regPass").value.trim();

  registerError.innerText = "";

  if(!username || !password){

    registerError.innerText = "All fields required";

    return;

  }

  const res = await fetch("/api/register", {

    method:"POST",

    headers:{
      "Content-Type":"application/json"
    },

    body:JSON.stringify({
      username,
      password
    })

  });

  const data = await res.json();

  if(data.success){

    registerError.style.color = "lightgreen";

    registerError.innerText =
      "Registered successfully";

    setTimeout(() => {

      wrapper.classList.remove("show-register");

      wrapper.classList.add("show-login");

    }, 800);

  }else{

    registerError.innerText = data.message;

  }

};

/* STUDENT LOGIN */

document.getElementById("loginBtn").onclick = async () => {

  const username =
    document.getElementById("loginUser").value.trim();

  const password =
    document.getElementById("loginPass").value.trim();

  loginError.innerText = "";

  if(!username || !password){

    loginError.innerText = "All fields required";

    return;

  }

  const res = await fetch("/api/login", {

    method:"POST",

    headers:{
      "Content-Type":"application/json"
    },

    body:JSON.stringify({
      username,
      password
    })

  });

  const data = await res.json();

  if(data.success){

    loginError.style.color = "lightgreen";

    loginError.innerText = "Login successful";

    localStorage.setItem(
      "user",
      JSON.stringify(data)
    );

    setTimeout(() => {

      window.location.href = "/dashboard";

    }, 800);

  }else{

    loginError.innerText = data.message;

  }

};

/* SIR LOGIN */

document.getElementById("sirLoginBtn").onclick = async () => {

  const username =
    document.getElementById("sirUser").value.trim();

  const password =
    document.getElementById("sirPass").value.trim();

  sirError.innerText = "";

  if(!username || !password){

    sirError.innerText = "All fields required";

    return;

  }

  const res = await fetch("/api/sir-auth", {

    method:"POST",

    headers:{
      "Content-Type":"application/json"
    },

    body:JSON.stringify({
      username,
      password
    })

  });

  const data = await res.json();

  if(data.success){

    sirError.style.color = "lightgreen";

    sirError.innerText =
      "Access Granted";

    localStorage.setItem(
      "sir",
      JSON.stringify(data)
    );

    setTimeout(() => {

      window.location.href =
        "/sir-dashboard";

    }, 800);

  }else{

    sirError.innerText = data.message;

  }

};