/* =========================
   GLOBALS
========================= */

let socket = null;

let activeRoom = null;

let recognition = null;


/* =========================
   WEBRTC
========================= */

let localStream = null;

let peerConnection = null;

let webrtcEnabled = false;

let muted = false;

let pendingCandidates = [];

const rtcConfig = {

    iceServers: [

        {
            urls:
            "stun:stun.l.google.com:19302"
        }

    ]

};


/* =========================
   LOGOUT
========================= */

const logoutBtn =
document.getElementById(
    "logoutBtn"
);

if(logoutBtn){

    logoutBtn.onclick = () => {

        // STOP WEBRTC

        stopWebRTC();

        // CLOSE SOCKET

        if(socket){

            socket.close();

        }

        localStorage.removeItem(
            "sir"
        );

        localStorage.removeItem(
            "user"
        );

        window.location.href = "/";

    };

}


/* =========================
   STUDENT LIST
========================= */

const studentList =
document.querySelector(
    ".student-list"
);


/* =========================
   FETCH STUDENTS
========================= */

async function fetchStudents(){

    try{

        const res =
        await fetch(
            "/api/students"
        );

        const data =
        await res.json();

        if(data.success){

            renderStudents(
                data.students
            );

        }

    }catch(err){

        console.log(
            "Student fetch error",
            err
        );

    }

}


/* =========================
   RENDER STUDENTS
========================= */

function renderStudents(students){

    if(!studentList) return;

    studentList.innerHTML =
    "";

    students.forEach(student => {

        const card =
        document.createElement(
            "div"
        );

        card.className =
        `student-card ${student.status}`;

        card.innerHTML = `

            <div class="student-info">

                <h3>
                    ${student.username}
                </h3>

                <p>
                    ${student.status}
                </p>

            </div>

            <button
            class="join-btn"
            onclick="joinViva(${student.id})">

                Join

            </button>

        `;

        studentList.appendChild(
            card
        );

    });

}


/* =========================
   JOIN VIVA
========================= */

