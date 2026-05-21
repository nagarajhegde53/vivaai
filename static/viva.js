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

let heartbeat = null;

let mode = null;

let tempQuestion = "";

let tempAnswer = "";

let currentBubbleQ = null;

let currentBubbleA = null;

let qaList = [];

let muted = false;
/* =========================
   CHEATING DETECTION
========================= */

let lastAlert = 0;

function sendCheatingAlert(message){

    const now = Date.now();

    // PREVENT SPAM

    if(
        now - lastAlert < 5000
    ){

        return;

    }

    lastAlert = now;

    console.log(
        "CHEATING:",
        message
    );

    if(
        socket &&
        socket.readyState === 1
    ){

        socket.send(

            JSON.stringify({

                type:
                "cheating-alert",

                text:
                message

            })

        );

    }

}

/* =========================
   WEBRTC
========================= */

let localStream = null;

let peerConnection = null;

let pendingCandidates = [];

let webrtcStarted = false;

/* =========================
   FACE DETECTION
========================= */

let faceDetectionStarted = false;

let faceInterval = null;


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

startBtn.onclick = () => {

    startScreen.style.display =
    "none";

    main.style.display =
    "flex";
    /* =====================
   START FULLSCREEN
===================== */

if(
    document.documentElement
    .requestFullscreen
){

    document.documentElement
    .requestFullscreen();

}

    main.style.visibility =
    "visible";

    main.style.opacity =
    "1";

    // SHOW BUTTONS

    const controls =
    document.querySelector(
        ".controls"
    );

    if(controls){

        controls.classList.add(
            "show"
        );

    }

    connectSocket();

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

        // CLEAR OLD HEARTBEAT

        if(heartbeat){

            clearInterval(
                heartbeat
            );

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

        /* =====================
           SIR STOPPED
        ===================== */

        if(
            msg.type ===
            "sir-stopped-speaking"
        ){

            createSystemMessage(
                "Professor stopped speaking"
            );

        }

        /* =====================
           MIC ON
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

                if(!webrtcStarted){

                    await startMedia();

                }

                if(
                    peerConnection &&
                    !peerConnection.remoteDescription
                ){

                    await peerConnection
                    .setRemoteDescription(

                        new RTCSessionDescription(
                            msg.offer
                        )

                    );

                }

                // APPLY PENDING ICE

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
           END VOICE
        ===================== */

        if(
            msg.type ===
            "sir-voice-ended"
        ){

            stopWebRTC();

            createSystemMessage(
                "Professor ended voice chat"
            );

        }

    };

}


/* =========================
   ENABLE VOICE
========================= */

enableVoiceBtn.onclick =
async () => {

    voicePopup.style.display =
    "none";

    await startMedia();

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

            audio:{

                echoCancellation:true,

                noiseSuppression:true,

                autoGainControl:true,

                sampleRate:48000,

                channelCount:1

            }

        });

        webrtcStarted = true;
        /* =====================
   LOAD FACE AI
===================== */

if(!faceDetectionStarted){

    await loadFaceModels();

   

}

        studentVideo.srcObject =
        localStream;
        /* =====================
   WAIT VIDEO READY
===================== */

studentVideo.onloadedmetadata =
() => {

    startFaceDetection();

};

        createPeerConnection();

        localStream
        .getTracks()
        .forEach(track => {

            peerConnection
            .addTrack(
                track,
                localStream
            );

        });

        socket.send(

            JSON.stringify({

                type:
                "student-camera-on"

            })

        );

    }catch(err){

        console.log(
            "Media Error",
            err
        );

        errorBox.innerText =
        "Camera or microphone permission denied";

    }

}


// load models
/* =========================
   LOAD FACE MODELS
========================= */

async function loadFaceModels(){

    if(typeof faceapi === "undefined"){

        console.log(
            "FACE API NOT LOADED"
        );

        return;

    }

    try{

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

        console.log(
            "Face models loaded"
        );

    }catch(err){

        console.log(
            "FACE MODEL ERROR:",
            err
        );

    }

}
/* =========================
   FACE DETECTION
========================= */

