/* =========================
   ELEMENTS
========================= */

const studentList =
document.querySelector(
    ".student-list"
);

const transcriptBox =
document.querySelector(
    ".transcript-box"
);

const chatBox =
document.querySelector(
    ".chat-box"
);

const chatInput =
document.getElementById(
    "chatInput"
);

const questionInput =
document.getElementById(
    "questionInput"
);

const studentVideo =
document.getElementById(
    "studentLiveVideo"
);

const remoteAudio =
document.getElementById(
    "remoteAudio"
);

const logoutBtn =
document.getElementById(
    "logoutBtn"
);

const voiceChatBtn =
document.getElementById(
    "voiceChatBtn"
);

const toggleVoiceBtn =
document.getElementById(
    "toggleVoiceBtn"
);

const muteBtn =
document.getElementById(
    "muteBtn"
);

const endVoiceBtn =
document.getElementById(
    "endVoiceBtn"
);

const voiceQuestionBtn =
document.getElementById(
    "voiceQuestionBtn"
);

const connectionText =
document.querySelector(
    ".connection"
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
JSON.parse(sirData);


/* =========================
   GLOBALS
========================= */

let socket = null;

let currentRoom = null;

let selectedStudent = null;

let localStream = null;

let peerConnection = null;

let recognition = null;

let muted = false;

let speaking = false;

let webrtcStarted = false;

let reconnecting = false;

let reconnectTimeout = null;

let pendingCandidates = [];

let heartbeat = null;


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

    iceCandidatePoolSize:10,

    sdpSemantics:"unified-plan"

};


/* =========================
   LOAD STUDENTS
========================= */

loadStudents();

async function loadStudents(){

    try{

        const res =
        await fetch(
            "/api/students"
        );

        const data =
        await res.json();

        console.log(
            "Students:",
            data
        );

        if(!data.success){

            return;

        }

        studentList.innerHTML =
        "";

        data.students.forEach(student => {

            const div =
            document.createElement(
                "div"
            );

            div.className =
            "student-item";

            div.innerHTML = `

                <div class="student-name">

                    ${student.username}

                </div>

                <div class="student-status">

                    ${student.status}

                </div>

            `;

            div.onclick = () => {

                selectStudent(
                    student,
                    div
                );

            };

            studentList.appendChild(
                div
            );

        });

        // AUTO SELECT FIRST

        if(
            data.students.length > 0
        ){

            const first =
            document.querySelector(
                ".student-item"
            );

            selectStudent(
                data.students[0],
                first
            );

        }

    }catch(err){

        console.log(
            "Load Students Error",
            err
        );

    }

}


/* =========================
   SELECT STUDENT
========================= */

function selectStudent(
    student,
    element
){

    document
    .querySelectorAll(
        ".student-item"
    )
    .forEach(item => {

        item.classList.remove(
            "active"
        );

    });

    if(element){

        element.classList.add(
            "active"
        );

    }

    selectedStudent =
    student;

    currentRoom =
    student.room_id;

    createSystemMessage(

        `Connected to ${student.username}`

    );

    if(socket){

        socket.onclose = null;

        socket.close();

    }

    stopVoice();

    connectSocket();

}


/* =========================
   CONNECT SOCKET
========================= */

