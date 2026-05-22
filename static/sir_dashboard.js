/* =========================================================
   FINAL ADVANCED sir_dashboard.js
   FULLY FIXED
   NO ROLLBACK
   FULL ADVANCED VERSION
   COMPATIBLE WITH FINAL viva.js
========================================================= */


/* =========================
   ELEMENTS
========================= */

const studentList =
document.querySelector(
    ".student-list"
);

const liveVideo =
document.getElementById(
    "studentLiveVideo"
);

const remoteAudio =
document.getElementById(
    "remoteAudio"
);

const chatBox =
document.querySelector(
    ".chat-box"
);

const chatInput =
document.getElementById(
    "chatInput"
);

const sendBtn =
document.getElementById(
    "sendBtn"
);

const questionInput =
document.getElementById(
    "questionInput"
);

const voiceQuestionBtn =
document.getElementById(
    "voiceQuestionBtn"
);

const confidenceBar =
document.getElementById(
    "confidenceBar"
);

const communicationBar =
document.getElementById(
    "communicationBar"
);

const understandingBar =
document.getElementById(
    "understandingBar"
);

const monitorList =
document.querySelector(
    ".monitor-list"
);

const transcriptBox =
document.querySelector(
    ".transcript-box"
);

const connectionLabel =
document.querySelector(
    ".connection"
);

const logoutBtn =
document.getElementById(
    "logoutBtn"
);


/* =========================
   USER
========================= */

const sirData =
localStorage.getItem(
    "sir"
);

if(!sirData){

    window.location.href =
    "/";

}

const sir =
JSON.parse(
    sirData
);


/* =========================
   GLOBALS
========================= */

let socket = null;

let selectedRoom = null;

let peerConnection = null;

let pendingCandidates = [];

let reconnecting = false;

let reconnectTimeout = null;

let monitorHistory = [];

let transcriptHistory = [];

let recognition = null;

let currentStudents = [];

let alreadyConnected = false;

let makingAnswer = false;


/* =========================
   RTC CONFIG
========================= */

const rtcConfig = {

    iceServers:[

        {
            urls:
            "stun:stun.l.google.com:19302"
        }

    ],

    iceCandidatePoolSize:10,

    bundlePolicy:"max-bundle",

    rtcpMuxPolicy:"require",

    sdpSemantics:"unified-plan"

};


/* =========================
   LOAD STUDENTS
========================= */

async function loadStudents(){

    try{

        const res =
        await fetch(
            "/api/students"
        );

        const data =
        await res.json();

        if(!data.success){

            return;

        }

        currentStudents =
        data.students;

        renderStudents();

    }catch(err){

        console.log(err);

    }

}


/* =========================
   RENDER STUDENTS
========================= */

function renderStudents(){

    if(!studentList){

        return;

    }

    studentList.innerHTML =
    "";

    currentStudents.forEach(student => {

        const card =
        document.createElement(
            "div"
        );

        card.className =
        `student-card ${student.status || "waiting"}`;

        card.innerHTML = `

            <div class="student-info">

                <h3>
                    ${student.username}
                </h3>

                <p>
                    ${student.status || "Waiting"}
                </p>

            </div>

            <button class="join-btn">

                Join Viva

            </button>

        `;

        const joinBtn =
        card.querySelector(
            ".join-btn"
        );

        joinBtn.onclick = () => {

            connectToStudent(
                student.room_id
            );

        };

        studentList.appendChild(
            card
        );

    });

}


/* =========================
   CONNECT TO STUDENT
========================= */

function connectToStudent(roomId){

    selectedRoom =
    roomId;

    createSystemMessage(
        "Connecting..."
    );

    connectSocket();

}


/* =========================
   SOCKET
========================= */

