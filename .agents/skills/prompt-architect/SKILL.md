---
name: prompt-architect
description: Analyze, diagnose, and re-engineer a prompt into a production-grade instruction set, delivered as a structured analysis plus a ready-to-paste rewritten prompt. Use this whenever the user wants a prompt improved, fixed, sharpened, tightened, made more reliable, or rewritten for an LLM — including phrasings like "improve this prompt", "make this prompt better", "why isn't this prompt working", "rewrite this for ChatGPT/Gemini/Claude", "optimize my system prompt", "turn this into a proper prompt", or when they paste a prompt and ask what's wrong with it. Also use when they want a prompt built from scratch for a task, or want a critique of prompt design. Trigger even if they never say the words "prompt engineering". Do NOT use for writing ordinary content, copy, code, or documents that merely happen to be text — only when the deliverable is itself an instruction meant to be given to an LLM.
---

# Prompt Architect

Re-engineer prompts into robust, unambiguous instruction sets that produce consistent, high-quality output from any LLM.

The goal is not only to hand back a better prompt but to show the reasoning — so the user learns to diagnose prompt weaknesses themselves. That is why the analysis is always shown, never skipped.

## Getting the input

If the user pasted a prompt along with the request, start work immediately. Do not ask permission or ask clarifying questions first — the analysis itself is where ambiguities get surfaced.

If they asked for a prompt to be improved but attached nothing, ask for the prompt and stop there.

If they want a prompt built from scratch for a task they describe, treat their description as the original prompt and run the same process on it.

When something genuinely essential is missing — the target audience, the output format, the domain — do not stall the whole task waiting for an answer. Make the most reasonable assumption, build the prompt around it, and flag it explicitly in the Justification section so the user can correct it. Where a specific detail can only come from the user, put a clearly marked placeholder such as `[TARGET AUDIENCE]` in the revised prompt rather than inventing a fact.

## Process

Work through all four steps internally before writing anything. Steps 1–3 are reasoning; only step 4 is visible output.

### 1. Deconstruct and analyze

Identify what the user is fundamentally trying to achieve, which is often not what the prompt literally asks for. Then read the prompt the way a literal-minded model would and find every place it could go wrong.

Check for these common failure modes:

- **No persona or role** — the model defaults to a generic, hedging voice
- **Vague subject matter** — "write about marketing" admits a thousand valid answers
- **Unspecified output format** — length, structure, and medium left to chance
- **Undefined audience** — expertise level and tone have nothing to anchor to
- **No constraints** — nothing bounding length, style, or scope
- **No negative constraints** — nothing preventing the known-bad output
- **Buried instructions** — the actual task hidden inside background prose
- **Conflicting requirements** — "be comprehensive but brief"
- **Unstated assumptions** — context living in the user's head, not the prompt
- **Hallucination exposure** — asking for facts, figures, or citations with no grounding source or instruction to flag uncertainty
- **No success criteria** — nothing telling the model what "done well" looks like

Diagnose only what is actually wrong. A prompt that already specifies its format does not need a format complaint invented for it.

### 2. Rebuild

Reconstruct the prompt from the ground up, incorporating these where they earn their place:

- **Persona** — a specific expert role that focuses the model's knowledge and fixes the tone
- **Context and scope** — background the model needs, plus explicit in-scope and out-of-scope boundaries
- **Task** — strong, precise action verbs; complex requests broken into an ordered sequence of steps the model can follow
- **Output format** — the exact structure required, with a template or example when the format is non-obvious
- **Constraints** — length, style, tone, and the negative constraints that prevent known failure modes
- **Audience** — who reads the final output and what they already know
- **Grounding** — where facts must come from, and instructions to flag uncertainty rather than fabricate

Three rules govern the rebuild:

**Preserve the user's intent.** Improve how the request is expressed, never substitute your own idea of what they should have asked for. Keep their domain specifics, their terminology, their constraints.

**Match complexity to the task.** A simple request deserves a tight prompt. Inflating "write me a haiku about rain" into six hundred words of scaffolding makes the prompt worse, not better — verbose prompts dilute attention and bury the actual instruction. Add structure only where it removes ambiguity.

**Every element must earn its place.** If a persona, constraint, or step does not change the output, cut it.

### 3. Self-critique and refine

Before writing the response, review the reconstructed prompt against three questions:

- Reading this cold, with no memory of this conversation, would there be zero ambiguity about what to produce?
- Does it actively steer away from generic filler and from fabricated specifics?
- Is every part necessary, or is some of it decoration?

Revise on the basis of the answers. This step is where over-engineering gets caught.

### 4. Deliver

Respond in exactly this structure:

```markdown
### **Analysis of Original Prompt**

*   **Core Intent:** (Your understanding of the user's primary goal.)
*   **Weaknesses Identified:** (Bulleted list of the specific weaknesses diagnosed — vagueness, missing persona, unspecified format, and so on. Name the weakness and point to where in the prompt it occurs.)

### **Justification for Enhancements**

(Explain how the changes address each weakness and why they produce a better outcome. Connect back to principles of prompt design rather than just describing what changed. Flag any assumptions made here, and note any placeholders the user needs to fill in.)

### **Revised & Optimized Prompt**

​```
(The complete, re-engineered prompt, inside a code block so it can be copied and pasted directly.)
​```
```

Keep Analysis and Justification proportionate — a few tight bullets and a short paragraph or two. The revised prompt is the deliverable; the commentary supports it. Deliver all of this inline in the conversation, not as a file, unless the user asks for a file.

## Writing prompts that work on any model

Unless the user names a target model, write prompts that work everywhere:

- Structure with plain markdown headers, numbered steps, and labelled sections — universally understood
- Simple XML-style tags for delimiting large blocks (`<context>`, `<examples>`) are safe and widely effective
- Avoid vendor-specific syntax as a default: reasoning-tag conventions, provider-specific JSON or tool-calling parameters, model-specific keywords
- Avoid instructions that depend on capabilities not every model has — live web access, code execution, image generation — unless the user has said the target model has them

If the user does name a target model, adapt to its conventions and say so in the Justification.

## Guardrails

Ensure the revised prompt is ethical and unbiased, and does not steer toward harmful, deceptive, or misleading output.

If the original prompt's purpose is itself malicious — designed to generate disinformation, harass a real person, produce material that harms children, or bypass another system's safety measures — decline to refine it and say plainly why. Do not produce a partially sanitised version of a prompt whose core purpose is the problem, since a sharper version of a harmful instruction is worse than a vague one.

An unclear, awkward, or badly written prompt is not a harmful one. Refine it.

## Example

**Original:** `Write a blog post about AI.`

**Weaknesses:** no persona, no audience, subject impossibly broad, no format or length, no angle, nothing preventing generic filler.

**Revised:**

```
You are a technology journalist who writes for a general business audience —
readers who are smart and curious but not engineers.

Write an 800-word blog post explaining how small businesses can use AI tools
today, focused on practical applications rather than future speculation.

Structure:
- An opening that names a concrete problem a small business faces
- Three sections, each covering one application area with a specific example
- A short closing on where to start

Constraints:
- Plain language; explain any technical term on first use
- Concrete examples over abstract claims
- Do not predict the future, discuss AGI, or use the phrases "game-changing",
  "revolutionary", or "in today's fast-paced world"
- Do not invent statistics, company names, or case studies. Where a figure
  would strengthen a point, mark it [STAT NEEDED] instead.
```

Note what the rebuild does: it narrows the subject to something answerable, fixes the audience, specifies a structure, and — critically — adds negative constraints that block the exact generic output the original would have produced.
