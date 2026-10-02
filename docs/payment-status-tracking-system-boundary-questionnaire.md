# Payment Status Tracking — Multi-System Boundary Questionnaire

**Purpose:** Clarify which system owns which payment-related data, what is duplicated today, and how Brain / CRM / daily reports / Excel / finance tools should divide responsibilities.  
**Context:** We are designing a clearer data-flow for project payment (AR/AP) status tracking. Payment tracking belongs primarily to **project delivery (Brain / PM)**, not CRM sales pipeline. Before we design AI-assisted tracking, we need colleagues to confirm current practice and target ownership.  
**Please reply by filling in the tables and answering the questions below.**  
**Owner (IT/AI):** Ben He  
**Date:** 2026-10-02  
**Version:** 0.1

---

## 1. Scope (for alignment)

In scope for this questionnaire:

- Project payment / collection status (milestones, invoiced amounts, received amounts, overdue, follow-up)
- Systems that currently store or touch this information
- Rules to avoid double entry and conflicting “sources of truth”

Out of scope for this document:

- Detailed AI model selection
- Full CRM sales pipeline design (except where it overlaps payment data)

---

## 2. Systems inventory — what exists today?

Please mark **Yes / No / Not sure**, and briefly describe what payment-related information each system holds.

| System | In use for payment tracking? (Y/N/?) | What payment-related data is stored today? | Who updates it? | How often? |
|--------|--------------------------------------|--------------------------------------------|-----------------|------------|
| **Brain (project management)** | | | | |
| **CRM (BCI-CRM / internal API)** | | | | |
| **Excel trackers** | | | | |
| **WeCom / daily reports** | | | | |
| **Finance / accounting system** (name: ________) | | | | |
| **Email / Outlook folders** | | | | |
| **Other** (name: ________) | | | | |

---

## 3. Field-level ownership — who should be the source of truth?

For each data element, mark the **primary system of record** (only one “Primary”), and note if other systems keep a copy.

Use: `Brain` / `CRM` / `Excel` / `Daily report` / `Finance system` / `N/A`

| Data element | Primary system of record (today) | Primary system of record (target) | Also copied to (if any) | Notes / conflicts |
|--------------|----------------------------------|-----------------------------------|-------------------------|-------------------|
| Project code / name | | | | |
| Contract value | | | | |
| Payment milestones / schedule | | | | |
| Invoice number / invoice date | | | | |
| Invoiced amount | | | | |
| Amount received / payment date | | | | |
| Outstanding balance | | | | |
| Payment status (e.g. pending / partial / paid / overdue) | | | | |
| Due date / overdue days | | | | |
| Follow-up owner (PM / commercial / finance) | | | | |
| Latest chase / client feedback | | | | |
| Bank / remittance reference | | | | |
| Client billing contact | | | | |

**Status definitions (please confirm or edit):**

| Status value | Meaning | Who is allowed to set it? | Evidence required? |
|--------------|---------|---------------------------|--------------------|
| Not due | | | |
| Invoiced / awaiting payment | | | |
| Partially paid | | | |
| Paid / settled | | | |
| Overdue | | | |
| On hold / disputed | | | |
| Other: ________ | | | |

---

## 4. Current process flow (as-is)

Please describe the typical path for **one milestone payment** from invoice to settlement.

Example format (edit freely):

1. ______ issues invoice → recorded in ______  
2. PM / commercial follows up via ______  
3. Payment confirmed by ______ → status updated in ______  
4. Daily report mentions ______ → someone updates ______  

**Questions:**

1. Where does payment status usually appear **first**?  
2. How long until Brain (or the main tracker) is updated?  
3. Where do items most often get **missed** today?  
4. Is Excel still the working master for any team? If yes, which team and why?

---

## 5. Target division of responsibility (to-be) — please agree or amend

Proposed working principle (for discussion):

| Domain | Proposed owner system | Role of other systems |
|--------|----------------------|------------------------|
| **Project payment status & milestones** | **Brain (PM)** | Single operational source of truth |
| **Client relationship, leads, meeting notes** | **CRM** | Does **not** own payment ledger; may show a read-only payment summary if needed |
| **Daily report / WeCom** | **Input channel** | Structured updates that write into Brain (payment fields) and/or CRM (client activity)—not a second ledger |
| **Excel** | **Export / ad-hoc only** | No longer the master tracker after go-live |
| **Finance / accounting** | **Official books** | Bank receipt / accounting confirmation; Brain status should reconcile to finance where required |
| **AI (MiniMax / internal assistants)** | **Assistant only** | Query/summarize/remind based on allowed fields; must not become a separate data store |

**Please answer:**

1. Do you agree that **Brain** is the system of record for project payment status?  
   - [ ] Agree  
   - [ ] Disagree — preferred owner: ________  
   - [ ] Need discussion  

2. Should CRM store payment amounts/status, or only a link/summary to Brain?  
   - [ ] No payment amounts in CRM (link/summary only)  
   - [ ] CRM may store a copy — reason: ________  
   - [ ] Need discussion  

3. Should daily reports be allowed to **directly update Brain payment fields** (via form/API), instead of free-text only?  
   - [ ] Yes  
   - [ ] No  
   - [ ] Need discussion  

4. After the target process is live, can Excel master sheets be retired for payment tracking?  
   - [ ] Yes  
   - [ ] No — must keep because: ________  

---

## 6. Double-writing & conflict rules

Please confirm how conflicts should be resolved.

| Scenario | Proposed rule | Agree? (Y/N) | Your rule if different |
|----------|---------------|--------------|------------------------|
| Brain status ≠ Excel | Brain wins (after go-live) | | |
| Brain status ≠ daily report wording | Structured Brain field wins; report is narrative | | |
| Brain “Paid” ≠ Finance not confirmed | Status stays “Awaiting finance confirmation” until finance confirms | | |
| Two people edit the same milestone | Last controlled edit with audit log; or finance lock after paid | | |

---

## 7. Integrations & handoffs (what we need named)

| Handoff | Exists today? (Y/N) | From → To | Manual or automatic? | Owner |
|---------|---------------------|-----------|----------------------|-------|
| Daily report → Brain payment fields | | | | |
| Daily report → CRM activity | | | | |
| Finance confirmation → Brain | | | | |
| Brain payment summary → management report | | | | |
| Brain → WeCom overdue reminder | | | | |

---

## 8. Confidentiality boundary (brief — for process design only)

Without designing the full AI stack yet, please mark which payment fields may leave the company network (e.g. to an external LLM API):

| Field | May send to external AI? (Yes / No / Masked only) |
|-------|--------------------------------------------------|
| Client legal name | |
| Project name / code | |
| Contract / invoice amounts | |
| Bank account / remittance details | |
| Overdue aging (days only) | |
| Follow-up notes / client complaints | |

---

## 9. Success criteria (please add/adjust)

We will treat the boundary design as successful if:

1. One primary system of record for payment status is agreed in writing.  
2. Daily report / CRM / Excel roles are explicit (input vs store vs export).  
3. Double-entry points are listed and either removed or given conflict rules.  
4. Finance confirmation path is named (who + which system).  

Your additional success criteria:


---

## 10. Respondents

| Name | Role | Team | Date answered |
|------|------|------|---------------|
| | | | |
| | | | |
| | | | |

**Please return this document with answers filled in** (comments in the tables are fine).  
We will use the responses to draft the data-flow diagram and the payment-tracking requirements for Brain.

---

*Internal working draft — Belt Collins / BCI IT & AI*
