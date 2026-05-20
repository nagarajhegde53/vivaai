/* =========================
   ELEMENTS
========================= */

const studentList =
document.querySelector(
    ".student-list"
);

const transcriptBox =
document.querySelector(
    ".transcript-box"
);

const chatBox =
document.querySelector(
    ".chat-box"
);

const chatInput =
document.getElementById(
    "chatInput"
);

const questionInput =
document.getElementById(
    "questionInput"
);

const studentVideo =
document.getElementById(
    "studentLiveVideo"
);

const remoteAudio =
document.getElementById(
    "remoteAudio"
);

const logoutBtn =
document.getElementById(
    "logoutBtn"
);

const voiceChatBtn =
document.getElementById(
    "voiceChatBtn"
);

const toggleVoiceBtn =
document.getElementById(
    "toggleVoiceBtn"
);

const muteBtn =
document.getElementById(
    "muteBtn"
);

const endVoiceBtn =
document.getElementById(
    "endVoiceBtn"
);

const voiceQuestionBtn =
document.getElementById(
    "voiceQuestionBtn"
);


/* =========================
   USER
========================= */

const sirData =
localStorage.getItem(
    "sir"
);

if(!sirData){

    window.location.href =
    "/";

}

const sir =
JSON.parse(sirData);


/* =========================
   GLOBALS
========================= */

let socket = null;

let currentRoom = null;

let selectedStudent = null;

let localStream = null;

let peerConnection = null;

let recognition = null;

let muted = false;

let webrtcStarted = false;

let pendingCandidates = [];


/* =========================
   RTC CONFIG
========================= */

const rtcConfig = {

    iceServers:[

        {
            urls:
            "stun:stun.l.google.com:19302"
        }

    ]

};


/* =========================
   LOAD STUDENTS
========================= */

loadStudents();

async function loadStudents(){

    try{

        const res =
        await fetch(
            "/api/students"
        );

        const data =
        await res.json();

        console.log(data);

        if(
            !data.success
        ){

            return;

        }

        studentList.innerHTML =
        "";

        data.students.forEach(student => {

            const div =
            document.createElement(
                "div"
            );

            div.className =
            "student-item";

            div.innerHTML = `

                <div>
                    ${student.username}
                </div>

                <small>
                    ${student.status}
                </small>

            `;

            div.onclick = () => {

                selectStudent(
                    student
                );

            };

            studentList.appendChild(
                div
            );

        });

        // AUTO SELECT FIRST

        if(
            data.students.length > 0
        ){

            selectStudent(
                data.students[0]
            );

        }

    }catch(err){

        console.log(
            err
        );

    }

}


/* =========================
   SELECT STUDENT
========================= */

function selectStudent(student){

    selectedStudent =
    student;

    currentRoom =
    student.room_id;

    console.log(
        "Selected Room:",
        currentRoom
    );

    if(socket){

        socket.close();

    }

    connectSocket();

}


/* =========================
   CONNECT SOCKET
========================= */

