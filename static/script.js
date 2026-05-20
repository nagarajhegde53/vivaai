/* =========================
   ELEMENTS
========================= */

const landing =
document.getElementById(
  "landing"
);

const main =
document.getElementById(
  "main"
);

const wrapper =
document.getElementById(
  "wrapper"
);

const startBtn =
document.getElementById(
  "startBtn"
);

const toRegister =
document.getElementById(
  "toRegister"
);

const toLogin =
document.getElementById(
  "toLogin"
);

const loginError =
document.getElementById(
  "loginError"
);

const registerError =
document.getElementById(
  "registerError"
);

const sirOption =
document.getElementById(
  "sirOption"
);

const sirModal =
document.getElementById(
  "sirModal"
);

const closeSirModal =
document.getElementById(
  "closeSirModal"
);

const sirError =
document.getElementById(
  "sirError"
);


/* =========================
   OPEN STUDENT LOGIN
========================= */

startBtn.onclick = () => {

  landing.style.opacity =
  "0";

  setTimeout(() => {

    landing.style.display =
    "none";

    main.style.display =
    "block";

    main.classList.add(
      "open"
    );

    wrapper.classList.add(
      "show-login"
    );

  }, 300);

};


/* =========================
   OPEN SIR MODAL
========================= */

sirOption.onclick = () => {

  sirModal.classList.add(
    "active"
  );

};


/* =========================
   CLOSE MODAL
========================= */

closeSirModal.onclick = () => {

  sirModal.classList.remove(
    "active"
  );

  sirError.innerText =
  "";

};


/* =========================
   SWITCH LOGIN/REGISTER
========================= */

toRegister.onclick = () => {

  loginError.innerText =
  "";

  wrapper.classList.remove(
    "show-login"
  );

  wrapper.classList.add(
    "show-register"
  );

};

toLogin.onclick = () => {

  registerError.innerText =
  "";

  wrapper.classList.remove(
    "show-register"
  );

  wrapper.classList.add(
    "show-login"
  );

};


/* =========================
   REGISTER
========================= */

document.getElementById(
  "registerBtn"
).onclick = async () => {

  try{

    const username =
    document.getElementById(
      "regUser"
    ).value.trim();

    const password =
    document.getElementById(
      "regPass"
    ).value.trim();

    registerError.style.color =
    "#ff4d4d";

    registerError.innerText =
    "";

    if(
      !username ||
      !password
    ){

      registerError.innerText =
      "All fields required";

      return;

    }

    const res =
    await fetch(
      "/api/register",
      {

        method:"POST",

        headers:{
          "Content-Type":
          "application/json"
        },

        body:JSON.stringify({

          username,
          password

        })

      }
    );

    const data =
    await res.json();

    console.log(
      "REGISTER:",
      data
    );

    if(data.success){

      registerError.style.color =
      "lightgreen";

      registerError.innerText =
      "Registered successfully";

      setTimeout(() => {

        wrapper.classList.remove(
          "show-register"
        );

        wrapper.classList.add(
          "show-login"
        );

      }, 800);

    }

    else{

      registerError.innerText =

      data.message ||

      "Registration failed";

    }

  }catch(err){

    console.log(
      "Register Error",
      err
    );

    registerError.innerText =
    "Server error";

  }

};


/* =========================
   STUDENT LOGIN
========================= */

document.getElementById(
  "loginBtn"
).onclick = async () => {

  try{

    const username =
    document.getElementById(
      "loginUser"
    ).value.trim();

    const password =
    document.getElementById(
      "loginPass"
    ).value.trim();

    loginError.style.color =
    "#ff4d4d";

    loginError.innerText =
    "";

    if(
      !username ||
      !password
    ){

      loginError.innerText =
      "All fields required";

      return;

    }

    const res =
    await fetch(
      "/api/login",
      {

        method:"POST",

        headers:{
          "Content-Type":
          "application/json"
        },

        body:JSON.stringify({

          username,
          password

        })

      }
    );

    const data =
    await res.json();

    console.log(
      "STUDENT LOGIN:",
      data
    );

    if(data.success){

      loginError.style.color =
      "lightgreen";

      loginError.innerText =
      "Login successful";

      // CLEAR OLD SESSION

      localStorage.removeItem(
        "sir"
      );

      // STORE USER

      localStorage.setItem(

        "user",

        JSON.stringify(data)

      );

      setTimeout(() => {

        window.location.href =
        "/dashboard";

      }, 800);

    }

    else{

      loginError.innerText =

      data.message ||

      "Invalid credentials";

    }

  }catch(err){

    console.log(
      "Student Login Error",
      err
    );

    loginError.innerText =
    "Server error";

  }

};


/* =========================
   SIR LOGIN
========================= */

document.getElementById(
  "sirLoginBtn"
).onclick = async () => {

  try{

    const username =
    document.getElementById(
      "sirUser"
    ).value.trim();

    const password =
    document.getElementById(
      "sirPass"
    ).value.trim();

    sirError.style.color =
    "#ff4d4d";

    sirError.innerText =
    "";

    if(
      !username ||
      !password
    ){

      sirError.innerText =
      "All fields required";

      return;

    }

    const res =
    await fetch(
      "/api/sir-auth",
      {

        method:"POST",

        headers:{
          "Content-Type":
          "application/json"
        },

        body:JSON.stringify({

          username,
          password

        })

      }
    );

    const data =
    await res.json();

    console.log(
      "SIR LOGIN:",
      data
    );

    if(data.success){

      sirError.style.color =
      "lightgreen";

      sirError.innerText =
      "Access Granted";

      // CLEAR OLD SESSION

      localStorage.removeItem(
        "user"
      );

      // STORE SIR

      localStorage.setItem(

        "sir",

        JSON.stringify(data)

      );

      setTimeout(() => {

        window.location.href =
        "/sir-dashboard";

      }, 800);

    }

    else{

      sirError.innerText =

      data.message ||

      "Invalid sir credentials";

    }

  }catch(err){

    console.log(
      "Sir Login Error",
      err
    );

    sirError.innerText =
    "Server error";

  }

};