function connectSocket(){

    if(!currentRoom){

        return;

    }

    const protocol =

    window.location.protocol ===
    "https:"

    ?

    "wss"

    :

    "ws";

    socket =
    new WebSocket(

        `${protocol}://${window.location.host}/ws/viva/${currentRoom}`

    );

    socket.onopen = () => {

        console.log(
            "Sir Connected"
        );

        reconnecting = false;

        if(reconnectTimeout){

            clearTimeout(
                reconnectTimeout
            );

        }

        if(connectionText){

            connectionText.innerText =
            "Connected";

        }

        // KEEP RENDER ALIVE

        heartbeat =
        setInterval(() => {

            if(
                socket &&
                socket.readyState === 1
            ){

                socket.send(

                    JSON.stringify({

                        type:"ping"

                    })

                );

            }

        }, 20000);

    };

    socket.onerror = (err) => {

        console.log(
            "Socket Error",
            err
        );

    };

    socket.onclose = () => {

        console.log(
            "Socket Closed"
        );

        if(connectionText){

            connectionText.innerText =
            "Disconnected";

        }

        clearInterval(
            heartbeat
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

        console.log(msg);

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
        if(
    msg.type ===
    "live-analysis"
){

    updateAIAnalysis(
        msg.analysis
    );

}

        /* =====================
           CHAT
        ===================== */

        if(
            msg.type ===
            "chat"
        ){

            addChatMessage(

                msg.text

            );

        }
        /* =====================
   CHEATING ALERT
===================== */

if(
    msg.type ===
    "cheating-alert"
){

    addWarning(
        msg.text
    );

}

        /* =====================
           STUDENT CAMERA
        ===================== */

        if(
            msg.type ===
            "student-camera-on"
        ){

            createSystemMessage(
                "Student camera enabled"
            );

        }

        /* =====================
           STUDENT MUTED
        ===================== */

        if(
            msg.type ===
            "student-muted"
        ){

            createSystemMessage(
                "Student muted microphone"
            );

        }

        /* =====================
           STUDENT UNMUTED
        ===================== */

        if(
            msg.type ===
            "student-unmuted"
        ){

            createSystemMessage(
                "Student unmuted microphone"
            );

        }

        /* =====================
           WEBRTC ANSWER
        ===================== */
           
            /* =====================
   WEBRTC OFFER
===================== */

if(
    msg.type ===
    "webrtc-offer"
){

    try{

        /* =================
           CREATE PEER
        ================= */

        if(!peerConnection){

            createPeerConnection();

        }

        /* =================
           SET REMOTE
        ================= */

        if(
            !peerConnection.remoteDescription
        ){

            await peerConnection
            .setRemoteDescription(

                new RTCSessionDescription(
                    msg.offer
                )

            );

        }

        /* =================
           CREATE ANSWER
        ================= */

        const answer =

        await peerConnection
        .createAnswer();

        await peerConnection
        .setLocalDescription(
            answer
        );

        /* =================
           SEND ANSWER
        ================= */

        socket.send(

            JSON.stringify({

                type:
                "webrtc-answer",

                answer:
                peerConnection.localDescription

            })

        );

        /* =================
           APPLY ICE
        ================= */

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
            "Student video connected"
        );

    }catch(err){

        console.log(
            "Offer Error",
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
                    peerConnection.remoteDescription
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
                    err
                );

            }

        }

        /* =====================
           STUDENT LEFT
        ===================== */

        if(
            msg.type ===
            "student-left"
        ){

            createSystemMessage(
                "Student left viva"
            );

            stopVoice();

        }

    };

}


/* =========================
   CREATE PEER
========================= */

function createPeerConnection(){

    peerConnection =
    new RTCPeerConnection(
        rtcConfig
    );

    /* =====================
       RECEIVE VIDEO/AUDIO
    ===================== */

    peerConnection.ontrack =
    async (event) => {

        try{

            const remoteStream =
            event.streams[0];

            // VIDEO

            if(
                event.track.kind ===
                "video"
            ){

                if(
                    studentVideo.srcObject ===
                    remoteStream
                ){

                    return;

                }

                studentVideo.srcObject =
                remoteStream;

                studentVideo.autoplay =
                true;

                studentVideo.playsInline =
                true;

                studentVideo.muted =
                true;

                try{

                    await studentVideo.play();

                }catch(err){

                    console.log(err);

                }

            }

            // AUDIO

            if(
                event.track.kind ===
                "audio"
            ){

                if(
                    remoteAudio.srcObject ===
                    remoteStream
                ){

                    return;

                }

                remoteAudio.srcObject =
                remoteStream;

                remoteAudio.autoplay =
                true;

                remoteAudio.playsInline =
                true;

                remoteAudio.muted =
                false;

                try{

                    await remoteAudio.play();

                }catch(err){

                    console.log(err);

                }

            }

        }catch(err){

            console.log(
                "Track Error",
                err
            );

        }

    };

    /* =====================
       ICE
    ===================== */

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

    /* =====================
       CONNECTION STATE
    ===================== */

    peerConnection.onconnectionstatechange =
    () => {

        if(!peerConnection){

            return;

        }

        console.log(

            "Connection:",

            peerConnection.connectionState

        );

    };

    /* =====================
       ICE STATE
    ===================== */

    peerConnection.oniceconnectionstatechange =
    () => {

        if(!peerConnection){

            return;

        }

        console.log(

            "ICE:",

            peerConnection
            .iceConnectionState

        );

    };

}


