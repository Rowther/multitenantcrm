import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';
import { MessageCircle, Send, Edit2, Trash2 } from 'lucide-react';

const CommentsSection = ({ workOrderId, companyId, user, onRefresh }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [editingComment, setEditingComment] = useState(null);
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    fetchComments();
  }, [workOrderId, companyId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/companies/${companyId}/workorders/${workOrderId}/comments`);
      setComments(response.data);
    } catch (error) {
      console.error('Failed to fetch comments', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    try {
      const response = await axios.post(`${API}/companies/${companyId}/workorders/${workOrderId}/comments`, {
        content: newComment
      });
      
      setComments([...comments, response.data]);
      setNewComment('');
      toast.success('Comment added successfully');
    } catch (error) {
      toast.error('Failed to add comment');
    }
  };

  const handleEditComment = (comment) => {
    setEditingComment(comment.id);
    setEditContent(comment.content);
  };

  const handleUpdateComment = async () => {
    if (!editContent.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    try {
      const response = await axios.put(`${API}/companies/${companyId}/comments/${editingComment}`, {
        content: editContent
      });
      
      setComments(comments.map(comment => 
        comment.id === editingComment ? response.data : comment
      ));
      setEditingComment(null);
      setEditContent('');
      toast.success('Comment updated successfully');
    } catch (error) {
      toast.error('Failed to update comment');
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await axios.delete(`${API}/companies/${companyId}/comments/${commentId}`);
      setComments(comments.filter(comment => comment.id !== commentId));
      toast.success('Comment deleted successfully');
    } catch (error) {
      toast.error('Failed to delete comment');
    }
  };

  const canEditOrDelete = (comment) => {
    // Admins, SuperAdmins, and the comment author can edit/delete
    return user.role === 'SUPERADMIN' || 
           user.role === 'ADMIN' || 
           comment.user_id === user.id;
  };

  const canAddComment = () => {
    // Admins, SuperAdmins, and Employees can add comments
    // Clients can only view
    return user.role === 'SUPERADMIN' || 
           user.role === 'ADMIN' || 
           user.role === 'EMPLOYEE';
  };

  if (loading) {
    return <div>Loading comments...</div>;
  }

  return (
    <Card className="p-6 mt-6">
      <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
        <MessageCircle className="w-5 h-5 mr-2" />
        Comments
      </h3>

      {/* Add Comment Form - Only for Admins, SuperAdmins, and Employees */}
      {canAddComment() && (
        <div className="mb-6">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            rows={3}
            className="mb-2"
          />
          <div className="flex justify-end">
            <Button 
              onClick={handleAddComment} 
              disabled={!newComment.trim()}
              className="bg-gradient-to-r from-blue-500 to-indigo-600"
            >
              <Send className="w-4 h-4 mr-2" />
              Post Comment
            </Button>
          </div>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            No comments yet. Be the first to comment!
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
              {editingComment === comment.id ? (
                // Edit Mode
                <div>
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={3}
                    className="mb-2"
                  />
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setEditingComment(null)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleUpdateComment}
                      className="bg-gradient-to-r from-blue-500 to-indigo-600"
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                // View Mode
                <div>
                  <div className="flex justify-between">
                    <div>
                      <p className="font-semibold text-slate-800">
                        {comment.user?.display_name || comment.user?.email || 'Unknown User'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(comment.created_at).toLocaleString()}
                      </p>
                    </div>
                    {canEditOrDelete(comment) && (
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditComment(comment)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteComment(comment.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-slate-700 whitespace-pre-wrap">
                    {comment.content}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </Card>
  );
};

export default CommentsSection;