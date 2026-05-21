/* =========================================================
   ADVANCED VIVA.JS
   FULL FEATURE VERSION
   Compatible with advanced sir_dashboard.js
========================================================= */


/* =========================
   ELEMENTS
========================= */

const startBtn =
document.getElementById(
    "startBtn"
);

const startScreen =
document.getElementById(
    "startScreen"
);

const main =
document.getElementById(
    "main"
);

const chatBox =
document.getElementById(
    "chatBox"
);

const storedBox =
document.getElementById(
    "storedBox"
);

const errorBox =
document.getElementById(
    "errorBox"
);

const muteBtn =
document.getElementById(
    "muteBtn"
);

const studentVideo =
document.getElementById(
    "studentVideo"
);

const remoteAudio =
document.getElementById(
    "remoteAudio"
);

const recordBtn =
document.getElementById(
    "recordA"
);

const stopBtn =
document.getElementById(
    "stop"
);

const storeBtn =
document.getElementById(
    "store"
);

const submitBtn =
document.getElementById(
    "submit"
);

const voicePopup =
document.getElementById(
    "voicePopup"
);

const enableVoiceBtn =
document.getElementById(
    "enableVoiceBtn"
);


/* =========================
   USER
========================= */

const userData =
localStorage.getItem(
    "user"
);

if(!userData){

    window.location.href =
    "/";

}

const user =
JSON.parse(userData);


/* =========================
   GLOBALS
========================= */

let socket = null;

let recognition = null;

let reconnecting = false;

let reconnectTimeout = null;

let peerConnection = null;

let localStream = null;

let pendingCandidates = [];

let qaList = [];

let tempQuestion = "";

let tempAnswer = "";

let currentBubbleQ = null;

let currentBubbleA = null;

let muted = false;

let faceDetectionInterval = null;

let faceModelsLoaded = false;

let monitorInterval = null;

let speaking = false;


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
   START
========================= */

startBtn.onclick =
async () => {

    startScreen.style.display =
    "none";

    main.style.display =
    "flex";

    connectSocket();

    await startMedia();

};


/* =========================
   SOCKET
========================= */

