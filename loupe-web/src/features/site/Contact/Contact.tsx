import { useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, LifeBuoy, Mail, Send } from "lucide-react";
import { Button, TextField } from "@/components";
import { SitePage, SiteSection } from "../SitePage/SitePage";
import { SUPPORT_EMAIL } from "@/lib/site";
import styles from "./Contact.module.scss";

const CHANNELS = [
  { icon: LifeBuoy, title: "Help center", body: "Browse answers to common questions.", to: "/help" },
  { icon: Mail, title: "Email us", body: SUPPORT_EMAIL, href: `mailto:${SUPPORT_EMAIL}` },
  { icon: BookOpen, title: "Developer API", body: "Build on the Loupe backend.", to: "/help" },
];

/** Contact — support channels plus a form that opens a pre-filled email. */
export function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const canSend = name.trim() !== "" && email.trim() !== "" && message.trim() !== "";

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend) return;
    const subject = encodeURIComponent(`Support request from ${name}`);
    const body = encodeURIComponent(`${message}\n\n— ${name} (${email})`);
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
  };

  return (
    <SitePage
      eyebrow="Contact"
      title="Talk to us"
      lead="Questions, feedback, or a bug to report? Pick a channel below, or send us a note directly."
    >
      <SiteSection title="Ways to reach us">
        <div className={styles.channels}>
          {CHANNELS.map(({ icon: Icon, title, body, to, href }) => {
            const inner = (
              <>
                <span className={styles.channel__icon}>
                  <Icon size={18} />
                </span>
                <span className={styles.channel__title}>{title}</span>
                <span className={styles.channel__body}>{body}</span>
              </>
            );
            return to ? (
              <Link key={title} to={to} className={styles.channel}>
                {inner}
              </Link>
            ) : (
              <a key={title} href={href} className={styles.channel}>
                {inner}
              </a>
            );
          })}
        </div>
      </SiteSection>

      <SiteSection title="Send a message">
        <form className={styles.form} onSubmit={send}>
          <div className={styles.form__row}>
            <TextField label="Your name" value={name} onChange={(e) => setName(e.target.value)} required />
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className={styles.form__field}>
            <label className={styles.form__label} htmlFor="contact-message">
              Message
            </label>
            <textarea
              id="contact-message"
              className={styles.form__textarea}
              rows={5}
              placeholder="How can we help?"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
          </div>
          <div className={styles.form__actions}>
            <Button type="submit" disabled={!canSend} leadingIcon={<Send size={16} />}>
              Send message
            </Button>
          </div>
        </form>
      </SiteSection>
    </SitePage>
  );
}
