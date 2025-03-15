import React, { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc, onSnapshot, getFirestore, getDoc, addDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { db } from '../firebase';

const Feedback = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteInProgress, setDeleteInProgress] = useState(false);

  // Synchronize feedback systems
  const syncFeedbackSystems = async () => {
    try {
      console.log("Synchronizing feedback systems...");
      
      // Get local storage feedback
      const localFeedback = JSON.parse(localStorage.getItem('user_feedback')) || [];
      
      if (localFeedback.length === 0) {
        console.log("No local feedback to sync");
        return;
      }
      
      // Get Firebase feedback
      const querySnapshot = await getDocs(collection(db, "feedbacks"));
      const firebaseFeedbacks = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Create a map of firebase content for easy lookup
      const firebaseContentMap = new Map();
      firebaseFeedbacks.forEach(fb => {
        if (fb.content) {
          firebaseContentMap.set(fb.content, fb.id);
        }
      });
      
      // Look for items deleted in one system but not the other
      for (const localItem of localFeedback) {
        // Skip if no text content
        if (!localItem.text) continue;
        
        // Check if this local item exists in Firebase
        const exists = firebaseContentMap.has(localItem.text);
        
        if (!exists) {
          console.log("Found local feedback not in Firebase:", localItem.text);
          // Skip syncing for now as we're focused on deletion
        }
      }
      
      console.log("Feedback synchronization complete");
    } catch (error) {
      console.error("Error synchronizing feedback systems:", error);
    }
  };

  // Load feedback data on component mount
  useEffect(() => {
    console.log("Setting up feedback listener");
    
    // Clean up any existing data first
    setFeedbacks([]);
    
    try {
      // Set up a real-time listener for the feedback collection
      const unsubscribe = onSnapshot(
        collection(db, "feedbacks"),
        { includeMetadataChanges: true },
        (snapshot) => {
          console.log("Received feedback snapshot:", snapshot.size, "items");
          
          // Process the snapshot and update state
          const updatedFeedbacks = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          console.log("Processed feedback data:", updatedFeedbacks.length, "items");
          setFeedbacks(updatedFeedbacks);
          setLoading(false);
        },
        (error) => {
          console.error("Error in feedback listener:", error);
          toast.error("Failed to load feedbacks");
          setLoading(false);
        }
      );
      
      // Synchronize feedback systems
      syncFeedbackSystems();
      
      // Return cleanup function
      return () => {
        console.log("Cleaning up feedback listener");
        unsubscribe();
      };
    } catch (error) {
      console.error("Error setting up feedback listener:", error);
      toast.error("Failed to connect to database");
      setLoading(false);
      return () => {};
    }
  }, []);

  // Handle feedback deletion
  const handleDelete = async (id) => {
    if (deleteInProgress) {
      console.log("Delete already in progress, please wait");
      return;
    }
    
    console.log("Attempting to delete feedback:", id);
    setDeleteInProgress(true);
    
    try {
      // First verify the document exists
      const feedbackRef = doc(db, "feedbacks", id);
      const docSnap = await getDoc(feedbackRef);
      
      if (!docSnap.exists()) {
        console.error("Feedback document doesn't exist:", id);
        toast.error("Cannot delete: feedback not found");
        setDeleteInProgress(false);
        return;
      }
      
      // Get the feedback content for sync purposes
      const feedbackContent = docSnap.data().content;
      console.log("Deleting feedback with content:", feedbackContent);
      
      // Perform the deletion
      await deleteDoc(feedbackRef);
      
      // Verify deletion was successful
      const verifySnap = await getDoc(feedbackRef);
      if (verifySnap.exists()) {
        throw new Error("Document still exists after deletion attempt");
      }
      
      // Show success notification
      console.log("Feedback successfully deleted:", id);
      toast.success("Feedback deleted");
      
      // Update local state to reflect deletion immediately
      setFeedbacks(prev => prev.filter(feedback => feedback.id !== id));
      
      // Also sync with localStorage if the other feedback system is using it
      try {
        const localFeedback = JSON.parse(localStorage.getItem('user_feedback')) || [];
        if (localFeedback.length > 0) {
          console.log("Syncing deletion with localStorage...");
          // Try to find and remove any matching feedback
          const updatedLocalFeedback = localFeedback.filter(item => {
            // Skip items without text (shouldn't happen)
            if (!item.text) return true;
            
            // Remove if ID matches or content matches
            const contentMatches = item.text.toLowerCase() === (feedbackContent || '').toLowerCase();
            const idMatches = item.id === id;
            
            return !contentMatches && !idMatches;
          });
          
          // If we removed any items, update localStorage
          if (updatedLocalFeedback.length < localFeedback.length) {
            console.log("Removed feedback from localStorage");
            localStorage.setItem('user_feedback', JSON.stringify(updatedLocalFeedback));
            
            // Try to update JSONBin as well (this will fail if we don't have the right API key)
            try {
              fetch('https://api.jsonbin.io/v3/b/67cdc57bad19ca34f8193431', {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Master-Key': '$2a$10$.OYhnUr5Na28.aDasn9JRenMZA4.9KUfpM1GyA/T4DCg7lmqI.SjK'
                },
                body: JSON.stringify(updatedLocalFeedback)
              });
              console.log("Sent update to JSONBin");
            } catch (jsonError) {
              console.error("Error updating JSONBin:", jsonError);
            }
          }
        }
      } catch (localError) {
        console.error("Error syncing with localStorage:", localError);
        // Non-critical error, continue
      }
    } catch (error) {
      console.error("Error deleting feedback:", error);
      toast.error("Failed to delete feedback. Please try again.");
    } finally {
      setDeleteInProgress(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Global Feedback Management System</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="grid gap-4">
          {feedbacks.length === 0 ? (
            <p>No feedback available.</p>
          ) : (
            feedbacks.map((feedback) => (
              <div key={feedback.id} className="bg-white p-4 rounded-lg shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-gray-700">{feedback.content}</p>
                    <p className="text-sm text-gray-500">
                      {feedback.timestamp && new Date(feedback.timestamp?.toDate()).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(feedback.id)}
                    className="text-red-600 hover:text-red-800 p-2"
                    title="Delete feedback"
                    disabled={deleteInProgress}
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className="h-5 w-5" 
                      viewBox="0 0 20 20" 
                      fill="currentColor"
                    >
                      <path 
                        fillRule="evenodd" 
                        d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" 
                        clipRule="evenodd" 
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default Feedback; 