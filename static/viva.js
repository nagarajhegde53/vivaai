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

const voicePopup =
document.getElementById(
    "voicePopup"
);

const enableVoiceBtn =
document.getElementById(
    "enableVoiceBtn"
);

const remoteAudio =
document.getElementById(
    "remoteAudio"
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

if(
    !user ||
    !user.room_id
){

    window.location.href =
    "/dashboard";

}


/* =========================
   GLOBALS
========================= */

let socket = null;

let recognition = null;

let reconnectTimeout = null;

let reconnecting = false;

let mode = null;

let tempQuestion = "";

let tempAnswer = "";

let currentBubbleQ = null;

let currentBubbleA = null;

let qaList = [];

let muted = false;

let faceDetectionInterval = null;

let cameraMonitorInterval = null;


/* =========================
   WEBRTC
========================= */

let localStream = null;

let peerConnection = null;

let pendingCandidates = [];

let webrtcStarted = false;


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
   START VIVA
========================= */

startBtn.onclick =
async () => {

    startScreen.style.display =
    "none";

    main.style.display =
    "flex";


      document
    .querySelector(".controls")
    .classList.add("show");

    connectSocket();

    await startMedia();

};


/* =========================
   CONNECT SOCKET
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

        `${protocol}://${window.location.host}/ws/viva/${user.room_id}`

    );

    socket.onopen = () => {

        console.log(
            "Connected"
        );

        reconnecting = false;

        createSystemMessage(
            "Connected to viva room"
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

        console.log(
            "Socket Closed"
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
           SIR SPEAKING
        ===================== */

        if(
            msg.type ===
            "sir-speaking"
        ){

            createSystemMessage(
                "Professor started speaking"
            );

        }

        if(
            msg.type ===
            "sir-stopped-speaking"
        ){

            createSystemMessage(
                "Professor stopped speaking"
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

        createSystemMessage(
            "WebRTC connected"
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

                console.log(err);

            }

        }

        /* =====================
           VOICE END
        ===================== */

        if(
            msg.type ===
            "sir-voice-ended"
        ){

            createSystemMessage(
                "Professor ended voice chat"
            );

        }

    };

}


/* =========================
   ENABLE MICROPHONE
========================= */

async function enableMicrophone(){

    try{

        const micStream =

        await navigator
        .mediaDevices
        .getUserMedia({

            audio:{

                echoCancellation:true,

                noiseSuppression:true,

                autoGainControl:true

            }

        });

        const audioTrack =

        micStream
        .getAudioTracks()[0];

        localStream.addTrack(
            audioTrack
        );

        if(peerConnection){

            peerConnection.addTrack(
                audioTrack,
                localStream
            );

        }

        createSystemMessage(
            "Microphone enabled"
        );

    }catch(err){

        console.log(
            "MIC ERROR:",
            err
        );

    }

}


/* =========================
   ENABLE VOICE
========================= */

enableVoiceBtn.onclick =
async () => {

    voicePopup.style.display =
    "none";

    await enableMicrophone();

};


/* =========================
   START MEDIA
========================= */

async function startMedia(){

    try{

        if(peerConnection){

            stopWebRTC();

        }

        localStream =
        await navigator
        .mediaDevices
        .getUserMedia({

            video:{

                facingMode:"user",

                width:{
                    ideal:640
                },

                height:{
                    ideal:360
                },

                frameRate:{
                    ideal:15,
                    max:18
                }

            },

            audio:false

        });

        webrtcStarted = true;

        studentVideo.srcObject =
        localStream;

        createPeerConnection();

        /* =====================
           ADD VIDEO TRACKS
        ===================== */

        localStream
        .getVideoTracks()
        .forEach(track => {

            peerConnection.addTrack(
                track,
                localStream
            );

        });

        /* =====================
           CREATE OFFER
        ===================== */

        const offer =

        await peerConnection
        .createOffer({

            offerToReceiveVideo:true,

            offerToReceiveAudio:true

        });

        await peerConnection
        .setLocalDescription(
            offer
        );

        if(
            socket &&
            socket.readyState === 1
        ){

            socket.send(

                JSON.stringify({

                    type:
                    "webrtc-offer",

                    offer:
                    peerConnection.localDescription

                })

            );

        }

        studentVideo.onloadedmetadata =
        () => {

            startFaceDetection();

            monitorCamera();

        };

        if(
            socket &&
            socket.readyState === 1
        ){

            socket.send(

                JSON.stringify({

                    type:
                    "student-camera-on"

                })

            );

        }

    }catch(err){

        console.log(
            "Media Error",
            err
        );

        errorBox.innerText =
        "Camera access denied";

    }

}


