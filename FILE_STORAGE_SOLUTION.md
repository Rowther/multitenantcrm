# File Storage Solution for Render Deployment

## Problem
Uploaded images in work order attachments were disappearing after 3 hours when deployed on Render.com. This was happening because:

1. Render's default filesystem is ephemeral
2. Files stored in the application directory are lost during redeployments
3. Temporary storage may be cleaned up after periods of inactivity

## Solution
Implemented Render's persistent disk storage feature to ensure uploaded files persist across deployments and over time.

## Implementation Details

### 1. Backend Changes
Modified [backend/server.py](file:///c:/Users/Tariq/Downloads/project%20(1)/backend/server.py) to use a configurable upload directory:

```python
# Create uploads directory - modified to use Render persistent disk if available
UPLOADS_DIR = Path(os.environ.get('RENDER_DISK_PATH', ROOT_DIR)) / 'uploads'
UPLOADS_DIR.mkdir(exist_ok=True, parents=True)
```

This change allows the application to:
- Use `/opt/render/project/uploads` when deployed on Render (persistent storage)
- Use the local `uploads` directory during development
- Fall back to the local directory if the environment variable is not set

### 2. Render Configuration
Updated [render.yaml](file:///c:/Users/Tariq/Downloads/project%20(1)/render.yaml) to configure a persistent disk:

```yaml
envVars:
  - key: RENDER_DISK_PATH
    value: /opt/render/project/uploads
disks:
  - name: uploads
    mountPath: /opt/render/project/uploads
    sizeGB: 10
```

This configuration:
- Defines a 10GB persistent disk named "uploads"
- Mounts it at `/opt/render/project/uploads`
- Sets the `RENDER_DISK_PATH` environment variable to point to this location

### 3. File Serving
The uploaded files are served using FastAPI's StaticFiles middleware, which works with the persistent disk path:

```python
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")
```

## Benefits
1. **Persistence**: Files now persist across deployments and server restarts
2. **Scalability**: 10GB of storage space for uploaded files
3. **Compatibility**: No changes needed for the frontend - it continues to work as before
4. **Flexibility**: Works in both development and production environments

## Limitations
1. **Single Instance**: Persistent disks are only available for single-instance services
2. **No Zero-Downtime Deploys**: Services using persistent disks cannot use zero-downtime deployments

## Future Improvements
For production environments with high availability requirements, consider:
1. Using cloud storage services like AWS S3, Google Cloud Storage, or Azure Blob Storage
2. Implementing a CDN for faster file delivery
3. Adding file expiration policies for automatic cleanup of old files