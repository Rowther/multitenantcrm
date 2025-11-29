"""
Test script to verify MongoDB GridFS integration is working correctly.
This script tests uploading and retrieving files from GridFS.
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket
from dotenv import load_dotenv
import os
from pathlib import Path
from bson import ObjectId

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'erp_crm_database')

async def test_gridfs():
    """Test uploading and retrieving a file from GridFS"""
    print("Testing MongoDB GridFS integration...")
    print(f"Database: {db_name}")
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    fs = AsyncIOMotorGridFSBucket(db)
    
    try:
        # Check if we have any existing images to test with
        uploads_dir = ROOT_DIR / 'uploads'
        test_files = list(uploads_dir.glob('*.jpg'))[:1]  # Get first jpg file
        
        if not test_files:
            print("ERROR: No test images found in uploads directory")
            return False
        
        test_file = test_files[0]
        print(f"Using test file: {test_file.name}")
        
        # Read file content
        with open(test_file, 'rb') as f:
            file_content = f.read()
        
        print(f"File size: {len(file_content)} bytes")
        
        # Upload to GridFS
        print("Uploading to GridFS...")
        file_id = await fs.upload_from_stream(
            test_file.name,
            file_content,
            metadata={
                "content_type": "image/jpeg",
                "test": True
            }
        )
        
        print(f"SUCCESS: Upload successful!")
        print(f"File ID: {file_id}")
        
        # Retrieve from GridFS
        print("\nRetrieving from GridFS...")
        grid_out = await fs.open_download_stream(file_id)
        retrieved_content = await grid_out.read()
        
        print(f"SUCCESS: Retrieved file!")
        print(f"Filename: {grid_out.filename}")
        print(f"Content type: {grid_out.metadata.get('content_type')}")
        print(f"Retrieved size: {len(retrieved_content)} bytes")
        
        # Verify content matches
        if file_content == retrieved_content:
            print("\nSUCCESS: File content matches original!")
        else:
            print("\nERROR: File content does not match!")
            return False
        
        # Clean up test file
        print("\nCleaning up test file...")
        await fs.delete(file_id)
        print("Test file deleted from GridFS")
        
        return True
        
    except Exception as e:
        print(f"ERROR: Test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        client.close()

if __name__ == "__main__":
    success = asyncio.run(test_gridfs())
    if success:
        print("\nSUCCESS: GridFS integration is working correctly!")
    else:
        print("\nFAILURE: GridFS integration test failed")
