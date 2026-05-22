/* =========================================================
   FINAL PRODUCTION viva.js
   ADVANCED + STABLE + LOW LATENCY
   MOBILE + DESKTOP COMPATIBLE
   NO FEATURES REMOVED
   SINGLE NEGOTIATION ARCHITECTURE
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

let peerConnection = null;

let localStream = null;

let recognition = null;

let reconnecting = false;

let reconnectTimeout = null;

let pendingCandidates = [];

let qaList = [];

let tempQuestion = "";

let tempAnswer = "";

let muted = false;

let faceDetectionInterval = null;

let monitorInterval = null;

let faceModelsLoaded = false;

let localAudioTrack = null;

let localVideoTrack = null;

let professorVoiceActive = false;

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

    bundlePolicy:"max-bundle",

    rtcpMuxPolicy:"require",

    sdpSemantics:"unified-plan"

};


/* =========================
   START
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

        await startMedia();

    }catch(err){

        console.log(err);

    }

};


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

            if(reconnecting){

                return;

            }

            reconnecting = true;

            clearTimeout(
                reconnectTimeout
            );

            reconnectTimeout =
            setTimeout(async () => {

                try{

                    await connectSocket();

                }catch(err){

                    console.log(err);

                }

                reconnecting = false;

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

            /* =====================
               QUESTION
            ===================== */

            if(
                msg.type ===
                "question"
            ){

                tempQuestion =
                msg.text;

                createBubble(

                    `Professor: ${msg.text}`,

                    "question"

                );

            }

            /* =====================
               MIC ON
            ===================== */

            if(
                msg.type ===
                "sir-mic-on"
            ){

                professorVoiceActive =
                true;

                if(localAudioTrack){

                    localAudioTrack.enabled =
                    !muted;

                }

                showVoicePopup(
                    "Professor microphone is now active."
                );

            }

            /* =====================
               MIC OFF
            ===================== */

            if(
                msg.type ===
                "sir-mic-off"
            ){

                professorVoiceActive =
                false;

                if(localAudioTrack){

                    localAudioTrack.enabled =
                    false;

                }

                showVoicePopup(
                    "Professor ended voice communication."
                );

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

                        peerConnection
                        .getReceivers()
                        .forEach(receiver => {

                            if(
                                receiver.track &&
                                receiver.track.kind ===
                                "audio"
                            ){

                                receiver.track.enabled =
                                true;

                            }

                        });

                        createSystemMessage(
                            "Connected To Professor"
                        );

                    }

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
   MEDIA
========================= */

async function startMedia(){

    try{

        localStream =
        await navigator
        .mediaDevices
        .getUserMedia({

            video:{

                width:640,

                height:360,

                frameRate:20

            },

            audio:true

        });

        studentVideo.srcObject =
        localStream;

        studentVideo.autoplay =
        true;

        studentVideo.playsInline =
        true;

        studentVideo.muted =
        true;

        studentVideo.setAttribute(
            "autoplay",
            true
        );

        studentVideo.setAttribute(
            "playsinline",
            true
        );

        studentVideo.setAttribute(
            "muted",
            true
        );

        setTimeout(async () => {

            try{

                await studentVideo.play();

            }catch(err){

                console.log(err);

            }

        }, 500);

        localVideoTrack =
        localStream
        .getVideoTracks()[0];

        localAudioTrack =
        localStream
        .getAudioTracks()[0];

        localAudioTrack.enabled =
        false;

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

        sendSocket({

            type:
            "student-camera-on"

        });

        setTimeout(async () => {

            await startFaceDetection();

        }, 3000);

        startMonitoring();

    }catch(err){

        console.log(err);

        errorBox.innerText =
        "Camera/Microphone access denied";

    }

}


/* =========================
   OFFER
========================= */

async function createAndSendOffer(){

    try{

        if(makingOffer){

            return;

        }

        makingOffer = true;

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
            "webrtc-offer",

            offer:
            peerConnection.localDescription

        });

        makingOffer = false;

    }catch(err){

        makingOffer = false;

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

            event.track.enabled =
            true;

            remoteAudio.srcObject =
            remoteStream;

            remoteAudio.autoplay =
            true;

            remoteAudio.playsInline =
            true;

            remoteAudio.muted =
            false;

            remoteAudio.load();

            setTimeout(() => {

                remoteAudio.play()
                .catch(err => {

                    console.log(err);

                });

            }, 700);

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

    peerConnection.onconnectionstatechange =
    () => {

        console.log(

            "RTC STATE:",

            peerConnection.connectionState

        );

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
   FACE MODELS
========================= */

async function loadFaceModels(){

    try{

        if(faceModelsLoaded){

            return true;

        }

        if(typeof faceapi === "undefined"){

            return false;

        }

        await Promise.all([

            faceapi.nets
            .tinyFaceDetector
            .loadFromUri(
                "/static/models"
            ),

            faceapi.nets
            .faceLandmark68Net
            .loadFromUri(
                "/static/models"
            )

        ]);

        faceModelsLoaded =
        true;

        createSystemMessage(
            "Face Detection Active"
        );

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
   MONITOR
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
   CHEATING
========================= */

function sendCheatingAlert(text){

    sendSocket({

        type:
        "cheating-alert",

        text:text

    });

}


/* =========================
   SPEECH
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

        sendSocket({

            type:
            "answer",

            text:text

        });

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

                        answer:
                        text

                    })

                }

            );

            const data =
            await res.json();

            if(data.success){

                sendSocket({

                    type:
                    "live-analysis",

                    analysis:
                    data.analysis

                });

            }

        }catch(err){

            console.log(err);

        }

    };

}


/* =========================
   RECORD
========================= */

recordBtn.onclick =
() => {

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

stopBtn.onclick =
() => {

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

storeBtn.onclick =
() => {

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

muteBtn.onclick =
() => {

    muted = !muted;

    if(localAudioTrack){

        localAudioTrack.enabled =
        !muted &&
        professorVoiceActive;

    }

    muteBtn.innerText =

    muted

    ?

    "Unmute"

    :

    "Mute";

};


/* =========================
   UI
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


function showVoicePopup(text){

    if(!voicePopup){

        return;

    }

    voicePopup.style.display =
    "flex";

    const popupText =
    voicePopup.querySelector(
        "p"
    );

    if(popupText){

        popupText.innerText =
        text;

    }

    setTimeout(() => {

        voicePopup.style.display =
        "none";

    }, 3000);

}


/* =========================
   SOCKET STATUS
========================= */

function updateSocketStatus(connected){

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
   FULLSCREEN
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
   BACK
========================= */

function goBack(){

    window.location.href =
    "/dashboard";

}