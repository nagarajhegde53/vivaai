/* =========================
   ELEMENTS
========================= */

const questionInput =
document.getElementById(
    "questionInput"
);

const sendBtn =
document.getElementById(
    "sendBtn"
);

const chatBox =
document.getElementById(
    "chatBox"
);

const startVoiceBtn =
document.getElementById(
    "startVoiceBtn"
);

const stopVoiceBtn =
document.getElementById(
    "stopVoiceBtn"
);

const muteBtn =
document.getElementById(
    "muteBtn"
);

const endBtn =
document.getElementById(
    "endBtn"
);

const studentVideo =
document.getElementById(
    "studentLiveVideo"
);

const socketStatus =
document.querySelector(
    ".socket-status"
);


/* =========================
   USER
========================= */

// COMPATIBLE WITH
// YOUR CURRENT LOGIN SYSTEM

const sirData =
localStorage.getItem(
    "user"
);

if(!sirData){

    window.location.href =
    "/";

}

const sir =
JSON.parse(sirData);

if(
    !sir ||
    !sir.room_id
){

    console.log(
        "Invalid sir session"
    );

    window.location.href =
    "/";

}


/* =========================
   GLOBALS
========================= */

let socket = null;

let localStream = null;

let peerConnection = null;

let webrtcStarted = false;

let muted = false;

let pendingCandidates = [];

let reconnecting = false;


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
   CONNECT SOCKET
========================= */

connectSocket();

