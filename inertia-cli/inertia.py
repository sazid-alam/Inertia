#!/usr/bin/env python3
import argparse
import json
import os
import subprocess
import sys
import urllib.request
import urllib.error

CONFIG_DIR = os.path.expanduser("~/.inertia/config")
CONFIG_FILE = os.path.join(CONFIG_DIR, "config.json")
HOOKS_DIR = os.path.expanduser("~/.inertia/hooks")

def load_config():
    if not os.path.exists(CONFIG_FILE):
        return {}
    with open(CONFIG_FILE, "r") as f:
        return json.load(f)

def save_config(config):
    os.makedirs(CONFIG_DIR, exist_ok=True)
    with open(CONFIG_FILE, "w") as f:
        json.dump(config, f, indent=2)

def cmd_init(args):
    print("Initializing Inertia...")
    
    email = "(none)"
    try:
        email = subprocess.check_output(["git", "config", "user.email"]).decode("utf-8").strip()
    except Exception:
        pass
        
    student_id = input(f"Enter student ID [{email}]: ").strip()
    if not student_id:
        student_id = email
        
    config = load_config()
    config["student_id"] = student_id
    config["api_base"] = "https://inertia-production.up.railway.app"
    config["frontend_base"] = "https://inertia-tau.vercel.app"
    save_config(config)
    
    # Configure global git hooks
    try:
        subprocess.check_call(["git", "config", "--global", "core.hooksPath", HOOKS_DIR])
        print(f"✅ Configured global Git pre-push hook at {HOOKS_DIR}")
    except subprocess.CalledProcessError:
        print("❌ Failed to set global Git hooksPath.")
        sys.exit(1)
        
    print(f"✅ Inertia initialized successfully for student: {student_id}")

def cmd_status(args):
    config = load_config()
    if not config.get("student_id"):
        print("Inertia is not initialized. Run 'inertia init'.")
        return
        
    api_base = config.get("api_base", "https://inertia-production.up.railway.app")
    student_id = config["student_id"]
    
    print(f"Student ID: {student_id}")
    print(f"API Base:   {api_base}")
    
    # Check dashboard status
    try:
        req = urllib.request.Request(f"{api_base}/dashboard/status")
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode())
            students = data.get("students", [])
            for s in students:
                if s["student_id"] == student_id:
                    print("-" * 30)
                    print(f"Attempts: {s['attempt_count']}")
                    print(f"Last score: {s.get('last_fc_score', 'N/A')}")
                    if s.get("lockout_seconds", 0) > 0:
                        print(f"Lockout: {s['lockout_seconds']}s remaining")
                    break
            else:
                print("No recent activity found.")
    except Exception as e:
        print(f"Status check failed: {e}")

def cmd_doctor(args):
    print("Running Inertia Doctor...")
    
    # 1. Config Check
    config = load_config()
    if not config:
        print("❌ Config not found. Run 'inertia init'.")
    else:
        print("✅ Config loaded.")
        
    # 2. Hook Check
    try:
        hook_path = subprocess.check_output(["git", "config", "--global", "core.hooksPath"]).decode("utf-8").strip()
        if hook_path == HOOKS_DIR:
            print("✅ Global Git hooks configured correctly.")
        else:
            print(f"⚠️ Global Git hooks configured to {hook_path}, expected {HOOKS_DIR}")
    except Exception:
        print("❌ Global Git hooks are not configured.")
        
    # 3. Server Check
    api_base = config.get("api_base", "https://inertia-production.up.railway.app")
    try:
        req = urllib.request.Request(f"{api_base}/health")
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode())
            print(f"✅ Server reachable ({data.get('version', 'unknown')}).")
    except Exception as e:
        print(f"❌ Server unreachable: {e}")

def main():
    parser = argparse.ArgumentParser(prog="inertia", description="Inertia CLI")
    subparsers = parser.add_subparsers(dest="command", required=False)
    
    parser_init = subparsers.add_parser("init", help="Initialize Inertia and attach git hooks")
    parser_status = subparsers.add_parser("status", help="Check your current challenge and lockout status")
    parser_doctor = subparsers.add_parser("doctor", help="Check system health and configurations")
    
    args = parser.parse_args()
    
    if args.command == "init":
        cmd_init(args)
    elif args.command == "status":
        cmd_status(args)
    elif args.command == "doctor":
        cmd_doctor(args)
    else:
        if not os.path.exists(CONFIG_FILE):
            cmd_init(args)
        else:
            parser.print_help()

if __name__ == "__main__":
    main()
