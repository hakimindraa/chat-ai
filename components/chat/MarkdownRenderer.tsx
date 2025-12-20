"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import "katex/dist/katex.min.css";

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        code({ node, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || "");
          const codeString = String(children).replace(/\n$/, "");

          if (match) {
            return (
              <div className="relative group my-2 sm:my-3 -mx-1 sm:mx-0">
                <div className="flex items-center justify-between bg-zinc-800 rounded-t-lg px-2 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs text-zinc-400">
                  <span>{match[1]}</span>
                  <button
                    onClick={() => copyToClipboard(codeString)}
                    className="flex items-center gap-1 hover:text-white transition-colors active:scale-95"
                  >
                    {copiedCode === codeString ? (
                      <>
                        <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <SyntaxHighlighter
                  // @ts-expect-error - style type mismatch with react-syntax-highlighter
                  style={oneDark}
                  language={match[1]}
                  PreTag="div"
                  customStyle={{
                    margin: 0,
                    borderTopLeftRadius: 0,
                    borderTopRightRadius: 0,
                    borderBottomLeftRadius: "0.5rem",
                    borderBottomRightRadius: "0.5rem",
                    fontSize: "0.75rem",
                  }}
                  {...props}
                >
                  {codeString}
                </SyntaxHighlighter>
              </div>
            );
          }

          return (
            <code
              className="bg-zinc-700 px-1 sm:px-1.5 py-0.5 rounded text-xs sm:text-sm text-emerald-400 break-all"
              {...props}
            >
              {children}
            </code>
          );
        },
        p({ children }) {
          return <p className="mb-2 sm:mb-3 last:mb-0 text-sm sm:text-base">{children}</p>;
        },
        ul({ children }) {
          return <ul className="list-disc list-inside mb-2 sm:mb-3 space-y-0.5 sm:space-y-1 text-sm sm:text-base">{children}</ul>;
        },
        ol({ children }) {
          return <ol className="list-decimal list-inside mb-2 sm:mb-3 space-y-0.5 sm:space-y-1 text-sm sm:text-base">{children}</ol>;
        },
        li({ children }) {
          return <li className="ml-1 sm:ml-2">{children}</li>;
        },
        h1({ children }) {
          return <h1 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3 mt-3 sm:mt-4">{children}</h1>;
        },
        h2({ children }) {
          return <h2 className="text-base sm:text-lg font-bold mb-1.5 sm:mb-2 mt-2 sm:mt-3">{children}</h2>;
        },
        h3({ children }) {
          return <h3 className="text-sm sm:text-base font-bold mb-1.5 sm:mb-2 mt-2 sm:mt-3">{children}</h3>;
        },
        blockquote({ children }) {
          return (
            <blockquote className="border-l-4 border-emerald-500 pl-3 sm:pl-4 my-2 sm:my-3 italic text-zinc-400 text-sm sm:text-base">
              {children}
            </blockquote>
          );
        },
        table({ children }) {
          return (
            <div className="overflow-x-auto my-2 sm:my-3 -mx-1 sm:mx-0">
              <table className="min-w-full border border-zinc-700 text-xs sm:text-sm">{children}</table>
            </div>
          );
        },
        th({ children }) {
          return (
            <th className="border border-zinc-700 px-2 sm:px-3 py-1.5 sm:py-2 bg-zinc-800 text-left font-semibold">
              {children}
            </th>
          );
        },
        td({ children }) {
          return <td className="border border-zinc-700 px-2 sm:px-3 py-1.5 sm:py-2">{children}</td>;
        },
        a({ href, children }) {
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:underline"
            >
              {children}
            </a>
          );
        },
        strong({ children }) {
          return <strong className="font-bold">{children}</strong>;
        },
        em({ children }) {
          return <em className="italic">{children}</em>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
