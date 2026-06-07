// First-hand proof (re-runnable receipt) of the version/restore model on the
// REAL installed Automerge 3.2.6. Run: node workers/api/_probe-versions.mjs
import * as A from "@automerge/automerge";

const ok = (label, cond) => console.log(`${cond ? "PASS" : "FAIL"}  ${label}`);

// 1) Create + edit, capturing a "version" (a set of heads) after each session.
let doc = A.from({ body: "" });
const versions = [];
const edit = (text) => {
  doc = A.change(doc, (d) => { d.body = text; });
  versions.push({ heads: A.getHeads(doc), text });
};
edit("draft one");
edit("draft one, expanded");
edit("draft one, expanded and revised");

// 2) view(doc, heads) == the exact content of that version (cheap snapshot).
const v0 = A.view(doc, versions[0].heads);
ok(`view(doc, v0.heads).body === "draft one"`, v0.body === "draft one");
ok(`current head is "...revised"`, doc.body === "draft one, expanded and revised");

// 3) RESTORE v0 to head the RIGHT way: a forward change() that writes v0's content.
const beforeRestore = A.getHeads(doc);
const histBefore = A.getHistory(doc).length;
doc = A.change(doc, "restored from v0", (d) => { d.body = v0.body; });
const afterRestore = A.getHeads(doc);
ok(`single head after restore (LINEAR, no fork)`, afterRestore.length === 1);
ok(`restored body === v0 content`, doc.body === "draft one");
const addedByRestore = A.getChangesSince(doc, beforeRestore);
ok(`restore added exactly 1 forward change`, addedByRestore.length === 1);
ok(`history grew by exactly 1 (linear chain)`, A.getHistory(doc).length === histBefore + 1);
ok(`restore change's commit message is preserved`, A.getHistory(doc).at(-1).change.message === "restored from v0");

// 4) CONTRAST: changeAt(scope=old heads) FORKS — the thing we must NOT use.
const r = A.changeAt(doc, versions[0].heads, "fork attempt", (d) => { d.body = "forked"; });
const forked = r.newDoc ?? r.doc ?? r;
const forkedHeads = A.getHeads(forked);
ok(`changeAt produced a BRANCH (>1 head) — avoid it`, forkedHeads.length > 1);

console.log(`\nheads now: restore→${afterRestore.length}, changeAt→${forkedHeads.length}  | history len ${A.getHistory(doc).length}`);
