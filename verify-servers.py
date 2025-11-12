"""
Script to verify that both backend and frontend servers are running
"""

import requests
import time
import webbrowser
import os

def check_backend():
    """Check if backend server is running"""
    try:
        response = requests.get("http://localhost:8000/docs", timeout=5)
        return response.status_code == 200
    except:
        return False

def check_frontend():
    """Check if frontend server is running (this is a simple check)"""
    try:
        # We'll check if we can connect to the port
        import socket
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        result = sock.connect_ex(('localhost', 3000))
        sock.close()
        return result == 0
    except:
        return False

def main():
    print("🔍 Verifying Multi-Tenant ERP/CRM Platform servers...")
    print()
    
    # Check backend
    print("Checking backend server (http://localhost:8000)... ", end="")
    if check_backend():
        print("✅ RUNNING")
    else:
        print("❌ NOT RUNNING")
    
    # Check frontend
    print("Checking frontend server (http://localhost:3000)... ", end="")
    if check_frontend():
        print("✅ RUNNING")
    else:
        print("❌ NOT RUNNING")
    
    print()
    print("📋 Server URLs:")
    print("   Backend API: http://localhost:8000")
    print("   Frontend App: http://localhost:3000")
    print("   API Docs: http://localhost:8000/docs")
    print()
    
    # Ask user if they want to open the frontend
    response = input("Would you like to open the frontend in your browser? (y/n): ")
    if response.lower() in ['y', 'yes']:
        webbrowser.open("http://localhost:3000")
        print("Opening frontend in browser...")
    
    print()
    print("🔐 Demo Login Credentials:")
    print("   SuperAdmin: superadmin@erp.com / password123")
    print("   Sama Admin: admin@samaaljazeera.com / password123")
    print("   Vigor Admin: admin@vigorautomotive.com / password123")
    print("   MSAM Admin: admin@msamtechnicalsolutions.com / password123")

if __name__ == "__main__":
    main()