'use client';

import { useState, useEffect, useRef } from 'react';
import {
  PaperAirplaneIcon,
  UserIcon,
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
  phase: string;
  suggestions?: string[];
  sources?: Array<{
    documentId: number;
    fileName: string;
    category: string;
  }>;
  workflowState: any;
}

export default function ChatInterface({ projectId, draftId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<OpinionChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPhase, setCurrentPhase] = useState<string>('interview');
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
      
      // Set phase from last message
      if (data.data && data.data.length > 0) {
        const lastMsg = data.data[data.data.length - 1];
        if (lastMsg.metadata) {
          try {
            const metadata = JSON.parse(lastMsg.metadata);
            if (metadata.phase) setCurrentPhase(metadata.phase);
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
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
            phase: currentPhase,
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
      
      // Update phase
      if (data.data.phase) {
        setCurrentPhase(data.data.phase);
      }
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

  const getPhaseDisplay = (phase: string) => {
    const phases: Record<string, { label: string; color: string }> = {
      interview: { label: 'Gathering Facts', color: 'bg-blue-100 text-blue-800' },
      research: { label: 'Researching', color: 'bg-purple-100 text-purple-800' },
      analysis: { label: 'Analyzing', color: 'bg-yellow-100 text-yellow-800' },
      drafting: { label: 'Drafting', color: 'bg-green-100 text-green-800' },
      review: { label: 'Review', color: 'bg-orange-100 text-orange-800' },
      complete: { label: 'Complete', color: 'bg-gray-100 text-gray-800' },
    };

    const phaseInfo = phases[phase] || phases.interview;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${phaseInfo.color}`}>
        {phaseInfo.label}
      </span>
    );
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

  const parseSuggestions = (metadata: string | null) => {
    if (!metadata) return [];
    try {
      const parsed = JSON.parse(metadata);
      return parsed.suggestions || [];
    } catch {
      return [];
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b-2 border-forvis-blue-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-forvis-gray-900">AI Tax Assistant</h3>
            <p className="text-sm text-forvis-gray-600">
              Get guidance on building your tax opinion
            </p>
          </div>
          <div className="flex items-center gap-3">
            {getPhaseDisplay(currentPhase)}
            <button
              onClick={fetchMessages}
              className="p-2 hover:bg-forvis-gray-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <ArrowPathIcon className="w-5 h-5 text-forvis-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <SparklesIcon className="w-16 h-16 mx-auto text-forvis-gray-400 mb-4" />
            <h4 className="text-lg font-semibold text-forvis-gray-900 mb-2">
              Welcome to the Tax Opinion Assistant
            </h4>
            <p className="text-sm text-forvis-gray-600 max-w-md mx-auto">
              I'll help you develop a comprehensive tax opinion by asking relevant questions,
              researching documents, and guiding you through the analysis.
            </p>
            <p className="text-sm text-forvis-gray-600 mt-4">
              Let's start by understanding the tax scenario. What tax issue are you working on?
            </p>
          </div>
        )}

        {messages.map((message) => {
          const isUser = message.role === 'user';
          const sources = parseSources(message.metadata);
          const suggestions = parseSuggestions(message.metadata);

          return (
            <div
              key={message.id}
              className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-forvis-blue-500 to-forvis-blue-700 flex items-center justify-center">
                    <SparklesIcon className="w-5 h-5 text-white" />
                  </div>
                </div>
              )}

              <div className={`flex-1 max-w-3xl ${isUser ? 'flex justify-end' : ''}`}>
                <div
                  className={`rounded-lg px-4 py-3 ${
                    isUser
                      ? 'bg-forvis-blue-600 text-white'
                      : 'bg-white border border-forvis-gray-200'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                  {/* Sources */}
                  {sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-forvis-gray-200">
                      <p className="text-xs font-semibold text-forvis-gray-700 mb-2">
                        Sources Referenced:
                      </p>
                      <div className="space-y-1">
                        {sources.map((source: any, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 text-xs text-forvis-gray-600"
                          >
                            <DocumentTextIcon className="w-4 h-4" />
                            <span className="font-medium">{source.fileName}</span>
                            <span className="text-forvis-gray-500">
                              ({source.category})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quick Suggestions */}
                  {suggestions.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-forvis-gray-200">
                      <p className="text-xs font-semibold text-forvis-gray-700 mb-2">
                        Quick Actions:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {suggestions.map((suggestion: string, idx: number) => (
                          <button
                            key={idx}
                            onClick={() => sendMessage(suggestion)}
                            disabled={isLoading}
                            className="px-3 py-1 text-xs font-medium bg-forvis-blue-50 text-forvis-blue-700 rounded-md hover:bg-forvis-blue-100 transition-colors disabled:opacity-50"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {isUser && (
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-forvis-gray-200 flex items-center justify-center">
                    <UserIcon className="w-5 h-5 text-forvis-gray-600" />
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-forvis-blue-500 to-forvis-blue-700 flex items-center justify-center">
                <SparklesIcon className="w-5 h-5 text-white animate-pulse" />
              </div>
            </div>
            <div className="bg-white border border-forvis-gray-200 rounded-lg px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-forvis-gray-400 rounded-full animate-bounce"></div>
                <div
                  className="w-2 h-2 bg-forvis-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0.2s' }}
                ></div>
                <div
                  className="w-2 h-2 bg-forvis-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0.4s' }}
                ></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-6 py-3 bg-red-50 border-t border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Input */}
      <div className="border-t-2 border-forvis-gray-200 px-6 py-4 bg-white">
        <div className="flex gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
            disabled={isLoading}
            rows={2}
            className="flex-1 px-4 py-2 border border-forvis-gray-300 rounded-lg focus:ring-2 focus:ring-forvis-blue-600 focus:border-transparent resize-none disabled:opacity-50"
          />
          <button
            onClick={() => sendMessage()}
            disabled={isLoading || !input.trim()}
            className="px-6 py-2 bg-gradient-to-r from-forvis-blue-500 to-forvis-blue-700 text-white rounded-lg hover:from-forvis-blue-600 hover:to-forvis-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <PaperAirplaneIcon className="w-5 h-5" />
            <span className="font-semibold">Send</span>
          </button>
        </div>
      </div>
    </div>
  );
}

