const question = document.getElementById("question");
const askForm = document.getElementById("askForm");
const plusBtn = document.getElementById("plusBtn");
const plusMenu = document.getElementById("plusMenu");
const attachment = document.getElementById("attachment");
const attachmentPreview = document.getElementById("attachmentPreview");
const chatArea = document.getElementById("chatArea");
const micBtn = document.getElementById("micBtn");
const newChatBtn = document.getElementById("newChatBtn");

/* PLUS MENU */
plusBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    plusMenu.classList.toggle("show");
});

/* PLUS OPTIONS */
plusMenu.querySelectorAll("button").forEach(button => {
    button.addEventListener("click", () => {
        const action = button.dataset.action;

        if (action === "image") {
            attachment.accept = "image/*";
            attachment.removeAttribute("capture");
            attachment.click();
        }

        if (action === "file") {
            attachment.accept = "image/*,.pdf,.txt";
            attachment.removeAttribute("capture");
            attachment.click();
        }

        if (action === "camera") {
            attachment.accept = "image/*";
            attachment.setAttribute("capture", "environment");
            attachment.click();
        }

        if (action === "edit") {
            alert("Image Editor foundation প্রস্তুত। পরের ধাপে এখানে আসল editor যোগ করা হবে।");
        }

        plusMenu.classList.remove("show");
    });
});

/* FILE PREVIEW */
attachment.addEventListener("change", () => {
    attachmentPreview.innerHTML = "";

    if (!attachment.files.length) return;

    const file = attachment.files[0];
    const chip = document.createElement("div");
    chip.className = "file-chip";
    chip.textContent = "📎 " + file.name;

    attachmentPreview.appendChild(chip);
});

/* AUTO RESIZE */
question.addEventListener("input", () => {
    question.style.height = "auto";
    question.style.height = Math.min(question.scrollHeight, 150) + "px";
});

/* QUICK QUESTION */
window.fillQuestion = function(text) {
    question.value = text;
    question.focus();
    question.dispatchEvent(new Event("input"));
};

/* ADD MESSAGE */
function addMessage(role, text) {
    const box = document.createElement("div");
    box.className = "message " + role;

    const name = document.createElement("div");
    name.className = "message-name";
    name.textContent = role === "user" ? "আপনি" : "Jibon Roy AI";

    const body = document.createElement("div");
    body.className = "message-text";
    body.textContent = text;

    box.appendChild(name);
    box.appendChild(body);
    chatArea.appendChild(box);

    chatArea.scrollTop = chatArea.scrollHeight;
}

/* SEND TO REAL BACKEND */
askForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const text = question.value.trim();

    if (!text && !attachment.files.length) return;

    const formData = new FormData(askForm);

    addMessage("user", text || "📎 ফাইল পাঠানো হয়েছে");

    question.value = "";
    question.style.height = "auto";

    const oldText = question.placeholder;
    question.placeholder = "Jibon Roy AI উত্তর দিচ্ছে...";
    question.disabled = true;

    const sendBtn = askForm.querySelector(".send-btn");
    if (sendBtn) sendBtn.disabled = true;

    try {
        const response = await fetch("/ask", {
            method: "POST",
            body: formData,
            credentials: "same-origin"
        });

        if (!response.ok) {
            throw new Error("HTTP " + response.status);
        }

        const data = await response.json();
        if (data && data.status === "ok" && typeof data.answer === "string") {
            addMessage("bot", data.answer);
        } else {
            addMessage("bot", "উত্তর পাওয়া যায়নি। Backend response সঠিক নয়।");
        }

    } catch (error) {
        console.error(error);

        addMessage(
            "bot",
            "দুঃখিত, AI server-এর সঙ্গে সংযোগ করা যাচ্ছে না।"
        );
    }

    question.disabled = false;
    question.placeholder = oldText;

    if (sendBtn) sendBtn.disabled = false;

    question.focus();
});

/* ENTER TO SEND */
question.addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();

        if (question.value.trim() || attachment.files.length) {
            askForm.requestSubmit();
        }
    }
});

/* NEW CHAT */
newChatBtn.addEventListener("click", () => {
    if (confirm("নতুন চ্যাট শুরু করবেন?")) {
        window.location.href = "/clear";
    }
});

/* VOICE */
micBtn.addEventListener("click", () => {
    if (
        !("webkitSpeechRecognition" in window) &&
        !("SpeechRecognition" in window)
    ) {
        alert("এই browser-এ voice recognition বর্তমানে পাওয়া যাচ্ছে না।");
        return;
    }

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

    const recognition = new SpeechRecognition();

    recognition.lang = "bn-BD";
    recognition.interimResults = true;
    recognition.continuous = false;

    micBtn.textContent = "🔴";

    recognition.onresult = event => {
        let text = "";

        for (
            let i = event.resultIndex;
            i < event.results.length;
            i++
        ) {
            text += event.results[i][0].transcript;
        }

        question.value = text;
        question.dispatchEvent(new Event("input"));
    };

    recognition.onerror = () => {
        micBtn.textContent = "🎙️";
    };

    recognition.onend = () => {
        micBtn.textContent = "🎙️";
    };

    recognition.start();
});

/* COPY SUPPORT */
document.addEventListener("click", event => {
    const target = event.target.closest(".copy-btn");

    if (!target) return;

    const text =
        target.parentElement
        ?.querySelector(".message-text")
        ?.textContent || "";

    navigator.clipboard
        .writeText(text)
        .then(() => {
            target.textContent = "কপি হয়েছে ✓";

            setTimeout(() => {
                target.textContent = "কপি";
            }, 1200);
        });
});

/* CLOSE PLUS MENU */
document.addEventListener("click", event => {
    if (
        !plusMenu.contains(event.target) &&
        !plusBtn.contains(event.target)
    ) {
        plusMenu.classList.remove("show");
    }
});
