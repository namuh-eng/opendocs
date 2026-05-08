"use client";

import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useCallback, useState } from "react";

type WidgetState = "idle" | "rated" | "submitting" | "submitted";

interface FeedbackWidgetProps {
  subdomain: string;
  pagePath: string;
}

export function FeedbackWidget({ subdomain, pagePath }: FeedbackWidgetProps) {
  const [state, setState] = useState<WidgetState>("idle");
  const [rating, setRating] = useState<"helpful" | "not_helpful" | null>(null);
  const [comment, setComment] = useState("");
  const [toast, setToast] = useState(false);

  const submitFeedback = useCallback(
    async (
      selectedRating: "helpful" | "not_helpful",
      feedbackComment?: string,
    ) => {
      setState("submitting");
      try {
        await fetch(`/api/docs/${subdomain}/feedback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            page: pagePath,
            rating: selectedRating,
            comment: feedbackComment || undefined,
          }),
        });
        setState("submitted");
        setToast(true);
        setTimeout(() => setToast(false), 3000);
      } catch {
        // Silently fail — feedback is non-critical
        setState("submitted");
        setToast(true);
        setTimeout(() => setToast(false), 3000);
      }
    },
    [subdomain, pagePath],
  );

  const handleRate = (selectedRating: "helpful" | "not_helpful") => {
    setRating(selectedRating);
    setState("rated");
  };

  const handleSubmitComment = () => {
    if (rating) {
      submitFeedback(rating, comment);
    }
  };

  const handleSkipComment = () => {
    if (rating) {
      submitFeedback(rating);
    }
  };

  if (state === "submitted") {
    return (
      <div className="docs-feedback-widget" data-testid="feedback-widget">
        <p className="docs-feedback-thanks" data-testid="feedback-thanks">
          Thanks for your feedback!
        </p>
        {toast && (
          <output className="docs-feedback-toast" data-testid="feedback-toast">
            Feedback recorded
          </output>
        )}
      </div>
    );
  }

  return (
    <div className="docs-feedback-widget" data-testid="feedback-widget">
      {state === "idle" && (
        <div className="docs-feedback-prompt">
          <span className="docs-feedback-label">Was this page helpful?</span>
          <div className="docs-feedback-buttons">
            <button
              type="button"
              onClick={() => handleRate("helpful")}
              className="docs-feedback-btn"
              data-testid="feedback-thumbs-up"
              aria-label="Yes, this page was helpful"
            >
              <ThumbsUp size={16} aria-hidden="true" />
              <span className="docs-feedback-btn-label">Yes</span>
            </button>
            <button
              type="button"
              onClick={() => handleRate("not_helpful")}
              className="docs-feedback-btn"
              data-testid="feedback-thumbs-down"
              aria-label="No, this page was not helpful"
            >
              <ThumbsDown size={16} aria-hidden="true" />
              <span className="docs-feedback-btn-label">No</span>
            </button>
          </div>
        </div>
      )}

      {(state === "rated" || state === "submitting") && (
        <div className="docs-feedback-comment-section">
          <p className="docs-feedback-comment-label">
            {rating === "helpful"
              ? "Great! Any additional feedback?"
              : "Sorry to hear that. How can we improve?"}
          </p>
          <textarea
            className="docs-feedback-textarea"
            data-testid="feedback-textarea"
            placeholder="Tell us more (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={2000}
            rows={3}
            disabled={state === "submitting"}
          />
          <div className="docs-feedback-actions">
            <button
              type="button"
              onClick={handleSubmitComment}
              className="docs-feedback-submit"
              data-testid="feedback-submit"
              disabled={state === "submitting"}
            >
              {state === "submitting" ? "Sending..." : "Submit"}
            </button>
            <button
              type="button"
              onClick={handleSkipComment}
              className="docs-feedback-skip"
              data-testid="feedback-skip"
              disabled={state === "submitting"}
            >
              Skip
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
