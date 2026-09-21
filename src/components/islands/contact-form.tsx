import { useState } from "react";
import { Send, Check } from "lucide-react";
import { ApiError, api, errorMessage } from "@/app/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

/** The contact form, posting JSON to `POST /api/contact`. */
export function ContactForm() {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      await api.contact.send({
        name: String(fd.get("name") ?? ""),
        email: String(fd.get("email") ?? ""),
        message: String(fd.get("message") ?? ""),
      });
      setSent(true);
    } catch (cause) {
      setError(cause instanceof ApiError ? errorMessage(cause) : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <Check className="w-12 h-12 text-success mx-auto mb-4" />
        <h2>Message Sent</h2>
        <p className="text-muted-foreground mt-2">Thanks for reaching out. We&apos;ll get back to you soon.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <h1>Contact</h1>
      <p className="text-muted-foreground mt-2 mb-8">Have a question or feedback? Drop us a message.</p>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-200 text-sm border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required className="mt-1" />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required className="mt-1" />
        </div>
        <div>
          <Label htmlFor="message">Message</Label>
          <Textarea id="message" name="message" rows={5} required className="mt-1" />
        </div>
        <Button type="submit" disabled={pending}>
          <Send className="w-4 h-4 mr-2" />
          {pending ? "Sending..." : "Send Message"}
        </Button>
      </form>
    </div>
  );
}