function connectSocket(){

    if(!currentRoom){

        return;

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

        `${protocol}://${window.location.host}/ws/viva/${currentRoom}`

    );

    socket.onopen = () => {

        console.log(
            "Connected"
        );

        addSystemMessage(
            "Connected to viva room"
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

            addTranscript(

                "Professor",

                msg.text

            );

        }

        /* =====================
           ANSWER
        ===================== */

        if(
            msg.type ===
            "answer"
        ){

            addTranscript(

                "Student",

                msg.text

            );

        }

        /* =====================
           CHAT
        ===================== */

        if(
            msg.type ===
            "chat"
        ){

            addChatMessage(

                msg.text

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

                await peerConnection
                .setRemoteDescription(

                    new RTCSessionDescription(
                        msg.answer
                    )

                );

            }catch(err){

                console.log(
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
                    peerConnection
                ){

                    await peerConnection
                    .addIceCandidate(

                        new RTCIceCandidate(
                            msg.candidate
                        )

                    );

                }

            }catch(err){

                console.log(
                    err
                );

            }

        }

        /* =====================
           STUDENT LEFT
        ===================== */

        if(
            msg.type ===
            "student-left"
        ){

            addSystemMessage(
                "Student left viva"
            );

            stopVoice();

        }

    };

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

        const stream =
        event.streams[0];

        if(
            studentVideo.srcObject ===
            stream
        ){

            return;

        }

        studentVideo.srcObject =
        stream;

        try{

            await studentVideo.play();

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

}


/* =========================
   CONNECT VOICE
========================= */

voiceChatBtn.onclick =
async () => {

    try{

        localStream =
        await navigator
        .mediaDevices
        .getUserMedia({

            video:true,

            audio:true

        });

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

        const offer =
        await peerConnection
        .createOffer();

        await peerConnection
        .setLocalDescription(
            offer
        );

        socket.send(

            JSON.stringify({

                type:
                "webrtc-offer",

                offer:
                peerConnection.localDescription

            })

        );

        webrtcStarted =
        true;

        addSystemMessage(
            "Voice connected"
        );

    }catch(err){

        console.log(err);

    }

};


/* =========================
   START / STOP TALK
========================= */

toggleVoiceBtn.onclick =
async () => {

    if(!localStream){

        return;

    }

    const tracks =
    localStream.getAudioTracks();

    if(tracks.length === 0){

        return;

    }

    const enabled =
    tracks[0].enabled;

    tracks.forEach(track => {

        track.enabled =
        !enabled;

    });

    toggleVoiceBtn.innerHTML =

    enabled

    ?

    `<i class="fa-solid fa-microphone"></i> Start Talking`

    :

    `<i class="fa-solid fa-microphone-slash"></i> Stop Talking`;

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

    muteBtn.innerHTML =

    muted

    ?

    `<i class="fa-solid fa-volume-xmark"></i> Unmute`

    :

    `<i class="fa-solid fa-microphone-slash"></i> Mute`;

};


/* =========================
   END VOICE
========================= */

endVoiceBtn.onclick = () => {

    stopVoice();

};


/* =========================
   STOP VOICE
========================= */

function stopVoice(){

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

    webrtcStarted =
    false;

    if(socket){

        socket.send(

            JSON.stringify({

                type:
                "sir-voice-ended"

            })

        );

    }

    addSystemMessage(
        "Voice ended"
    );

}


/* =========================
   VOICE QUESTION
========================= */

if(
    "webkitSpeechRecognition"
    in window
){

    recognition =
    new webkitSpeechRecognition();

    recognition.lang =
    "en-US";

    recognition.continuous =
    false;

    recognition.interimResults =
    false;

    recognition.onresult =
    (e) => {

        const text =
        e.results[0][0]
        .transcript;

        questionInput.value =
        text;

        sendQuestion(text);

    };

}

voiceQuestionBtn.onclick =
() => {

    if(recognition){

        recognition.start();

    }

};


/* =========================
   SEND QUESTION
========================= */

function sendQuestion(text){

    if(
        !text ||
        !socket
    ){

        return;

    }

    socket.send(

        JSON.stringify({

            type:"question",

            text:text

        })

    );

    addTranscript(
        "Professor",
        text
    );

}

questionInput.addEventListener(
    "keydown",
    (e) => {

        if(
            e.key === "Enter"
        ){

            e.preventDefault();

            sendQuestion(
                questionInput.value.trim()
            );

            questionInput.value =
            "";

        }

    }
);


/* =========================
   CHAT
========================= */

chatInput.addEventListener(
    "keydown",
    (e) => {

        if(
            e.key === "Enter"
        ){

            const text =
            chatInput.value.trim();

            if(!text){

                return;

            }

            socket.send(

                JSON.stringify({

                    type:"chat",

                    text:text

                })

            );

            addChatMessage(
                `Professor: ${text}`
            );

            chatInput.value =
            "";

        }

    }
);


/* =========================
   LOGOUT
========================= */

logoutBtn.onclick = () => {

    stopVoice();

    localStorage.removeItem(
        "sir"
    );

    window.location.href =
    "/";

};


/* =========================
   TRANSCRIPT
========================= */

function addTranscript(sender,text){

    const div =
    document.createElement(
        "div"
    );

    div.className =
    "transcript-item";

    div.innerHTML = `

        <b>${sender}:</b>
        ${text}

    `;

    transcriptBox.appendChild(
        div
    );

    transcriptBox.scrollTop =
    transcriptBox.scrollHeight;

}


/* =========================
   CHAT
========================= */

function addChatMessage(text){

    const div =
    document.createElement(
        "div"
    );

    div.className =
    "chat-message";

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

function addSystemMessage(text){

    const div =
    document.createElement(
        "div"
    );

    div.className =
    "chat-message";

    div.innerText =
    text;

    chatBox.appendChild(
        div
    );

    chatBox.scrollTop =
    chatBox.scrollHeight;

}