/* =========================
   CONNECT VOICE
========================= */

/* =========================
   CONNECT VOICE
========================= */

voiceChatBtn.onclick =
async () => {

    try{

        if(
            !socket ||
            socket.readyState !== 1
        ){

            createSystemMessage(
                "Socket not connected"
            );

            return;

        }

        /* =====================
           CREATE PEER ONLY ONCE
        ===================== */

        if(!peerConnection){

            createPeerConnection();

        }

        /* =====================
           REQUEST STUDENT MIC
        ===================== */

        socket.send(

            JSON.stringify({

                type:
                "sir-mic-on"

            })

        );

        /* =====================
           SIR AUDIO ONLY
        ===================== */

        localStream =
        await navigator
        .mediaDevices
        .getUserMedia({

            audio:{

                echoCancellation:true,

                noiseSuppression:true,

                autoGainControl:true,

                sampleRate:48000,

                channelCount:1

            }

        });

        /* =====================
           ADD AUDIO TRACK ONLY
        ===================== */

        localStream
        .getAudioTracks()
        .forEach(track => {

            peerConnection.addTrack(
                track,
                localStream
            );

        });

        /* =====================
           SPEAKING DEFAULT OFF
        ===================== */

        localStream
        .getAudioTracks()
        .forEach(track => {

            track.enabled = false;

        });

        webrtcStarted = true;

        createSystemMessage(
            "Voice connected"
        );

    }catch(err){

        console.log(
            "Voice Error",
            err
        );

    }

};

/* =========================
   START / STOP TALKING
========================= */

toggleVoiceBtn.onclick =
() => {

    if(!localStream){

        return;

    }

    speaking = !speaking;

    localStream
    .getAudioTracks()
    .forEach(track => {

        track.enabled =
        speaking;

    });

    toggleVoiceBtn.innerHTML =

    speaking

    ?

    `
    <i class="fa-solid fa-microphone-slash"></i>
    Stop Talking
    `

    :

    `
    <i class="fa-solid fa-microphone"></i>
    Start Talking
    `;

    if(
        socket &&
        socket.readyState === 1
    ){

        socket.send(

            JSON.stringify({

                type:

                speaking

                ?

                "sir-speaking"

                :

                "sir-stopped-speaking"

            })

        );

    }

};


/* =========================
   MUTE
========================= */

muteBtn.onclick = () => {

    if(!localStream){

        return;

    }

    muted = !muted;

    localStream
    .getAudioTracks()
    .forEach(track => {

        track.enabled =
        !muted;

    });

    muteBtn.innerHTML =

    muted

    ?

    `
    <i class="fa-solid fa-volume-xmark"></i>
    Unmute
    `

    :

    `
    <i class="fa-solid fa-microphone-slash"></i>
    Mute
    `;

};


/* =========================
   END VOICE
========================= */

endVoiceBtn.onclick = () => {

    stopVoice();

};


/* =========================
   STOP VOICE
========================= */