function connectSocket(){

    const protocol =

    location.protocol ===
    "https:"

    ?

    "wss"

    :

    "ws";

    socket =
    new WebSocket(

        `${protocol}://${location.host}/ws/viva/${user.room_id}`

    );

    socket.onopen = () => {

        console.log(
            "Connected"
        );

        createSystemMessage(
            "Connected"
        );

    };

    socket.onclose = () => {

        console.log(
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

        console.log(
            err
        );

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

            tempQuestion =
            msg.text;

            if(currentBubbleQ){

                currentBubbleQ.remove();

            }

            currentBubbleQ =
            createBubble(

                `Professor: ${msg.text}`,

                "question"

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
           MIC REQUEST
        ===================== */

        if(
            msg.type ===
            "sir-mic-on"
        ){

            voicePopup.style.display =
            "flex";

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
           ANSWER
        ===================== */

        if(
            msg.type ===
            "webrtc-answer"
        ){

            try{

                if(
                    peerConnection &&
                    !peerConnection.currentRemoteDescription
                ){

                    await peerConnection
                    .setRemoteDescription(

                        new RTCSessionDescription(
                            msg.answer
                        )

                    );

                    createSystemMessage(
                        "Video Connected"
                    );

                }

            }catch(err){

                console.log(err);

            }

        }

    };

}


/* =========================
   START MEDIA
========================= */

async function startMedia(){

    try{

        localStream =
        await navigator
        .mediaDevices
        .getUserMedia({

            video:true,

            audio:false

        });

        studentVideo.srcObject =
        localStream;

        createPeerConnection();

        localStream
        .getVideoTracks()
        .forEach(track => {

            peerConnection.addTrack(
                track,
                localStream
            );

        });

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

        socket.send(

            JSON.stringify({

                type:
                "webrtc-offer",

                offer:
                peerConnection.localDescription

            })

        );

        studentVideo.onloadedmetadata =
        () => {

            startFaceDetection();

            startMonitoring();

        };

        socket.send(

            JSON.stringify({

                type:
                "student-camera-on"

            })

        );

    }catch(err){

        console.log(err);

    }

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
   ENABLE MIC
========================= */

enableVoiceBtn.onclick =
async () => {

    try{

        voicePopup.style.display =
        "none";

        const micStream =

        await navigator
        .mediaDevices
        .getUserMedia({

            audio:true

        });

        const audioTrack =

        micStream
        .getAudioTracks()[0];

        localStream.addTrack(
            audioTrack
        );

        peerConnection.addTrack(
            audioTrack,
            localStream
        );

        createSystemMessage(
            "Microphone Enabled"
        );

    }catch(err){

        console.log(err);

    }

};


/* =========================
   FACE MODELS
========================= */

async function loadFaceModels(){

    try{

        if(typeof faceapi === "undefined"){

            console.log(
                "FACE API NOT LOADED"
            );

            return false;

        }

        await faceapi.nets
        .tinyFaceDetector
        .loadFromUri(
            "/static/models"
        );

        await faceapi.nets
        .faceLandmark68Net
        .loadFromUri(
            "/static/models"
        );

        faceModelsLoaded =
        true;

        return true;

    }catch(err){

        console.log(err);

        return false;

    }

}


/* =========================
   FACE DETECTION
========================= */

async function startFaceDetection(){

    const loaded =
    await loadFaceModels();

    if(!loaded){

        return;

    }

    if(faceDetectionInterval){

        clearInterval(
            faceDetectionInterval
        );

    }

    faceDetectionInterval =
    setInterval(async () => {

        try{

            if(
                !studentVideo ||
                studentVideo.readyState < 2
            ){

                return;

            }

            const detection =

            await faceapi
            .detectSingleFace(

                studentVideo,

                new faceapi
                .TinyFaceDetectorOptions()

            )
            .withFaceLandmarks();

            if(!detection){

                sendCheatingAlert(
                    "Face not visible"
                );

                return;

            }

            const nose =
            detection.landmarks
            .getNose()[3];

            if(nose.x < 220){

                sendCheatingAlert(
                    "Looking left"
                );

            }

            if(nose.x > 420){

                sendCheatingAlert(
                    "Looking right"
                );

            }

            if(nose.y > 260){

                sendCheatingAlert(
                    "Looking downward"
                );

            }

        }catch(err){

            console.log(err);

        }

    }, 4000);

}


/* =========================
   MONITORING
========================= */

function startMonitoring(){

    if(monitorInterval){

        clearInterval(
            monitorInterval
        );

    }

    monitorInterval =
    setInterval(() => {

        if(!localStream){

            return;

        }

        const tracks =

        localStream.getVideoTracks();

        if(
            tracks.length === 0
        ){

            sendCheatingAlert(
                "Camera disconnected"
            );

        }

    }, 3000);

}


/* =========================
   CHEATING ALERT
========================= */

function sendCheatingAlert(text){

    console.log(
        text
    );

    if(
        socket &&
        socket.readyState === 1
    ){

        socket.send(

            JSON.stringify({

                type:
                "cheating-alert",

                text:text

            })

        );

    }

}


/* =========================
   SPEECH RECOGNITION
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
    async (e) => {

        const text =
        e.results[0][0]
        .transcript;

        tempAnswer =
        text;

        if(currentBubbleA){

            currentBubbleA.remove();

        }

        currentBubbleA =
        createBubble(

            text,

            "answer"

        );

        socket.send(

            JSON.stringify({

                type:
                "answer",

                text:text

            })

        );

        /* =====================
           LIVE AI ANALYSIS
        ===================== */

        try{

            const res =
            await fetch(

                "/api/live-analysis",

                {

                    method:"POST",

                    headers:{
                        "Content-Type":
                        "application/json"
                    },

                    body:JSON.stringify({

                        question:
                        tempQuestion,

                        answer:text

                    })

                }

            );

            const data =
            await res.json();

            if(
                data.success
            ){

                socket.send(

                    JSON.stringify({

                        type:
                        "live-analysis",

                        analysis:
                        data.analysis

                    })

                );

            }

        }catch(err){

            console.log(err);

        }

    };

}


/* =========================
   RECORD
========================= */

recordBtn.onclick = () => {

    if(recognition){

        recognition.start();

    }

};


/* =========================
   STOP
========================= */

stopBtn.onclick = () => {

    if(recognition){

        recognition.stop();

    }

};


/* =========================
   STORE
========================= */

storeBtn.onclick = () => {

    if(
        !tempQuestion ||
        !tempAnswer
    ){

        return;

    }

    qaList.push({

        question:
        tempQuestion,

        answer:
        tempAnswer

    });

    renderStored();

};


/* =========================
   RENDER STORED
========================= */

function renderStored(){

    storedBox.innerHTML =
    "";

    qaList.forEach(q => {

        const div =
        document.createElement(
            "div"
        );

        div.className =
        "stored-item";

        div.innerHTML = `

            <b>Q:</b>
            ${q.question}

            <br>

            <b>A:</b>
            ${q.answer}

        `;

        storedBox.appendChild(
            div
        );

    });

}


/* =========================
   SUBMIT
========================= */

submitBtn.onclick =
async () => {

    try{

        const res =
        await fetch(

            "/api/evaluate",

            {

                method:"POST",

                headers:{
                    "Content-Type":
                    "application/json"
                },

                body:JSON.stringify({

                    qa_list:
                    qaList,

                    user_id:
                    user.userid

                })

            }

        );

        const data =
        await res.json();

        if(data.success){

            localStorage.setItem(

                "evaluation",

                JSON.stringify(
                    data.result
                )

            );

            window.location.href =
            "/result";

        }

    }catch(err){

        console.log(err);

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

};


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

    return div;

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
   TAB SWITCH
========================= */

document.addEventListener(
    "visibilitychange",
    () => {

        if(document.hidden){

            sendCheatingAlert(
                "Tab switched"
            );

        }

    }
);


/* =========================
   FULLSCREEN EXIT
========================= */

document.addEventListener(
    "fullscreenchange",
    () => {

        if(
            !document.fullscreenElement
        ){

            sendCheatingAlert(
                "Fullscreen exited"
            );

        }

    }
);