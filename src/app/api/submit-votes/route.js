
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase with admin privileges for the API route
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role key to bypass RLS
);

export async function POST(req) {
  try {
    // Get data from request
    const { votes, matric } = await req.json();
    
    console.log('Received vote submission:', { matric, votesCount: votes.length });
    
    if (!votes || !votes.length || !matric) {
      return NextResponse.json({ error: 'Invalid vote data' }, { status: 400 });
    }
    
    // Verify student hasn't already voted
    const { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .select('has_voted')
      .eq('matric_number', matric)
      .single();
    
    if (studentError) {
      console.error('Error checking student:', studentError);
      return NextResponse.json({ error: 'Could not verify student status' }, { status: 500 });
    }
    
    if (student && student.has_voted) {
      return NextResponse.json({ error: 'You have already voted in this election' }, { status: 403 });
    }
    
    // Format the votes data into a JSON structure
    const votesData = {};
    const candidateUpdatePromises = [];
    
    for (const vote of votes) {
      // Build the JSON structure
      votesData[vote.post_id] = vote.candidate_id;
      
      // Queue up candidate vote count updates
      const updatePromise = async () => {
        // Get the current vote count for this candidate
        const { data: candidate, error: fetchError } = await supabaseAdmin
          .from('candidates')
          .select('votes')
          .eq('id', vote.candidate_id)
          .single();
        
        if (fetchError) {
          console.error('Error fetching candidate:', fetchError);
          return;
        }
        
        // Update the candidate's vote count directly
        const currentVotes = candidate?.votes || 0;
        const { error: updateError } = await supabaseAdmin
          .from('candidates')
          .update({ votes: currentVotes + 1 })
          .eq('id', vote.candidate_id);
        
        if (updateError) {
          console.error('Error updating candidate votes:', updateError);
        }
      };
      
      candidateUpdatePromises.push(updatePromise());
    }
    
    // Insert the single votes record with all votes as JSON
    console.log('Inserting votes as JSON...');
    const { error: votesError } = await supabaseAdmin
      .from('student_votes') // New table name
      .insert({
        student_matric: matric,
        votes_data: votesData
      });
    
    if (votesError) {
      console.error('Error inserting votes:', votesError);
      return NextResponse.json({ error: 'Failed to record votes: ' + votesError.message }, { status: 500 });
    }
    
    // Update all candidate vote counts in parallel
    await Promise.all(candidateUpdatePromises);
    
    // Update student has_voted status
    console.log('Updating student voted status...');
    const { error: updateError } = await supabaseAdmin
      .from('students')
      .update({ has_voted: true })
      .eq('matric_number', matric);
    
    if (updateError) {
      console.error('Error updating student has_voted:', updateError);
      return NextResponse.json({ error: 'Failed to update student status: ' + updateError.message }, { status: 500 });
    }
    
    // Vote process completed
    console.log('Vote process completed successfully');
    
    return NextResponse.json({ 
      success: true,
      message: 'Votes submitted successfully',
      logoutRequired: true
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'Server error processing votes' }, { status: 500 });
  }
}