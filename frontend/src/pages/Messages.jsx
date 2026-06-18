import { useState, useEffect, useRef } from 'react'
import { api, imgUrl } from '../api'
import { useAuth } from '../context/AuthContext'
import { timeAgo } from '../utils'
import LoadingSpinner from '../components/LoadingSpinner'

export default function Messages() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState([])
  const [convLoading, setConvLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [thread, setThread] = useState([])
  const [threadLoading, setThreadLoading] = useState(false)

  // text + image state
  const [reply, setReply] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [sending, setSending] = useState(false)

  // fullscreen image viewer
  const [viewImage, setViewImage] = useState(null)

  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const fileRef = useRef(null)

  useEffect(() => {
    api.get('/messages')
      .then(setConversations)
      .catch(() => {})
      .finally(() => setConvLoading(false))
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [thread])

  const openConversation = async (conv) => {
    setSelected(conv)
    setThreadLoading(true)
    setThread([])
    try {
      setThread(await api.get(`/messages/${conv.listing_id}`))
    } catch {}
    setThreadLoading(false)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const pickImage = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    e.target.value = ''
  }

  const clearImage = () => {
    setImageFile(null)
    setImagePreview(null)
  }

  const sendReply = async (e) => {
    e?.preventDefault()
    if (!selected) return
    if (!reply.trim() && !imageFile) return
    setSending(true)
    try {
      let image_url = null

      // Upload image first if selected
      if (imageFile) {
        const fd = new FormData()
        fd.append('image', imageFile)
        const res = await api.post('/messages/upload', fd)
        image_url = res.image_url
      }

      await api.post('/messages', {
        listing_id: selected.listing_id,
        receiver_id: selected.other_user_id,
        content: reply.trim(),
        image_url,
      })

      setReply('')
      clearImage()
      const msgs = await api.get(`/messages/${selected.listing_id}`)
      setThread(msgs)
      setConversations((prev) =>
        prev.map((c) =>
          c.listing_id === selected.listing_id
            ? { ...c, last_message: reply.trim() || '📷 Image', last_message_at: new Date().toISOString() }
            : c
        )
      )
    } catch {}
    setSending(false)
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendReply()
    }
  }

  return (
    <div className="min-h-screen px-4 py-8" style={{ backgroundColor: '#F5F3FF' }}>
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-extrabold text-gray-900 mb-6">Messages</h1>

        <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden flex" style={{ minHeight: '65vh' }}>

          {/* Conversation list */}
          <div className={`${selected ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-72 border-r border-gray-100 shrink-0`}>
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <p className="text-sm font-semibold text-gray-700">Conversations</p>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
              {convLoading ? (
                <div className="flex justify-center py-10"><LoadingSpinner /></div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <p className="text-gray-400 text-sm">No messages yet.</p>
                  <p className="text-gray-400 text-xs mt-1">Message a seller from a listing.</p>
                </div>
              ) : (
                conversations.map((c) => (
                  <button key={c.listing_id} onClick={() => openConversation(c)}
                    className={`w-full text-left px-4 py-3.5 hover:bg-purple-50 transition-colors ${selected?.listing_id === c.listing_id ? 'bg-purple-50 border-l-[3px] border-purple-600' : ''}`}>
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-sm font-semibold text-gray-900 truncate">@{c.other_user_name}</p>
                      <span className="text-xs text-gray-400 shrink-0 ml-2">{timeAgo(c.last_message_at)}</span>
                    </div>
                    <p className="text-xs text-purple-600 font-medium truncate">{c.listing_title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{c.last_message || '📷 Image'}</p>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat thread */}
          <div className="flex-1 flex flex-col min-w-0">
            {!selected ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
                <div className="text-5xl mb-3">💬</div>
                <p className="text-gray-600 font-medium">Select a conversation</p>
                <p className="text-gray-400 text-sm mt-1">Choose from the left to start chatting</p>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
                  <button className="md:hidden text-gray-500 hover:text-gray-700" onClick={() => setSelected(null)}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">@{selected.other_user_name}</p>
                    <p className="text-xs text-gray-500 truncate">{selected.listing_title}</p>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ maxHeight: 'calc(65vh - 130px)' }}>
                  {threadLoading ? (
                    <div className="flex justify-center py-8"><LoadingSpinner /></div>
                  ) : thread.length === 0 ? (
                    <p className="text-center text-gray-400 text-sm py-8">No messages yet. Say hello!</p>
                  ) : (
                    thread.map((m) => {
                      const mine = m.sender_id === user?.id
                      return (
                        <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                          <div className={`max-w-[75%] rounded-2xl text-sm ${
                            mine ? 'bg-purple-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                          } ${m.content ? 'px-4 py-2.5' : 'p-1.5'}`}>
                            {/* Image */}
                            {m.image_url && (
                              <button
                                onClick={() => setViewImage(m.image_url)}
                                className="block mb-1 rounded-xl overflow-hidden max-w-[240px]"
                              >
                                <img
                                  src={m.image_url}
                                  alt="shared image"
                                  className="w-full rounded-xl hover:opacity-90 transition-opacity"
                                />
                              </button>
                            )}
                            {/* Text */}
                            {m.content && <p className="leading-relaxed">{m.content}</p>}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5 px-1">
                            {mine ? 'You' : `@${m.sender_display}`} · {timeAgo(m.created_at)}
                          </p>
                        </div>
                      )
                    })
                  )}
                  <div ref={bottomRef} />
                </div>

                {/* Image preview strip */}
                {imagePreview && (
                  <div className="px-4 pt-2 flex items-center gap-2 border-t border-gray-100 bg-gray-50">
                    <div className="relative inline-block">
                      <img src={imagePreview} alt="preview" className="h-16 w-16 rounded-xl object-cover border border-gray-200" />
                      <button
                        onClick={clearImage}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs leading-none"
                      >
                        ×
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">Image ready to send</p>
                  </div>
                )}

                {/* Input bar */}
                <div className="px-4 py-3 border-t border-gray-100">
                  <form onSubmit={sendReply} className="flex gap-2 items-center">
                    {/* Hidden file input */}
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={pickImage}
                    />
                    {/* Camera button */}
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="p-2.5 rounded-xl border border-gray-300 hover:border-purple-400 hover:bg-purple-50 text-gray-500 hover:text-purple-600 transition-colors shrink-0"
                      title="Attach image"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>

                    <input
                      ref={inputRef}
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      onKeyDown={onKeyDown}
                      placeholder="Type a message… (Enter to send)"
                      className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 focus:border-purple-500 focus:outline-none text-sm text-gray-800 placeholder-gray-400 transition-colors"
                    />

                    <button
                      type="submit"
                      disabled={sending || (!reply.trim() && !imageFile)}
                      className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white text-sm font-semibold transition-colors flex items-center gap-1.5 shrink-0"
                    >
                      {sending ? <LoadingSpinner size="sm" color="white" /> : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      )}
                      Send
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen image viewer */}
      {viewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setViewImage(null)}
        >
          <img
            src={viewImage}
            alt="full size"
            className="max-w-full max-h-full rounded-xl shadow-2xl"
          />
          <button
            className="absolute top-4 right-4 w-9 h-9 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white text-lg transition-colors"
            onClick={() => setViewImage(null)}
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}
