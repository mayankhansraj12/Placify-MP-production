import { useState, useRef, useEffect } from 'react'
import api from '../utils/api'
import { GLSLHills } from '../components/ui/glsl-hills'
import useDocumentTitle from '../hooks/useDocumentTitle'
import ThemedSelect from '../components/ThemedSelect'
import { TARGET_ROLE_OPTIONS } from '../utils/roles'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import vscDarkPlus from 'react-syntax-highlighter/dist/esm/styles/prism/vsc-dark-plus.js'

const shellClass = 'bg-white/60 dark:bg-stone-900/60 backdrop-blur-xl rounded-[1.5rem] sm:rounded-[2rem] border border-outline-variant/20 dark:border-stone-700/70 shadow-card-md dark:shadow-[0_24px_80px_rgba(0,0,0,0.35)] overflow-hidden transition-all duration-500'
const inputClass = 'flex-grow bg-white/75 dark:bg-stone-900/75 border border-outline-variant/30 dark:border-stone-700 rounded-xl px-4 py-3 text-on-surface dark:text-stone-100 outline-none transition-all duration-300 focus:border-amber-400 dark:focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 dark:focus:ring-amber-400/10 placeholder:text-on-surface-variant/45 dark:placeholder:text-stone-500'
const actionClass = 'bg-amber-400 dark:bg-amber-400 hover:bg-amber-300 dark:hover:bg-amber-300 disabled:bg-stone-200 dark:disabled:bg-stone-800 disabled:text-stone-500 text-stone-950 rounded-xl font-bold transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98] flex items-center justify-center shrink-0 shadow-[0_14px_36px_rgba(196,133,2,0.18)] dark:shadow-[0_14px_36px_rgba(196,133,2,0.20)]'

const formatQuestion = (question, questionNumber, totalQuestions) => {
  if (!question) return 'The interview is ready, but no question was returned. Please restart the session.'
  return [
    `Question ${questionNumber} of ${totalQuestions}`,
    question.question,
    question.difficulty ? `Difficulty: ${question.difficulty}` : '',
    question.tip ? `Hint: ${question.tip}` : '',
  ].filter(Boolean).join('\n\n')
}

const formatEvaluation = (result) => {
  const evaluation = result.evaluation || {}
  const parts = [
    `Score: ${evaluation.score ?? 'N/A'} / 10`,
    evaluation.feedback,
    Array.isArray(evaluation.strengths) && evaluation.strengths.length
      ? `Strengths:\n${evaluation.strengths.map(item => `- ${item}`).join('\n')}`
      : '',
    Array.isArray(evaluation.improvements) && evaluation.improvements.length
      ? `Improve:\n${evaluation.improvements.map(item => `- ${item}`).join('\n')}`
      : '',
    result.followup_question ? `Optional follow-up to think about:\n${result.followup_question}` : '',
  ]
  return parts.filter(Boolean).join('\n\n')
}

const formatSummary = (summary) => {
  if (!summary) return 'Interview complete. Nice work finishing the round.'
  return [
    'Interview complete',
    `Average score: ${summary.average_score ?? 0} / 10`,
    summary.overall_feedback,
  ].filter(Boolean).join('\n\n')
}

