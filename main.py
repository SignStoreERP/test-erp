import os
import io
import glob
import threading
import time
from datetime import datetime
from dotenv import load_dotenv
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, text
import json
import subprocess

# Load variables from .env
load_dotenv()

# Build the connection string dynamically
DB_USER = os.getenv("DB_USER", "admin")
DB_PASS = os.getenv("DB_PASSWORD", "supersecurepassword123")
DB_NAME = os.getenv("DB_NAME", "signos")
DB_HOST = os.getenv("DB_HOST", "db")
DB_PORT = os.getenv("DB_PORT", "5432")

DB_URL = f'postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}'
engine = create_engine(DB_URL)

app = FastAPI(title="SignOS Enterprise Brain (Data Vault)")

# Enable Cross-Origin Resource Sharing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Moved health check to /api/health so it doesn't block the frontend
@app.get("/api/health")
def health_check():
    return {"status": "ONLINE", "version": "3.2.0", "architecture": "Triple-Engine Cloud VPS"}

# --- THE UNIVERSAL DATA GATEWAY (GET) ---
@app.get("/api/data/{table}")
def get_table(table: str):
    """Generic reader for any table in the database"""
    try:
        with engine.connect() as conn:
            result = conn.execute(text(f'SELECT * FROM {table.lower()}'))
            return [dict(row._mapping) for row in result]
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

# --- THE UNIVERSAL DATA GATEWAY (POST/UPDATE/INSERT) ---
@app.post("/api/data/{table}")
async def mutate_table(table: str, request: Request):
    """Universal endpoint to Insert or Update database tables from the UI"""
    try:
        payload = await request.json()
        action = payload.get("action", "insert")
        data = payload.get("data", {})
        
        with engine.begin() as conn:
            if action == "insert":
                cols = ", ".join([f'"{k}"' for k in data.keys()])
                vals = ", ".join([f":{k}" for k in data.keys()])
                query = text(f'INSERT INTO {table.lower()} ({cols}) VALUES ({vals})')
                conn.execute(query, data)
                
            elif action == "update":
                id_col = payload.get("id_column")
                id_val = payload.get("id_value")
                set_clause = ", ".join([f'"{k}" = :{k}' for k in data.keys()])
                query = text(f'UPDATE {table.lower()} SET {set_clause} WHERE "{id_col}" = :id_val')
                exec_data = {**data, "id_val": id_val}
                conn.execute(query, exec_data)
                
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# --- CONFIGURATION & MDM ---
@app.get("/api/config/{product_code}")
def get_product_config(product_code: str):
    try:
        with engine.connect() as conn:
            # Fetch Global Costs
            global_res = conn.execute(text("SELECT cost_id, default_source_ref FROM sys_global_costs"))
            config = {str(row[0]).strip(): str(row[1]).replace('$', '').replace(',', '').strip() for row in global_res}

            # Fetch Product Overrides
            prod_res = conn.execute(
                text("SELECT variable_name, variable_value FROM sys_product_config WHERE product_code = :p"), 
                {"p": product_code}
            )
            for row in prod_res:
                config[str(row[0]).strip()] = str(row[1]).replace('$', '').replace(',', '').strip()

            return {"status": "success", "config": config}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# --- AUTHENTICATION ---
