/* =========================================================
   FINAL ADVANCED viva.js
   FULLY FIXED
   BACKEND COMPATIBLE
   HTML/CSS COMPATIBLE
   NO ROLLBACK
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

const controls =
document.querySelector(
    ".controls"
);

const socketStatus =
document.querySelector(
    ".socket-status"
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

const mySocketId =
Math.random()
.toString(36)
.slice(2);

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

let muted = false;

let micEnabled = false;

let faceDetectionInterval = null;

let monitorInterval = null;

let faceModelsLoaded = false;

let alreadyConnected = false;

let makingOffer = false;


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
   START VIVA
========================= */

startBtn.onclick =
async () => {

    try{

        startScreen.style.display =
        "none";

        main.style.display =
        "flex";

        controls.classList.add(
            "show"
        );

        await connectSocket();

        await startCamera();

    }catch(err){

        console.log(err);

    }

};


/* =========================
   SOCKET
========================= */

async function connectSocket(){

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

            `${protocol}://${location.host}/ws/viva/${user.room_id}`

        );

        socket.onopen = () => {

            reconnecting = false;

            updateSocketStatus(
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

            updateSocketStatus(
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

            console.log(
                "RAW SOCKET:",
                event.data
            );

            const msg =
            JSON.parse(
                event.data
            );

            console.log(
                "PARSED:",
                msg
            );

            /* =====================
               PREVENT SELF DUPLICATE
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
                "question" &&
                msg.text
            ){

                tempQuestion =
                msg.text;

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
               WEBRTC ANSWER
            ===================== */

            if(
                msg.type ===
                "webrtc-answer"
            ){

                try{

                    if(
                        !peerConnection
                    ){

                        return;

                    }

                    const answerDesc =

                    new RTCSessionDescription(
                        msg.answer
                    );

                    if(
                        !peerConnection
                        .currentRemoteDescription
                    ){

                        await peerConnection
                        .setRemoteDescription(
                            answerDesc
                        );

                        createSystemMessage(
                            "Video Connected"
                        );

                    }

                }catch(err){

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

    });

}


/* =========================
   START CAMERA
========================= */

async function startCamera(){

    try{

        localStream =
        await navigator
        .mediaDevices
        .getUserMedia({

            video:{
                width:1280,
                height:720
            },

            audio:false

        });

        studentVideo.srcObject =
        localStream;

        studentVideo.muted =
        true;

        studentVideo.playsInline =
        true;

        await studentVideo.play();

        await new Promise(resolve => {

            studentVideo.onloadedmetadata =
            () => {

                resolve();

            };

        });

        createPeerConnection();

        localStream
        .getTracks()
        .forEach(track => {

            peerConnection.addTrack(
                track,
                localStream
            );

        });

        await createAndSendOffer();

        if(
            socket &&
            socket.readyState === 1
        ){

            socket.send(

                JSON.stringify({

                    senderId:
                    mySocketId,

                    type:
                    "student-camera-on"

                })

            );

        }

        startMonitoring();

        startFaceDetection();

    }catch(err){

        console.log(err);

        errorBox.innerText =
        "Camera access denied";

    }

}


/* =========================
   CREATE OFFER
========================= */

async function createAndSendOffer(){

    try{

        if(makingOffer){

            return;

        }

        makingOffer = true;

        const offer =

        await peerConnection
        .createOffer();

        await peerConnection
        .setLocalDescription(
            offer
        );

        await waitForIceComplete();

        socket.send(

            JSON.stringify({

                senderId:
                mySocketId,

                type:
                "webrtc-offer",

                offer:
                peerConnection.localDescription

            })

        );

        makingOffer = false;

    }catch(err){

        makingOffer = false;

        console.log(
            "OFFER ERROR:",
            err
        );

    }

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
            direction:"sendrecv"
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

            remoteAudio.play()
            .catch(err => {

                console.log(
                    "AUDIO BLOCKED:",
                    err
                );

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
   ENABLE MIC
========================= */

enableVoiceBtn.onclick =
async () => {

    try{

        if(micEnabled){

            return;

        }

        micEnabled = true;

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

        peerConnection.addTrack(
            audioTrack,
            micStream
        );

        await createAndSendOffer();

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

        if(faceModelsLoaded){

            return true;

        }

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

            console.log(
                "FACE ERROR:",
                err
            );

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
        localStream
        .getVideoTracks();

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

    if(
        socket &&
        socket.readyState === 1
    ){

        socket.send(

            JSON.stringify({

                senderId:
                mySocketId,

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

        createBubble(

            text,

            "answer"

        );

        if(
            socket &&
            socket.readyState === 1
        ){

            socket.send(

                JSON.stringify({

                    senderId:
                    mySocketId,

                    type:
                    "answer",

                    text:text

                })

            );

        }

        try{

            if(!tempQuestion){

                tempQuestion =
                "Unknown Question";

            }

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
                data.success &&
                data.analysis
            ){

                socket.send(

                    JSON.stringify({

                        senderId:
                        mySocketId,

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

        createSystemMessage(
            "Recording..."
        );

    }

};


/* =========================
   STOP
========================= */

stopBtn.onclick = () => {

    if(recognition){

        recognition.stop();

        createSystemMessage(
            "Recording stopped"
        );

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

        errorBox.innerText =
        "Question or answer missing";

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

            <br><br>

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

    muted = !muted;

    muteBtn.innerText =

    muted

    ?

    "Unmute"

    :

    "Mute";

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
   SOCKET STATUS
========================= */

function updateSocketStatus(connected){

    if(!socketStatus){

        return;

    }

    socketStatus.innerHTML =

    connected

    ?

    `
    <span class="status-dot"></span>
    Connected
    `

    :

    `
    <span
    class="status-dot"
    style="background:red;">
    </span>

    Disconnected
    `;

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


/* =========================
   BACK BUTTON
========================= */

function goBack(){

    window.location.href =
    "/dashboard";

}