#!/usr/bin/env python3
"""
Script to add sample images to all work orders in the database for testing purposes.
"""

import os
import sys
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio

# Add the parent directory to the path to import from server.py
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import configuration from server.py
from server import db

# Sample image paths that exist in the uploads directory
SAMPLE_IMAGES = [
    "/uploads/2c5ba732-28f5-4a2a-b9dc-08f0a6f1d513.jpg",
    "/uploads/1969fb31-fd59-42b8-ae82-458d8977e7ec.jpg"
]

async def add_images_to_work_orders():
    """Add sample images to all work orders in the database."""
    try:
        # Count total work orders
        total_work_orders = await db.work_orders.count_documents({})
        print(f"Found {total_work_orders} work orders in the database.")
        
        if total_work_orders == 0:
            print("No work orders found. Exiting.")
            return
        
        # Update all work orders to include sample images
        updated_count = 0
        async for work_order in db.work_orders.find({}):
            # Check if the work order already has attachments
            current_attachments = work_order.get('attachments', [])
            
            # Add sample images if they're not already present
            new_attachments = current_attachments.copy()
            for image in SAMPLE_IMAGES:
                if image not in new_attachments:
                    new_attachments.append(image)
            
            # Update the work order if we added new attachments
            if len(new_attachments) > len(current_attachments):
                await db.work_orders.update_one(
                    {"id": work_order['id']},
                    {"$set": {"attachments": new_attachments}}
                )
                updated_count += 1
                print(f"Updated work order {work_order['id']} with sample images.")
        
        print(f"Successfully updated {updated_count} work orders with sample images.")
        
    except Exception as e:
        print(f"Error updating work orders: {e}")
        return False
    
    return True

async def main():
    """Main function to run the script."""
    print("Adding sample images to all work orders...")
    
    success = await add_images_to_work_orders()
    
    if success:
        print("Successfully added sample images to work orders.")
    else:
        print("Failed to add sample images to work orders.")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())