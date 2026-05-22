/* =========================================================
   FINAL PRODUCTION viva.js
   FULL ADVANCED STABLE VERSION
   VIDEO STREAM ONLY
   NO AUDIO CONFLICTS
   FULL FACE DETECTION
   FULL MONITORING
   FULL LIVE TRANSCRIPT
   FULL STORED Q&A
   FULL SIR COMPATIBILITY
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

const studentVideo =
document.getElementById(
    "studentVideo"
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

let faceDetectionInterval = null;

let monitorInterval = null;

let faceModelsLoaded = false;

let alreadyConnected = false;

let makingOffer = false;

let streamStarted = false;

let recognitionRunning = false;

let localVideoStream = null;

let localVideoTrack = null;


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
            PROFESSOR QUESTION
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
            START VIDEO STREAM
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
            STOP VIDEO STREAM
            */

            if(
                msg.type ===
                "stop-stream"
            ){

                stopStreaming();

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

        /*
        START FACE DETECTION
        */

        setTimeout(() => {

            startFaceDetection();

        }, 1000);

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
   STOP STREAM
========================= */

function stopStreaming(){

    streamStarted =
    false;

    if(localVideoTrack){

        localVideoTrack.stop();

        localVideoTrack =
        null;

    }

    if(peerConnection){

        peerConnection.close();

        peerConnection =
        null;

    }

    studentVideo.srcObject =
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

            /*
            NO FACE
            */

            if(!detection){

                sendCheatingAlert(
                    "Face not visible"
                );

                return;

            }

            /*
            LOOKING SIDE
            */

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

    };

    recognition.onerror =
    (err) => {

        console.log(err);

        recognitionRunning =
        false;

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

        }catch(err){

            console.log(err);

        }

    };

}


/* =========================
   RECORD ANSWER
========================= */

recordBtn.onclick =
() => {

    try{

        if(
            recognitionRunning
        ){

            return;

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
   STORE Q&A
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
   STORED RENDER
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