export default function MockInterview() {
  useDocumentTitle('Mock Interview')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [interviewStarted, setInterviewStarted] = useState(false)
  const [targetRole, setTargetRole] = useState(TARGET_ROLE_OPTIONS[0])
  const [sessionId, setSessionId] = useState(null)
  const [interviewComplete, setInterviewComplete] = useState(false)

  const messagesPanelRef = useRef(null)
  const scrollbarTimerRef = useRef(null)
  const [chatScrollbarVisible, setChatScrollbarVisible] = useState(false)

  const scrollChatToBottom = () => {
    const panel = messagesPanelRef.current
    if (!panel) return
    requestAnimationFrame(() => {
      panel.scrollTo({ top: panel.scrollHeight, behavior: 'smooth' })
    })
  }

  useEffect(() => scrollChatToBottom(), [messages, loading])
  useEffect(() => () => clearTimeout(scrollbarTimerRef.current), [])

  const handleChatScroll = () => {
    setChatScrollbarVisible(true)
    clearTimeout(scrollbarTimerRef.current)
    scrollbarTimerRef.current = setTimeout(() => setChatScrollbarVisible(false), 900)
  }

  const startInterview = async () => {
    setLoading(true)
    setInterviewStarted(true)
    setInterviewComplete(false)
    setSessionId(null)
    setMessages([])
    try {
      const response = await api.post('/interview/start', { role: targetRole })
      setSessionId(response.data.session_id)
      setMessages([{
        role: 'assistant',
        content: formatQuestion(response.data.current_question, response.data.question_number, response.data.total_questions),
      }])
    } catch {
      setMessages([{ role: 'system', content: 'Failed to start interview. Please try again.' }])
      setInterviewStarted(false)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading || !sessionId || interviewComplete) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)

    try {
      const response = await api.post('/interview/answer', { session_id: sessionId, answer: userMessage })
      const nextMessages = [{ role: 'assistant', content: formatEvaluation(response.data) }]

      if (response.data.is_complete) {
        setInterviewComplete(true)
        try {
          const summary = await api.get(`/interview/summary/${sessionId}`)
          nextMessages.push({ role: 'assistant', content: formatSummary(summary.data) })
        } catch {
          nextMessages.push({ role: 'assistant', content: formatSummary(null) })
        }
      } else {
        const next = await api.post('/interview/next', { session_id: sessionId })
        if (next.data.current_question) {
          nextMessages.push({
            role: 'assistant',
            content: formatQuestion(next.data.current_question, next.data.question_number, next.data.total_questions),
          })
        }
      }

      setMessages(prev => [...prev, ...nextMessages])
    } catch {
      setMessages(prev => [...prev, { role: 'system', content: 'Failed to send answer. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  const bubbleClass = (role) => {
    if (role === 'user') {
      return 'bg-amber-400 dark:bg-amber-400 text-stone-950 rounded-tr-sm shadow-[0_12px_30px_rgba(196,133,2,0.16)] dark:shadow-[0_12px_30px_rgba(196,133,2,0.18)]'
    }
    if (role === 'system') {
      return 'bg-red-500/10 text-red-700 dark:text-red-200 border border-red-500/25'
    }
    return 'bg-white/80 dark:bg-stone-800/85 text-on-surface dark:text-stone-200 rounded-tl-sm border border-outline-variant/20 dark:border-stone-700/70 shadow-card dark:shadow-none'
  }

  return (
    <div className="font-body text-on-surface dark:text-stone-100 min-h-screen flex flex-col selection:bg-primary-container selection:text-on-primary-container relative">
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <GLSLHills width="100%" height="100%" />
      </div>

      <main className="flex-grow pt-24 pb-6 md:pt-28 md:pb-16 px-4 sm:px-6 max-w-4xl mx-auto w-full relative z-10 flex flex-col min-h-[calc(100svh-80px)] md:h-[calc(100vh-80px)] min-w-0">
        <header className="text-center space-y-3 mb-8 shrink-0">
          <h1 className="text-3xl md:text-6xl font-black font-headline tracking-tighter leading-none">
            Mock <span className="text-amber-400 dark:text-amber-400">Interviews</span>
          </h1>
          <p className="text-on-surface-variant dark:text-stone-400 font-light max-w-xl mx-auto text-sm md:text-base">
            Practice your technical and behavioral interviews with Placify AI.
          </p>
        </header>

        {!interviewStarted ? (
          <div className="flex-grow flex items-center justify-center">
            <div className={`p-6 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] w-full max-w-md space-y-6 text-center hover:-translate-y-1 !overflow-visible ${shellClass}`}>
              <div className="mx-auto w-20 h-20 rounded-full bg-amber-400/10 dark:bg-amber-400/10 border border-amber-400/20 dark:border-amber-400/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-5xl text-amber-400 dark:text-amber-400">record_voice_over</span>
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold font-headline">Ready to practice?</h2>
                <p className="text-on-surface-variant dark:text-stone-400 text-sm">Select your target role and begin the simulated interview process.</p>
              </div>
              <div className="space-y-4 text-left">
                <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant dark:text-stone-400 block text-center">Target Role</label>
                <ThemedSelect
                  value={targetRole}
                  options={TARGET_ROLE_OPTIONS}
                  onChange={setTargetRole}
                  label="Target role"
                  align="center"
                  placement="up"
                />
              </div>
              <button
                onClick={startInterview}
                disabled={loading}
                className={`w-full py-4 ${actionClass}`}
              >
                {loading ? <span className="material-symbols-outlined animate-spin">sync</span> : <span className="material-symbols-outlined">play_arrow</span>}
                {loading ? 'Starting...' : 'Start Interview'}
              </button>
            </div>
          </div>
        ) : (
          <div className={`flex-grow flex flex-col min-h-[360px] min-w-0 ${shellClass}`}>
            <div className="px-5 py-3 border-b border-outline-variant/20 dark:border-stone-800/80 bg-white/35 dark:bg-stone-950/25 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400 dark:bg-amber-400 shadow-[0_0_24px_rgba(196,133,2,0.45)]" />
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant dark:text-stone-400">Interview Active</p>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/60 dark:text-stone-500">{targetRole}</p>
            </div>

            <div
              ref={messagesPanelRef}
              onScroll={handleChatScroll}
              className={`scrollbar-on-scroll ${chatScrollbarVisible ? 'scrollbar-active' : ''} flex-grow min-h-0 overflow-y-auto p-4 sm:p-5 md:p-6 space-y-6`}
            >
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                  <div className={`responsive-text max-w-[92%] sm:max-w-[85%] min-w-0 rounded-2xl p-4 transition-all duration-300 ${bubbleClass(msg.role)}`}>
                    {msg.role === 'assistant' ? (
                      <ReactMarkdown
                        components={{
                          code({ inline, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || '')
                            return !inline && match ? (
                              <SyntaxHighlighter style={vscDarkPlus} language={match[1]} PreTag="div" className="rounded-lg my-2 text-sm" {...props}>
                                {String(children).replace(/\n$/, '')}
                              </SyntaxHighlighter>
                            ) : (
                              <code className="bg-stone-100 dark:bg-stone-950 px-1.5 py-0.5 rounded text-amber-400 dark:text-amber-400 font-mono text-sm" {...props}>{children}</code>
                            )
                          },
                          p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                          ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-1">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-1">{children}</ol>,
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    ) : (
                      <p className="whitespace-pre-wrap responsive-text">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white/80 dark:bg-stone-800/85 text-on-surface-variant dark:text-stone-400 rounded-2xl rounded-tl-sm border border-outline-variant/20 dark:border-stone-700/70 p-4 flex gap-2 items-center">
                    <span className="w-2 h-2 rounded-full bg-amber-400 dark:bg-amber-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-amber-400 dark:bg-amber-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-amber-400 dark:bg-amber-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-white/45 dark:bg-stone-950/40 border-t border-outline-variant/20 dark:border-stone-800 shrink-0">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Your answer..."
                  className={inputClass}
                  disabled={loading || interviewComplete}
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim() || interviewComplete}
                  aria-label="Send message"
                  className={`${actionClass} px-4 sm:px-6`}
                >
                  <span className="material-symbols-outlined">send</span>
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
