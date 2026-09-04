import { useEffect, useRef, useState } from "react";
import { Bot, Camera, RotateCcw, Send, User } from "lucide-react";

import {
  KEYWORD_ROUTES,
  QUESTIONS,
  RESULTS,
  START_ID,
} from "../data/questionnaireTree";

const STOPWORDS = new Set([
  "a", "an", "the", "or", "and", "with", "only", "when", "just",
  "is", "it", "do", "does", "my", "of", "on", "in", "to", "at",
]);

function significantWords(label) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((word) => word && !STOPWORDS.has(word));
}

// Tries to match free-typed text against the current question's own
// options (plain word-overlap scoring — no NLP/LLM involved).
function matchOption(text, options) {
  const normalized = text.toLowerCase();

  // Common shortcut: a plain yes/no question answered with "yes"/"no".
  if (options.length === 2) {
    const labels = options.map((option) => option.label.toLowerCase());
    if (labels.includes("yes") && labels.includes("no")) {
      const saysYes = /\byes\b|\byeah\b|\byep\b/.test(normalized);
      const saysNo = /\bno\b|\bnope\b|\bnot\b/.test(normalized);
      if (saysYes && !saysNo) {
        return options.find((option) => option.label.toLowerCase() === "yes");
      }
      if (saysNo && !saysYes) {
        return options.find((option) => option.label.toLowerCase() === "no");
      }
    }
  }

  let best = null;
  let bestScore = 0;
  for (const option of options) {
    const words = significantWords(option.label);
    const score = words.reduce(
      (count, word) => (normalized.includes(word) ? count + 1 : count),
      0
    );
    if (score > bestScore) {
      bestScore = score;
      best = option;
    }
  }
  return bestScore > 0 ? best : null;
}

function matchKeywordRoute(text) {
  const normalized = text.toLowerCase();
  return (
    KEYWORD_ROUTES.find((route) =>
      route.keywords.some((keyword) => normalized.includes(keyword))
    ) || null
  );
}

let messageCounter = 0;
function nextMessageId() {
  messageCounter += 1;
  return messageCounter;
}

export default function ChatQuestionnaire({ onGoToScan }) {
  const [messages, setMessages] = useState(() => [
    {
      id: nextMessageId(),
      role: "bot",
      text: "Hi! Tell me what's bothering you, or pick an option below.",
    },
    {
      id: nextMessageId(),
      role: "bot",
      text: QUESTIONS[START_ID].prompt,
    },
  ]);
  const [currentId, setCurrentId] = useState(START_ID);
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const currentQuestion = QUESTIONS[currentId];
  const currentResult = RESULTS[currentId];

  function addBotMessage(text) {
    setMessages((previous) => [
      ...previous,
      { id: nextMessageId(), role: "bot", text },
    ]);
  }

  function addUserMessage(text) {
    setMessages((previous) => [
      ...previous,
      { id: nextMessageId(), role: "user", text },
    ]);
  }

  function advanceTo(nextId) {
    setCurrentId(nextId);
    const question = QUESTIONS[nextId];
    const result = RESULTS[nextId];
    if (question) {
      addBotMessage(question.prompt);
    } else if (result) {
      setMessages((previous) => [
        ...previous,
        { id: nextMessageId(), role: "bot", isResult: true, result },
      ]);
    }
  }

  function chooseOption(option) {
    addUserMessage(option.label);
    advanceTo(option.next);
  }

  function startOver() {
    setCurrentId(START_ID);
    setMessages([
      {
        id: nextMessageId(),
        role: "bot",
        text: "Let's start again — what's bothering you?",
      },
      {
        id: nextMessageId(),
        role: "bot",
        text: QUESTIONS[START_ID].prompt,
      },
    ]);
  }

  function handleSend() {
    const text = inputValue.trim();
    if (!text) return;

    addUserMessage(text);
    setInputValue("");

    if (currentQuestion) {
      const matched = matchOption(text, currentQuestion.options);
      if (matched) {
        advanceTo(matched.next);
        return;
      }
    }

    if (currentId === START_ID) {
      const route = matchKeywordRoute(text);
      if (route) {
        addBotMessage(route.reply);
        advanceTo(route.next);
        return;
      }
    }

    addBotMessage(
      "I didn't quite catch that — you can pick one of the options below, or try describing it a bit differently."
    );
  }

  function handleInputKeyDown(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSend();
    }
  }

  return (
    <section className="chat-shell">
      <div className="chat-header">
        <div>
          <span className="step-label">RULE-BASED SCREENING</span>
          <h3>Symptom checker</h3>
        </div>

        <button type="button" className="chat-restart" onClick={startOver}>
          <RotateCcw size={14} />
          Restart
        </button>
      </div>

      <div className="chat-messages" ref={scrollRef}>
        {messages.map((message) => {
          if (message.role === "bot" && message.isResult) {
            const result = message.result;
            return (
              <div className="chat-row bot" key={message.id}>
                <div className="chat-avatar bot">
                  <Bot size={16} />
                </div>

                <div className="chat-bubble bot chat-result-bubble">
                  <div
                    className={`result-urgency result-urgency-${result.urgency}`}
                  >
                    {result.urgency === "high"
                      ? "See a dentist soon"
                      : result.urgency === "moderate"
                      ? "Worth checking further"
                      : "Likely minor"}
                  </div>

                  <strong className="chat-result-title">
                    {result.title}
                  </strong>
                  <p>{result.description}</p>

                  <div className="result-recommendation">
                    {result.recommendation}
                  </div>

                  <p className="questionnaire-disclaimer">
                    This checklist is a general guide, not a diagnosis. When
                    in doubt, a dentist visit is always the safest next step.
                  </p>
                </div>
              </div>
            );
          }

          return (
            <div className={`chat-row ${message.role}`} key={message.id}>
              {message.role === "bot" && (
                <div className="chat-avatar bot">
                  <Bot size={16} />
                </div>
              )}

              <div className={`chat-bubble ${message.role}`}>
                {message.text}
              </div>

              {message.role === "user" && (
                <div className="chat-avatar user">
                  <User size={16} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {currentQuestion && (
        <div className="chat-quickreplies">
          {currentQuestion.options.map((option) => (
            <button
              key={option.label}
              type="button"
              className="chat-chip"
              onClick={() => chooseOption(option)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {currentResult && (
        <div className="chat-quickreplies">
          {currentResult.suggestScan && (
            <button
              type="button"
              className="chat-chip chat-chip-primary"
              onClick={onGoToScan}
            >
              <Camera size={14} />
              Run AI photo screening
            </button>
          )}

          <button type="button" className="chat-chip" onClick={startOver}>
            <RotateCcw size={14} />
            Start over
          </button>
        </div>
      )}

      <div className="chat-inputbar">
        <input
          type="text"
          value={inputValue}
          placeholder="Type what you're noticing..."
          onChange={(event) => setInputValue(event.target.value)}
          onKeyDown={handleInputKeyDown}
        />

        <button
          type="button"
          className="chat-send-btn"
          onClick={handleSend}
          aria-label="Send"
        >
          <Send size={16} />
        </button>
      </div>
    </section>
  );
}