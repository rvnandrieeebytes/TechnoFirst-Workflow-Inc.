import sqlite3
import os

from flask import Flask, render_template, request, jsonify, redirect, session
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
from functools import wraps

app = Flask(__name__)


# =====================
# CONFIG
# =====================
app.config.update(
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=False
)

app.secret_key = os.environ.get("SECRET_KEY", "technofirst_secret")

DATABASE = "technofirst.db"

UPLOAD_FOLDER = "static/uploads"
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "pdf", "docx", "doc"}

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024

os.makedirs(UPLOAD_FOLDER, exist_ok=True)


# =====================
# DB CONNECTION
# =====================
def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

PAPERTYPE_MAP = { 
    "bond" : "Bond Paper", 
    "glossy" : "Glossy Paper", 
    "matte" : "Matte Paper", 
    "card" : "Card Paper", 
    "vellum" : "Vellum Card" 
} 

SIZE_MAP = { 
    "1x1" : "1 x 1", 
    "2x2" : "2 x 2", 
    "letter": "Letter (8.5 x 11)", 
    "a4": "A4 (8.3 x 11.7)", 
    "legal": "Legal (8.5 x 14)", 
    "2r": "2R (2.5 x 3.5)", 
    "3r": "3R (3.5 x 5)", 
    "4r": "4R (4 x 6)", 
    "5r": "5R (5 x 7)" 
}

# =====================
# INIT DB
# =====================
def init_db():
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("""
    CREATE TABLE IF NOT EXISTS PrintOrder (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        assignedID TEXT UNIQUE,

        fileName TEXT,
        paperType TEXT,
        size TEXT,
        colorMode TEXT,

        isThesis TEXT,
        shouldBind TEXT,
        laminate TEXT,
        cutPhotos TEXT,

        isHurry TEXT,
        deadline TEXT,

        deliveryType TEXT,

        riderUsername TEXT,
        riderName TEXT,
        riderContact TEXT,

        status TEXT,

        moreInfo TEXT,

        firstName TEXT,
        middleName TEXT,
        lastName TEXT,
        address TEXT,
        contactNumber TEXT,

        price REAL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS Users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        fullName TEXT,
        contactNumber TEXT,
        role TEXT
    )
    """)

    conn.commit()
    conn.close()


init_db()


# =====================
# NO CACHE (IMPORTANT FIX FOR AUTO REFRESH BUG)
# =====================
@app.after_request
def no_cache(response):
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response


# =====================
# AUTH
# =====================
def login_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if not session.get("username"):
            return redirect("/user_login")
        return f(*args, **kwargs)
    return wrapper


def role_required(role):
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            if session.get("role") != role:
                return "Unauthorized", 403
            return f(*args, **kwargs)
        return wrapper
    return decorator


# =====================
# PAGES
# =====================
@app.route("/")
def index():
    return render_template("index.html")


@app.route("/details")
def details():
    return render_template("details.html")


@app.route("/waiting")
def waiting():
    return render_template("waiting.html")


@app.route("/admin_dashboard")
@login_required
@role_required("admin")
def admin_dashboard():
    conn = get_db_connection()

    orders = conn.execute("""
        SELECT * FROM PrintOrder
        WHERE status NOT IN ('delivered', 'ready')
        ORDER BY created_at DESC
    """).fetchall()

    conn.close()

    return render_template("admin.html", orders=orders)


@app.route("/rider")
@login_required
@role_required("rider")
def rider_dashboard():
    return render_template("rider.html")


@app.route("/logout")
def logout():
    session.clear()
    return redirect("/user_login")


@app.route("/user_login")
def login_page():
    return render_template("login.html")


@app.route("/user_register")
def register_page():
    return render_template("register.html")


