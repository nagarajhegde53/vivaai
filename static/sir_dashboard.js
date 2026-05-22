/* =========================================================
   FINAL PRODUCTION sir_dashboard.js
   FULLY FIXED ADVANCED VERSION
   PRESERVES ALL FEATURES
   FIXED QUESTION RECORDING
   FIXED STUDENT ANSWER RECEIVE
   FIXED AUDIO CONNECTION
   FIXED WEBRTC NEGOTIATION
   LOW LATENCY
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

/*
AI FOLLOW UP BUTTON
USED AS VIDEO BUTTON
*/

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

let recognition = null;

let reconnecting = false;

let reconnectTimeout = null;

let pendingCandidates = [];

let currentStudents = [];

let transcriptHistory = [];

let monitorHistory = [];

let professorAudioStream = null;

let professorAudioTrack = null;

let streamStarted = false;

let voiceStarted = false;

let muted = false;

let recognizing = false;

let makingAnswer = false;

let alreadyConnected = false;


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

        joinBtn.onclick =
        async () => {

            await connectToStudent(
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

    if(
        socket &&
        socket.readyState === 1
    ){

        return;

    }

    return new Promise((resolve,reject) => {

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

            reconnecting =
            false;

            updateConnectionStatus(
                true
            );

            if(!alreadyConnected){

                createSystemMessage(
                    "Connected"
                );

                alreadyConnected =
                true;

            }

            resolve();

        };

        socket.onerror =
        (err) => {

            console.log(err);

            reject(err);

        };

        socket.onclose =
        () => {

            updateConnectionStatus(
                false
            );

            if(reconnecting){

                return;

            }

            reconnecting =
            true;

            clearTimeout(
                reconnectTimeout
            );

            reconnectTimeout =
            setTimeout(async () => {

                try{

                    if(selectedRoom){

                        await connectSocket();

                    }

                }catch(err){

                    console.log(err);

                }

                reconnecting =
                false;

            }, 4000);

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

            if(
                msg.senderId ===
                mySocketId
            ){

                return;

            }

            /*
            STUDENT ANSWER
            */

            if(
                msg.type ===
                "answer"
            ){

                addTranscript(
                    "Student",
                    msg.text
                );

            }

            /*
            PROFESSOR QUESTION
            */

            if(
                msg.type ===
                "question"
            ){

                addTranscript(
                    "Professor",
                    msg.text
                );

            }

            /*
            LIVE ANALYSIS
            */

            if(
                msg.type ===
                "live-analysis"
            ){

                updateAIAnalysis(
                    msg.analysis
                );

            }

            /*
            CHEATING ALERT
            */

            if(
                msg.type ===
                "cheating-alert"
            ){

                addMonitoringMessage(
                    msg.text
                );

            }

            /*
            WEBRTC OFFER
            */

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

                    makingAnswer =
                    true;

                    const answer =

                    await peerConnection
                    .createAnswer();

                    await peerConnection
                    .setLocalDescription(
                        answer
                    );

                    sendSocket({

                        type:
                        "webrtc-answer",

                        answer:
                        peerConnection.localDescription

                    });

                    makingAnswer =
                    false;

                    /*
                    PENDING ICE
                    */

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

                    pendingCandidates =
                    [];

                    createSystemMessage(
                        "Streaming Connected"
                    );

                }catch(err){

                    makingAnswer =
                    false;

                    console.log(err);

                }

            }

            /*
            ICE
            */

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
   AUDIO INIT
========================= */

async function initializeProfessorAudio(){

    try{

        if(professorAudioTrack){

            professorAudioTrack.enabled =
            !muted;

            return;
        }

        professorAudioStream =
        await navigator
        .mediaDevices
        .getUserMedia({

            audio:true

        });

        professorAudioTrack =
        professorAudioStream
        .getAudioTracks()[0];

        professorAudioTrack.enabled =
        !muted;

        /*
        ADD TRACK
        */

        if(peerConnection){

            const alreadyAdded =

            peerConnection
            .getSenders()
            .some(sender => {

                return (
                    sender.track &&
                    sender.track.kind ===
                    "audio"
                );

            });

            if(!alreadyAdded){

                peerConnection.addTrack(

                    professorAudioTrack,

                    professorAudioStream

                );

                /*
                IMPORTANT FIX
                */

                renegotiateConnection();

            }

        }

    }catch(err){

        console.log(err);

    }

}


/* =========================
   RENEGOTIATE
========================= */

async function renegotiateConnection(){

    try{

        if(
            !peerConnection
        ){

            return;

        }

        const offer =

        await peerConnection
        .createOffer({

            offerToReceiveAudio:true,

            offerToReceiveVideo:true

        });

        await peerConnection
        .setLocalDescription(
            offer
        );

        sendSocket({

            type:
            "webrtc-answer",

            answer:
            peerConnection.localDescription

        });

    }catch(err){

        console.log(err);

    }

}


/* =========================
   PEER
========================= */

function createPeerConnection(){

    if(peerConnection){

        return;

    }

    peerConnection =
    new RTCPeerConnection(
        rtcConfig
    );

    peerConnection.ontrack =
    async (event) => {

        console.log(
            "TRACK:",
            event.track.kind
        );

        const remoteStream =
        event.streams[0];

        /*
        VIDEO
        */

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

            liveVideo.play()
            .catch(err => {

                console.log(err);

            });

        }

        /*
        AUDIO
        */

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

            voiceStarted

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

        if(event.candidate){

            sendSocket({

                type:
                "ice-candidate",

                candidate:
                event.candidate

            });

        }

    };

}


/* =========================
   SEND SOCKET
========================= */

function sendSocket(data){

    if(
        !socket
    ){

        return;

    }

    if(
        socket.readyState !== 1
    ){

        return;

    }

    socket.send(

        JSON.stringify({

            senderId:
            mySocketId,

            ...data

        })

    );

}


/* =========================
   VIDEO BUTTON
========================= */

voiceChatBtn.onclick =
() => {

    /*
    STOP STREAM
    */

    if(streamStarted){

        streamStarted =
        false;

        voiceStarted =
        false;

        sendSocket({

            type:
            "stop-stream"

        });

        if(peerConnection){

            peerConnection.close();

            peerConnection =
            null;

        }

        liveVideo.srcObject =
        null;

        remoteAudio.srcObject =
        null;

        createSystemMessage(
            "Video Stream Stopped"
        );

        return;

    }

    /*
    START STREAM
    */

    streamStarted =
    true;

    createPeerConnection();

    sendSocket({

        type:
        "start-stream"

    });

    createSystemMessage(
        "Starting Video Stream..."
    );

};


/* =========================
   START TALKING
========================= */

toggleVoiceBtn.onclick =
async () => {

    if(!streamStarted){

        createSystemMessage(
            "Start video stream first"
        );

        return;

    }

    if(voiceStarted){

        return;

    }

    voiceStarted =
    true;

    await initializeProfessorAudio();

    remoteAudio.volume =
    1;

    sendSocket({

        type:
        "connect-voice"

    });

    createSystemMessage(
        "Voice Connected"
    );

};


/* =========================
   END TALKING
========================= */

endVoiceBtn.onclick =
() => {

    voiceStarted =
    false;

    if(professorAudioTrack){

        professorAudioTrack.enabled =
        false;

    }

    remoteAudio.volume =
    0;

    sendSocket({

        type:
        "disconnect-voice"

    });

    createSystemMessage(
        "Voice Disconnected"
    );

};


/* =========================
   MUTE
========================= */

muteBtn.onclick =
() => {

    muted = !muted;

    if(professorAudioTrack){

        professorAudioTrack.enabled =
        !muted &&
        voiceStarted;

    }

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

    /*
    SOCKET ONLY
    */

    sendSocket({

        type:
        "question",

        text:text

    });

    addTranscript(
        "Professor",
        text
    );

    questionInput.value =
    "";

}


/* =========================
   ENTER SEND
========================= */

questionInput.addEventListener(

    "keydown",

    (e) => {

        if(e.key === "Enter"){

            sendQuestion();

        }

    }

);


/* =========================
   SPEECH API
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

    recognition.onend =
    () => {

        recognizing =
        false;

    };

    recognition.onerror =
    (err) => {

        console.log(err);

        recognizing =
        false;

    };

}


/* =========================
   RECORD QUESTION
========================= */

voiceQuestionBtn.onclick =
() => {

    if(!recognition){

        return;

    }

    if(recognizing){

        return;

    }

    try{

        recognizing =
        true;

        recognition.start();

    }catch(err){

        console.log(err);

    }

};


/* =========================
   AI ANALYSIS
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

    logoutBtn.onclick =
    () => {

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

    await loadStudents();

    setInterval(() => {

        loadStudents();

    }, 5000);

})();