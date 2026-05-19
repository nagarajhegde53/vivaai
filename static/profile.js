const user = JSON.parse(localStorage.getItem("user"));

async function loadProfile(){

    const res =
    await fetch(`/api/profile/${user.username}`);

    const data = await res.json();

    document.getElementById("username").innerText =
    data.username;

    document.getElementById("avatar").src =
    data.profile_pic + "?t=" + Date.now();

    document.getElementById("attempts").innerText =
    data.attempts;

    document.getElementById("avg").innerText =
    Math.round(data.avg_score * 100) + "%";

    document.getElementById("wins").innerText =
    data.wins;

    buildHistory(data.sessions);

    buildRoadmap(data.progress);

    buildProgress(data.progress);

    buildTopicAnalytics(data.progress);

    buildXP(data.sessions);

    setRank(data.sessions);

    findStrongestTopic(data.progress);

    generateBadges(data.sessions,data.progress);

    generateChallenge();
}

loadProfile();

/* HISTORY */

function buildHistory(sessions){

    const box =
    document.getElementById("sessionList");

    if(!sessions || sessions.length === 0){

        box.innerHTML = `
        <div class="session">
            No coding history yet
        </div>
        `;

        return;
    }

    let html = "";

    sessions.reverse().forEach(s=>{

        const ok = s[2] == 1;

        html += `
        <div class="session ${ok ? "success":"fail"}">

            <div>
                <h3>${s[0]}</h3>
                <p>${s[1]} Level</p>
            </div>

            <strong>
                ${ok ? "✔ Solved":"✘ Wrong"}
            </strong>

        </div>
        `;
    });

    box.innerHTML = html;
}

/* ROADMAP */

function buildRoadmap(progress){

    const topics = [

        "arrays",
        "strings",
        "recursion",
        "backtracking",
        "stack",
        "queue",
        "linkedlist",
        "tree",
        "graph",
        "dp",
        "greedy",
        "slidingwindow",
        "twopointers"
    ];

    let html = "";

    topics.forEach(topic=>{

        const data = progress[topic];

        let cls = "locked";

        let easy = 0;
        let medium = 0;
        let hard = 0;

        if(data){

            easy = data.easy;
            medium = data.medium;
            hard = data.hard;

            const solved =
            easy + medium + hard;

            if(solved >= 6){
                cls = "done";
            }
            else{
                cls = "partial";
            }
        }

        html += `

        <div class="node ${cls}">

            ${topic}

            <div class="tooltip">

                <h4>${topic}</h4>

                <p>Easy: ${easy}</p>

                <p>Medium: ${medium}</p>

                <p>Hard: ${hard}</p>

                <hr>

                <p>Total Solved:
                ${easy + medium + hard}</p>

            </div>

        </div>
        `;
    });

    document.getElementById("roadmap").innerHTML =
    html;
}

/* PROGRESS */

function buildProgress(progress){

    let completed = 0;

    const total = 13;

    for(let t in progress){

        const data = progress[t];

        const solved =
        data.easy +
        data.medium +
        data.hard;

        if(solved >= 6){
            completed++;
        }
    }

    const percent =
    Math.round((completed / total) * 100);

    document.getElementById("progressBar").style.width =
    percent + "%";

    document.getElementById("progressText").innerText =
    percent + "%";
}

/* TOPIC ANALYTICS */

function buildTopicAnalytics(progress){

    const box =
    document.getElementById("topicStats");

    let html = "";

    for(let topic in progress){

        const data = progress[topic];

        const total =
        data.easy +
        data.medium +
        data.hard;

        const percent =
        Math.min((total / 15) * 100,100);

        html += `

        <div class="topic-card">

            <h3>${topic}</h3>

            <div class="topic-line">
                <span>Easy</span>
                <span>${data.easy}</span>
            </div>

            <div class="topic-line">
                <span>Medium</span>
                <span>${data.medium}</span>
            </div>

            <div class="topic-line">
                <span>Hard</span>
                <span>${data.hard}</span>
            </div>

            <div class="topic-line">
                <span>Total</span>
                <span>${total}</span>
            </div>

            <div class="topic-progress">

                <div class="topic-fill"
                style="width:${percent}%"></div>

            </div>

        </div>
        `;
    }

    box.innerHTML = html;
}

