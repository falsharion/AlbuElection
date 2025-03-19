import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import * as jose from 'jose';
import VotePage from './client-vote-paje'; 

export const config = {
  runtime: 'nodejs',
};
export const dynamic = 'force-dynamic';

export default async function VotePageServer() {
  try {
    // Get token from cookies
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get('token');
    
    if (!tokenCookie || !tokenCookie.value) {
      // Redirect to home if not signed in
      return redirect('/');
    }
    
    let studentEmail = '';
    let studentMatric = '';
    
    // Verify the JWT token
    try {
      const secret = new TextEncoder().encode(
        process.env.JWT_SECRET || 'fallback-secret-do-not-use-in-production'
      );
      
      const { payload } = await jose.jwtVerify(tokenCookie.value, secret);
      
      // Extract student info from token
      studentEmail = payload.email || '';
      studentMatric = payload.matric || '';
      
      if (!studentEmail || !payload.verified) {
        console.error('Invalid token payload:', payload);
        return redirect('/');
      }
    } catch (error) {
      console.error('Invalid token:', error);
      return redirect('/');
    }
    
    // Create a server-side Supabase client
    const supabase = createClient();
    
    // Check if this user has already voted
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('has_voted')
      .eq('matric_number', studentMatric)
      .single();
    
    if (studentError) {
      console.error('Error fetching student data:', studentError);
      return redirect('/');
    }
    
    if (student && student.has_voted) {
      // Student has already voted, redirect to a message page
      return redirect('/already-voted');
    }
    
    // Fetch posts with their candidates
    const { data: posts, error } = await supabase
      .from('posts')
      .select(`
        id,
        name,
        candidates(*)
      `);
    
    if (error) {
      console.error('Error fetching posts:', error);
      // Pass the error to the client component to display
      return <VotePage serverPosts={[]} studentEmail={studentEmail} studentMatric={studentMatric} />;
    }
    
    // Pass the data to the client component
    return <VotePage serverPosts={posts} studentEmail={studentEmail} studentMatric={studentMatric} />;
  } catch (error) {
    console.error('Unexpected error in VotePageServer:', error);
    return redirect('/error?message=Something+went+wrong');
  }
}