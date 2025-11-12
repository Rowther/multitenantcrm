import React, { useRef } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Button } from './ui/button';
import { toast } from 'sonner';

const TestFileUpload = () => {
  const fileInputRef = useRef(null);

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    
    for (const file of files) {
      try {
        // Create FormData for file upload
        const formDataObj = new FormData();
        formDataObj.append('file', file);
        
        console.log('Uploading file:', file);
        
        // Upload file
        const response = await axios.post(`${API}/upload`, formDataObj);
        
        console.log('Upload response:', response);
        toast.success(`File ${file.name} uploaded successfully. Path: ${response.data.path}`);
      } catch (error) {
        console.error('Upload error:', error);
        console.error('Error response:', error.response);
        toast.error(`Failed to upload ${file.name}: ${error.response?.data?.detail || error.message || 'Unknown error'}`);
      }
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Test File Upload</h2>
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          multiple
          accept="image/*,.pdf,.doc,.docx"
          className="hidden"
        />
        <div className="text-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center mx-auto"
          >
            Select Files to Upload
          </Button>
          <p className="text-sm text-gray-500 mt-2">
            Test file upload functionality
          </p>
        </div>
      </div>
    </div>
  );
};

export default TestFileUpload;