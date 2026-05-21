/* =========================================================
   ADVANCED SIR_DASHBOARD.JS
   FULL FEATURE VERSION
   Compatible with advanced viva.js
========================================================= */


/* =========================
   ELEMENTS
========================= */

const studentGrid =
document.getElementById(
    "studentGrid"
);

const liveVideo =
document.getElementById(
    "liveVideo"
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

const voiceChatBtn =
document.getElementById(
    "voiceChatBtn"
);

const endVoiceBtn =
document.getElementById(
    "endVoiceBtn"
);

const muteVoiceBtn =
document.getElementById(
    "muteVoiceBtn"
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
document.getElementById(
    "transcriptBox"
);

const speakingIndicator =
document.getElementById(
    "speakingIndicator"
);

const connectionLabel =
document.getElementById(
    "connectionLabel"
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

let transcriptHistory = [];

let monitorHistory = [];

let micMuted = false;

let analyser = null;

let audioContext = null;

let speaking = false;

let speakingInterval = null;


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

        studentGrid.innerHTML =
        "";

        data.students.forEach(student => {

            const div =
            document.createElement(
                "div"
            );

            div.className =
            "student-card";

            div.innerHTML = `

                <h3>
                    ${student.username}
                </h3>

                <p>
                    ${student.status}
                </p>

                <button
                onclick="connectToStudent('${student.room_id}')">

                    Connect

                </button>

            `;

            studentGrid.appendChild(
                div
            );

        });

    }catch(err){

        console.log(err);

    }

}


/* =========================
   CONNECT STUDENT
========================= */

function connectToStudent(roomId){

    selectedRoom =
    roomId;

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

        createSystemMessage(
            "Connected"
        );

        updateConnectionStatus(
            "Connected"
        );

    };

    socket.onclose = () => {

        updateConnectionStatus(
            "Disconnected"
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

                "question"

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

                "answer"

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

            if(speakingIndicator){

                speakingIndicator.innerText =
                "Speaking";

            }

        }

        if(
            msg.type ===
            "sir-stopped-speaking"
        ){

            if(speakingIndicator){

                speakingIndicator.innerText =
                "Silent";

            }

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
   VOICE CONNECT
========================= */

voiceChatBtn.onclick =
async () => {

    try{

        if(!peerConnection){

            createPeerConnection();

        }

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

        startVoiceDetection();

        createSystemMessage(
            "Voice Enabled"
        );

    }catch(err){

        console.log(err);

    }

};


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

                if(!speaking){

                    speaking = true;

                    socket.send(

                        JSON.stringify({

                            type:
                            "sir-speaking"

                        })

                    );

                }

            }

            else{

                if(speaking){

                    speaking = false;

                    socket.send(

                        JSON.stringify({

                            type:
                            "sir-stopped-speaking"

                        })

                    );

                }

            }

        }, 300);

    }catch(err){

        console.log(err);

    }

}


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

    if(speakingInterval){

        clearInterval(
            speakingInterval
        );

    }

}


/* =========================
   MUTE
========================= */

muteVoiceBtn.onclick = () => {

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

};


/* =========================
   SEND QUESTION
========================= */

function sendQuestion(){

    const text =
    chatInput.value.trim();

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

        "question"

    );

    chatInput.value =
    "";

}


/* =========================
   SEND EVENTS
========================= */

sendBtn.onclick =
sendQuestion;

chatInput.addEventListener(
    "keypress",
    (e) => {

        if(
            e.key === "Enter"
        ){

            sendQuestion();

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
   TRANSCRIPTS
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
        "transcript-item";

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
    "bubble " + type;

    div.innerText =
    text;

    chatBox.appendChild(
        div
    );

    chatBox.scrollTop =
    chatBox.scrollHeight;

}


/* =========================
   SYSTEM
========================= */

function createSystemMessage(text){

    const div =
    document.createElement(
        "div"
    );

    div.className =
    "bubble system";

    div.innerText =
    text;

    chatBox.appendChild(
        div
    );

    chatBox.scrollTop =
    chatBox.scrollHeight;

}


/* =========================
   STATUS
========================= */

function updateConnectionStatus(text){

    if(connectionLabel){

        connectionLabel.innerText =
        text;

    }

}


/* =========================
   INIT
========================= */

loadStudents();

setInterval(() => {

    loadStudents();

}, 5000);