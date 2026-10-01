#!/usr/bin/env python3
"""
Catch identifiers used in a browser module but never imported or defined.

This has now bitten three times - renderStimulus, desktopAlertsOn,
setSubtypeNames - always the same way: an edit adds a call and the matching
edit to the import line silently fails to match, because the stamper had
already rewritten that line. The module then throws on the first render, and
the page shows "X is not defined" with nothing else to go on.

The check is deliberately narrow. It only looks at names that some asset
module EXPORTS, so it cannot be confused by DOM globals or local helpers: if
one file uses a name another file exports, that file must import it.

  python3 tools/check_imports.py
"""
import os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "web", "assets")

EXPORT = re.compile(r"^export\s+(?:async\s+)?(?:function|const|let|class)\s+([A-Za-z_$][\w$]*)",
                    re.M)
EXPORT_LIST = re.compile(r"^export\s*\{([^}]*)\}", re.M)
IMPORT = re.compile(r"import\s*(?:\*\s*as\s*([\w$]+)|\{([^}]*)\})\s*from", re.S)


def names_in(spec):
    out = set()
    for part in spec.split(","):
        part = part.strip()
        if not part:
            continue
        out.add(part.split(" as ")[-1].strip())
    return out


def main():
    files = sorted(f for f in os.listdir(ASSETS) if f.endswith(".js"))
    src = {f: open(os.path.join(ASSETS, f)).read() for f in files}

    exported = {}
    for f, s in src.items():
        for m in EXPORT.finditer(s):
            exported[m.group(1)] = f
        for m in EXPORT_LIST.finditer(s):
            for n in names_in(m.group(1)):
                exported[n] = f

    problems = []
    for f, s in src.items():
        imported, namespaces = set(), set()
        for m in IMPORT.finditer(s):
            if m.group(1):
                namespaces.add(m.group(1))
            if m.group(2):
                imported |= names_in(m.group(2))
        local = {m.group(1) for m in EXPORT.finditer(s)}
        local |= set(re.findall(r"^\s*(?:async\s+)?function\s+([\w$]+)", s, re.M))
        local |= set(re.findall(r"^\s*(?:const|let|var)\s+([\w$]+)", s, re.M))

        body = re.sub(r"^import[^;]+;", "", s, flags=re.M)
        # A name taken as a function parameter is bound locally, not missing -
        # rankLessons(lessons, ctx, scoreItem) receives scoreItem, it does not
        # need to import it.
        params = set()
        for m in re.finditer(r"function\s+[\w$]*\s*\(([^)]*)\)", s):
            params |= {x.strip().split("=")[0].strip() for x in m.group(1).split(",")}
        local |= {p for p in params if p}
        for name, owner in exported.items():
            if owner == f or name in imported or name in local:
                continue
            if re.search(rf"(?<![.\w$]){re.escape(name)}\s*\(", body):
                problems.append(f"{f}: uses {name}() exported by {owner}, "
                                f"but never imports it")

    # Namespace usage (chats.listChats()) is qualified, so the name check above
    # cannot see it. Catch an undefined namespace directly - this is how two
    # whole modules ended up never imported while the code that used them
    # looked fine.
    module_names = {f[:-3] for f in files}
    for f, s in src.items():
        namespaces = set(re.findall(r"import\s*\*\s*as\s*([\w$]+)\s*from", s))
        declared = namespaces | set(re.findall(r"^\s*(?:const|let|var)\s+([\w$]+)", s, re.M))
        for used in set(re.findall(r"(?<![.\w$])([\w$]+)\.[\w$]+\s*\(", s)):
            if used in module_names and used not in declared:
                problems.append(f"{f}: calls {used}.* but never imports a "
                                f"module as {used}")

    print(f"checked {len(files)} modules, {len(exported)} exported names")
    if problems:
        for p in problems:
            print(f"  PROBLEM  {p}")
        sys.exit(f"\n{len(problems)} undefined reference(s)")
    print("no module calls an exported name it did not import")


if __name__ == "__main__":
    main()
