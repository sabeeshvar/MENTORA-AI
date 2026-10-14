async function testLiveEndpoints() {
  console.log('Testing live AI API endpoints...\n')

  // 1. Backend Port 5000
  console.log('1. Checking Backend Port 5000 status:')
  try {
    const res5000 = await fetch('http://localhost:5000/api/ai/status')
    console.log(`   HTTP ${res5000.status}:`, await res5000.json())
  } catch (err: any) {
    console.error('   Port 5000 status error:', err.message)
  }

  // 2. Frontend Proxy Port 5173
  console.log('\n2. Checking Frontend Proxy Port 5173 status:')
  try {
    const res5173 = await fetch('http://localhost:5173/api/ai/status')
    console.log(`   HTTP ${res5173.status}:`, await res5173.json())
  } catch (err: any) {
    console.error('   Port 5173 status error:', err.message)
  }

  // 3. Live Tutor Query through Port 5173 (Testing end-to-end frontend proxy to backend to Gemini)
  console.log('\n3. Testing live Tutor Query via Frontend Proxy (Port 5173):')
  try {
    const tutorRes = await fetch('http://localhost:5173/api/ai/tutor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courseId: 'test_course_live',
        question: 'What is the definition of artificial intelligence and machine learning?',
        courseTitle: 'Introduction to Artificial Intelligence',
        chunks: [
          {
            chunkId: 'chunk_1',
            courseId: 'test_course_live',
            materialId: 'mat_1',
            materialName: 'AI_Lecture_01.pdf',
            sourceName: 'AI_Lecture_01.pdf',
            sourceType: 'PDF',
            pageNumber: 1,
            text: 'Artificial Intelligence (AI) refers to systems that simulate human intelligence to perform tasks such as visual perception, speech recognition, decision-making, and language translation. Machine Learning (ML) is a subfield of AI that enables algorithms to learn patterns iteratively from data without explicit procedural programming.',
            sectionTitle: 'Definition of AI and ML',
            similarityScore: 0.95,
          },
        ],
      }),
    })

    console.log(`   Tutor HTTP Status: ${tutorRes.status}`)
    const tutorData = await tutorRes.json()
    console.log('   Grounded status:', tutorData.groundingStatus)
    console.log('   Answer preview:', tutorData.answer?.substring(0, 150) + '...')
    console.log('   Sources count:', tutorData.sources?.length)
    if (tutorData.sources?.length > 0) {
      console.log('   Top Citation:', tutorData.sources[0])
    }
  } catch (err: any) {
    console.error('   Tutor query error:', err.message)
  }

  // 4. Live Quiz Generation via Port 5173
  console.log('\n4. Testing live Quiz Generation via Port 5173:')
  try {
    const quizRes = await fetch('http://localhost:5173/api/ai/quiz/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courseId: 'test_course_live',
        topic: 'Machine Learning Definitions',
        difficulty: 'medium',
        numberOfQuestions: 2,
        chunks: [
          {
            chunkId: 'chunk_1',
            courseId: 'test_course_live',
            materialId: 'mat_1',
            materialName: 'AI_Lecture_01.pdf',
            sourceName: 'AI_Lecture_01.pdf',
            sourceType: 'PDF',
            pageNumber: 1,
            text: 'Machine learning algorithms learn patterns iteratively from data without explicit procedural programming.',
            sectionTitle: 'Definition of AI and ML',
            similarityScore: 0.95,
          },
        ],
      }),
    })

    console.log(`   Quiz HTTP Status: ${quizRes.status}`)
    const quizData = await quizRes.json()
    console.log('   Questions generated:', quizData.questions?.length)
    if (quizData.questions?.length > 0) {
      console.log('   Sample Question:', quizData.questions[0].question)
      console.log('   Correct Answer:', quizData.questions[0].correctAnswer)
    }
  } catch (err: any) {
    console.error('   Quiz generation error:', err.message)
  }
}

testLiveEndpoints()
