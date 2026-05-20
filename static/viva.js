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

let mode = null;

let tempQuestion = "";

let tempAnswer = "";

let currentBubbleQ = null;

let currentBubbleA = null;

let qaList = [];

let reconnectTimeout = null;

let reconnecting = false;


/* =========================
   WEBRTC
========================= */

let localStream = null;

let peerConnection = null;

let muted = false;

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

    iceCandidatePoolSize:10

};


/* =========================
   START VIVA
========================= */

startBtn.onclick = () => {

    startScreen.style.display =
    "none";

    main.style.display =
    "flex";

    connectSocket();

};


/* =========================
   CONNECT SOCKET
========================= */

function connectSocket(){

    const protocol =

    window.location.protocol ===
    "https:"

    ?

    "wss"

    :

    "ws";

    const socketUrl =

    `${protocol}://${window.location.host}/ws/viva/${user.room_id}`;

    console.log(
        "Connecting:",
        socketUrl
    );

    socket =
    new WebSocket(
        socketUrl
    );

    socket.onopen = () => {

        console.log(
            "Student Connected"
        );

        reconnecting = false;

        if(reconnectTimeout){

            clearTimeout(
                reconnectTimeout
            );

        }

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
           SIR MIC ON
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

                    await startStudentMedia();

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

                // APPLY ICE

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

                console.log(
                    err
                );

            }

        }

        /* =====================
           VOICE END
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

    await startStudentMedia();

};


/* =========================
   START MEDIA
========================= */

async function startStudentMedia(){

    try{

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

                autoGainControl:true

            }

        });

        webrtcStarted = true;

        // HIDDEN LOCAL VIDEO

        studentVideo.srcObject =
        localStream;

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
            socket
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

    muted = false;

    webrtcStarted = false;

    pendingCandidates = [];

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
    (e) => {

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

            socket.send(

                JSON.stringify({

                    type:
                    "answer",

                    text:text

                })

            );

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

            socket.send(

                JSON.stringify({

                    type:
                    "student-left"

                })

            );

            socket.close();

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