# =====================
# LOGIN
# =====================
@app.route("/auth_login", methods=["POST"])
def auth_login():
    data = request.json

    conn = get_db_connection()

    user = conn.execute("""
        SELECT * FROM Users WHERE username = ?
    """, (data.get("username"),)).fetchone()

    conn.close()

    if user and check_password_hash(user["password"], data.get("password")):
        session["username"] = user["username"]
        session["role"] = user["role"]

        # debug multi-role tracking
        if "roles" not in session:
            session["roles"] = []

        if user["role"] not in session["roles"]:
            session["roles"].append(user["role"])

        return jsonify({"success": True, "role": user["role"]})

    return jsonify({"success": False})

#Temporarily
@app.route("/debug_session")
def debug_session():
    return jsonify(dict(session))


# =====================
# CREATE USER
# =====================
@app.route("/create_user_account", methods=["POST"])
def create_user():
    data = request.json

    conn = get_db_connection()

    exists = conn.execute("""
        SELECT * FROM Users WHERE username = ?
    """, (data.get("username"),)).fetchone()

    if exists:
        conn.close()
        return jsonify({"success": False, "message": "User exists"})

    conn.execute("""
        INSERT INTO Users (username, password, fullName, contactNumber, role)
        VALUES (?, ?, ?, ?, ?)
    """, (
        data.get("username"),
        generate_password_hash(data.get("password")),
        data.get("fullName"),
        data.get("contactNumber"),
        data.get("role", "rider")
    ))

    conn.commit()
    conn.close()

    return jsonify({"success": True})


