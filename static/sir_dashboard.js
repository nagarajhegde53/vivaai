/* =========================================================
   FINAL ADVANCED sir_dashboard.js
   FULLY BUG FIXED
   PROFESSIONAL STABLE VERSION
   COMPATIBLE WITH:
   - YOUR HTML
   - YOUR CSS
   - YOUR BACKEND
   - FINAL viva.js
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

const toggleVoiceBtn =
document.getElementById(
    "toggleVoiceBtn"
);

const endVoiceBtn =
document.getElementById(
    "endVoiceBtn"
);

const muteBtn =
document.getElementById(
    "muteBtn"
);

const voiceChatBtn =
document.getElementById(
    "voiceChatBtn"
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

const mySocketId =
Math.random()
.toString(36)
.slice(2);

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

let professorStream = null;

let professorAudioTrack = null;

let voiceModeEnabled = false;

let muted = false;


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
   LOAD PROFESSOR MIC
========================= */

async function initProfessorAudio(){

    try{

        professorStream =
        await navigator
        .mediaDevices
        .getUserMedia({

            audio:true

        });

        professorAudioTrack =
        professorStream
        .getAudioTracks()[0];

        /* =====================
           START MUTED
        ===================== */

        professorAudioTrack.enabled =
        false;

    }catch(err){

        console.log(
            "MIC ERROR:",
            err
        );

    }

}


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
   CONNECT STUDENT
========================= */

async function connectToStudent(roomId){

    selectedRoom =
    roomId;

    createSystemMessage(
        "Connecting..."
    );

    await connectSocket();

}


/* =========================
   SOCKET
========================= */

async function connectSocket(){

    return new Promise((resolve,reject) => {

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

            resolve();

        };

        socket.onerror = (err) => {

            console.log(err);

            reject(err);

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
               SELF FILTER
            ===================== */

            if(
                msg.senderId ===
                mySocketId
            ){

                return;

            }

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

            }

            /* =====================
               ANSWER
            ===================== */

            if(
                msg.type ===
                "answer"
            ){

                addTranscript(
                    "Student",
                    msg.text
                );

            }

            /* =====================
               ANALYSIS
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
               CHEATING
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

                    await waitForIceComplete();

                    socket.send(

                        JSON.stringify({

                            senderId:
                            mySocketId,

                            type:
                            "webrtc-answer",

                            answer:
                            peerConnection
                            .localDescription

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

                    console.log(err);

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

                    console.log(err);

                }

            }

        };

    });

}


/* =========================
   WAIT ICE
========================= */

async function waitForIceComplete(){

    return new Promise(resolve => {

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

}


/* =========================
   PEER CONNECTION
========================= */

function createPeerConnection(){

    peerConnection =
    new RTCPeerConnection(
        rtcConfig
    );

    peerConnection.addTransceiver(

        "video",

        {
            direction:"recvonly"
        }

    );

    peerConnection.addTransceiver(

        "audio",

        {
            direction:"sendrecv"
        }

    );

    /* =====================
       ADD PROFESSOR AUDIO
    ===================== */

    if(
        professorStream
    ){

        professorStream
        .getTracks()
        .forEach(track => {

            peerConnection.addTrack(
                track,
                professorStream
            );

        });

    }

    peerConnection.ontrack =
    async (event) => {

        console.log(
            "TRACK:",
            event.track.kind
        );

        const remoteStream =
        event.streams[0];

        /* =====================
           STUDENT VIDEO
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

            liveVideo.style.display =
            "block";

            setTimeout(async () => {

                try{

                    await liveVideo.play();

                }catch(err){

                    console.log(err);

                }

            }, 300);

        }

        /* =====================
           STUDENT AUDIO
        ===================== */

        if(
            event.track.kind ===
            "audio"
        ){

            remoteAudio.srcObject =
            remoteStream;

            remoteAudio.autoplay =
            true;

            remoteAudio.playsInline =
            true;

            remoteAudio.muted =
            false;

            remoteAudio.volume =

            voiceModeEnabled

            ?

            1

            :

            0;

            remoteAudio.play()
            .catch(err => {

                console.log(err);

            });

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

                    senderId:
                    mySocketId,

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
   START TALKING
========================= */

toggleVoiceBtn.onclick =
() => {

    if(
        !professorAudioTrack
    ){

        return;

    }

    voiceModeEnabled =
    true;

    professorAudioTrack.enabled =
    true;

    remoteAudio.volume =
    1;

    socket.send(

        JSON.stringify({

            senderId:
            mySocketId,

            type:
            "sir-mic-on"

        })

    );

    createSystemMessage(
        "Voice Communication Started"
    );

};


/* =========================
   END VOICE
========================= */

endVoiceBtn.onclick =
() => {

    if(
        !professorAudioTrack
    ){

        return;

    }

    voiceModeEnabled =
    false;

    professorAudioTrack.enabled =
    false;

    remoteAudio.volume =
    0;

    socket.send(

        JSON.stringify({

            senderId:
            mySocketId,

            type:
            "sir-mic-off"

        })

    );

    createSystemMessage(
        "Voice Communication Ended"
    );

};


/* =========================
   MUTE
========================= */

muteBtn.onclick =
() => {

    if(
        !professorAudioTrack
    ){

        return;

    }

    muted = !muted;

    professorAudioTrack.enabled =
    !muted &&
    voiceModeEnabled;

    muteBtn.innerText =

    muted

    ?

    "Unmute"

    :

    "Mute";

};


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

            senderId:
            mySocketId,

            type:
            "question",

            text:text

        })

    );

    addTranscript(
        "Professor",
        text
    );

    questionInput.value =
    "";

}


/* =========================
   VOICE ASK
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


voiceQuestionBtn.onclick =
() => {

    if(recognition){

        recognition.start();

    }

};


voiceChatBtn.onclick =
() => {

    sendQuestion();

};


/* =========================
   ANALYSIS
========================= */

function updateAIAnalysis(data){

    if(!data){

        return;

    }

    const confidence =
    parseInt(
        data.confidence || 0
    );

    const communication =
    parseInt(
        data.communication || 0
    );

    const understanding =
    parseInt(
        data.understanding || 0
    );

    confidenceBar.style.width =
    confidence + "%";

    communicationBar.style.width =
    communication + "%";

    understandingBar.style.width =
    understanding + "%";

}


/* =========================
   MONITORING
========================= */

function addMonitoringMessage(text){

    const exists =
    monitorHistory.some(
        item => item.text === text
    );

    if(exists){

        return;

    }

    monitorHistory.unshift({

        text:text,

        time:new Date()
        .toLocaleTimeString()

    });

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
   SYSTEM
========================= */

function createSystemMessage(text){

    console.log(text);

}


/* =========================
   CONNECTION
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

(async () => {

    await initProfessorAudio();

    await loadStudents();

    setInterval(() => {

        loadStudents();

    }, 5000);

})();