/* =========================================================
   FINAL PRODUCTION viva.js
   FULLY FIXED ADVANCED VERSION
   PRESERVES ALL FEATURES
   LOW LATENCY
   ON-DEMAND VIDEO
   ON-DEMAND AUDIO
   FIXED SPEECH API
   FIXED AUDIO NEGOTIATION
   FIXED ANSWER STREAMING
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

let alreadyConnected = false;

let makingOffer = false;

let streamStarted = false;

let voiceStarted = false;

let recognitionRunning = false;

let localVideoStream = null;

let localAudioStream = null;

let localVideoTrack = null;

let localAudioTrack = null;


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

        await loadFaceModels();

        startMonitoring();

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

            reconnecting =
            false;

            updateSocketStatus(
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

            updateSocketStatus(
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

                    await connectSocket();

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
            QUESTION
            */

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

            /*
            START VIDEO
            */

            if(
                msg.type ===
                "start-stream"
            ){

                if(streamStarted){

                    return;

                }

                streamStarted =
                true;

                await initializeVideo();

                await startVideoStreaming();

            }

            /*
            STOP STREAM
            */

            if(
                msg.type ===
                "stop-stream"
            ){

                stopStreaming();

            }

            /*
            START AUDIO
            */

            if(
                msg.type ===
                "connect-voice"
            ){

                if(voiceStarted){

                    return;

                }

                voiceStarted =
                true;

                await initializeAudio();

                addAudioTrack();

            }

            /*
            STOP AUDIO
            */

            if(
                msg.type ===
                ""
            ){
disconnect-voice
                voiceStarted =
                false;

                if(localAudioTrack){

                    if(localAudioTrack){

    localAudioTrack.stop();

    localAudioTrack = null;

}

if(localAudioStream){

    localAudioStream
    .getTracks()
    .forEach(track => {

        track.stop();

    });

    localAudioStream = null;

}
                }

            }

            /*
            WEBRTC ANSWER
            */

            if(
                msg.type ===
                "webrtc-answer"
            ){

                try{

                    if(!peerConnection){

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

                    }

                }catch(err){

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
   VIDEO INIT
========================= */

async function initializeVideo(){

    try{

        if(localVideoTrack){

            return;

        }

        localVideoStream =
        await navigator
        .mediaDevices
        .getUserMedia({

            video:{

                width:640,

                height:360,

                frameRate:20

            }

        });

        localVideoTrack =
        localVideoStream
        .getVideoTracks()[0];

        studentVideo.srcObject =
        localVideoStream;

        studentVideo.autoplay =
        true;

        studentVideo.playsInline =
        true;

        studentVideo.muted =
        true;

        studentVideo.play()
        .catch(err => {

            console.log(err);

        });

        setTimeout(() => {

            startFaceDetection();

        }, 1000);

    }catch(err){

        console.log(err);

    }

}


/* =========================
   AUDIO INIT
========================= */

async function initializeAudio(){

    try{

        if(localAudioTrack){

            return;

        }

        localAudioStream =
        await navigator
        .mediaDevices
        .getUserMedia({

            audio:true

        });

        localAudioTrack =
        localAudioStream
        .getAudioTracks()[0];

        localAudioTrack.enabled =
        !muted;

    }catch(err){

        console.log(err);

    }

}


/* =========================
   START VIDEO STREAM
========================= */

async function startVideoStreaming(){

    try{

        createPeerConnection();

        peerConnection.addTrack(

            localVideoTrack,

            localVideoStream

        );

        await createAndSendOffer();

        sendSocket({

            type:
            "student-camera-on"

        });

        createSystemMessage(
            "Video Streaming Started"
        );

    }catch(err){

        console.log(err);

    }

}


/* =========================
   ADD AUDIO TRACK
========================= */

function addAudioTrack(){

    if(
        !peerConnection ||
        !localAudioTrack
    ){

        return;

    }

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

    if(alreadyAdded){

        localAudioTrack.enabled =
        !muted;

        return;

    }

    peerConnection.addTrack(

        localAudioTrack,

        localAudioStream

    );

    /*
    IMPORTANT FIX
    */

    createAndSendOffer();

}


/* =========================
   STOP STREAM
========================= */

function stopStreaming(){

    streamStarted =
    false;

    voiceStarted =
    false;

    if(localVideoTrack){

        localVideoTrack.stop();

        localVideoTrack =
        null;

    }

    if(localAudioTrack){

        localAudioTrack.stop();

        localAudioTrack =
        null;

    }

    if(peerConnection){

        peerConnection.close();

        peerConnection =
        null;

    }

    studentVideo.srcObject =
    null;

    remoteAudio.srcObject =
    null;

    createSystemMessage(
        "Streaming Stopped"
    );

}


/* =========================
   OFFER
========================= */

async function createAndSendOffer(){

    try{

        if(makingOffer){

            return;

        }

        makingOffer =
        true;

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

        makingOffer =
        false;

    }catch(err){

        makingOffer =
        false;

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

        const remoteStream =
        event.streams[0];

        /*
        PROFESSOR AUDIO
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
            1;

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

    if(!localVideoStream){

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

        if(document.hidden){

            sendCheatingAlert(
                "Tab switched"
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

    recognition.onstart =
    () => {

        recognitionRunning =
        true;

    };

    recognition.onend =
    () => {

        recognitionRunning =
        false;

        /*
        RESTORE AUDIO
        */

        if(
            voiceStarted &&
            localAudioTrack
        ){

            localAudioTrack.enabled =
            !muted;

        }

    };

    recognition.onerror =
    (err) => {

        console.log(err);

    };

    recognition.onresult =
    async (e) => {

        try{

            const text =
            e.results[0][0]
            .transcript;

            tempAnswer =
            text;

            createBubble(
                text,
                "answer"
            );

            /*
            SEND TO SIR
            */

            sendSocket({

                type:"answer",

                text:text

            });

            /*
            RESTORE AUDIO
            */

            if(
                voiceStarted &&
                localAudioTrack
            ){

                localAudioTrack.enabled =
                !muted;

            }

        }catch(err){

            console.log(err);

        }

    };

}


/* =========================
   RECORD ANSWER
========================= */

recordBtn.onclick =
async () => {

    try{

        if(
            recognitionRunning
        ){

            return;

        }

        /*
        TEMP DISABLE MIC STREAM
        */

        if(localAudioTrack){

            localAudioTrack.enabled =
            false;

        }

        recognition.start();

    }catch(err){

        console.log(err);

    }

};


/* =========================
   STOP RECORDING
========================= */

stopBtn.onclick =
() => {

    if(recognition){

        recognition.stop();

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
   STORED
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
   BACK
========================= */

function goBack(){

    window.location.href =
    "/dashboard";

}