function connectSocket(){

    if(socket){

        socket.close();

    }

    const protocol =

    location.protocol ===
    "https:"

    ?

    "wss"

    :

    "ws";

    socket =
    new WebSocket(

        `${protocol}://${location.host}/ws/viva/${selectedRoom}`

    );

    socket.onopen = () => {

        reconnecting = false;

        updateConnectionStatus(
            true
        );

        if(!alreadyConnected){

            createSystemMessage(
                "Connected"
            );

            alreadyConnected = true;

        }

    };

    socket.onclose = () => {

        updateConnectionStatus(
            false
        );

        if(!reconnecting){

            reconnecting = true;

            reconnectTimeout =
            setTimeout(() => {

                connectSocket();

            }, 3000);

        }

    };

    socket.onerror = (err) => {

        console.log(err);

    };

    socket.onmessage =
    async (event) => {

        const msg =
        JSON.parse(
            event.data
        );

        console.log(
            "SOCKET:",
            msg
        );

        /* =====================
           QUESTION
        ===================== */

        if(
            msg.type ===
            "question"
        ){

            addTranscript(
                "Professor",
                msg.text
            );

            createBubble(

                `Q: ${msg.text}`,

                "ai"

            );

        }

        /* =====================
           ANSWER
        ===================== */

        if(
            msg.type ===
            "answer" ||
            msg.type ===
            "student-answer"
        ){

            addTranscript(
                "Student",
                msg.text
            );

            createBubble(

                `A: ${msg.text}`,

                "student"

            );

        }

        /* =====================
           CHAT
        ===================== */

        if(
            msg.type ===
            "chat"
        ){

            createBubble(

                msg.text,

                "ai"

            );

        }

        /* =====================
           LIVE ANALYSIS
        ===================== */

        if(
            msg.type ===
            "live-analysis"
        ){

            updateAIAnalysis(
                msg.analysis
            );

        }

        /* =====================
           CHEATING ALERT
        ===================== */

        if(
            msg.type ===
            "cheating-alert"
        ){

            addMonitoringMessage(
                msg.text
            );

        }

        /* =====================
           CAMERA ACTIVE
        ===================== */

        if(
            msg.type ===
            "student-camera-on"
        ){

            createSystemMessage(
                "Student Camera Active"
            );

        }

        /* =====================
           WEBRTC OFFER
        ===================== */

        if(
            msg.type ===
            "webrtc-offer"
        ){

            try{

                if(!peerConnection){

                    createPeerConnection();

                }

                const offerDesc =

                new RTCSessionDescription(
                    msg.offer
                );

                if(
                    !peerConnection
                    .currentRemoteDescription
                ){

                    await peerConnection
                    .setRemoteDescription(
                        offerDesc
                    );

                }

                if(makingAnswer){

                    return;

                }

                makingAnswer = true;

                const answer =

                await peerConnection
                .createAnswer();

                await peerConnection
                .setLocalDescription(
                    answer
                );

                /* =====================
                   WAIT ICE COMPLETE
                ===================== */

                await new Promise(resolve => {

                    if(
                        peerConnection
                        .iceGatheringState ===
                        "complete"
                    ){

                        resolve();

                    }

                    else{

                        function checkState(){

                            if(
                                peerConnection
                                .iceGatheringState ===
                                "complete"
                            ){

                                peerConnection
                                .removeEventListener(

                                    "icegatheringstatechange",

                                    checkState

                                );

                                resolve();

                            }

                        }

                        peerConnection
                        .addEventListener(

                            "icegatheringstatechange",

                            checkState

                        );

                    }

                });

                socket.send(

                    JSON.stringify({

                        type:
                        "webrtc-answer",

                        answer:
                        peerConnection.localDescription

                    })

                );

                makingAnswer = false;

                for(
                    const candidate
                    of pendingCandidates
                ){

                    try{

                        await peerConnection
                        .addIceCandidate(

                            new RTCIceCandidate(
                                candidate
                            )

                        );

                    }catch(err){

                        console.log(err);

                    }

                }

                pendingCandidates = [];

                createSystemMessage(
                    "Video Connected"
                );

            }catch(err){

                makingAnswer = false;

                console.log(
                    "ANSWER ERROR:",
                    err
                );

            }

        }

        /* =====================
           ICE
        ===================== */

        if(
            msg.type ===
            "ice-candidate"
        ){

            try{

                if(
                    peerConnection &&
                    peerConnection
                    .remoteDescription
                ){

                    await peerConnection
                    .addIceCandidate(

                        new RTCIceCandidate(
                            msg.candidate
                        )

                    );

                }

                else{

                    pendingCandidates.push(
                        msg.candidate
                    );

                }

            }catch(err){

                console.log(
                    "ICE ERROR:",
                    err
                );

            }

        }

    };

}


/* =========================
   PEER CONNECTION
========================= */

function createPeerConnection(){

    peerConnection =
    new RTCPeerConnection(
        rtcConfig
    );

    /* =====================
       VIDEO RECEIVER
    ===================== */

    peerConnection.addTransceiver(

        "video",

        {
            direction:"recvonly"
        }

    );

    peerConnection.onconnectionstatechange =
    () => {

        console.log(

            "CONNECTION:",

            peerConnection
            .connectionState

        );

    };

    peerConnection.oniceconnectionstatechange =
    () => {

        console.log(

            "ICE:",

            peerConnection
            .iceConnectionState

        );

    };

    peerConnection.ontrack =
    async (event) => {

        console.log(
            "TRACK:",
            event.track.kind
        );

        const remoteStream =
        event.streams[0];

        /* =====================
           VIDEO
        ===================== */

        if(
            event.track.kind ===
            "video"
        ){

            liveVideo.srcObject =
            remoteStream;

            liveVideo.autoplay =
            true;

            liveVideo.playsInline =
            true;

            liveVideo.muted =
            true;

            try{

                await liveVideo.play();

                console.log(
                    "VIDEO PLAYING"
                );

            }catch(err){

                console.log(
                    "VIDEO PLAY ERROR:",
                    err
                );

            }

        }

    };

    peerConnection.onicecandidate =
    (event) => {

        if(
            event.candidate &&
            socket &&
            socket.readyState === 1
        ){

            socket.send(

                JSON.stringify({

                    type:
                    "ice-candidate",

                    candidate:
                    event.candidate

                })

            );

        }

    };

}


