/* ========================================================= */
/* FULLY FIXED DSA VISUALIZER ENGINE */
/* ========================================================= */

/* ========================================================= */
/* ELEMENTS */
/* ========================================================= */

const editor =
    document.getElementById("editor");

const visualizerArea =
    document.getElementById("visualizerArea");

const timelineContent =
    document.getElementById("timelineContent");

const chatBox =
    document.getElementById("chatBox");

const chatInput =
    document.getElementById("chatInput");

const sendBtn =
    document.getElementById("sendBtn");

const muteBtn =
    document.getElementById("muteBtn");

const micBtn =
    document.getElementById("micBtn");

const pauseAiBtn =
    document.getElementById("pauseAiBtn");

const continueBtn =
    document.getElementById("continueBtn");

const selectedDsText =
    document.getElementById("selectedDsText");

/* ========================================================= */
/* GLOBALS */
/* ========================================================= */

let selectedDS = "";

let isMuted = false;

let aiPaused = false;

let executionRunning = false;

let selectedVoice = null;

let previousCode = "";

let previousSnapshot = "";

let debounceTimer = null;

let graphTraversalResult = [];

let aiMemory = [];

/* ========================================================= */
/* PERSISTENT SCENE */
/* ========================================================= */

const scene = {

    array:[],

    stack:[],

    queue:[],

    linkedlist:[],

    tree:[],

    heap:[],

    hashmap:{},

    graph:{
        nodes:{},
        edges:[]
    }

};

/* ========================================================= */
/* VOICE */
/* ========================================================= */

function loadVoice(){

    const voices =
        speechSynthesis.getVoices();

    selectedVoice =

        voices.find(v =>
            v.name.includes(
                "Google UK English Male"
            )
        )

        ||

        voices.find(v =>
            v.name.includes(
                "Microsoft David"
            )
        )

        ||

        voices[0];
}

speechSynthesis.onvoiceschanged =
loadVoice;

loadVoice();