/* XP */

function buildXP(sessions){

    let xp = 0;

    sessions.forEach(s=>{

        const level = s[1];
        const score = s[2];

        if(score == 1){

            if(level == "easy"){
                xp += 5;
            }

            if(level == "medium"){
                xp += 10;
            }

            if(level == "hard"){
                xp += 20;
            }
        }
    });

    const level =
    Math.floor(xp / 100) + 1;

    const current =
    xp % 100;

    document.getElementById("levelText").innerText =
    `Level ${level}`;

    document.getElementById("xpText").innerText =
    `${current} / 100 XP`;

    document.getElementById("xpFill").style.width =
    current + "%";
}

/* RANK */

function setRank(sessions){

    let solved = 0;

    sessions.forEach(s=>{

        if(s[2] == 1){
            solved++;
        }
    });

    let rank = "Beginner";

    if(solved >= 20){
        rank = "Explorer";
    }

    if(solved >= 50){
        rank = "Problem Solver";
    }

    if(solved >= 100){
        rank = "DSA Warrior";
    }

    if(solved >= 200){
        rank = "Algorithm Master";
    }

    document.getElementById("rankText").innerText =
    rank;
}

/* BEST TOPIC */

function findStrongestTopic(progress){

    let best = "None";

    let bestScore = 0;

    for(let topic in progress){

        const data = progress[topic];

        const total =
        data.easy +
        data.medium +
        data.hard;

        if(total > bestScore){

            bestScore = total;

            best = topic;
        }
    }

    document.getElementById("bestTopic").innerText =
    best;
}

/* BADGES */

function generateBadges(sessions,progress){

    const box =
    document.getElementById("badges");

    let solved = 0;

    let hardSolved = 0;

    sessions.forEach(s=>{

        if(s[2] == 1){

            solved++;

            if(s[1] == "hard"){
                hardSolved++;
            }
        }
    });

    let badges = [];

    if(solved >= 1){

        badges.push([
            "fa-solid fa-star",
            "First Solve"
        ]);
    }

    if(solved >= 10){

        badges.push([
            "fa-solid fa-bolt",
            "10 Solves"
        ]);
    }

    if(solved >= 50){

        badges.push([
            "fa-solid fa-fire",
            "50 Solves"
        ]);
    }

    if(hardSolved >= 5){

        badges.push([
            "fa-solid fa-crown",
            "Hard Crusher"
        ]);
    }

    if(progress.graph){

        const g =
        progress.graph.easy +
        progress.graph.medium +
        progress.graph.hard;

        if(g >= 10){

            badges.push([
                "fa-solid fa-diagram-project",
                "Graph Master"
            ]);
        }
    }

    let html = "";

    badges.forEach(b=>{

        html += `

        <div class="badge">

            <i class="${b[0]}"></i>

            <div>

                <h3>${b[1]}</h3>

                <p>Achievement Unlocked</p>

            </div>

        </div>
        `;
    });

    box.innerHTML = html;
}

/* CHALLENGE */

function generateChallenge(){

    const topics = [

        "Graph",
        "Tree",
        "DP",
        "Recursion",
        "Arrays",
        "Greedy"
    ];

    const levels = [

        "Easy",
        "Medium",
        "Hard"
    ];

    const t =
    topics[Math.floor(Math.random()*topics.length)];

    const l =
    levels[Math.floor(Math.random()*levels.length)];

    document.getElementById("challengeText").innerText =
    `Solve 1 ${l} ${t} Problem`;
}

/* AVATAR */

document.getElementById("file")
.addEventListener("change", async function(){

    const file = this.files[0];

    if(!file) return;

    const formData = new FormData();

    formData.append("file",file);

    const res = await fetch(

        `/api/upload-avatar/${user.username}`,

        {
            method:"POST",
            body:formData
        }
    );

    const data = await res.json();

    document.getElementById("avatar").src =
    data.path + "?t=" + Date.now();
});

/* BACK */

function goBack(){

    window.location.href="/dashboard";
}