/* =========================
   SEND QUESTION
========================= */

function sendQuestion(){

    const text =
    questionInput.value.trim();

    if(!text){

        return;

    }

    socket.send(

        JSON.stringify({

            type:
            "question",

            text:text

        })

    );

    createBubble(

        `Q: ${text}`,

        "ai"

    );

    questionInput.value =
    "";

}


/* =========================
   VOICE QUESTION
========================= */

if(
    "webkitSpeechRecognition"
    in window
){

    recognition =
    new webkitSpeechRecognition();

    recognition.continuous =
    false;

    recognition.lang =
    "en-US";

    recognition.interimResults =
    false;

    recognition.maxAlternatives =
    1;

    recognition.onresult =
    (e) => {

        const text =
        e.results[0][0]
        .transcript;

        questionInput.value =
        text;

        sendQuestion();

    };

}


voiceQuestionBtn.onclick = () => {

    if(recognition){

        recognition.start();

    }

};


/* =========================
   SEND CHAT
========================= */

function sendChat(){

    const text =
    chatInput.value.trim();

    if(!text){

        return;

    }

    socket.send(

        JSON.stringify({

            type:
            "chat",

            text:text

        })

    );

    createBubble(

        text,

        "ai"

    );

    chatInput.value =
    "";

}


if(sendBtn){

    sendBtn.onclick =
    sendChat;

}


chatInput.addEventListener(
    "keypress",
    (e) => {

        if(
            e.key === "Enter"
        ){

            sendChat();

        }

    }
);


/* =========================
   AI ANALYSIS
========================= */

function updateAIAnalysis(data){

    if(!data){

        return;

    }

    confidenceBar.style.width =

    (
        data.confidence || 0
    ) + "%";

    communicationBar.style.width =

    (
        data.communication || 0
    ) + "%";

    understandingBar.style.width =

    (
        data.understanding || 0
    ) + "%";

}


/* =========================
   MONITORING
========================= */

function addMonitoringMessage(text){

    if(
        monitorHistory.length > 0 &&
        monitorHistory[0].text === text
    ){

        return;

    }

    monitorHistory.unshift({

        text:text,

        time:new Date()
        .toLocaleTimeString()

    });

    /* =====================
       KEEP ONLY 10
    ===================== */

    if(
        monitorHistory.length > 10
    ){

        monitorHistory =
        monitorHistory.slice(0,10);

    }

    monitorList.innerHTML =
    "";

    monitorHistory.forEach(item => {

        const div =
        document.createElement(
            "div"
        );

        div.className =
        "warning";

        div.innerHTML = `

            ⚠ ${item.text}

            <br>

            <small>
                ${item.time}
            </small>

        `;

        monitorList.appendChild(
            div
        );

    });

}


/* =========================
   TRANSCRIPT
========================= */

function addTranscript(role,text){

    transcriptHistory.push({

        role,
        text

    });

    if(
        transcriptHistory.length > 20
    ){

        transcriptHistory.shift();

    }

    transcriptBox.innerHTML =
    "";

    transcriptHistory.forEach(item => {

        const div =
        document.createElement(
            "div"
        );

        div.className =

        item.role === "Student"

        ?

        "message student-msg"

        :

        "message ai-msg";

        div.innerHTML = `

            <b>
                ${item.role}:
            </b>

            ${item.text}

        `;

        transcriptBox.appendChild(
            div
        );

    });

}


/* =========================
   CHAT
========================= */

function createBubble(text,type){

    const div =
    document.createElement(
        "div"
    );

    div.className =

    type === "student"

    ?

    "chat-msg"

    :

    "chat-msg ai";

    div.innerText =
    text;

    chatBox.appendChild(
        div
    );

    chatBox.scrollTop =
    chatBox.scrollHeight;

}


/* =========================
   SYSTEM MESSAGE
========================= */

function createSystemMessage(text){

    const div =
    document.createElement(
        "div"
    );

    div.className =
    "chat-msg ai";

    div.innerText =
    text;

    chatBox.appendChild(
        div
    );

    chatBox.scrollTop =
    chatBox.scrollHeight;

}


/* =========================
   CONNECTION STATUS
========================= */

function updateConnectionStatus(connected){

    if(!connectionLabel){

        return;

    }

    connectionLabel.innerText =

    connected

    ?

    "Connected"

    :

    "Disconnected";

}


/* =========================
   LOGOUT
========================= */

if(logoutBtn){

    logoutBtn.onclick = () => {

        localStorage.removeItem(
            "sir"
        );

        window.location.href =
        "/";

    };

}


/* =========================
   INIT
========================= */

loadStudents();

setInterval(() => {

    loadStudents();

}, 5000);