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


/* =========================
   RTC CONFIG
========================= */

const rtcConfig = {

    iceServers: [

        {
            urls:
            "stun:stun.l.google.com:19302"
        }

    ]

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
           QUESTION FROM SIR
        ===================== */

        if(
            msg.type ===
            "question"
        ){

            tempQuestion =
            msg.text;

            // REMOVE OLD QUESTION

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
           SIR STARTED MIC
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
           PROFESSOR TALKING
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
           PROFESSOR STOPPED
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

            // START CAMERA + MIC

            if(!webrtcEnabled){

                await startStudentMedia();

            }

            await peerConnection
            .setRemoteDescription(

                new RTCSessionDescription(
                    msg.offer
                )

            );

            // APPLY PENDING ICE

            for(
                const candidate
                of pendingCandidates
            ){

                await peerConnection
                .addIceCandidate(

                    new RTCIceCandidate(
                        candidate
                    )

                );

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

                    answer:answer

                })

            );

        }

        /* =====================
           ICE CANDIDATE
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
           SIR ENDED VOICE
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
   START STUDENT MEDIA
========================= */

async function startStudentMedia(){

    try{

        // CLEAN OLD STREAMS

        if(peerConnection){

            peerConnection.close();

            peerConnection = null;

        }

        if(localStream){

            localStream
            .getTracks()
            .forEach(track => {

                track.stop();

            });

            localStream = null;

        }

        // GET CAMERA + MIC

        localStream =
        await navigator
        .mediaDevices
        .getUserMedia({

            video:true,

            audio:{

                echoCancellation:true,

                noiseSuppression:true,

                autoGainControl:false,

                channelCount:1,

                sampleRate:48000,

                sampleSize:16

            }

        });

        webrtcEnabled = true;

        // HIDDEN VIDEO STREAM
        // SENT TO SIR

        const studentVideo =
        document.getElementById(
            "studentVideo"
        );

        if(studentVideo){

            studentVideo.srcObject =
            localStream;

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
            "Student media started"
        );

    }catch(err){

        console.log(
            "Media Error",
            err
        );

    }

}


/* =========================
   CREATE PEER CONNECTION
========================= */

function createPeerConnection(){

    peerConnection =
    new RTCPeerConnection(
        rtcConfig
    );

    // RECEIVE SIR AUDIO

    peerConnection.ontrack =
    (event) => {

        const remoteStream =
        event.streams[0];

        const remoteAudio =
        document.getElementById(
            "remoteAudio"
        );

        if(
            remoteAudio &&
            remoteAudio.srcObject !== remoteStream
        ){

            remoteAudio.srcObject =
            remoteStream;

            remoteAudio.volume =
            0.2;

            remoteAudio.play();

        }

    };

    // SEND ICE

    peerConnection.onicecandidate =
    (event) => {

        if(
            event.candidate &&
            socket &&
            socket.readyState === 1
        ){

            socket.send(

                JSON.stringify({

                    type:"ice-candidate",

                    candidate:
                    event.candidate

                })

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

    // RESET VIDEO

    const studentVideo =
    document.getElementById(
        "studentVideo"
    );

    if(studentVideo){

        studentVideo.srcObject =
        null;

    }

    // RESET AUDIO

    const remoteAudio =
    document.getElementById(
        "remoteAudio"
    );

    if(remoteAudio){

        remoteAudio.srcObject =
        null;

    }

    webrtcEnabled = false;

    muted = false;

    pendingCandidates = [];

    console.log(
        "Student WebRTC stopped"
    );

}


/* =========================
   WEB SPEECH
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

            // REMOVE OLD ANSWER

            if(currentBubbleA){

                currentBubbleA.remove();

            }

            currentBubbleA =
            createBubble(

                text,

                "answer"

            );

            // SEND ANSWER TO SIR

            if(
                socket &&
                socket.readyState === 1
            ){

                socket.send(

                    JSON.stringify({

                        type:"answer",

                        text:text

                    })

                );

            }

        }

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

    recognition.start();

};


/* =========================
   STOP RECORDING
========================= */

document.getElementById(
    "stop"
).onclick = () => {

    recognition.stop();

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

    qaList.push({

        question:
        tempQuestion,

        answer:
        tempAnswer

    });

    // REMOVE TEMP BUBBLES

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

        if(data.success){

            localStorage.setItem(

                "qaList",

                JSON.stringify(
                    qaList
                )

            );

            stopWebRTC();

            if(socket){

                socket.send(

                    JSON.stringify({

                        type:"student-left"

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

        socket.send(

            JSON.stringify({

                type:"student-left"

            })

        );

        socket.close();

    }

    window.location.href =
    "/dashboard";

}