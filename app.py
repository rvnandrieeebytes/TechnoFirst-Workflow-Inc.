import os
from flask import Flask, render_template, request, jsonify
from werkzeug.utils import secure_filename
from urllib.parse import unquote

app = Flask(__name__)

# CONFIG
UPLOAD_FOLDER = 'static/uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# THE QUEUE (Shared Memory)
print_queue = []
order_counter = 0

@app.route('/')
def index(): return render_template('index.html')

@app.route('/details')
def details(): return render_template('details.html')

@app.route('/waiting')
def waiting(): return render_template('waiting.html')

@app.route('/admin_dashboard')
def admin_dashboard(): return render_template('admin.html', orders=print_queue)

# --- THE FIX: UPLOAD ROUTE ---
@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    filename = secure_filename(file.filename)
    file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
    # This MUST return 'fileName' for your JS to redirect correctly
    return jsonify({"fileName": filename})

# --- THE FIX: ADD TO QUEUE ROUTE ---
@app.route('/add_to_queue', methods=['POST'])
def add_to_queue():
    global order_counter
    data = request.json
    
    order_counter += 1

    # Auto-generate the ID
    prefix = 'R' if data.get('isHurry') == 'yes' else ''
    new_id = f"{prefix}{order_counter:04d}"
    
    # Ensure all new fields are stored in the object
    order = {
        "assignedID": new_id,
        "fileName": data.get('fileName'),
        "paperType": data.get('paperType'),
        "size": data.get('size'),
        "colorMode": data.get('colorMode'),
        "isThesis": data.get('isThesis'),
        "shouldBind": data.get('shouldBind'),
        "isHurry": data.get('isHurry'),
        "priority": data.get('priority'),
        "deadline": data.get('deadline'),
        "isDone": False
    }
    
    print_queue.append(order)
    return jsonify({"status": "success", "assignedID": new_id})

@app.route('/check_status')
def check_status():
    file_raw = request.args.get('file', '')
    file_name = unquote(file_raw)
    for order in print_queue:
        if order['fileName'] == file_name:
            return jsonify({"assignedID": order.get('assignedID'), "isDone": order.get('isDone')})
    return jsonify({"error": "Not found"}), 404

@app.route('/mark_done', methods=['POST'])
def mark_done():
    data = request.json
    target = data.get('fileName')
    
    global print_queue
    # Find the order first to make sure we mark it as done for the user
    for order in print_queue:
        if order['fileName'] == target:
            order['isDone'] = True # This triggers the User's "Done" screen
            
            # Use a timer or simply keep it in memory for the user, 
            # but we will return success so the Admin can hide it.
            return jsonify({"success": True})
            
    return jsonify({"success": False}), 404

@app.route('/remove_from_admin', methods=['POST'])
def remove_from_admin():
    data = request.json
    target = data.get('fileName')
    
    global print_queue
    # This actually deletes the record from the server's memory
    print_queue = [order for order in print_queue if order['fileName'] != target]
    
    print(f"DEBUG: Order {target} deleted from queue.")
    return jsonify({"success": True})

@app.route('/api/get_queue')
def get_queue():
    # This sends your current print_queue list to the browser as JSON
    # It assumes your list variable is named 'print_queue'
    return jsonify(print_queue)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)