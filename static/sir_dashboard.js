/* =========================================================
   FINAL ADVANCED sir_dashboard.js
   FULLY COMPATIBLE WITH:
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

const waveContainer =
document.querySelector(
    ".wave-container"
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

let localStream = null;

let pendingCandidates = [];

let reconnecting = false;

let reconnectTimeout = null;

let monitorHistory = [];

let transcriptHistory = [];

let micMuted = false;

let recognition = null;

let speaking = false;

let audioContext = null;

let analyser = null;

let speakingInterval = null;

let currentStudents = [];

let voiceConnected = false;


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

        createSystemMessage(
            "Connected"
        );

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
            "answer"
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
           OFFER
        ===================== */

        if(
            msg.type ===
            "webrtc-offer"
        ){

            try{

                if(!peerConnection){

                    createPeerConnection();

                }

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

                const answer =

                await peerConnection
                .createAnswer();

                await peerConnection
                .setLocalDescription(
                    answer
                );

                socket.send(

                    JSON.stringify({

                        type:
                        "webrtc-answer",

                        answer:
                        peerConnection.localDescription

                    })

                );

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

                console.log(err);

            }

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
           SPEAKING
        ===================== */

        if(
            msg.type ===
            "sir-speaking"
        ){

            waveContainer.style.opacity =
            "1";

        }

        if(
            msg.type ===
            "sir-stopped-speaking"
        ){

            waveContainer.style.opacity =
            "0.3";

        }

    };

}


/* =========================
   PEER
========================= */

function createPeerConnection(){

    peerConnection =
    new RTCPeerConnection(
        rtcConfig
    );

    peerConnection.ontrack =
    async (event) => {

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

            }catch(err){

                console.log(err);

            }

        }

        /* =====================
           AUDIO
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

            try{

                await remoteAudio.play();

            }catch(err){

                console.log(err);

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
   CONNECT VOICE
========================= */

voiceChatBtn.onclick =
async () => {

    try{

        if(voiceConnected){

            return;

        }

        voiceConnected = true;

        socket.send(

            JSON.stringify({

                type:
                "sir-mic-on"

            })

        );

        localStream =
        await navigator
        .mediaDevices
        .getUserMedia({

            audio:true

        });

        localStream
        .getAudioTracks()
        .forEach(track => {

            peerConnection.addTrack(
                track,
                localStream
            );

        });

        createSystemMessage(
            "Voice Connected"
        );

        startVoiceDetection();

    }catch(err){

        console.log(err);

    }

};


/* =========================
   TOGGLE TALKING
========================= */

toggleVoiceBtn.onclick = () => {

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
    <i class="fa-solid fa-microphone"></i>
    Stop Talking
    `

    :

    `
    <i class="fa-solid fa-microphone"></i>
    Start Talking
    `;

};


/* =========================
   MUTE
========================= */

muteBtn.onclick = () => {

    if(!localStream){

        return;

    }

    micMuted = !micMuted;

    localStream
    .getAudioTracks()
    .forEach(track => {

        track.enabled =
        !micMuted;

    });

    muteBtn.innerHTML =

    micMuted

    ?

    `
    <i class="fa-solid fa-microphone"></i>
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

    voiceConnected = false;

    if(speakingInterval){

        clearInterval(
            speakingInterval
        );

    }

    createSystemMessage(
        "Voice Ended"
    );

}


/* =========================
   VOICE DETECTION
========================= */

function startVoiceDetection(){

    try{

        audioContext =
        new AudioContext();

        analyser =
        audioContext
        .createAnalyser();

        const source =
        audioContext
        .createMediaStreamSource(
            localStream
        );

        source.connect(
            analyser
        );

        analyser.fftSize =
        256;

        const dataArray =
        new Uint8Array(
            analyser.frequencyBinCount
        );

        if(speakingInterval){

            clearInterval(
                speakingInterval
            );

        }

        speakingInterval =
        setInterval(() => {

            analyser
            .getByteFrequencyData(
                dataArray
            );

            let volume = 0;

            for(
                let i=0;
                i<dataArray.length;
                i++
            ){

                volume +=
                dataArray[i];

            }

            volume =
            volume /
            dataArray.length;

            if(volume > 15){

                socket.send(

                    JSON.stringify({

                        type:
                        "sir-speaking"

                    })

                );

            }

            else{

                socket.send(

                    JSON.stringify({

                        type:
                        "sir-stopped-speaking"

                    })

                );

            }

        }, 300);

    }catch(err){

        console.log(err);

    }

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

    monitorHistory.unshift({

        text:text,

        time:new Date()
        .toLocaleTimeString()

    });

    if(
        monitorHistory.length > 10
    ){

        monitorHistory.pop();

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
   CHAT BUBBLE
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

logoutBtn.onclick = () => {

    localStorage.removeItem(
        "sir"
    );

    window.location.href =
    "/";

};


/* =========================
   INIT
========================= */

loadStudents();

setInterval(() => {

    loadStudents();

}, 5000);