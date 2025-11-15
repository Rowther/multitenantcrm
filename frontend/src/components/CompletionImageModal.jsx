import React, { useState, useRef } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { Upload, Image as ImageIcon, X } from 'lucide-react';

const CompletionImageModal = ({ workOrderId, companyId, onClose, onSuccess, company }) => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    
    for (const file of files) {
      try {
        // Create FormData for file upload
        const formDataObj = new FormData();
        formDataObj.append('file', file);
        
        // Upload file
        const response = await axios.post(`${API}/upload`, formDataObj, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        
        // Debug: Log the upload response
        // console.log('Upload Response:', response.data);
        
        // Add uploaded file to state
        setUploadedFiles(prev => [...prev, {
          id: Date.now() + Math.random(), // Unique ID
          name: file.name,
          url: response.data.path
        }]);
        
        toast.success(`File ${file.name} uploaded successfully`);
      } catch (error) {
        // console.error('Upload error:', error);
        toast.error(`Failed to upload ${file.name}: ${error.response?.data?.detail || error.message || 'Unknown error'}`);
      }
    }
  };

  const removeAttachment = (id) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== id));
  };

  const handleSubmit = async () => {
    if (uploadedFiles.length === 0) {
      toast.error('Please upload at least one completion image');
      return;
    }

    setLoading(true);
    try {
      // Get current work order to preserve existing attachments
      const workOrderResponse = await axios.get(`${API}/companies/${companyId}/workorders/${workOrderId}`);
      const currentWorkOrder = workOrderResponse.data;
      
      // Debug: Log current work order and uploaded files
      // console.log('Current Work Order:', currentWorkOrder);
      // console.log('Uploaded Files:', uploadedFiles);
      
      // Extract just the URLs from uploaded files
      const newAttachmentUrls = uploadedFiles.map(file => file.url);
      
      // console.log('New Attachment URLs:', newAttachmentUrls);
      
      // Combine existing attachments with new completion images
      const allAttachments = [...(currentWorkOrder.attachments || []), ...newAttachmentUrls];
      
      // console.log('All Attachments:', allAttachments);
      
      // Update work order with completion images
      const updateResponse = await axios.put(`${API}/companies/${companyId}/workorders/${workOrderId}`, {
        status: 'COMPLETED',
        attachments: allAttachments
      });
      // 
      // console.log('Update Response:', updateResponse.data);
      
      toast.success('Work order completed successfully with completion images');
      onSuccess();
    } catch (error) {
      // console.error('Completion Error:', error);
      toast.error(error.response?.data?.detail || 'Failed to complete work order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold" style={{fontFamily: 'Space Grotesk'}}>
            Complete Work Order with Image
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-slate-600">
            Please upload completion images to mark this work order as completed.
          </p>
          
          {/* Image Upload Section */}
          <div className="space-y-2">
            <Label>Completion Images *</Label>
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-4">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                multiple
                accept="image/*"
                className="hidden"
              />
              <div className="text-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center mx-auto"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Images
                </Button>
                <p className="text-sm text-slate-500 mt-2">
                  Upload images showing the completed work (Max 10 files)
                </p>
              </div>
              
              {/* Display uploaded files */}
              {uploadedFiles.length > 0 && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {uploadedFiles.map((file) => {
                    // Handle both relative and absolute URLs properly
                    let fullUrl = file.url;
                    if (file.url.startsWith('/uploads/')) {
                      // Relative path - convert to full URL
                      fullUrl = `${API.replace('/api', '')}${file.url}`;
                    } else if (file.url.startsWith('http')) {
                      // Already a full URL - use as is
                      fullUrl = file.url;
                    } else if (!file.url.includes('://')) {
                      // Neither relative nor absolute - assume it's a relative path
                      fullUrl = `${API.replace('/api', '')}${file.url.startsWith('/') ? '' : '/'}${file.url}`;
                    }
                    
                    return (
                      <div key={file.id} className="relative group">
                        <div className="border rounded-lg overflow-hidden">
                          {fullUrl.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                            <img 
                              src={fullUrl} 
                              alt={file.name}
                              className="w-full h-24 object-cover"
                              onError={(e) => {
                                // Fallback if image fails to load
                                e.target.onerror = null;
                                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2NjYyIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1zaXplPSIxMCIgZmlsbD0iIzY2NiIgdGV4dC1hbmNob3I9Im1pZGRsZSI+SW1hZ2UgTm90IEZvdW5kPC90ZXh0Pjwvc3ZnPg==';
                              }}
                            />
                          ) : (
                            <div className="w-full h-24 flex items-center justify-center bg-slate-100">
                              <ImageIcon className="w-8 h-8 text-slate-400" />
                            </div>
                          )}
                          <div className="p-2 text-xs truncate">{file.name}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAttachment(file.id)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button 
              type="button" 
              disabled={loading || uploadedFiles.length === 0} 
              onClick={handleSubmit}
              className="bg-gradient-to-r from-blue-500 to-indigo-600"
            >
              {loading ? 'Completing...' : 'Complete Work Order'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CompletionImageModal;