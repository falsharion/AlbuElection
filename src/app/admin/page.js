'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import AdminProtectedRoute from '@/components/AdminProtectedRoute';
import { useRouter } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import logger from '@/utils/logger';

function AdminDashboard() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartType, setChartType] = useState('bar'); // 'bar' or 'pie'
  const router = useRouter();
  
  // Colors for the charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c', '#d0ed57'];

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Redirect to login page
      router.push('/admin-login');
    } catch (error) {
      logger.error('Error signing out:', error.message);
    }
  };

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true);
        
        // Fetch posts with their candidates
        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select(`
            id,
            name,
            title,
            candidates (
              id,
              name,
              votes
            )
          `);
        
        if (postsError) throw postsError;
        
        // Attempt to fetch student votes data using raw SQL
        let studentVotesData = [];
        try {
          // Use a simpler query - just get direct vote counts from candidates
          // We'll handle the JSON votes separately if needed
          const { data } = await supabase
            .from('candidates')
            .select('id, votes');
          
          if (data) {
            studentVotesData = data;
          }
        } catch (voteError) {
          logger.error('Could not fetch vote data:', voteError);
          // Continue with the posts data we have
        }
        
        // Process and merge the data
        const postsWithVotes = postsData.map(post => {
          // Map candidates and enrich with vote data
          const candidatesWithVotes = post.candidates.map(candidate => {
            // For simplicity, just use the direct votes from the candidates table
            const voteCount = candidate.votes || 0;
            
            return {
              ...candidate,
              voteCount: voteCount,
              name: candidate.name,
              votes: voteCount
            };
          });
          
          // Sort candidates by vote count
          const sortedCandidates = [...candidatesWithVotes].sort((a, b) => b.voteCount - a.voteCount);
          
          return {
            ...post,
            candidates: sortedCandidates,
            totalVotes: sortedCandidates.reduce((sum, c) => sum + c.voteCount, 0)
          };
        });
        
        setPosts(postsWithVotes);
      } catch (err) {
        logger.error('Error fetching results:', err);
        setError('Failed to load voting results');
      } finally {
        setLoading(false);
      }
    };
    
    fetchResults();
  }, []);

  const toggleChartType = () => {
    setChartType(chartType === 'bar' ? 'pie' : 'bar');
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Election Results</h1>
        <p>Loading results...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Election Results</h1>
          <button 
            onClick={handleSignOut}
            className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
          >
            Sign Out
          </button>
        </div>
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  const renderBarChart = (candidates, totalVotes) => {
    // Ensure we have candidates with data
    if (!candidates || candidates.length === 0 || totalVotes === 0) {
      return <div className="text-center py-8">No voting data available</div>;
    }
    
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={candidates}
          margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} />
          <YAxis />
          <Tooltip formatter={(value, name) => [`${value} votes (${((value/totalVotes)*100).toFixed(1)}%)`, 'Votes']} />
          <Bar dataKey="voteCount" fill="#0088FE">
            {candidates.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const renderPieChart = (candidates, totalVotes) => {
    // Ensure we have candidates with data
    if (!candidates || candidates.length === 0 || totalVotes === 0) {
      return <div className="text-center py-8">No voting data available</div>;
    }
    
    return (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={candidates}
            cx="50%"
            cy="50%"
            labelLine={true}
            outerRadius={80}
            fill="#8884d8"
            dataKey="voteCount"
            nameKey="name"
            label={({name, voteCount}) => `${name}: ${voteCount} (${((voteCount/totalVotes)*100).toFixed(1)}%)`}
          >
            {candidates.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => [`${value} votes`, 'Votes']} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Election Results Dashboard</h1>
          <p className="text-gray-500">Total positions: {posts.length} | Total votes: {posts.reduce((sum, post) => sum + post.totalVotes, 0)}</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <span className="mr-2">Chart Type:</span>
            <button 
              onClick={toggleChartType}
              className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              {chartType === 'bar' ? 'Switch to Pie Charts' : 'Switch to Bar Charts'}
            </button>
          </div>
          <button 
            onClick={handleSignOut}
            className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
          >
            Sign Out
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        {posts.length > 0 ? (
          posts.map(post => (
            <div key={post.id} className="border rounded-lg p-4 shadow-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-xl font-semibold">{post.name}</h2>
                  {post.title && <p className="text-gray-600">{post.title}</p>}
                  <p className="text-sm text-gray-500">Total votes: {post.totalVotes}</p>
                </div>
              </div>
              
              {/* Charts Section */}
              <div className="mb-6">
                {chartType === 'bar' 
                  ? renderBarChart(post.candidates, post.totalVotes) 
                  : renderPieChart(post.candidates, post.totalVotes)
                }
              </div>
              
              {/* Data Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="py-2 px-4 border text-left">Ranking</th>
                      <th className="py-2 px-4 border text-left">Candidate</th>
                      <th className="py-2 px-4 border text-right">Votes</th>
                      <th className="py-2 px-4 border text-right">Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {post.candidates.map((candidate, index) => {
                      const percentage = post.totalVotes > 0 
                        ? ((candidate.voteCount / post.totalVotes) * 100).toFixed(1) 
                        : '0.0';
                        
                      return (
                        <tr key={candidate.id} className={index === 0 ? "bg-green-50" : ""}>
                          <td className="py-2 px-4 border font-medium">{index + 1}</td>
                          <td className="py-2 px-4 border">{candidate.name}</td>
                          <td className="py-2 px-4 border text-right">{candidate.voteCount}</td>
                          <td className="py-2 px-4 border text-right">{percentage}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {/* Progress bars section */}
              <div className="mt-6">
                {post.candidates.map((candidate, index) => {
                  const percentage = post.totalVotes > 0 
                    ? (candidate.voteCount / post.totalVotes) * 100 
                    : 0;
                    
                  return (
                    <div key={candidate.id} className="mb-3">
                      <div className="flex items-center">
                        <span className="w-32 truncate font-medium">{candidate.name}</span>
                        <div className="flex-1 ml-2">
                          <div className="bg-gray-200 h-6 rounded-full">
                            <div 
                              className={`h-6 rounded-full ${index === 0 ? 'bg-green-500' : 'bg-blue-600'}`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                        <span className="ml-2 w-32 text-right">{candidate.voteCount} votes ({percentage.toFixed(1)}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center p-8 border rounded-lg shadow-md bg-white">
            <p className="text-lg">No posts or candidates found. Please add election data first.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProtectedAdminDashboard() {
  return (
    <AdminProtectedRoute>
      <AdminDashboard />
    </AdminProtectedRoute>
  );
}