@app.post("/api/auth")
async def login(request: Request):
    try:
        payload = await request.json()
        pin = str(payload.get("pin"))
        with engine.connect() as conn:
            result = conn.execute(text('SELECT * FROM master_staff WHERE "access_pin" = :p'), {"p": pin})
            user = result.fetchone()
            if user:
                u = dict(user._mapping)
                return {"status": "success", "user": {"name": f"{u['first_name']} {u['last_name']}", "role": u['access_role']}}
        return {"status": "error", "message": "Invalid PIN"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# --- SYSTEM OPERATIONS (GIT, REBOOT, MIGRATION) ---

@app.get("/api/changelog")
def get_changelog():
    try:
        with engine.connect() as conn:
            query = text("SELECT * FROM sys_changelog ORDER BY timestamp DESC LIMIT 50")
            result = conn.execute(query)
            return {"status": "success", "data": [dict(row._mapping) for row in result]}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/system/git-status")
def system_git_status():
    """Checks synchronization status and file differences between local host and GitHub."""
    try:
        subprocess.run(["git", "fetch"], cwd="/app", check=False)
        
        dirty_check = subprocess.run(["git", "status", "--porcelain"], cwd="/app", capture_output=True, text=True)
        dirty_files = [line.strip() for line in dirty_check.stdout.strip().split('\n') if line]
        is_dirty = len(dirty_files) > 0

        branch_status = subprocess.run(["git", "rev-list", "--left-right", "--count", "main...origin/main"], cwd="/app", capture_output=True, text=True)
        ahead, behind = 0, 0
        if branch_status.returncode == 0 and branch_status.stdout.strip():
            parts = branch_status.stdout.strip().split()
            if len(parts) == 2:
                ahead, behind = int(parts[0]), int(parts[1])

        diff_check = subprocess.run(["git", "diff", "--name-status", "main...origin/main"], cwd="/app", capture_output=True, text=True)
        diff_files = [line.strip() for line in diff_check.stdout.strip().split('\n') if line]

        state = "SYNCED"
        color = "text-green-500"
        if is_dirty:
            state = "UNCOMMITTED CHANGES"
            color = "text-yellow-500"
        elif ahead > 0 and behind > 0:
            state = "DIVERGED"
            color = "text-red-500"
        elif ahead > 0:
            state = f"PENDING PUSH ({ahead} Commits)"
            color = "text-blue-500"
        elif behind > 0:
            state = f"UPDATE AVAILABLE ({behind} Commits)"
            color = "text-orange-500"

        return {
            "status": "success", 
            "state": state, 
            "color": color, 
            "dirty": is_dirty, 
            "ahead": ahead, 
            "behind": behind,
            "local_changes": dirty_files,
            "remote_diff": diff_files
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/system/git-pull")
def system_git_pull():
    try:
        result = subprocess.run(["git", "pull", "origin", "main"], cwd="/app", capture_output=True, text=True)
        requires_reboot = ".py" in result.stdout
        return {
            "status": "success" if result.returncode == 0 else "error", 
            "message": result.stdout if result.returncode == 0 else result.stderr,
            "requires_reboot": requires_reboot
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/system/git-force-pull")
def system_git_force_pull():
    """Nuclear Option: Overwrites local changes to match GitHub perfectly."""
    try:
        diff_check = subprocess.run(["git", "diff", "--name-only", "main...origin/main"], cwd="/app", capture_output=True, text=True)
        requires_reboot = ".py" in diff_check.stdout
        subprocess.run(["git", "fetch", "origin"], cwd="/app", check=True)
        result = subprocess.run(["git", "reset", "--hard", "origin/main"], cwd="/app", capture_output=True, text=True)
        return {
            "status": "success", 
            "message": f"Force-Synced to GitHub.\n{result.stdout}",
            "requires_reboot": requires_reboot
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/system/git-push")
async def system_git_push(request: Request):
    try:
        payload = await request.json()
        msg = payload.get("message", "Auto-commit from SignOS UI")
        subprocess.run(["git", "add", "."], cwd="/app", check=True)
        commit = subprocess.run(["git", "commit", "-m", msg], cwd="/app", capture_output=True, text=True)
        if "nothing to commit" in commit.stdout:
            return {"status": "success", "message": "Already up to date."}
        push = subprocess.run(["git", "push", "origin", "main"], cwd="/app", capture_output=True, text=True)
        return {"status": "success", "message": "Pushed to GitHub."} if push.returncode == 0 else {"status": "error", "message": push.stderr}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/system/export-context")
def export_context_local():
    """Writes chronological NotebookLM Context Bundles to /notebook_context/."""
    try:
        export_dir = "/app/notebook_context"
        os.makedirs(export_dir, exist_ok=True)
        # Front-loaded timestamp for alphabetical/chronological alignment
        timestamp = datetime.now().strftime('%Y%m%d%H%M')

        # --- 1. BACKEND MASTER ---
        backend_content = f"SIGNOS BACKEND MASTER\nGenerated: {datetime.now()}\n\n"
        backend_files = list(set(glob.glob("**/*.py", recursive=True)))
        for f in backend_files:
            if os.path.exists(f):
                with open(f, "r", encoding="utf-8") as file:
                    backend_content += f"\n{'='*40}\nFILE: {f}\n{'='*40}\n{file.read()}\n"
        
        # --- 2. BUSINESS LOGIC MASTER ---
        logic_content = f"SIGNOS BUSINESS LOGIC MASTER\nGenerated: {datetime.now()}\n\n"
        all_js = glob.glob("**/*.js", recursive=True)
        logic_files = [f for f in all_js if "cost_" in f.lower() or "logic_" in f.lower()]
        for f in logic_files:
            if os.path.exists(f):
                with open(f, "r", encoding="utf-8") as file:
                    logic_content += f"\n{'='*40}\nFILE: {f}\n{'='*40}\n{file.read()}\n"

        # --- 3. FRONTEND MASTER ---
        frontend_content = f"SIGNOS FRONTEND MASTER\nGenerated: {datetime.now()}\n\n"
        all_html = glob.glob("**/*.html", recursive=True)
        frontend_files = [f for f in (all_html + all_js) if f not in logic_files and "node_modules" not in f and ".git" not in f]
        for f in frontend_files:
            if os.path.exists(f):
                with open(f, "r", encoding="utf-8") as file:
                    frontend_content += f"\n{'='*40}\nFILE: {f}\n{'='*40}\n{file.read()}\n"

        # --- 4. CHANGELOG MASTER ---
        changelog_content = f"SIGNOS CHANGELOG & VERSION HISTORY\nGenerated: {datetime.now()}\n\n"
        with engine.connect() as conn:
            logs = conn.execute(text("SELECT timestamp, commit_hash, author, message FROM sys_changelog ORDER BY timestamp DESC LIMIT 100")).fetchall()
            if logs:
                for log in logs:
                    changelog_content += f"[{log[0]}] {log[2]} (Hash: {log[1]})\nMessage: {log[3]}\n{'-'*40}\n"

        # Write directly to disk
        with open(f"{export_dir}/{timestamp} - SignOS_Backend.txt", "w", encoding="utf-8") as f: f.write(backend_content)
        with open(f"{export_dir}/{timestamp} - SignOS_Logic.txt", "w", encoding="utf-8") as f: f.write(logic_content)
        with open(f"{export_dir}/{timestamp} - SignOS_Frontend.txt", "w", encoding="utf-8") as f: f.write(frontend_content)
        with open(f"{export_dir}/{timestamp} - SignOS_Changelog.txt", "w", encoding="utf-8") as f: f.write(changelog_content)

        return {"status": "success", "message": f"Context Snapshots saved to /notebook_context/.", "version": timestamp}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/system/db-export")
def db_export():
    """Generates a SQL dump of the current database and returns it as a download."""
    try:
        dump_file = "/tmp/signos_dump.sql"
        env = os.environ.copy()
        env["PGPASSWORD"] = DB_PASS
        
        cmd = ["pg_dump", "-h", DB_HOST, "-U", DB_USER, "-f", dump_file, DB_NAME]
        subprocess.run(cmd, env=env, check=True)
        
        return FileResponse(
            dump_file, 
            filename=f"signos_backup_{datetime.now().strftime('%Y%m%d')}.sql",
            media_type="application/sql"
        )
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/system/db-import")
async def db_import(request: Request):
    """Injects a SQL file into the database."""
    try:
        body = await request.body()
        sql_content = body.decode('utf-8')
        with engine.begin() as conn:
            conn.execute(text(sql_content))
        return {"status": "success", "message": "Database synchronized successfully."}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/system/restart")
def restart_server():
    """Triggers a fatal exit. Docker must have 'restart: always' to reboot the process."""
    def reboot():
        time.sleep(1)
        os._exit(1)
    threading.Thread(target=reboot).start()
    return {"status": "success", "message": "API Reboot sequence initiated."}

# --- GITHUB WEBHOOK ---
@app.post("/api/webhook/github")
async def github_webhook(request: Request):
    try:
        payload = await request.json()
        head_commit = payload.get("head_commit", {})
        if not head_commit: return {"status": "ignored"}

        commit_data = {
            "h": head_commit.get("id", "??")[:7],
            "a": head_commit.get("author", {}).get("name", "GitHub"),
            "m": head_commit.get("message", "No message"),
            "u": head_commit.get("url", "#")
        }
        
        with engine.begin() as conn:
            query = text("""
                INSERT INTO sys_changelog (commit_hash, author, message, timestamp, github_url)
                VALUES (:h, :a, :m, NOW()::text, :u)
            """)
            conn.execute(query, commit_data)
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# --- FRONTEND GATEWAY (MUST BE AT THE BOTTOM) ---
@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    """Catches all non-API routes and serves HTML/JS files"""
    if full_path == "":
        full_path = "index.html"
        
    file_path = os.path.join("/app", full_path)
    
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return FileResponse(file_path)
        
    # Fallback if you haven't uploaded the files yet
    return {"error": "UI Missing", "message": f"Please upload {full_path} to the VPS directory."}