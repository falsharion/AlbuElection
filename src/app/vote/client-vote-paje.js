'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Image from 'next/image';

export default function VotePage({ serverPosts, studentEmail, studentMatric }) {
  const router = useRouter();
  const [posts, setPosts] = useState([]);
  const [selections, setSelections] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Extract user info from cookie or props on component load
  const [userInfo, setUserInfo] = useState({
    email: studentEmail || '',
    matric: studentMatric || ''
  });

  // Handle body scroll lock when modal is shown
  useEffect(() => {
    if (showModal) {
      // Prevent scrolling on the background
      document.body.style.overflow = 'hidden';
    } else {
      // Re-enable scrolling when modal is closed
      document.body.style.overflow = 'auto';
    }
    
    // Cleanup function to ensure scrolling is re-enabled when component unmounts
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [showModal]);

  useEffect(() => {
    // Check if user has already voted
    const checkVoteStatus = async () => {
      if (userInfo.matric) {
        const { data: student, error } = await supabase
          .from('students')
          .select('has_voted')
          .eq('matric_number', userInfo.matric)
          .single();
          
        if (student && student.has_voted) {
          // Redirect to already voted page
          router.push('/already-voted');
          return;
        }
      }
    };
    
    checkVoteStatus();
  }, [userInfo.matric, router]);

  useEffect(() => {
    // Check if we have required user info
    if (!userInfo.email || !userInfo.matric) {
      // Try to get from localStorage if available (fallback)
      const storedEmail = localStorage.getItem('studentEmail');
      const storedMatric = localStorage.getItem('studentMatric');
      
      if (storedEmail && storedMatric) {
        setUserInfo({
          email: storedEmail,
          matric: storedMatric
        });
      } else {
        // Redirect to login if no user info available
        setError('User information not found. Please sign in again.');
        setTimeout(() => router.push('/'), 3000);
      }
    }
  }, [router, userInfo.email, userInfo.matric]);

  useEffect(() => {
    // Fetch posts client-side if not provided from server
    const fetchPosts = async () => {
      setLoading(true);
      
      if (serverPosts) {
        setPosts(serverPosts);
        setLoading(false);
        return;
      }

      const { data: fetchedPosts, error } = await supabase
        .from('posts')
        .select(`
          id,
          name,
          candidates(id, name, image_url, bio)
        `);
      
      if (error) {
        console.error('Error fetching posts:', error);
        setError('Failed to load voting options');
      } else {
        setPosts(fetchedPosts || []);
      }
      
      setLoading(false);
    };
    
    fetchPosts();
  }, [serverPosts]);

  const handleCandidateSelect = (postId, candidateId) => {
    setSelections({
      ...selections,
      [postId]: candidateId
    });
  };

  const handleSubmit = () => {
    // Check if all posts have a selection
    const hasAllSelections = posts.every(post => selections[post.id]);
    
    if (!hasAllSelections) {
      setError('Please select one candidate for each position');
      return;
    }
    
    setError('');
    setShowModal(true);
  };

  const submitVotes = async () => {
    setIsSubmitting(true);
    
    try {
      // Prepare the votes data using the user info we have
      const votes = Object.entries(selections).map(([postId, candidateId]) => ({
        post_id: postId,
        candidate_id: candidateId,
        student_matric: userInfo.matric,
        student_email: userInfo.email
      }));
      
      // First check if student has already voted
      const { data: student } = await supabase
        .from('students')
        .select('has_voted')
        .eq('matric_number', userInfo.matric)
        .single();
      
      if (student && student.has_voted) {
        throw new Error('You have already voted in this election');
      }
      
      // Use a serverless function for voting to handle RLS securely
      const response = await fetch('/api/submit-votes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ votes, matric: userInfo.matric })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit votes');
      }
      
      // Clear any stored user info from localStorage
      localStorage.removeItem('studentEmail');
      localStorage.removeItem('studentMatric');
      
      // Delete the token cookie
      document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      
      // Redirect to confirmation page
      router.push('/vote-confirmed');
      
    } catch (err) {
      console.error('Vote submission error:', err);
      setError('Failed to submit votes: ' + err.message);
      setShowModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen w-full">
        <div className="relative flex items-center justify-center">
          <div className="w-20 h-20 border-4 border-gray-200 rounded-full"></div>
          <div className="w-20 h-20 border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent rounded-full absolute top-0 left-0 animate-spin"></div>
          <span className="text-gray-700 font-medium absolute">Loading</span>
        </div>
      </div>
    );
  }

  if (error && !posts.length) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold text-red-500">Error</h1>
        <p className="mt-2">{error}</p>
      </div>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold">No active polls</h1>
        <p className="mt-2">There are currently no polls available for voting.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-2 text-center pt-7 text-blue-950">ALBU 2025/2026 Election</h1>
        <p className="text-center text-gray-600 mb-8">Select your preferred candidates for each position</p>
        
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded shadow">
            <p className="text-red-700">{error}</p>
          </div>
        )}
        
        <div className="space-y-10 mb-12">
          {posts.map(post => (
            <div key={post.id} className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="bg-blue-950 text-white p-4">
                <h2 className="text-2xl font-bold">{post.name}</h2>
                <p className="text-blue-100 text-sm">Select one candidate</p>
              </div>
              <div className="p-6">
                {post.candidates && post.candidates.length > 0 ? (
                  <div className="space-y-4">
                    {post.candidates.map(candidate => (
                      <div 
                        key={candidate.id} 
                        className={`border border-gray-500/30 rounded-lg p-3 cursor-pointer transition-all ${
                          selections[post.id] === candidate.id 
                            ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-300' 
                            : 'hover:bg-gray-50 hover:shadow'
                        }`}
                        onClick={() => handleCandidateSelect(post.id, candidate.id)}
                      >
                        <div className="flex items-center space-x-4">
                          <div className="relative h-16 w-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                            {candidate.image_url ? (
                              <Image 
                                src={candidate.image_url} 
                                alt={candidate.name}
                                fill
                                sizes="64px"
                                style={{objectFit: 'cover'}}
                                className="rounded-lg"
                                onError={(e) => {
                                  e.target.src = '/placeholder-avatar.png'; // Fallback image
                                }}
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full w-full bg-blue-100 text-blue-500">
                                <span className="text-xl font-bold">{candidate.name.charAt(0)}</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-grow">
                            <h3 className="font-medium text-lg">{candidate.name}</h3>
                            {candidate.bio && (
                              <p className="text-gray-600 text-sm line-clamp-2">{candidate.bio}</p>
                            )}
                          </div>
                          
                          <div className="flex-shrink-0">
                            <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center ${
                              selections[post.id] === candidate.id 
                                ? 'border-blue-500 bg-blue-500' 
                                : 'border-gray-300'
                            }`}>
                              {selections[post.id] === candidate.id && (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-gray-500">No candidates available for this position.</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex justify-center mt-8 mb-12">
          <button 
            onClick={handleSubmit}
            className="bg-blue-950 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 px-8 rounded-xl shadow-lg transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          >
            Submit My Vote
          </button>
        </div>
      </div>
      
      {/* Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl max-h-[90vh] flex flex-col">
            {/* Modal Header - Fixed */}
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-2xl font-bold text-blue-950">Confirm Your Vote</h3>
            </div>
            
            {/* Modal Content - Scrollable */}
            <div className="p-6 overflow-y-auto flex-grow">
              <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <p className="text-gray-600 italic">You are about to submit your vote for the following positions:</p>
                
                <ul className="mt-4 space-y-2">
                  {posts.map(post => {
                    const selectedCandidate = post.candidates?.find(c => c.id === selections[post.id]);
                    return selections[post.id] ? (
                      <li key={post.id} className="flex justify-between">
                        <span className="font-medium">{post.name}:</span>
                        <span className="text-blue-950 text-end">{selectedCandidate?.name}</span>
                      </li>
                    ) : null;
                  })}
                </ul>
              </div>
              
              <p className="mb-6 text-gray-600 italic text-sm">This action cannot be undone. Your vote is anonymous and secure.</p>
            </div>
            
            {/* Modal Footer - Fixed */}
            <div className="p-6 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row sm:justify-end space-y-3 sm:space-y-0 sm:space-x-3">
                <button 
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm hover:bg-gray-100 transition-colors text-gray-700"
                  disabled={isSubmitting}
                >
                  Go Back
                </button>
                <button 
                  onClick={submitVotes}
                  className="px-4 py-2 bg-blue-950 text-white rounded-lg shadow-md hover:bg-blue-800 transition-colors flex items-center justify-center"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting...
                    </>
                  ) : 'Confirm My Vote'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};