function startFaceDetection(){

    if(faceInterval){

        clearInterval(
            faceInterval
        );

    }

    faceDetectionStarted = true;

    faceInterval =
    setInterval(async () => {

        try{

            if(
                !studentVideo ||
                studentVideo.readyState < 2
            ){

                return;

            }

            const detections =

            await faceapi

            .detectAllFaces(

                studentVideo,

                new faceapi
                .TinyFaceDetectorOptions()

            )

            .withFaceLandmarks();

            /* =====================
               NO FACE
            ===================== */

            if(
                detections.length === 0
            ){

                sendCheatingAlert(
                    "Face not visible"
                );

                return;
            }

            /* =====================
               MULTIPLE FACES
            ===================== */

            if(
                detections.length > 1
            ){

                sendCheatingAlert(
                    "Multiple faces detected"
                );

            }

            const landmarks =
            detections[0]
            .landmarks;

            const nose =
            landmarks.getNose();

            const jaw =
            landmarks.getJawOutline();

            const leftEye =
            landmarks.getLeftEye();

            const rightEye =
            landmarks.getRightEye();

            const noseX =
            nose[3].x;

            const leftJaw =
            jaw[0].x;

            const rightJaw =
            jaw[16].x;

            const faceCenter =
            (leftJaw + rightJaw) / 2;

            const diff =
            noseX - faceCenter;

            /* =====================
               LOOKING LEFT/RIGHT
            ===================== */

            if(diff < -20){

                sendCheatingAlert(
                    "Looking left"
                );

            }

            else if(diff > 20){

                sendCheatingAlert(
                    "Looking right"
                );

            }

            /* =====================
               LOOKING DOWN
            ===================== */

            const eyeY =

            (
                leftEye[0].y +
                rightEye[3].y
            ) / 2;

            const noseY =
            nose[6].y;

            if(
                noseY - eyeY > 55
            ){

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

    }, 3000);

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

    peerConnection.onconnectionstatechange =
    () => {

        if(!peerConnection){

            return;

        }

        console.log(
            peerConnection.connectionState
        );

    };

}


/* =========================
   STOP WEBRTC
========================= */

function stopWebRTC(){

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

    studentVideo.srcObject =
    null;

    remoteAudio.srcObject =
    null;

    pendingCandidates = [];

    muted = false;

    webrtcStarted = false;
if(faceInterval){

    clearInterval(
        faceInterval
    );

    faceInterval = null;

}
}


/* =========================
   WEB SPEECH API
========================= */

if(

    "SpeechRecognition" in window ||

    "webkitSpeechRecognition" in window

){

    const SpeechRecognition =

    window.SpeechRecognition ||

    window.webkitSpeechRecognition;

    recognition =
    new SpeechRecognition();

    recognition.continuous =
    false;

    recognition.interimResults =
    false;

    recognition.lang =
    "en-US";

    recognition.maxAlternatives =
    1;

    recognition.onstart = () => {

        console.log(
            "Recording Started"
        );

        createSystemMessage(
            "Recording answer..."
        );

    };

    recognition.onresult =
    (event) => {

        console.log(
            "Speech Result:",
            event
        );

        const transcript =

        event.results[0][0]
        .transcript
        .trim();

        if(
            !transcript
        ){

            return;

        }

        tempAnswer =
        transcript;

        // REMOVE OLD

        if(currentBubbleA){

            currentBubbleA.remove();

        }

        // SHOW NEW

        currentBubbleA =
        createBubble(

            `You: ${transcript}`,

            "answer"

        );

        // SEND TO SIR PAGE

        if(
            socket &&
            socket.readyState === 1
        ){

            socket.send(

                JSON.stringify({

                    type:"answer",

                    text:transcript

                })

            );

        }
// api live analysis
fetch("/api/live-analysis", {

    method:"POST",

    headers:{
        "Content-Type":
        "application/json"
    },

    body:JSON.stringify({

        question:
        tempQuestion,

        answer:
        transcript

    })

})
.then(async (res) => {

    console.log(
        "LIVE ANALYSIS STATUS:",
        res.status
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

        console.log(
            "SENDING LIVE ANALYSIS:",
            data.analysis
        );

        socket.send(

            JSON.stringify({

                type:
                "live-analysis",

                analysis:
                data.analysis

            })

        );

    }

    else{

        console.log(
            "LIVE ANALYSIS FAILED"
        );

    }

})
.catch(err => {

    console.log(
        "LIVE ANALYSIS ERROR:",
        err
    );

});}
    // end 

    recognition.onerror =
    (event) => {

        console.log(
            "Speech Error:",
            event.error
        );

        errorBox.innerText =

        "Mic Error: " +

        event.error;

    };

    recognition.onend = () => {

        console.log(
            "Recording Stopped"
        );

    };

}


/* =========================
   RECORD ANSWER
========================= */

recordBtn.onclick = () => {

    errorBox.innerText =
    "";

    if(!recognition){

        errorBox.innerText =
        "Speech recognition unsupported";

        return;

    }

    try{

        recognition.stop();

    }catch(e){}

    setTimeout(() => {

        recognition.start();

    }, 200);

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

    // PREVENT DUPLICATE

    const exists =
    qaList.some(q =>

        q.question ===
        tempQuestion &&

        q.answer ===
        tempAnswer

    );

    if(exists){

        errorBox.innerText =
        "Already stored";

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
   TAB SWITCH DETECTION
========================= */

document.addEventListener(

    "visibilitychange",

    () => {

        if(document.hidden){

            sendCheatingAlert(

                "Tab switching detected"

            );

        }

    }

);


/* =========================
   FULLSCREEN EXIT DETECTION
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
   CLEANUP
========================= */

window.addEventListener(
    "beforeunload",
    () => {

        stopWebRTC();

        if(socket){

            socket.close();

        }

    }
);