async function joinViva(studentId){

    try{

        const res =
        await fetch(
            "/api/start-viva",
            {
                method:"POST",

                headers:{
                    "Content-Type":
                    "application/json"
                },

                body:JSON.stringify({

                    student_id:
                    studentId

                })

            }
        );

        const data =
        await res.json();

        if(data.success){

            activeRoom =
            data.room_id;

            localStorage.setItem(
                "activeRoom",
                activeRoom
            );

            // CLEAN OLD CONNECTIONS

            stopWebRTC();

            if(socket){

                socket.close();

            }

            pendingCandidates = [];

            // DYNAMIC WS/WSS

            const protocol =

            window.location.protocol ===
            "https:"

            ?

            "wss"

            :

            "ws";

            // CONNECT SOCKET

            socket =
            new WebSocket(

                `${protocol}://${window.location.host}/ws/viva/${activeRoom}`

            );

            socket.onopen = () => {

                console.log(
                    "Sir Connected"
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
                   STUDENT ANSWER
                ===================== */

                if(
                    msg.type ===
                    "answer"
                ){

                    addTranscript(
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

                    addChat(
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

                    if(peerConnection){

                        await peerConnection
                        .setRemoteDescription(

                            new RTCSessionDescription(
                                msg.answer
                            )

                        );

                        // APPLY ICE

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

                    }

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
                   STUDENT MUTED
                ===================== */

                if(
                    msg.type ===
                    "student-muted"
                ){

                    addSystemMessage(
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

                    addSystemMessage(
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

                    addSystemMessage(
                        "Student left voice chat"
                    );

                }

            };

            alert(
                "Connected To Viva"
            );

        }

    }catch(err){

        console.log(
            "Join viva error",
            err
        );

    }

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

        addSirQuestion(
            text
        );

        // SEND QUESTION

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

    };

}


/* =========================
   QUESTION BUTTON
========================= */

const voiceQuestionBtn =
document.getElementById(
    "voiceQuestionBtn"
);

if(voiceQuestionBtn){

    voiceQuestionBtn.onclick =
    () => {

        if(!recognition){

            return;

        }

        if(!socket){

            alert(
                "Join student first"
            );

            return;

        }

        recognition.start();

    };

}


/* =========================
   ADD QUESTION
========================= */

function addSirQuestion(text){

    const box =
    document.querySelector(
        ".transcript-box"
    );

    if(!box) return;

    const div =
    document.createElement(
        "div"
    );

    div.className =
    "message ai-msg";

    div.innerHTML = `

        <strong>Sir:</strong>

        ${text}

    `;

    box.appendChild(div);

    box.scrollTop =
    box.scrollHeight;

}


/* =========================
   ADD ANSWER
========================= */

function addTranscript(text){

    const box =
    document.querySelector(
        ".transcript-box"
    );

    if(!box) return;

    const div =
    document.createElement(
        "div"
    );

    div.className =
    "message student-msg";

    div.innerHTML = `

        <strong>Student:</strong>

        ${text}

    `;

    box.appendChild(div);

    box.scrollTop =
    box.scrollHeight;

}


/* =========================
   CHAT
========================= */

function addChat(text){

    const box =
    document.querySelector(
        ".chat-box"
    );

    if(!box) return;

    const div =
    document.createElement(
        "div"
    );

    div.className =
    "chat-msg";

    div.innerText =
    text;

    box.appendChild(div);

    box.scrollTop =
    box.scrollHeight;

}


/* =========================
   SYSTEM MESSAGE
========================= */

function addSystemMessage(text){

    const box =
    document.querySelector(
        ".transcript-box"
    );

    if(!box) return;

    const div =
    document.createElement(
        "div"
    );

    div.className =
    "message system-msg";

    div.innerHTML = `

        <strong>System:</strong>

        ${text}

    `;

    box.appendChild(div);

    box.scrollTop =
    box.scrollHeight;

}


/* =========================
   START VOICE
========================= */

async function startVoiceChat(){

    try{

        localStream =
        await navigator
        .mediaDevices
        .getUserMedia({

            audio:{

                echoCancellation:true,

                noiseSuppression:true,

                autoGainControl:true

            },

            video:false

        });

        webrtcEnabled = true;

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

        // CREATE OFFER

        const offer =
        await peerConnection
        .createOffer();

        await peerConnection
        .setLocalDescription(
            offer
        );

        // SEND OFFER

        socket.send(

            JSON.stringify({

                type:"webrtc-offer",

                offer:offer

            })

        );

        // NOTIFY STUDENT

        socket.send(

            JSON.stringify({

                type:"sir-mic-on"

            })

        );

        console.log(
            "Sir Voice Started"
        );

    }catch(err){

        console.log(
            "Voice Error",
            err
        );

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

    // RECEIVE STREAM

    peerConnection.ontrack =
    (event) => {

        // AUDIO

        const remoteAudio =
        document.getElementById(
            "remoteAudio"
        );

        if(remoteAudio){

            remoteAudio.srcObject =
            event.streams[0];

            remoteAudio.volume =
            0.5;

            remoteAudio.play();

        }

        // VIDEO

        const studentVideo =
        document.getElementById(
            "studentLiveVideo"
        );

        if(studentVideo){

            studentVideo.srcObject =
            event.streams[0];

        }

    };

    // ICE

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
   START VOICE BUTTON
========================= */

const voiceChatBtn =
document.getElementById(
    "voiceChatBtn"
);

if(voiceChatBtn){

    voiceChatBtn.onclick =
    async () => {

        if(!socket){

            alert(
                "Join student first"
            );

            return;

        }

        if(
            socket.readyState !== 1
        ){

            alert(
                "Socket not connected"
            );

            return;

        }

        if(webrtcEnabled){

            return;

        }

        await startVoiceChat();

    };

}


/* =========================
   MUTE / UNMUTE
========================= */

const muteBtn =
document.getElementById(
    "muteBtn"
);

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

        muteBtn.innerHTML =

        muted

        ?

        `<i class="fa-solid fa-microphone"></i>
        Unmute`

        :

        `<i class="fa-solid fa-microphone-slash"></i>
        Mute`;

        // SEND STATUS

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

}


/* =========================
   END VOICE
========================= */

const endVoiceBtn =
document.getElementById(
    "endVoiceBtn"
);

if(endVoiceBtn){

    endVoiceBtn.onclick = () => {

        stopWebRTC();

        // NOTIFY STUDENT

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

        alert(
            "Voice chat ended"
        );

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
        "studentLiveVideo"
    );

    if(studentVideo){

        studentVideo.srcObject =
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
   INITIAL LOAD
========================= */

fetchStudents();


/* =========================
   AUTO REFRESH
========================= */

setInterval(() => {

    fetchStudents();

}, 2000);