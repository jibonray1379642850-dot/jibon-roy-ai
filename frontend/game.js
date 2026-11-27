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

    if (file.type.startsWith("image/")) {
        const img = document.createElement("img");
        img.className = "attachment-image-preview";
        img.src = URL.createObjectURL(file);
        img.alt = "নির্বাচিত ছবির Preview";
        attachmentPreview.appendChild(img);
    }

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
function addMessage(role, text, imageFile = null) {
    const box = document.createElement("div");
    box.className = "message " + role;

    const name = document.createElement("div");
    name.className = "message-name";
    name.textContent = role === "user" ? "আপনি" : "Jibon Roy AI";

    const body = document.createElement("div");
    body.className = "message-text";
    body.textContent = text;

    box.appendChild(name);

    if (imageFile && imageFile.type.startsWith("image/")) {
        const img = document.createElement("img");
        img.className = "chat-image";
        img.src = URL.createObjectURL(imageFile);
        img.alt = "আপনার পাঠানো ছবি";
        img.loading = "lazy";
        box.appendChild(img);
    }

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

    addMessage("user", text || "📎 ফাইল পাঠানো হয়েছে", attachment.files[0] || null);

    question.value = "";
    question.style.height = "auto";

    const oldText = question.placeholder;
    question.placeholder = "Jibon Roy AI উত্তর দিচ্ছে...";
    question.disabled = true;

    const sendBtn = askForm.querySelector(".send-btn");
    if (sendBtn) sendBtn.disabled = true;

    try {
        const response = await fetch("https://jibon-roy-ai.onrender.com/ask", {
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

/* VOICE RECORDING */
let mediaRecorder = null;
let recordedChunks = [];
let micStream = null;
let recording = false;

micBtn.addEventListener("click", async () => {
    if (recording && mediaRecorder) {
        mediaRecorder.stop();
        recording = false;
        micBtn.textContent = "⏳";
        micBtn.disabled = true;
        return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia ||
        !window.MediaRecorder) {
        alert("এই WebView-তে অডিও রেকর্ডিং সমর্থিত নয়।");
        return;
    }

    try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        recordedChunks = [];

        let options = {};
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
            options.mimeType = "audio/webm;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/webm")) {
            options.mimeType = "audio/webm";
        } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
            options.mimeType = "audio/mp4";
        }

        mediaRecorder = new MediaRecorder(micStream, options);

        mediaRecorder.ondataavailable = event => {
            if (event.data && event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        mediaRecorder.onerror = () => {
            alert("অডিও রেকর্ডিংয়ে সমস্যা হয়েছে।");
            micBtn.textContent = "🎙️";
            micBtn.disabled = false;
            recording = false;
            micStream?.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.onstop = async () => {
            const mime = mediaRecorder.mimeType || "audio/webm";
            const extension = mime.includes("mp4") ? "mp4" : "webm";
            const audioBlob = new Blob(recordedChunks, { type: mime });

            micStream?.getTracks().forEach(track => track.stop());
            micStream = null;

            if (!audioBlob.size) {
                alert("কোনো অডিও রেকর্ড হয়নি। আবার চেষ্টা করো।");
                micBtn.textContent = "🎙️";
                micBtn.disabled = false;
                return;
            }

            const form = new FormData();
            form.append("audio", audioBlob, "recording." + extension);

            try {
                const response = await fetch("https://jibon-roy-ai.onrender.com/transcribe", {
                    method: "POST",
                    body: form,
                    credentials: "same-origin"
                });
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || "অডিও লেখা করা যায়নি।");
                }

                if (data.text) {
                    question.value = data.text;
                    question.dispatchEvent(new Event("input"));
                    question.focus();
                } else {
                    alert("কথা শনাক্ত হয়নি। একটু পরিষ্কার করে আবার বলো।");
                }
            } catch (error) {
                alert(error.message || "Voice সার্ভারে সমস্যা হয়েছে।");
            } finally {
                micBtn.textContent = "🎙️";
                micBtn.disabled = false;
            }
        };

        mediaRecorder.start();
        recording = true;
        micBtn.textContent = "⏹️";
    } catch (error) {
        micBtn.textContent = "🎙️";
        micBtn.disabled = false;
        alert("মাইক্রোফোন চালু হয়নি: " + (error.message || error));
    }
});

/* COPY SUPPORT */

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
