"use client";
import { useState, useEffect, useRef } from "react";
import { useChat } from "ai/react";
import { Message } from "ai";
import { useSession } from "next-auth/react";
import ReactMarkdown from "react-markdown";
import { useOrganization } from "@/contexts/OrganizationContext";

// Type declarations for Speech Recognition API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

declare var SpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};

export default function ChatPage() {
  const { data: session } = useSession();
  const { selectedOrganization, isLoading: orgLoading } = useOrganization();
  
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/chat",
    body: { organizationId: selectedOrganization?.id },
    onError: (error) => {
      console.error('🚨 Chat error:', error);
    },
    onFinish: (message) => {
      console.log('✅ Chat finished:', message);
    },
  });
  
  // Voice recognition states
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  
  // Chat container ref for auto-scroll
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  
  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        setVoiceSupported(true);
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'id-ID'; // Indonesian language
        
        recognition.onstart = () => {
          setIsListening(true);
        };
        
        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          // Create a synthetic event to update input
          const syntheticEvent = {
            target: { value: transcript }
          } as React.ChangeEvent<HTMLInputElement>;
          handleInputChange(syntheticEvent);
        };
        
        recognition.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };
        
        recognition.onend = () => {
          setIsListening(false);
        };
        
        recognitionRef.current = recognition;
      }
    }
  }, [handleInputChange]);
  
  // Voice input functions
  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      recognitionRef.current.start();
    }
  };
  
  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };
  
  // Custom submit handler to ensure organizationId is present
  const customHandleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedOrganization?.id) {
      alert('Silakan pilih organisasi terlebih dahulu!');
      return;
    }
    console.log('📤 Submitting chat with:', { input, organizationId: selectedOrganization.id });
    handleSubmit(e);
  };
  
  // Log organizationId changes
  useEffect(() => {
    console.log('🔄 organizationId changed:', selectedOrganization?.id);
  }, [selectedOrganization?.id]);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  console.log("messages", messages);
  
  if (!session?.user) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Kas Chatbot</h1>
        <p className="text-gray-600">Silakan login terlebih dahulu untuk menggunakan chatbot.</p>
      </div>
    );
  }

  if (orgLoading) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Kas Chatbot</h1>
        <p className="text-gray-600">Memuat organisasi...</p>
      </div>
    );
  }

  if (!selectedOrganization) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Kas Chatbot</h1>
        <p className="text-gray-600">Silakan pilih organisasi dari navbar untuk menggunakan chatbot.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Kas Chatbot</h1>
      <div className="mb-3">
        <p className="text-sm text-gray-600">
          Chatbot untuk organisasi: <span className="font-medium">{selectedOrganization.name}</span>
        </p>
      </div>
      <div className="border rounded p-4 space-y-4 bg-white">
        <div ref={chatContainerRef} className="h-80 overflow-y-auto space-y-3">
          {messages
            .filter((message) => message.content && message.content.trim() !== '')
            .map((message, index) => (
            <div key={message.id || index} className={message.role === "user" ? "text-right" : "text-left"}>
              <div className={`inline-block px-3 py-2 rounded max-w-xs md:max-w-md lg:max-w-lg xl:max-w-xl ${
                message.role === "user" 
                  ? "bg-black text-white" 
                  : "bg-white text-black border border-gray-200"
              }`}>
                <div className={`prose prose-sm max-w-none ${
                  message.role === "user" ? "prose-invert" : ""
                }`}>
                  <ReactMarkdown 
                    components={{
                      p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                      ul: ({children}) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                      ol: ({children}) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                      li: ({children}) => <li className="">{children}</li>,
                      strong: ({children}) => <strong className="font-semibold">{children}</strong>,
                      em: ({children}) => <em className="italic">{children}</em>,
                      code: ({children}) => <code className={`px-1 py-0.5 rounded text-sm font-mono ${
                        message.role === "user" ? "bg-gray-700 text-gray-200" : "bg-gray-200 text-gray-800"
                      }`}>{children}</code>,
                      pre: ({children}) => <pre className={`p-2 rounded text-sm font-mono overflow-x-auto ${
                        message.role === "user" ? "bg-gray-700 text-gray-200" : "bg-gray-200 text-gray-800"
                      }`}>{children}</pre>,
                      h1: ({children}) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                      h2: ({children}) => <h2 className="text-base font-bold mb-2">{children}</h2>,
                      h3: ({children}) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
        </div>
        <form onSubmit={customHandleSubmit} className="flex gap-2">
          <div className="flex-1 relative">
            <input 
              className="w-full border rounded px-3 py-2 pr-12" 
              placeholder="Tanya: siapa saja yang masih menunggak uang kas?" 
              value={input} 
              onChange={handleInputChange} 
            />
            {voiceSupported && (
              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-1 rounded-full transition-colors ${
                  isListening 
                    ? 'bg-red-500 text-white animate-pulse' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-600'
                }`}
                title={isListening ? 'Klik untuk berhenti merekam' : 'Klik untuk mulai merekam suara'}
              >
                {isListening ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            )}
          </div>
          <button disabled={isLoading} className="px-4 py-2 rounded bg-black text-white disabled:opacity-50">
            {isLoading ? 'Mengirim...' : 'Kirim'}
          </button>
        </form>
      </div>
    </div>
  );
}
