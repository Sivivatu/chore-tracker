import { ParentApprovalPanel } from "@/components/parent/ParentApprovalPanel";

export function ParentApprovalsPage() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <p className="text-sm font-black uppercase text-teal">Approval workflow</p>
        <h1 className="text-4xl font-black">Submitted routines</h1>
        <p className="mt-2 text-ink/65">Only approved routines add points to the child balance.</p>
      </div>
      <ParentApprovalPanel />
    </section>
  );
}
