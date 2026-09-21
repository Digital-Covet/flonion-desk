import { Button } from "@base-ui/react/button";
import { Dialog } from "@base-ui/react/dialog";
import { useEffect, useId, useState } from "react";
import { useFetcher } from "react-router";
import type { FeedbackThread } from "../../prisma/support";
import { StatusBadge } from "../shell/StatusBadge";
import { useFetcherToast } from "../ui/useFetcherToast";

const REPLY_MAX = 5000;

/**
 * Reply to a support thread by email.
 *
 * The thread is fetched when the dialog opens, from `support/:id/thread`, so
 * the operator sees the original message and every earlier reply before
 * writing. A reply that failed to send is kept in the thread with a Retry.
 */
export function ReplyDialog({
  feedbackId,
  name,
  email,
}: {
  feedbackId: string;
  name: string;
  email: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [resolve, setResolve] = useState(false);

  const thread = useFetcher<{
    thread: FeedbackThread | null;
    error: string | null;
  }>();
  const send = useFetcher();
  const retry = useFetcher();

  useFetcherToast(send, {
    successTitle: "Reply sent",
    successDescription: `Emailed to ${email}`,
    errorTitle: "Reply not delivered",
  });
  useFetcherToast(retry, {
    successTitle: "Reply sent",
    errorTitle: "Retry failed",
  });

  const load = thread.load;
  useEffect(() => {
    if (open) load(`/support/${feedbackId}/thread`);
  }, [open, feedbackId, load]);

  // After a send settles, refresh the thread. A reply the server stored is
  // cleared from the box even when delivery failed: it now sits in the thread
  // with a Retry, and sending the draft again would store it twice.
  const sendData = send.data as { ok?: boolean; replyId?: string } | undefined;
  useEffect(() => {
    if (send.state !== "idle" || !sendData) return;
    if (sendData.ok || sendData.replyId) {
      setText("");
      setResolve(false);
    }
    if (open) load(`/support/${feedbackId}/thread`);
  }, [send.state, sendData, open, feedbackId, load]);

  useEffect(() => {
    if (retry.state === "idle" && retry.data && open) {
      load(`/support/${feedbackId}/thread`);
    }
  }, [retry.state, retry.data, open, feedbackId, load]);

  const sending = send.state !== "idle";
  const canSend = text.trim() !== "" && !sending;
  const t = thread.data?.thread;

  return (
    <Dialog.Root open={open} onOpenChange={(next) => setOpen(next)}>
      <Dialog.Trigger
        render={
          <Button className="rounded-md bg-teal-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-teal-700 transition-colors" />
        }
      >
        Reply
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/30 z-50" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 flex max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] max-w-2xl flex-col rounded-xl bg-white shadow-xl">
          <div className="border-b border-gray-100 px-6 py-4">
            <Dialog.Title className="text-lg font-semibold text-gray-900">
              Reply to {name}
            </Dialog.Title>
            <Dialog.Description className="text-sm text-gray-500">
              Sent by email to {email} from Flonion Support.
            </Dialog.Description>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            {thread.state !== "idle" && !t ? (
              <p className="text-sm text-gray-500">Loading thread…</p>
            ) : thread.data?.error ? (
              <p className="text-sm text-red-600">{thread.data.error}</p>
            ) : t ? (
              <>
                <article className="rounded-lg bg-gray-50 p-3">
                  <header className="mb-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <span className="font-medium text-gray-700">{t.name}</span>
                    <span>{t.created}</span>
                    <span>
                      {t.category} · {t.rating}/5
                    </span>
                  </header>
                  <p className="whitespace-pre-wrap text-sm text-gray-800">
                    {t.message}
                  </p>
                </article>
                {t.replies.map((r) => (
                  <article
                    key={r.id}
                    className="ml-6 rounded-lg border border-teal-100 bg-teal-50/50 p-3"
                  >
                    <header className="mb-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <span className="font-medium text-gray-700">
                        {r.operatorLabel}
                      </span>
                      <span>{r.created}</span>
                      {r.deliveryStatus === "sent" ? (
                        <StatusBadge tone="good">Sent</StatusBadge>
                      ) : (
                        <StatusBadge tone="bad" title={r.error ?? undefined}>
                          Not delivered
                        </StatusBadge>
                      )}
                      {r.deliveryStatus !== "sent" ? (
                        <Button
                          disabled={retry.state !== "idle"}
                          onClick={() =>
                            retry.submit(
                              {
                                intent: "resend-reply",
                                feedbackId,
                                replyId: r.id,
                              },
                              {
                                method: "post",
                                encType: "application/json",
                                action: "/support",
                              },
                            )
                          }
                          className="rounded px-2 py-0.5 text-xs font-medium text-teal-700 hover:bg-teal-100 disabled:opacity-50"
                        >
                          {retry.state !== "idle" ? "Retrying…" : "Retry"}
                        </Button>
                      ) : null}
                    </header>
                    <p className="whitespace-pre-wrap text-sm text-gray-800">
                      {r.body}
                    </p>
                  </article>
                ))}
              </>
            ) : null}
          </div>

          <form
            className="border-t border-gray-100 px-6 py-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!canSend) return;
              send.submit(
                { intent: "reply", feedbackId, body: text.trim(), resolve },
                {
                  method: "post",
                  encType: "application/json",
                  action: "/support",
                },
              );
            }}
          >
            <label htmlFor={`${id}-body`} className="sr-only">
              Reply
            </label>
            <textarea
              id={`${id}-body`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={REPLY_MAX}
              rows={5}
              placeholder={`Write to ${name}…`}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={resolve}
                  onChange={(e) => setResolve(e.target.checked)}
                  className="size-4 accent-teal-600"
                />
                Mark resolved after sending
              </label>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">
                  {text.length}/{REPLY_MAX}
                </span>
                <Dialog.Close
                  render={
                    <Button className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors" />
                  }
                >
                  Close
                </Dialog.Close>
                <Button
                  type="submit"
                  disabled={!canSend}
                  className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? "Sending…" : "Send reply"}
                </Button>
              </div>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
