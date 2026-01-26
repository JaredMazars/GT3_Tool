'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Send,
  Sparkles,
  FileText,
  RefreshCw,
  Search,
  Scale,
  BookOpen,
  Globe,
  ChevronDown,
  ChevronUp,
  Plus,
} from 'lucide-react';
import { OpinionChatMessage } from '@/types';

interface ChatInterfaceProps {
  taskId: number;
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

interface ResearchResult {
  title: string;
  content: string;
  source: string;
  url?: string;
  relevance?: number;
}

export default function ChatInterface({ taskId, draftId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<OpinionChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Research tools state
  const [showResearch, setShowResearch] = useState(true);
  const [researchQuery, setResearchQuery] = useState('');
  const [researchType, setResearchType] = useState<'legal' | 'tax' | 'web' | null>(null);
  const [researchResults, setResearchResults] = useState<ResearchResult[]>([]);
  const [isResearching, setIsResearching] = useState(false);
  const [expandedResult, setExpandedResult] = useState<number | null>(null);

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
        `/api/tasks/${taskId}/opinion-drafts/${draftId}/chat`
      );
      if (!response.ok) throw new Error('Failed to fetch messages');
      const data = await response.json();
      setMessages(data.data || []);
    } catch (error) {
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
        `/api/tasks/${taskId}/opinion-drafts/${draftId}/chat`,
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

  const performResearch = async (type: 'legal' | 'tax' | 'web', query: string) => {
    if (!query.trim()) return;
    
    setIsResearching(true);
    setResearchType(type);
    setResearchResults([]);
    setError(null);
    
    try {
      const endpoint = 
        type === 'legal' ? '/api/search/legal-precedents' :
        type === 'tax' ? '/api/search/tax-law' :
        '/api/search/web';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query,
          taskId 
        }),
      });
      
      if (!response.ok) throw new Error('Research failed');
      
      const data = await response.json();
      setResearchResults(data.data?.results || data.data || []);
    } catch (error) {
      setError(`Failed to perform ${type} research. Please try again.`);
    } finally {
      setIsResearching(false);
    }
  };

  const addResultToChat = (result: ResearchResult) => {
    const researchContext = `Research finding from ${researchType === 'legal' ? 'Legal Precedents' : researchType === 'tax' ? 'Tax Law' : 'Web Search'}:\n\n${result.title}\n\n${result.content}\n\nSource: ${result.source}`;
    sendMessage(`Please analyze this research finding: ${researchContext}`);
  };

  return (
    <div className="flex h-full">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">AI Tax Assistant</h3>
              <p className="text-sm text-gray-600">
                Ask questions about documents or discuss your tax case
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchMessages}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={() => setShowResearch(!showResearch)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title={showResearch ? 'Hide Research' : 'Show Research'}
              >
                <Search className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-gray-50">
        {messages.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <Sparkles className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              Welcome to the Tax Opinion Assistant
            </h4>
            <p className="text-sm text-gray-600 max-w-md mx-auto mb-4">
              I can help you in two ways:
            </p>
            <div className="max-w-md mx-auto text-left space-y-2 mb-6">
              <div className="flex items-start gap-3 text-sm text-gray-600">
                <FileText className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Search Documents:</strong> Ask questions about uploaded documents like "What does the assessment say about penalties?"
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm text-gray-600">
                <Sparkles className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
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
                    <Sparkles className="w-5 h-5 text-white" />
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
                        {sources.map((source: { fileName: string; category: string }, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 text-xs text-gray-600"
                          >
                            <FileText className="w-4 h-4" />
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
                <Sparkles className="w-5 h-5 text-white" />
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
              <Send className="w-5 h-5" />
              <span>Send</span>
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>

      {/* Research Panel */}
      {showResearch && (
        <div className="w-96 border-l border-gray-200 bg-white flex flex-col">
          {/* Research Header */}
          <div className="px-4 py-4 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Research Tools</h3>
            
            {/* Research Type Buttons */}
            <div className="space-y-2">
              <button
                onClick={() => {
                  setResearchType('legal');
                  setResearchResults([]);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  researchType === 'legal'
                    ? 'bg-blue-50 text-blue-700 border-2 border-blue-200'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <Scale className="w-5 h-5" />
                <span>Legal Precedents</span>
              </button>
              <button
                onClick={() => {
                  setResearchType('tax');
                  setResearchResults([]);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  researchType === 'tax'
                    ? 'bg-blue-50 text-blue-700 border-2 border-blue-200'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <BookOpen className="w-5 h-5" />
                <span>Tax Law</span>
              </button>
              <button
                onClick={() => {
                  setResearchType('web');
                  setResearchResults([]);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  researchType === 'web'
                    ? 'bg-blue-50 text-blue-700 border-2 border-blue-200'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <Globe className="w-5 h-5" />
                <span>Web Search</span>
              </button>
            </div>

            {/* Search Input */}
            {researchType && (
              <div className="mt-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={researchQuery}
                    onChange={(e) => setResearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && researchType) {
                        performResearch(researchType, researchQuery);
                      }
                    }}
                    placeholder={`Search ${researchType === 'legal' ? 'legal cases' : researchType === 'tax' ? 'tax law' : 'web'}...`}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => researchType && performResearch(researchType, researchQuery)}
                    disabled={isResearching || !researchQuery.trim()}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    <Search className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Research Results */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {isResearching && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}

            {!isResearching && researchResults.length === 0 && researchType && (
              <div className="text-center py-8">
                <Search className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">
                  {researchQuery ? 'No results found' : 'Enter a search query above'}
                </p>
              </div>
            )}

            {!isResearching && researchResults.length > 0 && (
              <div className="space-y-3">
                {researchResults.map((result, idx) => (
                  <div
                    key={idx}
                    className="border border-gray-200 rounded-lg overflow-hidden hover:border-blue-300 transition-colors"
                  >
                    <button
                      onClick={() => setExpandedResult(expandedResult === idx ? null : idx)}
                      className="w-full px-3 py-2 text-left bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-gray-900 line-clamp-2">
                            {result.title}
                          </h4>
                          <p className="text-xs text-gray-600 mt-1">{result.source}</p>
                        </div>
                        {expandedResult === idx ? (
                          <ChevronUp className="w-4 h-4 text-gray-500 flex-shrink-0 mt-1" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0 mt-1" />
                        )}
                      </div>
                    </button>
                    
                    {expandedResult === idx && (
                      <div className="px-3 py-3 bg-white border-t border-gray-200">
                        <p className="text-xs text-gray-700 mb-3 line-clamp-4">
                          {result.content}
                        </p>
                        {result.url && (
                          <a
                            href={result.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-700 mb-3 block"
                          >
                            View Source →
                          </a>
                        )}
                        <button
                          onClick={() => addResultToChat(result)}
                          className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          Add to Chat
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}



