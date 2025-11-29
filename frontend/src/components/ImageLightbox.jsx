import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from './ui/button';

const ImageLightbox = ({ attachments, initialIndex = 0, onClose, constructUrl }) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [zoom, setZoom] = useState(1);

    const currentAttachment = attachments[currentIndex];
    const fullUrl = constructUrl ? constructUrl(currentAttachment) : currentAttachment;

    // Detect file type
    const isPDF = fullUrl.toLowerCase().match(/\.pdf$/i) || fullUrl.includes('/api/files/');
    const isImage = fullUrl.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i);

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
                setCurrentIndex(currentIndex - 1);
                setZoom(1);
            } else if (e.key === 'ArrowRight' && currentIndex < attachments.length - 1) {
                setCurrentIndex(currentIndex + 1);
                setZoom(1);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentIndex, attachments.length, onClose]);

    const handlePrevious = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
            setZoom(1);
        }
    };

    const handleNext = () => {
        if (currentIndex < attachments.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setZoom(1);
        }
    };

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = fullUrl;
        link.download = `attachment-${currentIndex + 1}`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleZoomIn = () => {
        setZoom(Math.min(zoom + 0.25, 3));
    };

    const handleZoomOut = () => {
        setZoom(Math.max(zoom - 0.25, 0.5));
    };

    return (
        <div
            className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center"
            onClick={onClose}
        >
            {/* Close button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
            >
                <X className="w-8 h-8" />
            </button>

            {/* Navigation buttons */}
            {attachments.length > 1 && (
                <>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handlePrevious();
                        }}
                        disabled={currentIndex === 0}
                        className={`absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-colors z-10 ${currentIndex === 0 ? 'opacity-30 cursor-not-allowed' : ''
                            }`}
                    >
                        <ChevronLeft className="w-12 h-12" />
                    </button>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleNext();
                        }}
                        disabled={currentIndex === attachments.length - 1}
                        className={`absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-colors z-10 ${currentIndex === attachments.length - 1 ? 'opacity-30 cursor-not-allowed' : ''
                            }`}
                    >
                        <ChevronRight className="w-12 h-12" />
                    </button>
                </>
            )}

            {/* Toolbar */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black bg-opacity-50 rounded-lg px-4 py-2 z-10">
                <span className="text-white text-sm">
                    {currentIndex + 1} / {attachments.length}
                </span>

                {isImage && (
                    <>
                        <div className="w-px h-6 bg-gray-600 mx-2" />
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleZoomOut();
                            }}
                            className="text-white hover:text-gray-300 transition-colors"
                        >
                            <ZoomOut className="w-5 h-5" />
                        </button>
                        <span className="text-white text-sm min-w-[3rem] text-center">
                            {Math.round(zoom * 100)}%
                        </span>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleZoomIn();
                            }}
                            className="text-white hover:text-gray-300 transition-colors"
                        >
                            <ZoomIn className="w-5 h-5" />
                        </button>
                    </>
                )}

                <div className="w-px h-6 bg-gray-600 mx-2" />
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        handleDownload();
                    }}
                    className="text-white hover:text-gray-300 transition-colors"
                >
                    <Download className="w-5 h-5" />
                </button>
            </div>

            {/* Content */}
            <div
                className="max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center p-4"
                onClick={(e) => e.stopPropagation()}
            >
                {isImage ? (
                    <img
                        src={fullUrl}
                        alt={`Attachment ${currentIndex + 1}`}
                        className="max-w-full max-h-full object-contain transition-transform duration-200"
                        style={{ transform: `scale(${zoom})` }}
                        onClick={(e) => e.stopPropagation()}
                    />
                ) : isPDF ? (
                    <iframe
                        src={fullUrl}
                        className="w-full h-full bg-white rounded-lg"
                        title={`PDF ${currentIndex + 1}`}
                    />
                ) : (
                    <div className="bg-white rounded-lg p-8 text-center">
                        <p className="text-gray-600 mb-4">Preview not available for this file type</p>
                        <Button onClick={handleDownload}>
                            <Download className="w-4 h-4 mr-2" />
                            Download File
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ImageLightbox;
