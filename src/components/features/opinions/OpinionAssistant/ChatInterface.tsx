'use client';

import { useState, useEffect, useRef } from 'react';
import {
  PaperAirplaneIcon,
  SparklesIcon,
  DocumentTextIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { OpinionChatMessage } from '@/types';

interface ChatInterfaceProps {
  projectId: number;
  draftId: number;
}

interface ChatResponse {
  userMessage: OpinionChatMessage;
  assistantMessage: OpinionChatMessage;
  sources?: Array<{
    documentId: number;
    fileName: string;
    category: string;
  }>;
}

export default function ChatInterface({ projectId, draftId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<OpinionChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat history
  useEffect(() => {
    fetchMessages();
  }, [draftId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/opinion-drafts/${draftId}/chat`
      );
      if (!response.ok) throw new Error('Failed to fetch messages');
      const data = await response.json();
      setMessages(data.data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setError('Failed to load chat history');
    }
  };

  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText || input.trim();
    if (!textToSend) return;

    setIsLoading(true);
    setError(null);
    setInput('');

    try {
      const response = await fetch(
        `/api/projects/${projectId}/opinion-drafts/${draftId}/chat`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: textToSend,
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to send message');

      const data: { data: ChatResponse } = await response.json();
      
      // Add messages to state
      setMessages((prev) => [
        ...prev,
        data.data.userMessage,
        data.data.assistantMessage,
      ]);
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const parseSources = (metadata: string | null) => {
    if (!metadata) return [];
    try {
      const parsed = JSON.parse(metadata);
      return parsed.sources || [];
    } catch {
      return [];
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">AI Tax Assistant</h3>
            <p className="text-sm text-gray-600">
              Ask questions about documents or discuss your tax case
            </p>
          </div>
          <button
            onClick={fetchMessages}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <ArrowPathIcon className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-gray-50">
        {messages.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <SparklesIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              Welcome to the Tax Opinion Assistant
            </h4>
            <p className="text-sm text-gray-600 max-w-md mx-auto mb-4">
              I can help you in two ways:
            </p>
            <div className="max-w-md mx-auto text-left space-y-2 mb-6">
              <div className="flex items-start gap-3 text-sm text-gray-600">
                <DocumentTextIcon className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Search Documents:</strong> Ask questions about uploaded documents like "What does the assessment say about penalties?"
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm text-gray-600">
                <SparklesIcon className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Discuss Tax Issues:</strong> Get guidance on tax law, positions, and structuring your opinion
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-500">
              Start by uploading documents in the Documents tab, or ask me a question!
            </p>
          </div>
        )}

        {messages.map((message) => {
          const isUser = message.role === 'user';
          const sources = parseSources(message.metadata ?? null);

          return (
            <div
              key={message.id}
              className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                    <SparklesIcon className="w-5 h-5 text-white" />
                  </div>
                </div>
              )}

              <div className={`flex-1 max-w-3xl ${isUser ? 'flex justify-end' : ''}`}>
                <div
                  className={`rounded-lg px-4 py-3 ${
                    isUser
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-200 shadow-sm'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                  {/* Sources */}
                  {sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs font-semibold text-gray-700 mb-2">
                        📄 Sources Referenced:
                      </p>
                      <div className="space-y-1">
                        {sources.map((source: any, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 text-xs text-gray-600"
                          >
                            <DocumentTextIcon className="w-4 h-4" />
                            <span className="font-medium">{source.fileName}</span>
                            <span className="text-gray-500">({source.category})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {isUser && (
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-700">You</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                <SparklesIcon className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="animate-pulse flex gap-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animation-delay-200"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animation-delay-400"></div>
                </div>
                <span className="text-sm text-gray-600">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error Display */}
      {error && (
        <div className="px-6 py-3 bg-red-50 border-t border-red-200">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Input */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="flex gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Ask a question about your documents or discuss the tax issue..."
            rows={2}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isLoading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <PaperAirplaneIcon className="w-5 h-5" />
            <span>Send</span>
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}



