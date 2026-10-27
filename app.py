from flask import Flask, request, render_template_string, session, redirect, url_for, jsonify
import ast
import operator
import os
import urllib.request
import json

app = Flask(__name__)
app.secret_key = os.environ.get("JIBON_ROY_SECRET", "change-this-local-secret-before-sharing")

# Optional local AI server (for example, a compatible OpenAI-style endpoint).
# Set JIBON_ROY_AI_URL and JIBON_ROY_MODEL when you later configure a model.
def read_groq_key():
    key = os.environ.get("GROQ_API_KEY", "").strip()
    if key:
        return key
    try:
        with open(os.path.join(os.path.dirname(__file__), ".env"), encoding="utf-8") as f:
            for line in f:
                if line.strip().startswith("GROQ_API_KEY="):
                    return line.strip().split("=", 1)[1].strip().strip(chr(34) + chr(39))
    except OSError:
        pass
    return ""

GROQ_API_KEY = read_groq_key()
AI_URL = os.environ.get("JIBON_ROY_AI_URL", "https://api.groq.com/openai/v1").strip()
AI_MODEL = os.environ.get("JIBON_ROY_MODEL", "openai/gpt-oss-120b").strip()

PAGE = r"""
<!doctype html>
<html lang="bn">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#101827">
<title>Jibon Roy AI</title>
<style>
:root{color-scheme:dark;--bg:#0b1120;--panel:#121c2f;--line:#29364d;--text:#edf3ff;--muted:#aab7ce;--accent:#70a5ff}
*{box-sizing:border-box}
body{margin:0;background:radial-gradient(ellipse at top,#1c3152 0%,#0b1120 55%,#070b14 100%);color:var(--text);font:16px system-ui,-apple-system,"Noto Sans Bengali",sans-serif;min-height:100vh}
.wrap{max-width:760px;margin:auto;padding:20px}
header{text-align:center;padding:26px 8px 18px}
h1{margin:0;font-size:clamp(28px,6vw,40px);letter-spacing:-.5px}
.panel{background:rgba(18,28,47,.88);border:1px solid #344663;border-radius:22px;padding:18px;margin:14px 0;box-shadow:0 12px 32px rgba(0,0,0,.18)}
.msg{padding:15px 17px;border-radius:18px;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.75}
.user{background:linear-gradient(135deg,#254a7c,#20385e);align-self:flex-end;max-width:92%;border-bottom-right-radius:5px}
.bot{background:#17243a;border:1px solid #30415f;align-self:stretch;border-bottom-left-radius:5px}
textarea{resize:vertical;min-height:58px;max-height:180px;flex:1;min-width:0;border:1px solid #405575;border-radius:16px;background:#0b1424;color:var(--text);padding:14px;font:inherit}
button,.btn{border:0;border-radius:14px;background:linear-gradient(135deg,#8bb8ff,#70a5ff);color:#081326;font-weight:700;padding:12px 16px;cursor:pointer;text-decoration:none;transition:filter .2s}
button:hover,.btn:hover{filter:brightness(1.08)}
button.secondary,.example{background:#263650;color:var(--text)}
@media(max-width:520px){.wrap{padding:10px}.panel{padding:13px;border-radius:18px}form.ask{flex-direction:column}form.ask button{width:100%}}
.wrap{max-width:900px;margin:auto;padding:18px}
header{padding:20px 4px 12px}
h1{margin:0;font-size:clamp(25px,5vw,36px)}
.sub{color:var(--muted);margin-top:8px;line-height:1.6}
.panel{background:rgba(18,28,47,.96);border:1px solid var(--line);border-radius:18px;padding:16px;margin:12px 0}
.actions{display:flex;gap:8px;flex-wrap:wrap}
button,.btn{border:0;border-radius:12px;background:var(--accent);color:#081326;font-weight:700;padding:11px 14px;cursor:pointer;text-decoration:none}
button.secondary{background:#263650;color:var(--text)}
.chat{display:flex;flex-direction:column;gap:12px;min-height:180px}
.msg{padding:13px 15px;border-radius:14px;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.65}
.user{background:#20385e;align-self:flex-end;max-width:95%}
.bot{background:#1a273c;border:1px solid #2a3a54;align-self:stretch}
form.ask{display:flex;gap:8px;margin-top:14px}
.upload-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.plus-btn{display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:12px;background:#263650;color:#edf3ff;font-size:28px;cursor:pointer;border:1px solid #405575}
#file-name{overflow-wrap:anywhere}

textarea{resize:vertical;min-height:54px;max-height:180px;flex:1;min-width:0;border:1px solid var(--line);border-radius:12px;background:#0b1424;color:var(--text);padding:13px;font:inherit}
.small{color:var(--muted);font-size:13px;line-height:1.6}
.examples{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
.example{background:#263650;color:var(--text);font-weight:500}
@media(max-width:520px){.wrap{padding:10px}.panel{padding:12px}form.ask{flex-direction:column}form.ask button{width:100%}}
</style>
</head>
<body><main class="wrap">
<header>
<h1>🤖 Jibon Roy AI</h1>
<div class="sub">বাংলা ও ইংরেজি প্রশ্নোত্তরের সহায়ক • মোবাইল-উপযোগী প্রাথমিক সংস্করণ</div>
</header>
<section class="panel">
<div class="actions">
<form method="post" action="/clear"><button class="secondary" type="submit">চ্যাট মুছুন</button></form>
<a class="btn" href="/health">সিস্টেম পরীক্ষা</a>
</div>
<p class="small">নোট: AI মডেল সংযুক্ত না থাকলে এই সংস্করণ সাধারণ পরিচিতি, কিছু গণিত ও নির্দিষ্ট প্রশ্নে উত্তর দিতে পারবে। এটি ChatGPT-এর সমমানের পূর্ণ AI নয়।</p>
</section>
<section class="panel">
<div class="chat">
{% for item in history %}
<div class="msg user"><strong>আপনি</strong><br>{{ item.q }}</div>
<div class="msg bot"><strong>Jibon Roy AI</strong><br>{{ item.a }}</div>
{% endfor %}
{% if not history %}
<div class="msg bot"><strong>Jibon Roy AI</strong><br>নমস্কার! আমি Jibon Roy AI-এর প্রাথমিক সংস্করণ। নিচে প্রশ্ন লিখুন। পরে একটি AI মডেল যুক্ত করলে আরও বিস্তৃত প্রশ্নের উত্তর দেওয়া যাবে।</div>
{% endif %}
</div>
<form class="ask" method="post" action="/ask" enctype="multipart/form-data">
<div class="upload-row">
<label class="plus-btn" for="attachment" title="ছবি বা ফাইল যোগ করুন">＋</label>
<input id="attachment" type="file" name="attachment" accept="image/*,.pdf,.txt" hidden>
<span id="file-name" class="small">ছবি বা ফাইল যোগ করুন (ঐচ্ছিক)</span>
</div>
<textarea name="q" maxlength="4000" placeholder="আপনার প্রশ্ন লিখুন..." ></textarea>
<button type="submit">পাঠান</button>
</form>
<script>
const attachmentInput = document.getElementById('attachment');
if (attachmentInput) {
  attachmentInput.addEventListener('change', function () {
    const label = document.getElementById('file-name');
    label.textContent = this.files.length ? this.files[0].name : 'ছবি বা ফাইল যোগ করুন (ঐচ্ছিক)';
  });
}
</script>
<div class="examples">
<button class="example" type="button" onclick="fillQ('তোমার নাম কী?')">তোমার নাম কী?</button>
<button class="example" type="button" onclick="fillQ('বাংলাদেশের রাজধানী কী?')">বাংলাদেশের রাজধানী</button>
<button class="example" type="button" onclick="fillQ('গণনা: 123 * 456')">গণিতের উদাহরণ</button>
</div>
</section>
<section class="panel small">
<strong>গোপনীয়তা ও নিরাপত্তা</strong><br>
এই প্রাথমিক অ্যাপ কথোপকথন ব্রাউজারের সেশন কুকিতে রাখে। সংবেদনশীল তথ্য লিখবেন না। অন্যদের ব্যবহারের জন্য অনলাইনে প্রকাশ করলে আগে নিরাপত্তা, লগইন ও গোপনীয়তার ব্যবস্থা যোগ করতে হবে।
</section>
</main>
<script>
function fillQ(text){const box=document.querySelector('textarea[name="q"]');box.value=text;box.focus();}
</script>
</body></html>
"""

