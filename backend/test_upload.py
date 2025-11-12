#!/usr/bin/env python3
"""
Script to test the file upload functionality.
"""

import os
import sys
import requests

# Get the backend URL from environment variables
backend_url = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8000')
api_url = f"{backend_url}/api"

def test_upload():
    """Test the file upload functionality."""
    try:
        # First, we need to get a token by logging in
        # Using default superadmin credentials from seed.py
        login_data = {
            "email": "superadmin@erp.com",
            "password": "password123"
        }
        
        print(f"Logging in to {api_url}/auth/login...")
        response = requests.post(f"{api_url}/auth/login", json=login_data)
        
        if response.status_code != 200:
            print(f"Login failed with status code {response.status_code}")
            print(response.text)
            return False
            
        token = response.json()['token']
        print(f"Login successful. Token: {token[:20]}...")
        
        # Now test the upload endpoint
        # We'll create a simple test image
        import base64
        
        # Create a simple test image (1x1 pixel PNG)
        test_image_data = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
        )
        
        files = {
            'file': ('test.png', test_image_data, 'image/png')
        }
        
        headers = {
            'Authorization': f'Bearer {token}'
        }
        
        print("Uploading test image...")
        response = requests.post(f"{api_url}/upload", files=files, headers=headers)
        
        if response.status_code != 200:
            print(f"Upload failed with status code {response.status_code}")
            print(response.text)
            return False
            
        result = response.json()
        print(f"Upload successful. Result: {result}")
        return True
        
    except Exception as e:
        print(f"Error testing upload: {e}")
        return False

if __name__ == "__main__":
    print("Testing file upload functionality...")
    success = test_upload()
    
    if success:
        print("File upload test passed!")
    else:
        print("File upload test failed!")
        sys.exit(1)