function connectSocket(){

    const protocol =

    window.location.protocol ===
    "https:"

    ?

    "wss"

    :

    "ws";

    socket =
    new WebSocket(

        `${protocol}://${window.location.host}/ws/viva/${sir.room_id}`

    );

    socket.onopen = () => {

        console.log(
            "Sir Connected"
        );

        reconnecting = false;

        if(socketStatus){

            socketStatus.innerHTML =

            `
            <span class="status-dot"></span>
            Connected
            `;

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

        if(socketStatus){

            socketStatus.innerHTML =

            `
            <span class="status-dot offline"></span>
            Disconnected
            `;

        }

        // AUTO RECONNECT

        if(!reconnecting){

            reconnecting = true;

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
           STUDENT ANSWER
        ===================== */

        if(
            msg.type ===
            "answer"
        ){

            createBubble(

                `Student: ${msg.text}`,

                "answer"

            );

        }

        /* =====================
           STUDENT CAMERA
        ===================== */

        if(
            msg.type ===
            "student-camera-on"
        ){

            createSystemMessage(
                "Student camera enabled"
            );

        }

        /* =====================
           STUDENT MUTED
        ===================== */

        if(
            msg.type ===
            "student-muted"
        ){

            createSystemMessage(
                "Student muted microphone"
            );

        }

        /* =====================
           STUDENT UNMUTED
        ===================== */

        if(
            msg.type ===
            "student-unmuted"
        ){

            createSystemMessage(
                "Student unmuted microphone"
            );

        }

        /* =====================
           STUDENT LEFT
        ===================== */

        if(
            msg.type ===
            "student-left"
        ){

            createSystemMessage(
                "Student left viva"
            );

            stopWebRTC();

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
                    peerConnection &&
                    !peerConnection.currentRemoteDescription
                ){

                    await peerConnection
                    .setRemoteDescription(

                        new RTCSessionDescription(
                            msg.answer
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

                        console.log(
                            "Pending ICE Error",
                            err
                        );

                    }

                }

                pendingCandidates = [];

            }catch(err){

                console.log(
                    "Answer Error",
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
                    !msg.candidate
                ){

                    return;

                }

                if(
                    peerConnection &&
                    peerConnection.remoteDescription &&
                    peerConnection.remoteDescription.type
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
                    "ICE Error",
                    err
                );

            }

        }

    };

}


/* =========================
   SEND QUESTION
========================= */

sendBtn.onclick = () => {

    const text =
    questionInput.value.trim();

    if(!text){

        return;

    }

    createBubble(

        `You: ${text}`,

        "question"

    );

    if(
        socket &&
        socket.readyState === 1
    ){

        socket.send(

            JSON.stringify({

                type:"question",

                text:text

            })

        );

    }

    questionInput.value =
    "";

};


/* =========================
   ENTER KEY
========================= */

questionInput.addEventListener(
    "keydown",
    (e) => {

        if(
            e.key === "Enter"
        ){

            sendBtn.click();

        }

    }
);


/* =========================
   START VOICE
========================= */

startVoiceBtn.onclick =
async () => {

    try{

        if(
            peerConnection
        ){

            stopWebRTC();

        }

        if(webrtcStarted){

            return;

        }

        if(
            !socket ||
            socket.readyState !== 1
        ){

            return;

        }

        // NOTIFY STUDENT

        socket.send(

            JSON.stringify({

                type:
                "sir-mic-on"

            })

        );

        // CAMERA + MIC

        localStream =
        await navigator
        .mediaDevices
        .getUserMedia({

            video:{

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

        createPeerConnection();

        // ADD TRACKS

        localStream
        .getTracks()
        .forEach(track => {

            peerConnection
            .addTrack(
                track,
                localStream
            );

        });

        // OFFER

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

        // SEND OFFER

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

        createSystemMessage(
            "Voice chat started"
        );

    }catch(err){

        console.log(
            "Voice Start Error",
            err
        );

    }

};


/* =========================
   CREATE PEER
========================= */

function createPeerConnection(){

    peerConnection =
    new RTCPeerConnection(
        rtcConfig
    );

    /* =====================
       RECEIVE STREAM
    ===================== */

    peerConnection.ontrack =
    async (event) => {

        try{

            const remoteStream =
            event.streams[0];

            console.log(
                "TRACK:",
                event.track.kind
            );

            // PREVENT DUPLICATE

            if(
                studentVideo &&
                studentVideo.srcObject ===
                remoteStream
            ){

                return;

            }

            if(studentVideo){

                studentVideo.srcObject =
                remoteStream;

                studentVideo.autoplay =
                true;

                studentVideo.playsInline =
                true;

                studentVideo.muted =
                false;

                studentVideo.style.objectFit =
                "cover";

                try{

                    await studentVideo.play();

                }catch(err){

                    console.log(
                        "Video Play Error",
                        err
                    );

                }

            }

        }catch(err){

            console.log(
                "Track Error",
                err
            );

        }

    };

    /* =====================
       ICE
    ===================== */

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

    /* =====================
       CONNECTION STATE
    ===================== */

    peerConnection.onconnectionstatechange =
    () => {

        if(!peerConnection){

            return;

        }

        console.log(

            "Connection State:",

            peerConnection.connectionState

        );

        if(
            peerConnection.connectionState ===
            "connected"
        ){

            createSystemMessage(
                "Voice connected"
            );

        }

        if(
            peerConnection.connectionState ===
            "disconnected"
        ){

            createSystemMessage(
                "Trying to reconnect..."
            );

        }

        if(
            peerConnection.connectionState ===
            "failed"
        ){

            createSystemMessage(
                "Connection unstable"
            );

        }

    };

}


/* =========================
   STOP VOICE
========================= */

stopVoiceBtn.onclick = () => {

    stopWebRTC();

    if(
        socket &&
        socket.readyState === 1
    ){

        socket.send(

            JSON.stringify({

                type:
                "sir-voice-ended"

            })

        );

    }

};


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

    if(studentVideo){

        studentVideo.srcObject =
        null;

    }

    pendingCandidates = [];

    muted = false;

    webrtcStarted = false;

    if(chatBox){

        createSystemMessage(
            "Voice chat stopped"
        );

    }

}


/* =========================
   MUTE / UNMUTE
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

    if(
        socket &&
        socket.readyState === 1
    ){

        socket.send(

            JSON.stringify({

                type:

                muted

                ?

                "sir-muted"

                :

                "sir-unmuted"

            })

        );

    }

};


/* =========================
   END VIVA
========================= */

endBtn.onclick = () => {

    stopWebRTC();

    if(
        socket &&
        socket.readyState === 1
    ){

        socket.onclose = null;

        socket.send(

            JSON.stringify({

                type:
                "sir-voice-ended"

            })

        );

        socket.close();

    }

    window.location.href =
    "/";

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