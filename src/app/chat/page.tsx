"use client";
import { useState, useEffect } from "react";
import { useChat } from "ai/react";
import { Message } from "ai";
import { useSession } from "next-auth/react";
import ReactMarkdown from "react-markdown";
import { useOrganization } from "@/contexts/OrganizationContext";

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
        <div className="h-80 overflow-y-auto space-y-3">
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
          <input className="flex-1 border rounded px-3 py-2" placeholder="Tanya: siapa saja yang masih menunggak uang kas?" value={input} onChange={handleInputChange} />
          <button disabled={isLoading} className="px-4 py-2 rounded bg-black text-white">Kirim</button>
        </form>
      </div>
    </div>
  );
}
