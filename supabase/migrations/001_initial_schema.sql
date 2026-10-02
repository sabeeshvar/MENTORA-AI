-- =============================================================================
-- MENTORA AI — Production Supabase PostgreSQL Schema & Migrations
-- Track D: Multimodal, Source-Grounded & Adaptive AI Learning Companion
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- Enable pgvector for semantic dense embeddings if available in Supabase
CREATE EXTENSION IF NOT EXISTS "vector";

-- 1. PROFILES TABLE (Users & Learning Preferences)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    display_name TEXT,
    photo_url TEXT,
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'educator', 'admin')),
    preferred_language TEXT NOT NULL DEFAULT 'en',
    fallback_language TEXT NOT NULL DEFAULT 'en',
    locale TEXT NOT NULL DEFAULT 'en-US',
    learning_stats JSONB NOT NULL DEFAULT '{
        "materialsCount": 0,
        "quizzesTaken": 0,
        "overallMastery": 0,
        "questionsAsked": 0,
        "streakDays": 1,
        "lastActiveDate": ""
    }'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. COURSES TABLE
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. COURSE MATERIALS TABLE (PDF, PPT/PPTX, Video)
CREATE TABLE IF NOT EXISTS public.course_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('PDF', 'PPT', 'PPTX', 'MP4', 'VIDEO')),
    storage_path TEXT NOT NULL,
    download_url TEXT,
    size_bytes BIGINT NOT NULL DEFAULT 0,
    processing_status TEXT NOT NULL DEFAULT 'uploaded' CHECK (processing_status IN ('uploaded', 'processing', 'processed', 'failed')),
    error_message TEXT,
    chunks_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. COURSE CHUNKS TABLE (Multimodal Content Units with Source Metadata & Vectors)
CREATE TABLE IF NOT EXISTS public.course_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES public.course_materials(id) ON DELETE CASCADE,
    chunk_index INT NOT NULL,
    content TEXT NOT NULL,
    page_number INT,
    slide_number INT,
    video_timestamp TEXT,
    token_count INT NOT NULL DEFAULT 0,
    topic_id TEXT,
    concept_id TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Vector embedding column (256-dim dense semantic vector)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
        ALTER TABLE public.course_chunks ADD COLUMN IF NOT EXISTS embedding vector(256);
        CREATE INDEX IF NOT EXISTS idx_course_chunks_embedding 
            ON public.course_chunks USING hnsw (embedding vector_cosine_ops);
    END IF;
END $$;

-- RPC Function for Grounded Vector Search with Strict Course Boundary Isolation
CREATE OR REPLACE FUNCTION match_course_chunks(
    p_course_id UUID,
    query_embedding vector(256),
    match_threshold FLOAT DEFAULT 0.15,
    match_count INT DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    course_id UUID,
    material_id UUID,
    chunk_index INT,
    content TEXT,
    page_number INT,
    slide_number INT,
    video_timestamp TEXT,
    token_count INT,
    topic_id TEXT,
    concept_id TEXT,
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        cc.id,
        cc.course_id,
        cc.material_id,
        cc.chunk_index,
        cc.content,
        cc.page_number,
        cc.slide_number,
        cc.video_timestamp,
        cc.token_count,
        cc.topic_id,
        cc.concept_id,
        cc.metadata,
        (1 - (cc.embedding <=> query_embedding))::FLOAT AS similarity
    FROM public.course_chunks cc
    WHERE cc.course_id = p_course_id
      AND cc.embedding IS NOT NULL
      AND (1 - (cc.embedding <=> query_embedding)) >= match_threshold
    ORDER BY cc.embedding <=> query_embedding ASC
    LIMIT match_count;
END;
$$;

-- 5. COURSE TOPICS & KNOWLEDGE GRAPH PREREQUISITES
CREATE TABLE IF NOT EXISTS public.course_topics (
    id TEXT NOT NULL,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    canonical_name TEXT NOT NULL,
    translations JSONB NOT NULL DEFAULT '{}'::jsonb,
    prerequisites TEXT[] NOT NULL DEFAULT '{}',
    difficulty TEXT NOT NULL DEFAULT 'medium',
    importance_weight FLOAT NOT NULL DEFAULT 1.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (course_id, id)
);

-- 6. TOPIC MASTERY TABLE (Per-student Topic Mastery Model)
CREATE TABLE IF NOT EXISTS public.mastery (
    id TEXT NOT NULL, -- Format: {user_id}_{topic_id}
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    topic_id TEXT NOT NULL,
    topic_name TEXT NOT NULL,
    mastery_score FLOAT NOT NULL DEFAULT 0.5 CHECK (mastery_score >= 0.0 AND mastery_score <= 1.0),
    attempts INT NOT NULL DEFAULT 0,
    correct_answers INT NOT NULL DEFAULT 0,
    incorrect_answers INT NOT NULL DEFAULT 0,
    difficulty_level TEXT NOT NULL DEFAULT 'medium',
    trend TEXT NOT NULL DEFAULT 'stable' CHECK (trend IN ('up', 'down', 'stable')),
    weak_areas TEXT[] DEFAULT '{}',
    misconceptions TEXT[] DEFAULT '{}',
    last_attempt_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, topic_id)
);

