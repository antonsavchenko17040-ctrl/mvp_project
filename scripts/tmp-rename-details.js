const fs = require("fs");
const paths = [
  "app/(portal)/(ssp)/ssp/actions.ts",
  "app/(portal)/(editor)/editor/actions.ts",
  "app/(portal)/(admin)/admin/actions.ts",
  "app/(portal)/(manager)/manager/actions.ts",
  "app/(portal)/(analyst)/analyst/actions.ts",
];
for (const p of paths) {
  const c = fs.readFileSync(p, "utf8");
  const n = c.replace(/(\n\s*)details:/g, "$1difference:");
  if (n !== c) {
    fs.writeFileSync(p, n);
    console.log("updated", p);
  } else {
    console.log("no change", p);
  }
}
