import { useState } from "react";
import { FormGroup, Input, Dropdown, Button, Card } from "@codesweep-ai/ui";

interface Errors {
  first?: string;
  last?: string;
  email?: string;
  plan?: string;
}

export function FormDemo() {
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);

  function validate(): Errors {
    const e: Errors = {};
    if (!first.trim()) e.first = "Required.";
    if (!last.trim()) e.last = "Required.";
    if (!email.includes("@")) e.email = "Enter a valid email.";
    if (!plan) e.plan = "Pick a plan.";
    return e;
  }

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    setSubmitted(Object.keys(e).length === 0);
  };

  return (
    <div className="cs-preview-pages-patterns-form-demo-13 ">
      <div className="cs-preview-pages-patterns-form-demo-14 ">
        <div>
          <h2 className="cs-preview-pages-patterns-form-demo-15 ">Create account</h2>
          <p className="cs-preview-pages-patterns-form-demo-16 ">
            Canonical form: one <code className="cs-preview-pages-patterns-form-demo-17 ">FormGroup</code> per field, two-column grid for the short name pair, submit gated by validation. See <code className="cs-preview-pages-patterns-form-demo-17 ">patterns/Form.md</code>.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="cs-preview-pages-patterns-form-demo-18 ">
          <div className="cs-preview-pages-patterns-form-demo-19 ">
            <FormGroup label="First name" htmlFor="first" required error={errors.first}>
              <Input value={first} onChange={(e) => setFirst(e.target.value)} />
            </FormGroup>
            <FormGroup label="Last name" htmlFor="last" required error={errors.last}>
              <Input value={last} onChange={(e) => setLast(e.target.value)} />
            </FormGroup>
          </div>

          <FormGroup label="Email" htmlFor="email" required error={errors.email} helper={errors.email ? undefined : "We'll never share it."}>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </FormGroup>

          <FormGroup label="Plan" htmlFor="plan" required error={errors.plan}>
            <Dropdown
              id="plan"
              value={plan}
              onChange={setPlan}
              placeholder="Choose a plan"
              options={[
                { value: "free", label: "Free" },
                { value: "pro", label: "Pro — $20/mo" },
                { value: "team", label: "Team — $99/mo" },
              ]}
            />
          </FormGroup>

          <FormGroup label="Notes" htmlFor="notes" helper="Optional.">
            <Input multiline rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything we should know?" />
          </FormGroup>

          <div className="cs-preview-pages-patterns-form-demo-43 ">
            <Button type="submit">Create account</Button>
            <Button type="button" variant="secondary" onClick={() => { setFirst(""); setLast(""); setEmail(""); setPlan(""); setNotes(""); setErrors({}); setSubmitted(false); }}>
              Reset
            </Button>
          </div>
        </form>

        {submitted && (
          <Card variant="muted">
            <span className="cs-preview-pages-patterns-form-demo-53">✓</span> Submitted — all fields valid. ({first} {last}, {email}, {plan})
          </Card>
        )}
      </div>
    </div>
  );
}
