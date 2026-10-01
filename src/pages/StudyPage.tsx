import React, { useState } from 'react'
import {
  Sparkles,
  Send,
  FileText,
  ExternalLink,
  BookOpen,
} from 'lucide-react'
import { Button } from '@/components/common/Button'
import { Badge } from '@/components/common/Badge'

export const StudyPage: React.FC = () => {
  const [question, setQuestion] = useState('')

  const sampleMessages = [
    {
      id: 'msg-1',
      sender: 'user',
      text: 'How does Raft leader election handle split votes?',
    },
    {
      id: 'msg-2',
      sender: 'ai',
      text: `When candidates split votes equally in Raft so that no candidate secures a majority, the election times out without a leader. Raft solves this by using randomized election timeouts (typically between 150ms and 300ms) to ensure split votes are rare and quickly resolved in the subsequent term.`,
      citations: [
        {
          materialTitle: 'Distributed Systems & Consensus Algorithms.pdf',
          page: 14,
          snippet:
            'Raft uses randomized election timeouts to ensure that split-vote situations are resolved quickly...',
        },
      ],
    },
  ]

  return (
    <div className="h-[calc(100vh-8.5rem)] flex flex-col md:flex-row gap-6">
      {/* Left Pane: Document / Course Context Preview */}
      <div className="w-full md:w-5/12 h-full flex flex-col rounded-3xl bg-slate-900/50 border border-slate-800/80 overflow-hidden">
        <div className="p-4 border-b border-slate-800/80 bg-slate-950/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold text-white">Source Context Viewer</span>
          </div>
          <Badge variant="indigo" size="sm">
            Active Material
          </Badge>
        </div>

        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center gap-2 text-indigo-400 mb-1">
              <FileText className="w-4 h-4" />
              <span className="text-xs font-semibold">
                Distributed Systems & Consensus Algorithms.pdf
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Section 3.2: Leader Election & Heartbeats</p>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/20">
            <div className="flex items-center justify-between mb-2">
              <Badge variant="indigo" size="sm">
                Cited on Page 14
              </Badge>
              <span className="text-[10px] text-slate-500">Relevance: 98%</span>
            </div>
            <p className="text-xs text-slate-300 italic leading-relaxed border-l-2 border-indigo-500 pl-3">
              "Raft uses randomized election timeouts to ensure that split-vote situations are
              resolved quickly. Each candidate restarts its timer at a random interval whenever an
              election cycle terminates without a quorum..."
            </p>
          </div>
        </div>
      </div>

      {/* Right Pane: Source-Grounded AI Assistant */}
      <div className="w-full md:w-7/12 h-full flex flex-col rounded-3xl bg-slate-900/50 border border-slate-800/80 overflow-hidden">
        {/* Assistant Header */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-950/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-white">Grounded Study Companion</h2>
              <p className="text-[10px] text-emerald-400">Strictly grounded in your uploaded materials</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            Groq LLaMA 3.3
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          {sampleMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.sender === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                    : 'bg-slate-950/80 border border-slate-800/80 text-slate-200'
                }`}
              >
                <p>{msg.text}</p>

                {msg.citations && (
                  <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-1.5">
                    <p className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">
                      Source References:
                    </p>
                    {msg.citations.map((c, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-indigo-300"
                      >
                        <ExternalLink className="w-3 h-3 text-indigo-400 shrink-0" />
                        <span className="font-medium truncate">{c.materialTitle}</span>
                        <span className="font-bold text-indigo-200 shrink-0">
                          (Page {c.page})
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Question Input Form */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/60">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!question.trim()) return
              setQuestion('')
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask any grounded question regarding your uploaded course materials..."
              className="flex-1 px-4 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
            <Button type="submit" size="md" className="rounded-2xl px-5">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
