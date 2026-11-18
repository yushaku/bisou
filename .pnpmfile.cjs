// typescript-eslint needs the JS compiler API, which TypeScript 7 (native Go) does not ship.
// Pin its own copy of TypeScript 6 and drop the typescript peer so it never resolves to the root TS 7.
// `tsc` and the root `typescript` dependency stay on 7.
function readPackage(pkg) {
  if (pkg.name === "typescript-eslint" || pkg.name.startsWith("@typescript-eslint/")) {
    if (pkg.peerDependencies?.typescript) {
      delete pkg.peerDependencies.typescript;
      pkg.dependencies = { ...pkg.dependencies, typescript: "npm:typescript@~6.0.0" };
    }
  }
  return pkg;
}

module.exports = { hooks: { readPackage } };
