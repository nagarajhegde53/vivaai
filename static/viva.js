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

const controls =
document.querySelector(
    ".controls"
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

if(!user.room_id){

    window.location.href =
    "/dashboard";

}


/* =========================
   GLOBALS
========================= */

let recognition = null;

let mode = null;

let tempQuestion = "";

let tempAnswer = "";

let currentBubbleQ = null;

let currentBubbleA = null;

let qaList = [];

let socket = null;


/* =========================
   WEBRTC
========================= */

let localStream = null;

let peerConnection = null;

let webrtcEnabled = false;

let muted = false;

let pendingCandidates = [];

let remoteStreamAttached =
false;


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

    setTimeout(() => {

        controls.classList.add(
            "show"
        );

    }, 100);

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

    socket =
    new WebSocket(

        `${protocol}://${window.location.host}/ws/viva/${user.room_id}`

    );

    socket.onopen = () => {

        console.log(
            "Student Connected"
        );

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

                `Sir: ${msg.text}`,

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

            if(voicePopup){

                voicePopup.style.display =
                "flex";

            }

        }

        /* =====================
           SIR TALKING
        ===================== */

        if(
            msg.type ===
            "sir-speaking"
        ){

            createSystemMessage(
                "Professor started talking"
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
                "Professor stopped talking"
            );

        }

        /* =====================
           WEBRTC OFFER
        ===================== */

        if(
            msg.type ===
            "webrtc-offer"
        ){

            try{

                if(!webrtcEnabled){

                    await startStudentMedia();

                }

                // PREVENT DUPLICATE OFFER

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

                        console.log(
                            "Pending ICE Error",
                            err
                        );

                    }

                }

                pendingCandidates = [];

                // CREATE ANSWER

                const answer =
                await peerConnection
                .createAnswer();

                await peerConnection
                .setLocalDescription(
                    answer
                );

                // SEND ANSWER

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

        /* =====================
           SIR MUTED
        ===================== */

        if(
            msg.type ===
            "sir-muted"
        ){

            createSystemMessage(
                "Professor muted microphone"
            );

        }

        /* =====================
           SIR UNMUTED
        ===================== */

        if(
            msg.type ===
            "sir-unmuted"
        ){

            createSystemMessage(
                "Professor unmuted microphone"
            );

        }

        /* =====================
           VOICE ENDED
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

if(enableVoiceBtn){

    enableVoiceBtn.onclick =
    async () => {

        voicePopup.style.display =
        "none";

        await startStudentMedia();

    };

}


/* =========================
   START MEDIA
========================= */

async function startStudentMedia(){

    try{

        // CLEAN OLD

        stopWebRTC();

        // CAMERA + MIC

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

        webrtcEnabled = true;

        // LOCAL PREVIEW

        if(studentVideo){

            studentVideo.srcObject =
            localStream;

            studentVideo.autoplay =
            true;

            studentVideo.playsInline =
            true;

            studentVideo.muted =
            true;

            studentVideo.style.objectFit =
            "cover";

        }

        // CREATE PEER

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

        // NOTIFY SIR

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

        console.log(
            "Media Started"
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

    /* =====================
       RECEIVE AUDIO
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

            if(
                remoteStreamAttached
            ){

                return;

            }

            remoteStreamAttached =
            true;

            if(remoteAudio){

                remoteAudio.srcObject =
                remoteStream;

                remoteAudio.autoplay =
                true;

                remoteAudio.playsInline =
                true;

                try{

                    await remoteAudio.play();

                }catch(playErr){

                    console.log(
                        "Autoplay Error",
                        playErr
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
   STOP WEBRTC
========================= */

function stopWebRTC(){

    // STOP TRACKS

    if(localStream){

        localStream
        .getTracks()
        .forEach(track => {

            track.stop();

        });

        localStream = null;

    }

    // CLOSE PEER

    if(peerConnection){

        peerConnection.close();

        peerConnection = null;

    }

    // RESET STREAM FLAG

    remoteStreamAttached =
    false;

    // RESET VIDEO

    if(studentVideo){

        studentVideo.srcObject =
        null;

    }

    // RESET AUDIO

    if(remoteAudio){

        remoteAudio.srcObject =
        null;

    }

    webrtcEnabled = false;

    muted = false;

    pendingCandidates = [];

    console.log(
        "WebRTC stopped"
    );

}


/* =========================
   SPEECH RECOGNITION
========================= */

if(
    'webkitSpeechRecognition'
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

        /* =====================
           ANSWER
        ===================== */

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

            // SEND ANSWER

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

        }

    };

    recognition.onerror =
    (e) => {

        console.log(
            "Speech Error",
            e
        );

    };

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
   RECORD ANSWER
========================= */

document.getElementById(
    "recordA"
).onclick = () => {

    errorBox.innerText =
    "";

    mode = "answer";

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

document.getElementById(
    "stop"
).onclick = () => {

    if(recognition){

        recognition.stop();

    }

};


/* =========================
   STORE Q&A
========================= */

document.getElementById(
    "store"
).onclick = () => {

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

    const alreadyExists =
    qaList.some(q => {

        return (

            q.question ===
            tempQuestion

            &&

            q.answer ===
            tempAnswer

        );

    });

    if(alreadyExists){

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

    // REMOVE TEMP

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

document.getElementById(
    "submit"
).onclick = async () => {

    errorBox.innerText =
    "";

    if(
        !qaList ||
        qaList.length === 0
    ){

        errorBox.innerText =
        "Please store at least one Q&A";

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

        console.log(
            "Evaluation:",
            data
        );

        if(data.success){

            localStorage.setItem(

                "qaList",

                JSON.stringify(
                    qaList
                )

            );

            localStorage.setItem(

                "evaluation",

                JSON.stringify(
                    data.result
                )

            );

            stopWebRTC();

            if(socket){

                socket.onclose = null;

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

        console.log(
            "Submit Error",
            err
        );

        errorBox.innerText =
        "Server error";

    }

};


/* =========================
   MUTE / UNMUTE
========================= */

if(muteBtn){

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

        // NOTIFY SIR

        if(
            socket &&
            socket.readyState === 1
        ){

            socket.send(

                JSON.stringify({

                    type:

                    muted

                    ?

                    "student-muted"

                    :

                    "student-unmuted"

                })

            );

        }

    };

}


/* =========================
   BACK
========================= */

function goBack(){

    stopWebRTC();

    if(
        socket &&
        socket.readyState === 1
    ){

        socket.onclose = null;

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