function stopVoice(){

    if(localStream){

        localStream
        .getTracks()
        .forEach(track => {

            track.stop();

        });

        localStream = null;

    }

    if(peerConnection){

        peerConnection.close();

        peerConnection = null;

    }

    if(studentVideo){

        studentVideo.srcObject =
        null;

    }

    if(remoteAudio){

        remoteAudio.srcObject =
        null;

    }

    pendingCandidates = [];

    muted = false;

    speaking = false;

    webrtcStarted = false;

    toggleVoiceBtn.innerHTML =

    `
    <i class="fa-solid fa-microphone"></i>
    Start Talking
    `;

    if(
        socket &&
        socket.readyState === 1
    ){

        socket.send(

            JSON.stringify({

                type:
                "sir-voice-ended"

            })

        );

    }

    createSystemMessage(
        "Voice ended"
    );

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

    recognition.lang =
    "en-US";

    recognition.continuous =
    false;

    recognition.interimResults =
    false;

    recognition.onresult =
    (e) => {

        const text =
        e.results[0][0]
        .transcript;

        questionInput.value =
        text;

        sendQuestion(text);

    };

}

voiceQuestionBtn.onclick =
() => {

    if(recognition){

        recognition.start();

    }

};


/* =========================
   SEND QUESTION
========================= */

function sendQuestion(text){

    if(
        !text ||
        !socket
    ){

        return;

    }

    socket.send(

        JSON.stringify({

            type:"question",

            text:text

        })

    );

    addTranscript(
        "Professor",
        text
    );

}

questionInput.addEventListener(
    "keydown",
    (e) => {

        if(
            e.key === "Enter"
        ){

            e.preventDefault();

            const text =
            questionInput.value.trim();

            sendQuestion(text);

            questionInput.value =
            "";

        }

    }
);


/* =========================
   CHAT
========================= */

chatInput.addEventListener(
    "keydown",
    (e) => {

        if(
            e.key === "Enter"
        ){

            const text =
            chatInput.value.trim();

            if(!text){

                return;

            }

            socket.send(

                JSON.stringify({

                    type:"chat",

                    text:
                    `Professor: ${text}`

                })

            );

            addChatMessage(
                `Professor: ${text}`
            );

            chatInput.value =
            "";

        }

    }
);


/* =========================
   LOGOUT
========================= */

logoutBtn.onclick = () => {

    stopVoice();

    if(socket){

        socket.close();

    }

    localStorage.removeItem(
        "sir"
    );

    window.location.href =
    "/";

};


/* =========================
   TRANSCRIPT
========================= */

function addTranscript(sender,text){

    const div =
    document.createElement(
        "div"
    );

    div.className =
    "transcript-item";

    div.innerHTML = `

        <b>${sender}:</b>
        ${text}

    `;

    transcriptBox.appendChild(
        div
    );

    transcriptBox.scrollTop =
    transcriptBox.scrollHeight;

}


/* =========================
   CHAT
========================= */

function addChatMessage(text){

    const div =
    document.createElement(
        "div"
    );

    div.className =
    "chat-message";

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
    "chat-message";

    div.innerText =
    text;

    chatBox.appendChild(
        div
    );

    chatBox.scrollTop =
    chatBox.scrollHeight;

}


// update ui
function updateAIAnalysis(data){

    console.log(
        "AI ANALYSIS:",
        data
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

    // SCORE -> CONFIDENCE

    if(confidenceBar){

        confidenceBar.style.width =

        (
data.confidence ||

            0

        ) + "%";

    }

    // COMMUNICATION

    if(communicationBar){

        communicationBar.style.width =

        (
            data.communication ||

            0

        ) + "%";

    }

    // CRITICAL -> UNDERSTANDING

    if(understandingBar){

        understandingBar.style.width =

        (
            data.understanding ||

            0

        ) + "%";

    }

}

/* =========================
   MONITORING WARNING
========================= */

function addWarning(text){

    const monitorSection =

    document.querySelector(
        ".monitor-list"
    );

    if(!monitorSection){

        return;

    }

    const div =
    document.createElement(
        "div"
    );

    div.className =
    "warning";

    div.innerText =
    "⚠ " + text;

    monitorSection.appendChild(
        div
    );

    /* =====================
       KEEP ONLY LAST 10
    ===================== */

    const warnings =

    monitorSection.querySelectorAll(
        ".warning"
    );

    if(warnings.length > 10){

        warnings[0].remove();

    }

    /* =====================
       AUTO SCROLL
    ===================== */

    monitorSection.scrollTop =
    monitorSection.scrollHeight;

}