/* =========================================================
   ADVANCED SIR DASHBOARD
   FULL FIXED VERSION
   Compatible with latest viva.js
   NO ROLLBACK
   ALL FEATURES INCLUDED
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

const connectionLabel =
document.getElementById(
    "connectionLabel"
);

const speakingIndicator =
document.getElementById(
    "speakingIndicator"
);

const transcriptBox =
document.getElementById(
    "transcriptBox"
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

let micMuted = false;

let speaking = false;

let analyser = null;

let audioContext = null;

let voiceInterval = null;

let transcriptHistory = [];

let studentStatus = "offline";


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

                <p class="status">
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

        console.log(
            "Student Load Error",
            err
        );

    }

}


/* =========================
   CONNECT STUDENT
========================= */

function connectToStudent(roomId){

    selectedRoom = roomId;

    createSystemMessage(
        "Connecting to student..."
    );

    connectSocket();

}


/* =========================
   SOCKET
========================= */

function connectSocket(){

    if(socket){

        socket.onclose = null;

        socket.close();

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

        `${protocol}://${window.location.host}/ws/viva/${selectedRoom}`

    );

    socket.onopen = () => {

        reconnecting = false;

        createSystemMessage(
            "Connected to viva room"
        );

        updateConnectionStatus(
            "Connected"
        );

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
           CHAT
        ===================== */

        if(
            msg.type ===
            "chat"
        ){

            createBubble(
                msg.text,
                "question"
            );

        }

        /* =====================
           CAMERA
        ===================== */

        if(
            msg.type ===
            "student-camera-on"
        ){

            studentStatus =
            "camera-active";

            createSystemMessage(
                "Student camera active"
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
                    "Video connected"
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
                    "ICE ERROR:",
                    err
                );

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

        /* =====================
           LEFT
        ===================== */

        if(
            msg.type ===
            "student-left"
        ){

            createSystemMessage(
                "Student disconnected"
            );

            stopVoice();

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

    peerConnection.ontrack =
    async (event) => {

        try{

            const remoteStream =
            event.streams[0];

            if(
                event.track.kind ===
                "video"
            ){

                if(
                    liveVideo.srcObject !==
                    remoteStream
                ){

                    liveVideo.srcObject =
                    remoteStream;

                    liveVideo.autoplay =
                    true;

                    liveVideo.playsInline =
                    true;

                    liveVideo.muted =
                    true;

                    await liveVideo.play();

                }

            }

            if(
                event.track.kind ===
                "audio"
            ){

                if(
                    remoteAudio.srcObject !==
                    remoteStream
                ){

                    remoteAudio.srcObject =
                    remoteStream;

                    remoteAudio.autoplay =
                    true;

                    remoteAudio.playsInline =
                    true;

                    remoteAudio.muted =
                    false;

                    await remoteAudio.play();

                }

            }

        }catch(err){

            console.log(
                "Track Error",
                err
            );

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

        if(
            !socket ||
            socket.readyState !== 1
        ){

            return;

        }

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

            audio:{

                echoCancellation:true,

                noiseSuppression:true,

                autoGainControl:true

            }

        });

        localStream
        .getAudioTracks()
        .forEach(track => {

            peerConnection.addTrack(
                track,
                localStream
            );

        });

        startVoiceActivityDetection();

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
   VOICE ACTIVITY
========================= */

function startVoiceActivityDetection(){

    try{

        audioContext =
        new AudioContext();

        analyser =
        audioContext.createAnalyser();

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

        if(voiceInterval){

            clearInterval(
                voiceInterval
            );

        }

        voiceInterval =
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

        }, 400);

    }catch(err){

        console.log(
            err
        );

    }

}


/* =========================
   MUTE
========================= */

if(muteVoiceBtn){

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

        muteVoiceBtn.innerText =

        micMuted

        ?

        "Unmute"

        :

        "Mute";

    };

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

    if(voiceInterval){

        clearInterval(
            voiceInterval
        );

    }

}


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
   CHAT EVENTS
========================= */

if(sendBtn){

    sendBtn.onclick =
    sendQuestion;

}

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

    if(transcriptBox){

        transcriptBox.innerHTML =
        "";

        transcriptHistory
        .forEach(item => {

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

            transcriptBox
            .appendChild(div);

        });

    }

}


/* =========================
   CHAT BUBBLES
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
   SYSTEM MESSAGE
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
   CONNECTION STATUS
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