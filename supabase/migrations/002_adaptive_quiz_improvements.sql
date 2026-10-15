-- =============================================================================
-- MENTORA AI — Migration 002: Adaptive Quiz Optimization & Performance Indexes
-- Improves query performance for quiz generation, attempts tracking, and topic mastery lookups
-- =============================================================================

-- 1. Optimized composite indexes for quizzes
CREATE INDEX IF NOT EXISTS idx_quizzes_user_course 
    ON public.quizzes(user_id, course_id);

CREATE INDEX IF NOT EXISTS idx_quizzes_course 
    ON public.quizzes(course_id);

-- 2. Optimized composite indexes for quiz attempts
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_course 
    ON public.quiz_attempts(user_id, course_id);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id 
    ON public.quiz_attempts(quiz_id);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_topic 
    ON public.quiz_attempts(user_id, topic);

-- 3. Optimized indexes for mastery table
CREATE INDEX IF NOT EXISTS idx_mastery_user_course_topic 
    ON public.mastery(user_id, course_id, topic_id);

CREATE INDEX IF NOT EXISTS idx_mastery_score 
    ON public.mastery(user_id, mastery_score);

-- 4. Server-side RPC helper to get learner topic mastery snapshot
CREATE OR REPLACE FUNCTION get_learner_topic_mastery(
    p_user_id UUID,
    p_course_id UUID,
    p_topic_id TEXT
)
RETURNS TABLE (
    mastery_score FLOAT,
    attempts INT,
    correct_answers INT,
    incorrect_answers INT,
    difficulty_level TEXT,
    misconceptions TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.mastery_score,
        m.attempts,
        m.correct_answers,
        m.incorrect_answers,
        m.difficulty_level,
        m.misconceptions
    FROM public.mastery m
    WHERE m.user_id = p_user_id
      AND m.course_id = p_course_id
      AND (m.topic_id = p_topic_id OR LOWER(m.topic_name) = LOWER(p_topic_id))
    LIMIT 1;
END;
$$;
