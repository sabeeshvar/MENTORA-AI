import type { CourseKnowledgeMap, ModuleNode, TopicNode, SubtopicNode, ConceptNode } from '@/types/knowledgeMap'
import type { ProcessedChunk } from '@/types/chunk'
import type { TopicMastery } from '@/types/mastery'
import { getMasteryStatus } from '@/types/mastery'

export class KnowledgeMapService {
  /**
   * Constructs a structured hierarchical Course Knowledge Map:
   * Course -> Module -> Topic -> Subtopic -> Concept
   * Grounded in the course's processed chunks and user mastery data
   */
  public static buildKnowledgeMap(
    courseId: string,
    courseTitle: string,
    chunks: ProcessedChunk[],
    masteries: TopicMastery[] = []
  ): CourseKnowledgeMap {
    if (!chunks || chunks.length === 0) {
      return {
        courseId,
        courseTitle,
        modules: [],
        generatedAt: new Date().toISOString(),
      }
    }

    // Group chunks by sourceName (Module level)
    const sourceGroups = new Map<string, ProcessedChunk[]>()
    for (const chunk of chunks) {
      const src = chunk.sourceName || 'General Material'
      if (!sourceGroups.has(src)) {
        sourceGroups.set(src, [])
      }
      sourceGroups.get(src)!.push(chunk)
    }

    const modules: ModuleNode[] = []
    let moduleIndex = 1

    for (const [sourceName, moduleChunks] of sourceGroups.entries()) {
      // Group module chunks by sectionTitle (Topic level)
      const topicGroups = new Map<string, ProcessedChunk[]>()
      for (const chunk of moduleChunks) {
        const title = chunk.sectionTitle || 'Core Concepts'
        if (!topicGroups.has(title)) {
          topicGroups.set(title, [])
        }
        topicGroups.get(title)!.push(chunk)
      }

      const topics: TopicNode[] = []
      let prevTopicName: string | undefined = undefined

      for (const [topicName, tChunks] of topicGroups.entries()) {
        const topicId = topicName.toLowerCase().replace(/[^a-z0-9]/g, '_')
        const matchingMastery = masteries.find(
          (m) => m.topicId === topicId || m.topicName.toLowerCase() === topicName.toLowerCase()
        )

        const score = matchingMastery ? matchingMastery.masteryScore : 0.5
        const attempts = matchingMastery ? matchingMastery.attempts : 0
        const status = matchingMastery ? getMasteryStatus(score).status : 'developing'

        // Extract subtopics / concepts from chunks
        const concepts: ConceptNode[] = tChunks.map((c, idx) => {
          const loc = c.pageNumber !== undefined && c.pageNumber !== null
            ? `Page ${c.pageNumber}`
            : c.slideNumber !== undefined && c.slideNumber !== null
            ? `Slide ${c.slideNumber}`
            : 'Section'

          return {
            id: `conc_${c.chunkId}`,
            name: `${topicName} - Part ${idx + 1} (${loc})`,
            description: c.text.slice(0, 140) + '...',
            masteryScore: score,
            status,
            attempts,
            sourceMaterials: [c.sourceName],
            prerequisites: prevTopicName ? [prevTopicName] : undefined,
          }
        })

        const subtopics: SubtopicNode[] = [
          {
            id: `sub_${topicId}`,
            name: `${topicName} Core Content`,
            concepts,
          },
        ]

        topics.push({
          id: topicId,
          name: topicName,
          subtopics,
          masteryScore: score,
          attempts,
          status,
          sourceMaterials: Array.from(new Set(tChunks.map((c) => c.sourceName))),
          prerequisites: prevTopicName ? [prevTopicName] : undefined,
        })

        prevTopicName = topicName
      }

      modules.push({
        id: `mod_${moduleIndex}`,
        title: `Module ${moduleIndex}: ${sourceName.replace(/\.[^/.]+$/, '')}`,
        order: moduleIndex,
        topics,
      })

      moduleIndex++
    }

    return {
      courseId,
      courseTitle,
      modules,
      generatedAt: new Date().toISOString(),
    }
  }
}