# Deliberately limited safe arithmetic parser; it does not evaluate arbitrary Python.
OPS = {
    ast.Add: operator.add, ast.Sub: operator.sub, ast.Mult: operator.mul,
    ast.Div: operator.truediv, ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod, ast.Pow: operator.pow,
    ast.UAdd: operator.pos, ast.USub: operator.neg,
}
def safe_math(expression):
    expression = expression.strip().replace("^", "**")
    if len(expression) > 120:
        raise ValueError("হিসাবটি অনেক বড়।")
    tree = ast.parse(expression, mode="eval")
    def visit(node):
        if isinstance(node, ast.Expression):
            return visit(node.body)
        if isinstance(node, ast.Constant) and type(node.value) in (int, float):
            return node.value
        if isinstance(node, ast.BinOp) and type(node.op) in OPS:
            left, right = visit(node.left), visit(node.right)
            if isinstance(node.op, ast.Pow) and abs(right) > 10:
                raise ValueError("ঘাত ১০-এর মধ্যে রাখুন।")
            value = OPS[type(node.op)](left, right)
            if abs(value) > 1e100:
                raise ValueError("ফলাফলটি অত্যন্ত বড়।")
            return value
        if isinstance(node, ast.UnaryOp) and type(node.op) in OPS:
            return OPS[type(node.op)](visit(node.operand))
        raise ValueError("শুধু সংখ্যা ও + - * / // % ** বন্ধনী ব্যবহার করুন।")
    return visit(tree)