-- 7. QUIZZES TABLE (Generated Question Sets)
CREATE TABLE IF NOT EXISTS public.quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    title TEXT NOT NULL,
    difficulty TEXT NOT NULL DEFAULT 'medium',
    questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_diagnostic BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. QUIZ ATTEMPTS TABLE (Assessment Logs & Evaluation)
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    quiz_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    score FLOAT NOT NULL DEFAULT 0.0,
    correct_count INT NOT NULL DEFAULT 0,
    total_questions INT NOT NULL DEFAULT 0,
    difficulty TEXT NOT NULL DEFAULT 'medium',
    results JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_diagnostic BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. STUDY PLANS TABLE (Goal-Oriented Daily Curriculum)
CREATE TABLE IF NOT EXISTS public.study_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    target_date DATE NOT NULL,
    daily_available_minutes INT NOT NULL DEFAULT 60,
    preferred_days TEXT[] NOT NULL DEFAULT ARRAY['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
    days JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_study_plans_user_course UNIQUE (user_id, course_id)
);

-- 10. REVISION ITEMS TABLE (Spaced-Repetition Schedule)
CREATE TABLE IF NOT EXISTS public.revision_items (
    id TEXT NOT NULL, -- Format: {user_id}_{topic_id}
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    topic_id TEXT NOT NULL,
    topic_name TEXT NOT NULL,
    mastery_score FLOAT NOT NULL DEFAULT 0.5,
    last_studied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    next_revision_due TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revision_count INT NOT NULL DEFAULT 0,
    interval_days INT NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'due_today' CHECK (status IN ('revise_now', 'due_today', 'upcoming', 'mastered')),
    weak_areas TEXT[] DEFAULT '{}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, topic_id)
);

-- 11. PERSONALIZED RECOMMENDATIONS TABLE
CREATE TABLE IF NOT EXISTS public.recommendations (
    id TEXT NOT NULL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    topic_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('REVISION', 'QUIZ', 'PRACTICE', 'ADVANCE')),
    title TEXT NOT NULL,
    reason TEXT NOT NULL,
    priority TEXT NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
    estimated_minutes INT NOT NULL DEFAULT 10,
    action_label TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. SYSTEM EVALUATION BENCHMARK RESULTS
CREATE TABLE IF NOT EXISTS public.evaluation_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    score FLOAT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- INDEXES FOR HIGH-PERFORMANCE QUERYING
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_courses_owner ON public.courses(owner_id);
CREATE INDEX IF NOT EXISTS idx_materials_course ON public.course_materials(course_id);
CREATE INDEX IF NOT EXISTS idx_chunks_course ON public.course_chunks(course_id);
CREATE INDEX IF NOT EXISTS idx_chunks_material ON public.course_chunks(material_id);
CREATE INDEX IF NOT EXISTS idx_mastery_user_course ON public.mastery(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON public.quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_study_plans_user ON public.study_plans(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_revision_due ON public.revision_items(user_id, next_revision_due);
CREATE INDEX IF NOT EXISTS idx_recs_user ON public.recommendations(user_id);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES — STRICT MULTI-TENANT ISOLATION
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revision_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_results ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can only read and update their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Courses: Users can only see and manage their own courses
DROP POLICY IF EXISTS "Users can view own courses" ON public.courses;
CREATE POLICY "Users can view own courses" ON public.courses
    FOR SELECT USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can create own courses" ON public.courses;
CREATE POLICY "Users can create own courses" ON public.courses
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can update own courses" ON public.courses;
CREATE POLICY "Users can update own courses" ON public.courses
    FOR UPDATE USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can delete own courses" ON public.courses;
CREATE POLICY "Users can delete own courses" ON public.courses
    FOR DELETE USING (auth.uid() = owner_id);

-- Course Materials: Only course owner can read and write
DROP POLICY IF EXISTS "Course owner can access materials" ON public.course_materials;
CREATE POLICY "Course owner can access materials" ON public.course_materials
    FOR ALL USING (auth.uid() = owner_id);

-- Course Chunks: Access granted via course ownership
DROP POLICY IF EXISTS "Course owner can access chunks" ON public.course_chunks;
CREATE POLICY "Course owner can access chunks" ON public.course_chunks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.courses
            WHERE courses.id = course_chunks.course_id
            AND courses.owner_id = auth.uid()
        )
    );