/* =========================
   CREATE PEER
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

        }catch(err){

            console.log(err);

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
   LOAD FACE MODELS
========================= */
/* =========================
   LOAD FACE MODELS
========================= */

let faceModelsLoaded = false;

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

        faceModelsLoaded = true;

        console.log(
            "Face models loaded"
        );

        return true;

    }catch(err){

        console.log(
            "FACE MODEL ERROR:",
            err
        );

        return false;

    }

}


/* =========================
   FACE DETECTION
========================= */
// const loaded =
// await loadFaceModels();

// if(!loaded){

//     return;

// }
/* =========================
   FACE DETECTION
========================= */

async function startFaceDetection(){

    try{

        const loaded =
        await loadFaceModels();

        if(!loaded){

            console.log(
                "Face models failed"
            );

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

                if(!faceModelsLoaded){

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
                    "FACE DETECTION ERROR:",
                    err
                );

            }

        }, 4000);

    }catch(err){

        console.log(
            "FACE INIT ERROR:",
            err
        );

    }

}
/* =========================
   CAMERA MONITOR
========================= */

function monitorCamera(){

    if(cameraMonitorInterval){

        clearInterval(
            cameraMonitorInterval
        );

    }

    cameraMonitorInterval =
    setInterval(() => {

        if(!localStream){

            return;

        }

        const videoTracks =

        localStream.getVideoTracks();

        if(
            videoTracks.length === 0
        ){

            sendCheatingAlert(
                "Camera disconnected"
            );

            return;
        }

        const track =
        videoTracks[0];

        if(
            !track.enabled
        ){

            sendCheatingAlert(
                "Camera turned off"
            );

        }

        if(
            track.readyState ===
            "ended"
        ){

            sendCheatingAlert(
                "Camera access lost"
            );

        }

    }, 3000);

}


/* =========================
   CHEATING ALERT
========================= */

function sendCheatingAlert(text){

    console.log(
        "CHEATING:",
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

        if(
            mode ===
            "answer"
        ){

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

            if(
                socket &&
                socket.readyState === 1
            ){

                socket.send(

                    JSON.stringify({

                        type:
                        "answer",

                        text:text

                    })

                );

            }

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

                console.log(
                    "LIVE ANALYSIS RESPONSE:",
                    data
                );

                if(
                    data.success &&
                    socket &&
                    socket.readyState === 1
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

                console.log(
                    "LIVE ANALYSIS ERROR:",
                    err
                );

            }

        }

    };

}


/* =========================
   RECORD ANSWER
========================= */

recordBtn.onclick = () => {

    mode = "answer";

    errorBox.innerText =
    "";

    if(!recognition){

        errorBox.innerText =
        "Speech recognition unsupported";

        return;

    }

    try{

        recognition.abort();

    }catch(e){}

    setTimeout(() => {

        recognition.start();

    }, 150);

};


/* =========================
   STOP RECORDING
========================= */

stopBtn.onclick = () => {

    if(recognition){

        recognition.stop();

    }

};


/* =========================
   STORE Q&A
========================= */

storeBtn.onclick = () => {

    errorBox.innerText =
    "";

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

    if(currentBubbleQ){

        currentBubbleQ.remove();

    }

    if(currentBubbleA){

        currentBubbleA.remove();

    }

    currentBubbleQ = null;

    currentBubbleA = null;

    tempQuestion = "";

    tempAnswer = "";

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

    errorBox.innerText =
    "";

    if(
        qaList.length === 0
    ){

        errorBox.innerText =
        "Store at least one Q&A";

        return;

    }

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

        console.log(data);

        if(data.success){

            localStorage.setItem(

                "evaluation",

                JSON.stringify(
                    data.result || {}
                )

            );

            stopWebRTC();

            if(socket){

                socket.send(

                    JSON.stringify({

                        type:
                        "student-left"

                    })

                );

                socket.close();

            }

            window.location.href =
            "/result";

        }

        else{

            errorBox.innerText =

            data.message ||

            "Evaluation failed";

        }

    }catch(err){

        console.log(err);

        errorBox.innerText =
        "Server error";

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

    muteBtn.innerText =

    muted

    ?

    "Unmute"

    :

    "Mute";

};


/* =========================
   STOP WEBRTC
========================= */

function stopWebRTC(){

    if(faceDetectionInterval){

        clearInterval(
            faceDetectionInterval
        );

    }

    if(cameraMonitorInterval){

        clearInterval(
            cameraMonitorInterval
        );

    }

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

    webrtcStarted = false;

}


/* =========================
   CREATE BUBBLE
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
   BACK
========================= */

function goBack(){

    stopWebRTC();

    if(socket){

        socket.send(

            JSON.stringify({

                type:
                "student-left"

            })

        );

        socket.close();

    }

    window.location.href =
    "/dashboard";

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