def try_local_ai(question, history):
    """Call Groq and log safe diagnostic details if the request fails."""
    import urllib.error

    if not GROQ_API_KEY:
        print("AI error: GROQ_API_KEY is missing.")
        return "AI সংযোগ ব্যর্থ: সার্ভারে API Key সেট করা নেই।"

    messages = [{
        "role": "system",
        "content": "You are Jibon Roy AI, a helpful assistant. Answer clearly in the user's language. Be honest about uncertainty."
    }]
    for item in history[-8:]:
        messages.append({"role": "user", "content": item["q"]})
        messages.append({"role": "assistant", "content": item["a"]})
    messages.append({"role": "user", "content": question})

    payload = json.dumps({
        "model": AI_MODEL,
        "messages": messages,
        "temperature": 0.5,
        "max_tokens": 700
    }).encode("utf-8")

    req = urllib.request.Request(
        AI_URL.rstrip("/") + "/chat/completions",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": "Bearer " + GROQ_API_KEY,
            "User-Agent": "JibonRoyAI/1.0"
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            data = json.loads(response.read().decode("utf-8"))
        return data["choices"][0]["message"]["content"].strip()
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")[:1000]
        print(f"AI HTTP error: status={exc.code}; detail={detail}")
        return f"AI সংযোগে HTTP ত্রুটি হয়েছে (কোড {exc.code})। Render Logs পরীক্ষা করুন।"
    except urllib.error.URLError as exc:
        print(f"AI network error: {exc.reason}")
        return "AI সার্ভারে সংযোগ করা যায়নি। Render Logs পরীক্ষা করুন।"
    except Exception as exc:
        print(f"AI unexpected error: {type(exc).__name__}: {exc}")
        return "AI উত্তর তৈরি করতে পারেনি। Render Logs পরীক্ষা করুন।"

def answer_question(question, history):
    q = question.strip()
    low = q.lower()
    if not q:
        return "একটি প্রশ্ন লিখুন।"

    # If configured later, the local AI model is used first.
    model_answer = try_local_ai(q, history)
    if model_answer:
        return model_answer

    math_text = q
    for prefix in ("গণনা:", "হিসাব:", "calculate:", "math:"):
        if low.startswith(prefix):
            math_text = q[len(prefix):].strip()
            try:
                return f"উত্তর: {safe_math(math_text)}"
            except Exception as exc:
                return f"হিসাব করা যায়নি: {exc}"

    if any(x in low for x in ("তোমার নাম", "তোমার পরিচয়", "your name", "who are you")):
        return "আমার নাম Jibon Roy AI। এটি একটি প্রাথমিক সহায়ক অ্যাপ; AI মডেল যুক্ত করলে আরও নানা বিষয়ে উত্তর দিতে পারব।"
    if any(x in low for x in ("হ্যালো", "নমস্কার", "আসসালামু", "hello", "hi")):
        return "হ্যালো! কী জানতে চান? আপনার প্রশ্ন লিখুন।"
    if any(x in low for x in ("বাংলাদেশের রাজধানী", "capital of bangladesh")):
        return "বাংলাদেশের রাজধানী ঢাকা।"
    if any(x in low for x in ("কে তৈরি করেছে", "who created you", "তোমাকে কে বানিয়েছে")):
        return "এই প্রাথমিক প্রজেক্টটি Jibon Roy AI নামে তৈরি করা হচ্ছে।"
    return "দুঃখিত, এই প্রশ্নের উত্তর এখন দিতে পারছি না।"

@app.get("/")
def home():
    return render_template_string(PAGE, history=session.get("history", []))

@app.post("/ask")
def ask():
    question = request.form.get("q", "").strip()
    history = session.get("history", [])
    answer = answer_question(question, history)
    history.append({"q": question, "a": answer})
    session["history"] = history[-12:]
    return redirect(url_for("home"))

@app.post("/clear")
def clear():
    session.pop("history", None)
    return redirect(url_for("home"))

@app.get("/health")
def health():
    return {
        "app": "Jibon Roy AI",
        "status": "ok",
        "local_ai_configured": bool(AI_URL),
        "note": "A configured compatible AI model is required for broad open-ended answers."
    }

if __name__ == "__main__":
    # Local-only by default. Do not expose to the internet without authentication/security.
    app.run(host="127.0.0.1", port=5000, debug=False)