-- Course Topics: Access granted via course ownership
DROP POLICY IF EXISTS "Course owner can access topics" ON public.course_topics;
CREATE POLICY "Course owner can access topics" ON public.course_topics
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.courses
            WHERE courses.id = course_topics.course_id
            AND courses.owner_id = auth.uid()
        )
    );

-- Mastery: Students only access their own mastery
DROP POLICY IF EXISTS "Students access own mastery" ON public.mastery;
CREATE POLICY "Students access own mastery" ON public.mastery
    FOR ALL USING (auth.uid() = user_id);

-- Quizzes: Students access their own quizzes
DROP POLICY IF EXISTS "Students access own quizzes" ON public.quizzes;
CREATE POLICY "Students access own quizzes" ON public.quizzes
    FOR ALL USING (auth.uid() = user_id);

-- Quiz Attempts: Students access their own attempts
DROP POLICY IF EXISTS "Students access own attempts" ON public.quiz_attempts;
CREATE POLICY "Students access own attempts" ON public.quiz_attempts
    FOR ALL USING (auth.uid() = user_id);

-- Study Plans: Students access their own plans
DROP POLICY IF EXISTS "Students access own study plans" ON public.study_plans;
CREATE POLICY "Students access own study plans" ON public.study_plans
    FOR ALL USING (auth.uid() = user_id);

-- Revision Items: Students access their own revision items
DROP POLICY IF EXISTS "Students access own revision items" ON public.revision_items;
CREATE POLICY "Students access own revision items" ON public.revision_items
    FOR ALL USING (auth.uid() = user_id);

-- Recommendations: Students access their own recommendations
DROP POLICY IF EXISTS "Students access own recommendations" ON public.recommendations;
CREATE POLICY "Students access own recommendations" ON public.recommendations
    FOR ALL USING (auth.uid() = user_id);

-- Evaluation Results: Read-only for authenticated students, insertable by test runner
DROP POLICY IF EXISTS "Authenticated users view evaluations" ON public.evaluation_results;
CREATE POLICY "Authenticated users view evaluations" ON public.evaluation_results
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users insert evaluations" ON public.evaluation_results;
CREATE POLICY "Authenticated users insert evaluations" ON public.evaluation_results
    FOR INSERT TO authenticated WITH CHECK (true);

-- =============================================================================
-- STORAGE BUCKET CONFIGURATION & POLICIES
-- =============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-materials', 'course-materials', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated users can upload course materials" ON storage.objects;
CREATE POLICY "Authenticated users can upload course materials" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (bucket_id = 'course-materials');

DROP POLICY IF EXISTS "Public can view course materials" ON storage.objects;
CREATE POLICY "Public can view course materials" ON storage.objects
    FOR SELECT USING (bucket_id = 'course-materials');

DROP POLICY IF EXISTS "Users can update own course materials in storage" ON storage.objects;
CREATE POLICY "Users can update own course materials in storage" ON storage.objects
    FOR UPDATE TO authenticated USING (bucket_id = 'course-materials' AND (storage.foldername(name))[1] = 'courses');

DROP POLICY IF EXISTS "Users can delete own course materials in storage" ON storage.objects;
CREATE POLICY "Users can delete own course materials in storage" ON storage.objects
    FOR DELETE TO authenticated USING (bucket_id = 'course-materials' AND (storage.foldername(name))[1] = 'courses');