function speak(text){

    if(isMuted) return;

    if(aiPaused) return;

    if(executionRunning) return;

    speechSynthesis.cancel();
    /* ====================================== */
/* CLEAN SPECIAL CHARACTERS */
/* ====================================== */

text = text
/* ====================================== */
/* REMOVE MARKDOWN + SPECIAL SYMBOLS */
/* ====================================== */

text = text

/* markdown */

.replace(/\*\*/g, " ")

.replace(/\*/g, " ")

.replace(/##/g, " ")

.replace(/#/g, " ")

.replace(/```/g, " ")

.replace(/`/g, " ")

.replace(/---/g, " ")

.replace(/__/g, " ")

/* operators */

.replace(/==/g, " equals ")

.replace(/=/g, " equals ")

.replace(/\+/g, " plus ")

.replace(/-/g, " minus ")

.replace(/\//g, " divided by ")

.replace(/\*/g, " multiplied by ")

.replace(/%/g, " percent ")

/* brackets */

.replace(/\(/g, " ")

.replace(/\)/g, " ")

.replace(/\[/g, " ")

.replace(/\]/g, " ")

.replace(/\{/g, " ")

.replace(/\}/g, " ")

/* punctuation */

.replace(/:/g, " ")

.replace(/\./g, " ")

.replace(/,/g, " ")

.replace(/;/g, " ")

.replace(/!/g, " ")

.replace(/\?/g, " ")

/* cleanup */

.replace(/\s+/g, " ")

.trim();

    const utterance =
        new SpeechSynthesisUtterance(text);

    utterance.voice =
        selectedVoice;

    utterance.rate = 1.15;

    speechSynthesis.speak(utterance);
}

/* ========================================================= */
/* TOPIC */
/* ========================================================= */

document
.querySelectorAll(".topic-card")
.forEach(card => {

    card.addEventListener("click", () => {

        document
        .querySelectorAll(".topic-card")
        .forEach(c => {

            c.classList.remove(
                "selected-topic"
            );

        });

        card.classList.add(
            "selected-topic"
        );

        selectedDS =
            card.innerText
            .toLowerCase()
            .replaceAll(" ", "");

    });

});

continueBtn.addEventListener("click", () => {

    if(selectedDS === ""){

        alert("Select DS");

        return;
    }

    document
    .getElementById("topicPopup")
    .style.display = "none";

    selectedDsText.innerText =
        selectedDS.toUpperCase();

    aiReply(
        `${selectedDS} engine initialized`
    );

});

/* ========================================================= */
/* LIVE EDITOR */
/* ========================================================= */

editor.addEventListener("input", () => {

    clearTimeout(debounceTimer);

    debounceTimer = setTimeout(() => {

        updateVisualization();

    }, 300);

});

/* ========================================================= */
/* MAIN UPDATE */
/* ========================================================= */

async function updateVisualization(){

    if(selectedDS === "") return;

    const code =
        editor.value.trim();

    /* ========================================== */
    /* RESET */
    /* ========================================== */

    if(code === ""){

        resetAll();

        return;
    }

    /* ========================================== */
    /* NO CHANGE */
    /* ========================================== */

    if(code === previousCode){

        return;
    }

    previousCode = code;

    executionRunning = true;

    /* ====================================== */
/* RESET GRAPH STATE */
/* ====================================== */

graphTraversalResult = [];

scene.graph = {

    nodes:{},

    edges:[]
};

/* ====================================== */
/* CLEAR HELPER PANELS */
/* ====================================== */

const helper =
    document.getElementById(
        "graph-helper-panel"
    );

if(helper){

    helper.innerHTML = "";
}

const result =
    document.getElementById(
        "graph-result-panel"
    );

if(result){

    result.innerHTML = "";
}

/* ====================================== */
/* CLEAR VISUALIZER */
/* ====================================== */

// document.querySelector(
//     ".visualizer-area"
// ).innerHTML = "";
// end 

    try{

        const response =
            await fetch("/execute-dsa", {

                method:"POST",

                headers:{
                    "Content-Type":"application/json"
                },

                body:JSON.stringify({

                    code:code,

                    ds:selectedDS

                })

            });

        const data =
            await response.json();

        if(!data.success){

            executionRunning = false;

            return;
        }

        const actions =
            data.actions;

        const snapshot =
            JSON.stringify(actions);

        /* ====================================== */
        /* NO REAL CHANGES */
        /* ====================================== */

        if(snapshot === previousSnapshot){

            executionRunning = false;

            return;
        }

        previousSnapshot = snapshot;

        timelineContent.innerHTML = "";

        rebuildScene();

        for(const action of actions){

            await animateAction(action);
        }

        // analyzeCode(actions);

        executionRunning = false;

    }

    catch(error){

        console.log(error);

        executionRunning = false;

    }

}

/* ========================================================= */
/* SCENE RESET */
/* ========================================================= */

function rebuildScene(){

    visualizerArea.innerHTML = "";

    scene.array = [];

    scene.stack = [];

    scene.queue = [];

    scene.linkedlist = [];

    scene.tree = [];

    scene.heap = [];

    scene.hashmap = {};

    scene.graph.nodes = {};

    scene.graph.edges = [];

}

/* ========================================================= */
/* ANIMATE ACTION */
/* ========================================================= */

async function animateAction(action){

    return new Promise(resolve => {

        let speed = 850;

        /* ====================================== */
        /* EDUCATIONAL SPEEDS */
        /* ====================================== */

        if(
    action.action === "traverse"
    ||
    action.action === "bfs_step"
    ||
    action.action === "dfs_step"
){

    speed = 1800;
}

        else if(action.action === "found"){

            speed = 1200;
        }

        else if(action.action === "delete"){

            speed = 1100;
        }

        else if(action.action === "insert"){

            speed = 900;
        }

        setTimeout(() => {

            /* ================================== */
            /* ERRORS */
            /* ================================== */

            if(action.type === "error"){

                addTimeline(
                    `❌ ${action.message}`
                );

                aiInterrupt(
                    action.message
                );

                resolve();

                return;
            }

            /* ================================== */
            /* TIMELINE */
            /* ================================== */

            addTimeline(
                `${action.ds} ${action.action}`
            );

            /* ================================== */
            /* ARRAY */
            /* ================================== */

            if(action.ds === "array"){

                handleArray(action);
            }

            /* ================================== */
            /* STACK */
            /* ================================== */

            else if(action.ds === "stack"){

                handleStack(action);
            }

            /* ================================== */
            /* QUEUE */
            /* ================================== */

            else if(action.ds === "queue"){

                handleQueue(action);
            }

            /* ================================== */
            /* LINKED LIST */
            /* ================================== */

            else if(action.ds === "linkedlist"){

                handleLinkedList(action);
            }

            /* ================================== */
            /* TREE */
            /* ================================== */

            else if(action.ds === "tree"){

                handleTree(action);
            }

            /* ================================== */
            /* GRAPH */
            /* ================================== */

            else if(action.ds === "graph"){

                handleGraph(action);
            }

            /* ================================== */
            /* HEAP */
            /* ================================== */

            else if(action.ds === "heap"){

                handleHeap(action);
            }

            /* ================================== */
            /* HASHMAP */
            /* ================================== */

            else if(action.ds === "hashmap"){

                handleHashMap(action);
            }

            resolve();

        }, speed);

    });

}
/* ========================================================= */
/* ARRAY */
/* ========================================================= */

function handleArray(action){

    if(action.action === "declare"){

        scene.array =
            action.data.array;

    }

    else if(action.action === "insert"){

        scene.array =
            action.data.array;

    }

    else if(action.action === "delete"){

        scene.array =
            action.data.array;

    }

    renderArray();

    if(action.action === "traverse"){

        highlightTraversal(
            action.data.current
        );
    }

    if(action.action === "found"){

        highlightFound(
            action.data.value
        );
    }

}

/* ========================================================= */
/* STACK */
/* ========================================================= */

function handleStack(action){

    if(action.data.stack){

        scene.stack =
            action.data.stack;
    }

    renderStack();
}

/* ========================================================= */
/* QUEUE */
/* ========================================================= */

function handleQueue(action){

    if(action.data.queue){

        scene.queue =
            action.data.queue;
    }

    renderQueue();

    if(action.action === "traverse"){

        highlightTraversal(
            action.data.current
        );
    }

}

/* ========================================================= */
/* LINKED LIST */
/* ========================================================= */

function handleLinkedList(action){

    if(action.data.list){

        scene.linkedlist =
            action.data.list;
    }

    renderLinkedList();

    if(action.action === "traverse"){

        highlightTraversal(
            action.data.current
        );
    }

    if(action.action === "found"){

        highlightFound(
            action.data.value
        );
    }

}

/* ========================================================= */
/* TREE */
/* ========================================================= */

function handleTree(action){

    if(action.action === "render"){

        scene.tree =
            action.data.tree;

        renderTree();
    }

    if(action.action === "traverse"){

        highlightTraversal(
            action.data.current
        );
    }

    if(action.action === "found"){

        highlightFound(
            action.data.value
        );
    }

}
function handleHeap(action){

    if(action.data.heap){

        scene.heap =
            action.data.heap;

        renderHeap();
    }

}
/* ========================================================= */
/* HASHMAP */
/* ========================================================= */

function handleHashMap(action){

    if(action.data.map){

        scene.hashmap =
            action.data.map;
    }

    renderHashMap();
}

/* ========================================================= */
/* GRAPH */
/* ========================================================= */
function handleGraph(action){

    let container =
        getOrCreate(
            "graph-container"
        );

    const width =
        container.clientWidth || 1000;

    const height =
        container.clientHeight || 700;

    if(action.action === "add_node"){

        const node =
            action.data.node;

        if(!scene.graph.nodes[node]){

            const total =
                Object.keys(
                    scene.graph.nodes
                ).length;

            const radius = 220;

            const angle =
                (Math.PI * 2 * total) / 10;

            const centerX =
                width / 2;

            const centerY =
                height / 2;

            scene.graph.nodes[node] = {

                x:
                Math.max(

                    80,

                    Math.min(

                        width - 120,

                        centerX +
                        Math.cos(angle)
                        * radius

                    )

                ),

                y:
                Math.max(

                    80,

                    Math.min(

                        height - 120,

                        centerY +
                        Math.sin(angle)
                        * radius

                    )

                )

            };

        }

    }

    else if(action.action === "add_edge"){

        scene.graph.edges.push({

            from:action.data.from,

            to:action.data.to

        });
  renderGraph(); 
    }
    // bfs
 else if(action.action === "bfs_step"){

    renderGraph();

    if(
        !graphTraversalResult.includes(
            action.data.current
        )
    ){

        graphTraversalResult.push(
            action.data.current
        );
    }

    renderGraphQueue(
        action.data.queue
    );

    highlightGraphNode(
        action.data.current
    );

    renderTraversalResult(
        "BFS"
    );
}
    // dfs 
     /* ===================================== */
    /* DFS STEP */
    /* ===================================== */
else if(action.action === "dfs_step"){

    renderGraph();

    if(
        !graphTraversalResult.includes(
            action.data.current
        )
    ){

        graphTraversalResult.push(
            action.data.current
        );
    }

    renderGraphStack(
        action.data.stack
    );

    highlightGraphNode(
        action.data.current
    );

    renderTraversalResult(
        "DFS"
    );
}

  
    

    if(action.action === "traverse"){

        setTimeout(() => {

            highlightGraphNode(
                action.data.current
            );

        }, 150);

    }
// new handle 
if(
    action.action === "bfs_step"
    
    ||
    action.action === "dfs_step"
)

    if(
        !graphTraversalResult.includes(
            action.data.current
        )
    ){

        graphTraversalResult.push(
            action.data.current
        );
    }


}

 
/* ========================================================= */
/* ARRAY RENDER */
/* ========================================================= */

function renderArray(){

    let container =
        getOrCreate(
            "array-container"
        );

    container.innerHTML = "";

    scene.array.forEach((value, index) => {

        const box =
            document.createElement("div");

        box.className =
            "array-box insertion-animation";

        if(value !== null){

            box.dataset.value =
                value;

            box.innerHTML = `

                <div>${value}</div>

                <span>${index}</span>

            `;

        }

        else{

            box.innerHTML = `

                <div>EMPTY</div>

                <span>${index}</span>

            `;

            box.classList.add(
                "empty-array-slot"
            );

        }

        container.appendChild(box);

    });

}

/* ========================================================= */
/* STACK */
/* ========================================================= */

function renderStack(){

    let container =
        getOrCreate(
            "stack-container"
        );

    syncChildren(

        container,

        [...scene.stack].reverse(),

        createStackItem

    );

}

/* ========================================================= */
/* QUEUE */
/* ========================================================= */

function renderQueue(){

    let container =
        getOrCreate(
            "queue-container"
        );

    syncChildren(

        container,

        scene.queue,

        createQueueItem

    );

}

/* ========================================================= */
/* LINKED LIST */
/* ========================================================= */
function renderLinkedList(){

    let container =
        getOrCreate(
            "linked-container"
        );

    container.innerHTML = "";

    scene.linkedlist.forEach((value, index) => {

        const wrapper =
            document.createElement("div");

        wrapper.className =
            "linked-wrapper";

        /* ====================== */
        /* HEAD */
        /* ====================== */

        if(index === 0){

            const head =
                document.createElement("div");

            head.className =
                "pointer-label";

            head.innerText =
                "HEAD";

            wrapper.appendChild(head);
        }

        /* ====================== */
        /* NODE */
        /* ====================== */

        const node =
            document.createElement("div");

        node.className =
            "linked-node insertion-animation";

        node.dataset.value =
            value;

        node.innerHTML = `

            <div class="node-left">
                ${value}
            </div>

            <div class="node-right">
                next
            </div>

        `;

        wrapper.appendChild(node);

        /* ====================== */
        /* TAIL */
        /* ====================== */

        if(index === scene.linkedlist.length - 1){

            const tail =
                document.createElement("div");

            tail.className =
                "pointer-label";

            tail.innerText =
                "TAIL";

            wrapper.appendChild(tail);

            const nullNode =
                document.createElement("div");

            nullNode.className =
                "null-node";

            nullNode.innerText =
                "NULL";

            wrapper.appendChild(nullNode);

        }

        else{

            const arrow =
                document.createElement("div");

            arrow.className =
                "linked-arrow";

            arrow.innerHTML = "→";

            wrapper.appendChild(arrow);

        }

        container.appendChild(wrapper);

    });

}

/* ========================================================= */
/* TREE */
/* ========================================================= */
function renderTree(){

    let container =
        getOrCreate(
            "tree-container"
        );

    container.innerHTML = "";

    if(!scene.tree) return;

    const width =
        container.clientWidth || 1000;

    renderTreeNode(

        scene.tree,

        width / 2,

        60,

        width / 4,

        container

    );

}

// new function
function renderTreeNode(
    node,
    x,
    y,
    gap,
    container
){

    if(!node) return;

    const div =
        document.createElement("div");

    div.className =
        "tree-node insertion-animation";

    div.dataset.value =
        node.value;

    div.innerText =
        node.value;

    div.style.left =
        `${x}px`;

    div.style.top =
        `${y}px`;

    container.appendChild(div);

    /* ============================ */
    /* LEFT */
    /* ============================ */

    if(node.left){

        drawLine(

            container,

            x + 40,
            y + 40,

            x - gap + 40,
            y + 140

        );

        renderTreeNode(

            node.left,

            x - gap,

            y + 140,

            gap / 1.8,

            container

        );

    }

    /* ============================ */
    /* RIGHT */
    /* ============================ */

    if(node.right){

        drawLine(

            container,

            x + 40,
            y + 40,

            x + gap + 40,
            y + 140

        );

        renderTreeNode(

            node.right,

            x + gap,

            y + 140,

            gap / 1.8,

            container

        );

    }

}

// render heap
function renderHeap(){

    let container =
        getOrCreate(
            "tree-container"
        );

    container.innerHTML = "";

    if(!scene.heap.length) return;

    const width =
        container.clientWidth || 1000;

    renderHeapNode(

        scene.heap,

        0,

        width / 2,

        60,

        width / 4,

        container

    );

}

function renderHeapNode(
    heap,
    index,
    x,
    y,
    gap,
    container
){

    if(index >= heap.length) return;

    const value =
        heap[index];

    const div =
        document.createElement("div");

    div.className =
        "tree-node insertion-animation";

    div.dataset.value =
        value;

    div.innerText =
        value;

    div.style.left =
        `${x}px`;

    div.style.top =
        `${y}px`;

    container.appendChild(div);

    const left =
        index * 2 + 1;

    const right =
        index * 2 + 2;

    /* ======================= */
    /* LEFT CHILD */
    /* ======================= */

    if(left < heap.length){

        drawLine(

            container,

            x + 40,
            y + 40,

            x - gap + 40,
            y + 140

        );

        renderHeapNode(

            heap,

            left,

            x - gap,

            y + 140,

            gap / 1.8,

            container

        );

    }

    /* ======================= */
    /* RIGHT CHILD */
    /* ======================= */

    if(right < heap.length){

        drawLine(

            container,

            x + 40,
            y + 40,

            x + gap + 40,
            y + 140

        );

        renderHeapNode(

            heap,

            right,

            x + gap,

            y + 140,

            gap / 1.8,

            container

        );

    }

}
/* ========================================================= */
/* GRAPH */
/* ========================================================= */

function renderGraph(){

    let container =
        getOrCreate(
            "graph-container"
        );

    container.innerHTML = "";

    /* ============================== */
    /* EDGES */
    /* ============================== */

    scene.graph.edges.forEach(edge => {

        const from =
            scene.graph.nodes[edge.from];

        const to =
            scene.graph.nodes[edge.to];

        if(!from || !to) return;

        drawLine(

            container,

            from.x + 40,
            from.y + 40,

            to.x + 40,
            to.y + 40

        );

    });

    /* ============================== */
    /* NODES */
    /* ============================== */

    Object.entries(scene.graph.nodes)
    .forEach(([name, pos]) => {

        const node =
            document.createElement("div");

        node.className =
            "graph-node insertion-animation";

        node.dataset.value =
            name;

        node.innerText =
            name;

        node.style.left =
            `${pos.x}px`;

        node.style.top =
            `${pos.y}px`;

        container.appendChild(node);

    });

}

// new quegraph
function renderGraphQueue(queue){

    let panel =
        getOrCreate(
            "graph-helper-panel"
        );
        panel.style.opacity = "1";

    panel.innerHTML = `

        <div class="helper-title">
            BFS Queue
        </div>

        <div class="graph-queue-container">
        </div>

    `;

    const container =
        panel.querySelector(
            ".graph-queue-container"
        );

    queue.forEach((item,index) => {

        const div =
            document.createElement("div");

        div.className =
            "graph-queue-item";

        /* ======================= */
        /* FRONT LABEL */
        /* ======================= */

        if(index === 0){

            div.classList.add(
                "queue-front"
            );
        }

        div.innerText =
            item;

        container.appendChild(div);

    });

}

// new stack
function renderGraphStack(stack){

    let panel =
        getOrCreate(
            "graph-helper-panel"
        );
        panel.style.opacity = "1";

    panel.innerHTML = `

        <div class="helper-title">
            DFS Stack
        </div>

        <div class="graph-stack-container">
        </div>

    `;

    const container =
        panel.querySelector(
            ".graph-stack-container"
        );

    [...stack]
    .reverse()
    .forEach((item,index) => {

        const div =
            document.createElement("div");

        div.className =
            "graph-stack-item";

        if(index === 0){

            div.classList.add(
                "stack-top"
            );
        }

        div.innerText =
            item;

        container.appendChild(div);

    });

}
    /* ====================================== */
    /* EDGES */
    /* ====================================== */

    // scene.graph.edges.forEach(edge => {

    //     const from =
    //         scene.graph.nodes[edge.from];

    //     const to =
    //         scene.graph.nodes[edge.to];

    //     if(!from || !to) return;

    //     drawLine(

    //         container,

    //         from.x + 40,
    //         from.y + 40,

    //         to.x + 40,
    //         to.y + 40

    //     );

    // });

    // /* ====================================== */
    // /* NODES */
    // /* ====================================== */

    // Object.entries(scene.graph.nodes)
    // .forEach(([name, pos]) => {

    //     const node =
    //         document.createElement("div");

    //     node.className =
    //         "graph-node insertion-animation";

    //     node.dataset.value =
    //         name;

    //     node.innerText =
    //         name;

    //     node.style.left =
    //         `${pos.x}px`;

    //     node.style.top =
    //         `${pos.y}px`;

    //     container.appendChild(node);

    // });

// new render 
function renderTraversalResult(type){

    let panel =
        getOrCreate(
            "graph-result-panel"
        );
        panel.style.opacity = "1";
    panel.innerHTML = `

        <div class="helper-title">
            ${type} Result
        </div>

        <div class="traversal-result">
            ${graphTraversalResult.join(" → ")}
        </div>

    `;
}

/* ========================================================= */
/* HASHMAP */
/* ========================================================= */

function renderHashMap(){

    let container =
        getOrCreate(
            "hashmap-container"
        );

    container.innerHTML = "";

    Object.entries(scene.hashmap)
    .forEach(([key, value]) => {

        const bucket =
            document.createElement("div");

        bucket.className =
            "hashmap-bucket insertion-animation";

        bucket.innerHTML = `

            <div>
                KEY : ${key}
            </div>

            <div>
                VALUE : ${value}
            </div>

        `;

        container.appendChild(bucket);

    });

}

/* ========================================================= */
/* HELPERS */
/* ========================================================= */

function getOrCreate(className){

    let el =
        document.querySelector(
            `.${className}`
        );

    if(!el){

        el =
            document.createElement("div");

        el.className =
            className;

        visualizerArea.appendChild(el);

    }

    return el;
}

function syncChildren(
    container,
    values,
    creator
){

    container.innerHTML = "";

    values.forEach((value, index) => {

        container.appendChild(

            creator(value, index)

        );

    });

}

function createArrayBox(value, index){

    const box =
        document.createElement("div");

    box.className =
        "array-box insertion-animation";

    box.dataset.value =
        value;

    box.innerHTML = `

        <div>${value}</div>

        <span>${index}</span>

    `;

    return box;
}

function createStackItem(value){

    const item =
        document.createElement("div");

    item.className =
        "stack-item insertion-animation";

    item.dataset.value =
        value;

    item.innerText =
        value;

    return item;
}

function createQueueItem(value){

    const item =
        document.createElement("div");

    item.className =
        "queue-item insertion-animation";

    item.dataset.value =
        value;

    item.innerText =
        value;

    return item;
}

/* ========================================================= */
/* LINE */
/* ========================================================= */

function drawLine(
    container,
    x1,
    y1,
    x2,
    y2
){

    const line =
        document.createElement("div");

    line.className =

        container.classList.contains(
            "tree-container"
        )

        ? "tree-line"

        : "graph-edge";

    const length =
        Math.hypot(
            x2 - x1,
            y2 - y1
        );

    const angle =
        Math.atan2(
            y2 - y1,
            x2 - x1
        ) * 180 / Math.PI;

    line.style.width =
        `${length}px`;

    line.style.left =
        `${x1}px`;

    line.style.top =
        `${y1}px`;

    line.style.transform =
        `rotate(${angle}deg)`;

    container.appendChild(line);
}
/* ========================================================= */
/* HIGHLIGHTS */
/* ========================================================= */

function highlightTraversal(value){

    document
    .querySelectorAll(

        ".array-box, .stack-item, .queue-item, .linked-node, .tree-node"

    )
    .forEach(el => {

        if(
            String(el.dataset.value)
            ===
            String(value)
        ){

            el.classList.add(
                "active-traversal"
            );

            setTimeout(() => {

                el.classList.remove(
                    "active-traversal"
                );

            }, 1000);

        }

    });

}
// ----------------------------------------
function highlightFound(value){

    document
    .querySelectorAll(

        ".array-box, .stack-item, .queue-item, .linked-node, .tree-node"

    )
    .forEach(el => {

        if(
            String(el.dataset.value)
            ===
            String(value)
        ){

            el.classList.add(
                "found-node"
            );

        }

    });

}


function highlightGraphNode(value){

    document
    .querySelectorAll(".graph-node")
    .forEach(node => {

        if(
            String(node.dataset.value)
            ===
            String(value)
        ){

            node.classList.add(
                "active-traversal"
            );

            setTimeout(() => {

                node.classList.remove(
                    "active-traversal"
                );

            }, 1800);

        }

    });

}



/* ========================================================= */
/* RESET */
/* ========================================================= */

function resetAll(){

    visualizerArea.innerHTML = "";

    timelineContent.innerHTML = "";

    previousCode = "";

    previousSnapshot = "";

    rebuildScene();
}

/* ========================================================= */
/* TIMELINE */
/* ========================================================= */

function addTimeline(text){

    const item =
        document.createElement("div");

    item.className =
        "timeline-item";

    item.innerText =
        text;

    timelineContent.appendChild(item);
}

/* ========================================================= */
/* AI */
/* ========================================================= */

// function analyzeCode(actions){

//     if(actions.length === 0) return;

//     const latest =
//         actions[actions.length - 1];

//     if(latest.type === "error") return;

//     aiReply(

//         `${latest.ds} ${latest.action} executed successfully`

//     );

// }

// function aiReply(text){

//     if(aiPaused) return;

//     addMessage(
//         text,
//         "ai-message"
//     );

//     speak(text);
// }
function aiReply(text){

    if(

        !text

        ||

        text === "undefined"

        ||

        text.trim() === ""

    ){

        return;
    }

    if(aiPaused) return;

    addMessage(
        text,
        "ai-message"
    );

    speak(text);
}
// end
function aiInterrupt(text){

    addMessage(
        text,
        "ai-message"
    );

    speak(text);
}

function addMessage(text, className){

    const div =
        document.createElement("div");

    div.className =
        className;

    div.innerText =
        text;

    chatBox.appendChild(div);

    chatBox.scrollTop =
        chatBox.scrollHeight;

        // ai memory
        aiMemory.push({

    role:
        className === "user-message"
        ? "user"
        : "assistant",

    content:text
});

if(aiMemory.length > 20){

    aiMemory.shift();
}
}

/* ========================================================= */
/* CHAT */
/* ========================================================= */

sendBtn.addEventListener("click", sendMessage);

chatInput.addEventListener("keypress", e => {

    if(e.key === "Enter"){

        sendMessage();
    }

});

async function sendMessage(){

    const text =
        chatInput.value.trim();

    if(text === "") return;

    addMessage(
        text,
        "user-message"
    );

    // editor.value +=
    //     "\n" + text.toUpperCase();

    // updateVisualization();
  

    chatInput.value = "";
      await askAI(text);
}

/* ========================================================= */
/* MUTE */
/* ========================================================= */

/* ========================================================= */
/* MUTE */
/* ========================================================= */

muteBtn.addEventListener(
    "click",
    () => {

        isMuted = !isMuted;

        if(isMuted){

            speechSynthesis.pause();

            muteBtn.innerText =
                "UNMUTE";
        }

        else{

            speechSynthesis.resume();

            muteBtn.innerText =
                "MUTE";
        }

    }
);

/* ========================================================= */
/* PAUSE */
/* ========================================================= */

pauseAiBtn.addEventListener("click", () => {

    aiPaused = !aiPaused;

    speechSynthesis.cancel();

});

/* ========================================================= */
/* MIC */
/* ========================================================= */

micBtn.addEventListener("click", () => {

    if(
        !(
            "webkitSpeechRecognition"
            in window
        )
    ){

        alert(
            "Speech recognition not supported"
        );

        return;
    }

    const recognition =
        new webkitSpeechRecognition();

    recognition.lang = "en-US";

    recognition.start();

    
recognition.onresult =
async function(event){

    const transcript =
        event.results[0][0]
        .transcript;

    addMessage(
        transcript,
        "user-message"
    );

    await askAI(transcript);
};
/* ========================================================= */
/* INIT */
/* ========================================================= */

setTimeout(() => {

    aiReply(
        // "DSA workspace initialized"
    );

}, 1200);



// new editor access
function applyEditorCommand(command){

    if(!command) return;

    editor.value +=
        "\n" + command.toUpperCase();

    updateVisualization();
}



// ask ai 
async function askAI(userText){

    try{

        const response =
            await fetch("/ask-ai", {

                method:"POST",

                headers:{
                    "Content-Type":"application/json"
                },

                body:JSON.stringify({

                    message:userText,

                    ds:selectedDS,

                    editor:editor.value,

                    memory:aiMemory

                })

            });

        const data =
            await response.json();

        /* =========================== */
        /* AI REPLY */
        /* =========================== */

        if(data.reply){

            aiReply(data.reply);
        }

        /* =========================== */
        /* SAFE EDITOR COMMAND */
        /* =========================== */

        if(

            data.command

            &&

            (

                data.command.startsWith("INSERT")

                ||

                data.command.startsWith("DELETE")

                ||

                data.command.startsWith("SEARCH")

                ||
               
                data.command.startsWith(
                "DECLARE ARRAY SIZE"
)
 ||

                data.command.startsWith("ADD NODE")

                ||

                data.command.startsWith("CONNECT")

                ||

                data.command.startsWith("PUSH")

                ||

                data.command.startsWith("POP")

                ||

                data.command.startsWith("ENQUEUE")

                ||

                data.command.startsWith("DEQUEUE")

            )

        ){

            applyEditorCommand(
                data.command
            );
        }

    }

    catch(error){

        console.log(error);

        aiReply(
            "AI connection failed"
        );

    }

}})



/* ========================================================= */
/* BACK BUTTON */
/* ========================================================= */

const backBtn =
    document.getElementById(
        "backBtn"
    );

if(backBtn){

    backBtn.addEventListener(
        "click",
        () => {

            window.location.href =
                "/dashboard";

        }
    );

}




/* ========================================================= */
/* RESET BUTTON */
/* ========================================================= */

document
.querySelectorAll(".top-btn")
.forEach(btn => {

    if(

        btn.innerText
        .toLowerCase()
        .includes("reset")

    ){

        btn.addEventListener("click", () => {

            /* ====================================== */
            /* STOP VOICE */
            /* ====================================== */

            speechSynthesis.cancel();

            /* ====================================== */
            /* RESET EDITOR */
            /* ====================================== */

            editor.value = "";

            /* ====================================== */
            /* RESET CHAT */
            /* ====================================== */

            chatBox.innerHTML = "";

            /* ====================================== */
            /* RESET TIMELINE */
            /* ====================================== */

            timelineContent.innerHTML = "";

            /* ====================================== */
            /* RESET MEMORY */
            /* ====================================== */

            aiMemory = [];

            graphTraversalResult = [];

            previousCode = "";

            previousSnapshot = "";

            executionRunning = false;

            /* ====================================== */
            /* RESET SCENE */
            /* ====================================== */

            scene.array = [];

            scene.stack = [];

            scene.queue = [];

            scene.linkedlist = [];

            scene.tree = [];

            scene.heap = [];

            scene.hashmap = {};

            scene.graph = {

                nodes:{},

                edges:[]
            };

            /* ====================================== */
            /* CLEAR VISUALIZER */
            /* ====================================== */

            visualizerArea.replaceChildren();

            /* ====================================== */
            /* REMOVE PANELS */
            /* ====================================== */

            document
            .querySelectorAll(

                ".graph-helper-panel, .graph-result-panel"

            )
            .forEach(el => el.remove());

        });

    }

});