# =====================
# UPLOAD (FIXED - THIS WAS YOUR ISSUE)
# =====================
def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route("/upload", methods=["POST"])
def upload_file():

    if "file" not in request.files:
        return jsonify({"success": False, "error": "No file"}), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({"success": False, "error": "No file selected"}), 400

    if not allowed_file(file.filename):
        return jsonify({"success": False, "error": "Invalid file type"}), 400

    filename = secure_filename(file.filename)

    base, ext = os.path.splitext(filename)
    counter = 1

    save_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)

    while os.path.exists(save_path):
        filename = f"{base}({counter}){ext}"
        save_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
        counter += 1

    try:
        file.save(save_path)

        return jsonify({
            "success": True,
            "fileName": filename
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# =====================
# QUEUE
# =====================
@app.route("/add_to_queue", methods=["POST"])
def add_to_queue():
    try:
        data = request.json

        conn = get_db_connection()
        cur = conn.cursor()

        size_label = SIZE_MAP.get(data.get("size"), data.get("size")) 
        paper_label = PAPERTYPE_MAP.get(data.get("paperType"), data.get("paperType"))

        today = datetime.now().strftime("%Y%m%d")

        cur.execute("""
            SELECT COUNT(*) FROM PrintOrder
            WHERE DATE(created_at) = DATE('now','localtime')
        """)

        count = cur.fetchone()[0] + 1
        assignedID = f"{today}-{count:04d}"

        # 🔥 DEBUG PRINT (IMPORTANT)
        print("ADD TO QUEUE DATA:", data)

        cur.execute("""
            INSERT INTO PrintOrder (
                assignedID,
                fileName,
                paperType,
                size,
                colorMode,
                isThesis,
                shouldBind,
                laminate,
                cutPhotos,
                isHurry,
                deadline,
                deliveryType,
                riderUsername,
                riderName,
                riderContact,
                status,
                moreInfo,
                firstName,
                middleName,
                lastName,
                address,
                contactNumber,
                price
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            assignedID,
            data.get("fileName", ""),
            paper_label,
            size_label,
            data.get("colorMode", ""),
            data.get("isThesis", ""),
            data.get("shouldBind", ""),
            data.get("laminate", ""),
            data.get("cutPhotos", ""),
            data.get("isHurry", ""),
            data.get("deadline", ""),
            data.get("deliveryType", ""),

            "", "", "",

            "pending",

            data.get("moreInfo", ""),

            data.get("firstName", ""),
            data.get("middleName", ""),
            data.get("lastName", ""),
            data.get("address", ""),
            data.get("contactNumber", ""),
            float(data.get("price") or 0)
        ))

        conn.commit()
        conn.close()

        return jsonify({
            "success": True,
            "assignedID": assignedID
        })

    except Exception as e:
        print("🔥 ADD TO QUEUE ERROR:", str(e))
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# =====================
# ADMIN API
# =====================
@app.route("/api/get_queue")
@login_required
@role_required("admin")
def get_queue():

    conn = get_db_connection()

    orders = conn.execute("""
        SELECT * FROM PrintOrder
        WHERE status NOT IN ('delivered', 'ready')
        ORDER BY datetime(created_at) DESC
    """).fetchall()

    conn.close()

    response = jsonify([dict(o) for o in orders])

    # 🔥 FORCE NO CACHE
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"

    return response


# =====================
# RIDER API
# =====================
@app.route("/api/get_deliveries")
@login_required
@role_required("rider")
def get_deliveries():

    username = session.get("username")

    conn = get_db_connection()

    orders = conn.execute("""
        SELECT * FROM PrintOrder
        WHERE riderUsername = ?
        AND status = 'out_for_delivery'
    """, (username,)).fetchall()

    conn.close()

    response = jsonify([dict(o) for o in orders])

    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"

    return response


# =====================
# CHECK STATUS (WAITING PAGE)
# =====================
@app.route("/check_status")
def check_status():
    assignedID = request.args.get("assignedID")

    conn = get_db_connection()

    order = conn.execute("""
        SELECT * FROM PrintOrder WHERE assignedID = ?
    """, (assignedID,)).fetchone()

    conn.close()

    if not order:
        return jsonify({"error": "not found"}), 404

    return jsonify(dict(order))


# =====================
# UPDATE STATUS
# =====================
@app.route("/update_status", methods=["POST"])
@login_required
def update_status():
    data = request.json

    conn = get_db_connection()

    conn.execute("""
        UPDATE PrintOrder
        SET status = ?, price = ?
        WHERE assignedID = ?
    """, (
        data.get("status"),
        float(data.get("price") or 0),
        data.get("assignedID")
    ))

    conn.commit()

    # 🔥 FORCE REFRESH READ (important for SQLite locking issues)
    conn.close()
    return jsonify({"success": True})

# =====================
# GET RIDER
# =====================
@app.route("/api/get_riders")
@login_required
@role_required("admin")
def get_riders():

    conn = get_db_connection()

    riders = conn.execute("""
        SELECT username, fullName, contactNumber
        FROM Users
        WHERE role = 'rider'
    """).fetchall()

    conn.close()

    return jsonify([dict(r) for r in riders])

# =====================
# ASSIGN RIDER
# =====================
@app.route("/assign_rider", methods=["POST"])
@login_required
@role_required("admin")
def assign_rider():
    data = request.json

    conn = get_db_connection()

    rider = conn.execute("""
        SELECT * FROM Users
        WHERE username = ? AND role = 'rider'
    """, (data.get("riderUsername"),)).fetchone()

    if not rider:
        conn.close()
        return jsonify({"success": False})

    conn.execute("""
        UPDATE PrintOrder
        SET riderUsername = ?,
            riderName = ?,
            riderContact = ?,
            status = 'out_for_delivery'
        WHERE assignedID = ?
    """, (
        rider["username"],
        rider["fullName"],
        rider["contactNumber"],
        data.get("assignedID")
    ))

    conn.commit()
    conn.close()

    return jsonify({"success": True})

# ===================== 
# # DELIVERY ORDERS (RIDER) 
# # ===================== 
@app.route('/mark_delivered', methods=['POST'])
@login_required
@role_required("rider")
def mark_delivered():

    data = request.json
    assigned_id = data.get('assignedID')

    if not assigned_id:
        return jsonify({"success": False, "error": "Missing assignedID"}), 400

    conn = get_db_connection()

    conn.execute("""
        UPDATE PrintOrder
        SET status = 'delivered'
        WHERE assignedID = ?
    """, (assigned_id,))

    conn.commit()
    conn.close()

    return jsonify({"success": True})

# =====================
# RUN SERVER
# =====================
if __name__ == "__main__":
    #app.run(debug=True, port=5000)
    app.run(host="0.0.0.0", port=5000)