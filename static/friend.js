function goPractice(){
  window.location.href="/practice";
}

function openForm(){
  document.getElementById("overlay").style.display="flex";
}

function closeForm(){
  document.getElementById("overlay").style.display="none";
}

/* ADD FRIEND */
async function addFriend(){

  const user = localStorage.getItem("practiceUser")?.trim().toLowerCase();
  const friend = document.getElementById("friendName").value.trim().toLowerCase();

  const res = await fetch("/api/add-friend",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({user, friend})
  });

  const data = await res.json();

  alert(data.msg);

  if(data.success){
    closeForm();
    loadFriendData();
  }
}

/* REMOVE FRIEND */
async function removeFriend(){

  const user = localStorage.getItem("practiceUser");

  await fetch("/api/remove-friend",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({user})
  });

  loadFriendData();
}

/* LOAD DATA */
async function loadFriendData(){

  const user = localStorage.getItem("practiceUser")?.trim().toLowerCase();

  if(!user){
    document.getElementById("myData").innerHTML="No user";
    return;
  }

  const res = await fetch(`/api/friend-data/${user}`);
  const data = await res.json();

  // TITLES
  document.getElementById("myTitle").innerText =
    `👤 You (${data.user_name})`;

  document.getElementById("friendTitle").innerText =
    data.friend_name
      ? `👥 Friend (${data.friend_name})`
      : "👥 Friend";

  /* MY DATA */
  let myHTML="";

  if(data.me.length>0){

    data.me.forEach(r=>{

      let flow = "";

      if(r[1]==="Apti" && r[3]==="pass") flow="→ Coding Round";
      if(r[1]==="Coding" && r[3]==="pass") flow="→ HR Round";
      if(r[1]==="HR" && r[3]==="pass") flow="→ Completed";

      myHTML+=`
      <p>
      ${r[0]} (${r[1]}) → ${r[2]} 
      <b style="color:${r[3]=='pass'?'green':'red'}">${r[3]}</b>
      ${flow}
      </p>`;
    });

  }else{
    myHTML="<p>No attempts</p>";
  }

  // BADGES
  if(data.my_badges.length>0){
    myHTML+="<h4>🏆 Badges</h4>";
    data.my_badges.forEach(b=>{
      myHTML+=`<p>${b[0]}</p>`;
    });
  }

  document.getElementById("myData").innerHTML=myHTML;

  /* FRIEND DATA */
  let frHTML="";

  if(!data.friend_name){
    frHTML="<p>No friend connected</p>";
  }else{

    frHTML+=`<button onclick="removeFriend()">❌ Unbind</button>`;

    if(data.friend.length>0){

      data.friend.forEach(r=>{

        let flow="";

        if(r[1]==="Apti" && r[3]==="pass") flow="→ Coding";
        if(r[1]==="Coding" && r[3]==="pass") flow="→ HR";
        if(r[1]==="HR" && r[3]==="pass") flow="→ Completed";

        frHTML+=`
        <p>
        ${r[0]} (${r[1]}) → ${r[2]} 
        <b style="color:${r[3]=='pass'?'green':'red'}">${r[3]}</b>
        ${flow}
        </p>`;
      });

    }else{
      frHTML+="<p>No attempts</p>";
    }

    if(data.friend_badges.length>0){
      frHTML+="<h4>🏆 Badges</h4>";
      data.friend_badges.forEach(b=>{
        frHTML+=`<p>${b[0]}</p>`;
      });
    }
  }

  document.getElementById("friendData").innerHTML=frHTML;
}

loadFriendData();